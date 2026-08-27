export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc?: '2.0';
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcSuccess<T = unknown> {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: T;
}

export interface JsonRpcError {
  jsonrpc: '2.0';
  id: JsonRpcId;
  error: { code: number; message: string };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

export interface Service {
  name: string;
  description: string;
}

export interface Project {
  slug: string;
  title: string;
  category: string;
  url: string;
  summary: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCallParams {
  name?: string;
  arguments?: Record<string, unknown>;
}

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent: unknown;
}
