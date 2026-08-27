import { createRagContainer } from './createrag.container.js';

type RagContainer = ReturnType<typeof createRagContainer>;

let container: RagContainer | null = null;

export const ragContainer = {
  get logger() {
    return getRagContainer().logger;
  },
  get assistant() {
    return getRagContainer().assistant;
  },
  get security() {
    return getRagContainer().security;
  },
};

function getRagContainer(): RagContainer {
  container ||= createRagContainer();
  return container;
}
