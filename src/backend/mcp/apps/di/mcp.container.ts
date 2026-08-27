import { createMcpContainer } from './createmcp.container.js';

type McpContainer = ReturnType<typeof createMcpContainer>;

let container: McpContainer | null = null;

export const mcpContainer = {
  get logger() {
    return getMcpContainer().logger;
  },
};

function getMcpContainer(): McpContainer {
  container ||= createMcpContainer();
  return container;
}
