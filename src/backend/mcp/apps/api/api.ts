import { readJsonBody } from '../../../shared/api/http.js';
import type {
  JsonRpcError,
  JsonRpcId,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccess,
  ToolCallParams,
  ToolResult,
} from './types/mcpTypes.js';
import {
  BLOG_DISCOVERY,
  COMPANY_PROFILE,
  CONTACT_OPTIONS,
  LLM_CONTEXT,
  PROJECTS,
  SERVER_INFO,
  SERVICES,
  TOOLS,
} from './mcpContent.js';

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
  return handleMcpRequest;
}

export const handleMcp = createMcpApi();

async function handleMcpRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return createResponse(204, null);
  }

  if (request.method !== 'POST') {
    return createResponse(405, createJsonRpcError(null, -32600, 'Method not allowed'));
  }

  let payload: unknown;
  try {
    payload = await readJsonBody(request);
  } catch {
    return createResponse(400, createJsonRpcError(null, -32700, 'Parse error'));
  }

  const response = handleJsonRpc(payload);
  if (response === null) return createResponse(204, null);

  return createResponse(200, response);
}

function handleJsonRpc(payload: unknown): JsonRpcResponse | JsonRpcResponse[] | null {
  if (Array.isArray(payload)) {
    const responses = payload
      .map(handleSingleRequest)
      .filter((response): response is JsonRpcResponse => response !== null);
    return responses.length > 0 ? responses : null;
  }

  return handleSingleRequest(payload);
}

function handleSingleRequest(payload: unknown): JsonRpcResponse | null {
  const request = payload as Partial<JsonRpcRequest> | null | undefined;
  const id: JsonRpcId = request?.id ?? null;

  if (!request?.method) {
    return createJsonRpcError(id, -32600, 'Invalid request');
  }

  if (request.id === undefined && request.method.startsWith('notifications/')) {
    return null;
  }

  switch (request.method) {
    case 'initialize':
      return createJsonRpcResult(id, {
        protocolVersion: (request.params?.protocolVersion as string) || '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    case 'tools/list':
      return createJsonRpcResult(id, { tools: TOOLS });
    case 'tools/call':
      return callTool(id, request.params as ToolCallParams | undefined);
    case 'resources/list':
      return createJsonRpcResult(id, { resources: [] });
    case 'prompts/list':
      return createJsonRpcResult(id, { prompts: [] });
    default:
      return createJsonRpcError(id, -32601, 'Method not found');
  }
}

function callTool(id: JsonRpcId, params: ToolCallParams | undefined): JsonRpcResponse {
  const name = params?.name;
  const args = params?.arguments ?? {};
  const handler = name ? TOOL_HANDLERS[name] : undefined;

  if (!handler) {
    return createJsonRpcError(id, -32602, 'Unknown tool');
  }

  try {
    return createToolResult(id, handler(args));
  } catch (error) {
    if (error instanceof ToolError) {
      return createJsonRpcError(id, error.code, error.message);
    }

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
