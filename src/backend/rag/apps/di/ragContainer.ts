import { createRagContainer } from './createRagContainer.js';

type RagContainer = ReturnType<typeof createRagContainer>;

let container: RagContainer | null = null;

export const ragContainer = {
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
