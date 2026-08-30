import { createRagContainer } from './createrag.container.js';

export type RagContainer = ReturnType<typeof createRagContainer>;

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
  get ingestion() {
    return getRagContainer().ingestion;
  },
  get maintenance() {
    return getRagContainer().maintenance;
  },
};

function getRagContainer(): RagContainer {
  container ||= createRagContainer();
  return container;
}
