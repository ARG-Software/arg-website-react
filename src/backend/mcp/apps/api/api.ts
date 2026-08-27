import { readJsonBody } from '../../../shared/api/http.js';
import type { ILogger } from '../../../shared/logger/ilogger.js';
import { mcpContainer } from '../di/mcp.container.js';
import type {
  JsonRpcError,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccess,
  ToolCallParams,
  ToolResult,
} from './types/mcp.types.js';
import {
  BLOG_DISCOVERY,
  COMPANY_PROFILE,
  CONTACT_OPTIONS,
  LLM_CONTEXT,
  PROJECTS,
  SERVER_INFO,
  SERVICES,
  TOOLS,
} from './mcpcontent.js';

class ToolError extends Error {
  constructor(
    message: string,
    readonly code = -32602
  ) {
    super(message);
  }
}

const TOOL_HANDLERS: Record<string, (args: Record<string, unknown>) => unknown> = {
  get_company_profile: () => COMPANY_PROFILE,
  list_services: () => ({ services: SERVICES }),
  list_projects: () => ({ projects: PROJECTS }),
  get_project: args => {
    const project = PROJECTS.find(item => item.slug === args.slug);
    if (!project) throw new ToolError('Unknown project slug');
    return project;
  },
  get_blog_discovery: () => BLOG_DISCOVERY,
  get_contact_options: () => CONTACT_OPTIONS,
  get_llm_context: () => LLM_CONTEXT,
};

export const config = {
  path: '/mcp',
  method: ['POST', 'OPTIONS'],
};

export function createMcpApi() {
  const logger = mcpContainer.logger;
  return (request: Request) => handleMcpRequest(request, logger);
}

export const handleMcp = createMcpApi();

async function handleMcpRequest(request: Request, logger: ILogger): Promise<Response> {
  const startedAt = Date.now();
  const { pathname } = new URL(request.url);
  logger.info('MCP API request started', { method: request.method, path: pathname });

  if (request.method === 'OPTIONS') {
    return logMcpResponse(logger, request, pathname, startedAt, createResponse(204, null));
  }

  if (request.method !== 'POST') {
    return logMcpResponse(
      logger,
      request,
      pathname,
      startedAt,
      createResponse(405, createJsonRpcError(null, -32600, 'Method not allowed'))
    );
  }

  let payload: unknown;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    logger.warn('MCP API request JSON parse failed', { error });
    return logMcpResponse(
      logger,
      request,
      pathname,
      startedAt,
      createResponse(400, createJsonRpcError(null, -32700, 'Parse error'))
    );
  }

  const response = handleJsonRpc(payload, logger);
  if (response === null) {
    return logMcpResponse(logger, request, pathname, startedAt, createResponse(204, null));
  }

  return logMcpResponse(logger, request, pathname, startedAt, createResponse(200, response));
}

function handleJsonRpc(payload: unknown, logger: ILogger): JsonRpcResponse | JsonRpcResponse[] | null {
  if (Array.isArray(payload)) {
    logger.info('MCP JSON-RPC batch received', { requestCount: payload.length });
    const responses = payload
      .map(request => handleSingleRequest(request, logger))
      .filter((response): response is JsonRpcResponse => response !== null);
    return responses.length > 0 ? responses : null;
  }

  return handleSingleRequest(payload, logger);
}

function handleSingleRequest(payload: unknown, logger: ILogger): JsonRpcResponse | null {
  const request = payload as Partial<JsonRpcRequest> | null | undefined;
  const id: JsonRpcId = request?.id ?? null;

  if (!request?.method) {
    logger.warn('MCP JSON-RPC request rejected', { reason: 'missing_method' });
    return createJsonRpcError(id, -32600, 'Invalid request');
  }

  if (request.id === undefined && request.method.startsWith('notifications/')) {
    logger.info('MCP JSON-RPC notification ignored', { rpcMethod: request.method });
    return null;
  }

  logger.info('MCP JSON-RPC method started', { rpcMethod: request.method });

  switch (request.method) {
    case 'initialize':
      logger.info('MCP JSON-RPC method completed', { rpcMethod: request.method });
      return createJsonRpcResult(id, {
        protocolVersion: (request.params?.protocolVersion as string) || '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    case 'tools/list':
      logger.info('MCP JSON-RPC method completed', { rpcMethod: request.method });
      return createJsonRpcResult(id, { tools: TOOLS });
    case 'tools/call':
      return callTool(id, request.params as ToolCallParams | undefined, logger);
    case 'resources/list':
      logger.info('MCP JSON-RPC method completed', { rpcMethod: request.method });
      return createJsonRpcResult(id, { resources: [] });
    case 'prompts/list':
      logger.info('MCP JSON-RPC method completed', { rpcMethod: request.method });
      return createJsonRpcResult(id, { prompts: [] });
    default:
      logger.warn('MCP JSON-RPC method rejected', { rpcMethod: request.method, reason: 'not_found' });
      return createJsonRpcError(id, -32601, 'Method not found');
  }
}

function callTool(id: JsonRpcId, params: ToolCallParams | undefined, logger: ILogger): JsonRpcResponse {
  const name = params?.name;
  const args = params?.arguments ?? {};
  const handler = name ? TOOL_HANDLERS[name] : undefined;

  if (!handler) {
    logger.warn('MCP tool rejected', { tool: name ?? 'unknown', reason: 'unknown_tool' });
    return createJsonRpcError(id, -32602, 'Unknown tool');
  }

  try {
    logger.info('MCP tool started', { tool: name });
    const response = createToolResult(id, handler(args));
    logger.info('MCP tool completed', { tool: name });
    return response;
  } catch (error) {
    if (error instanceof ToolError) {
      logger.warn('MCP tool failed', { tool: name, code: error.code, error });
      return createJsonRpcError(id, error.code, error.message);
    }

    logger.error('MCP tool failed unexpectedly', { tool: name, error });
    return createJsonRpcError(id, -32603, 'Internal error');
  }
}

function createToolResult(id: JsonRpcId, data: unknown): JsonRpcSuccess<ToolResult> {
  return createJsonRpcResult(id, {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  });
}

function createJsonRpcResult<T>(id: JsonRpcId, result: T): JsonRpcSuccess<T> {
  return { jsonrpc: '2.0', id, result };
}

function createJsonRpcError(id: JsonRpcId, code: number, message: string): JsonRpcError {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function createResponse(status: number, body: unknown): Response {
  return new Response(status === 204 || body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Headers': 'Content-Type, MCP-Protocol-Version',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}

function logMcpResponse(
  logger: ILogger,
  request: Request,
  path: string,
  startedAt: number,
  response: Response
): Response {
  const level = response.status >= 400 ? 'warn' : 'info';
  logger[level]('MCP API request completed', {
    method: request.method,
    path,
    status: response.status,
    durationMs: Date.now() - startedAt,
  });

  return response;
}
