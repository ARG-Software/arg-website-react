import type { IRetrievedContext } from '../../../domain/sources/retrievedcontext.types.js';
import { createRoutedRetrievalItems } from '../../../domain/routing/retrievalitems.js';
import { resolveRetrievalRoute } from '../../../domain/routing/retrievalroute.js';
import {
  normalizeMessages,
  normalizePageContext,
  normalizeQuestion,
} from '../../../domain/conversation/inputvalidation.js';
import type { ILlmProvider } from '../../ports/iproviderports.js';
import {
  getHomepageSectionScope,
  getKnownProjectNames,
  getProjectNameBySlug,
  getStaticPageSourceKeys,
} from '../../config/sourcecatalog.config.js';
import { RoutedContextRetriever } from '../../retrieval/routedcontextretriever.js';

export interface RetrieveRelevantChunksInput {
  question?: unknown;
  messages?: unknown;
  pageContext?: unknown;
  retrievalQuestion?: string;
}

export class RetrieveRelevantChunksUseCase {
  constructor(
    private readonly answerProvider: ILlmProvider,
    private readonly routedContextRetriever: RoutedContextRetriever
  ) {}

  async execute(input: RetrieveRelevantChunksInput = {}): Promise<IRetrievedContext[]> {
    const question = normalizeQuestion(input.question);
    const messages = normalizeMessages(input.messages);
    const pageContext = normalizePageContext(input.pageContext, {
      getHomepageSectionScope,
      getProjectNameBySlug,
      getStaticPageSourceKeys,
    });
    const plan = await this.answerProvider.planRetrieval(question, messages, pageContext);
    const routedItem = createRoutedRetrievalItems(
      { ...plan, query: input.retrievalQuestion?.trim() || plan.query },
      question,
      pageContext,
      getKnownProjectNames()
    )[0];
    const query = routedItem?.retrievalQuestion || question;
    const route = routedItem?.route || resolveRetrievalRoute(query, plan, getKnownProjectNames());

    if (route.requiresPersonClarification) {
      return [];
    }

    const result = await this.routedContextRetriever.retrieve({
      retrievalQuestion: query,
      route,
    });

    return result.contexts;
  }
}
