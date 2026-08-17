import { loadLocalEnv } from '../config/env.js';
import type { ChatMessage, PageContext } from '../domain/conversation/ChatMessage.js';
import { createGasparApp } from '../apps/gaspar/createGasparApp.js';

loadLocalEnv();

const args = process.argv.slice(2);
const retrieveOnly =
  args.includes('--retrieve-only') || process.env.npm_config_retrieve_only === 'true';
const historyDemo =
  args.includes('--external-profile-history') ||
  process.env.npm_config_external_profile_history === 'true';
const historyJsonIndex = args.indexOf('--history-json');
const pagePathIndex = args.indexOf('--page-path');
const pageTitleIndex = args.indexOf('--page-title');
const sectionIndex = args.indexOf('--section');
const pagePath = getOptionValue('--page-path');
const pageTitle = getOptionValue('--page-title');
const activeSection = getOptionValue('--section');

try {
  const messages = parseMessages();
  const pageContext = parsePageContext();
  const question = getQuestion();
  const application = createGasparApp();

  if (!question) {
    console.error(
      'Usage: npm run rag:ask:test -- [--retrieve-only] [--external-profile-history] [--history-json <json>] [--page-path=<pathname> --page-title=<title> --section=<sectionId>] "What does ARG Software do?"'
    );
    process.exit(1);
  }

  if (retrieveOnly) {
    const contexts = await application.retrieveRelevantChunks({ question, messages, pageContext });
    console.log(`\nQuestion: ${question}\n`);
    console.log(`Retrieved chunks: ${contexts.length}`);

    for (const context of contexts) {
      console.log(
        `- ${context.title} (${context.sourceType}/${context.sourceKey}) similarity=${context.similarity.toFixed(3)}`
      );
    }

    process.exit(0);
  }

  const result = await application.askQuestion({ question, messages, pageContext });
  console.log(`\nQuestion: ${question}\n`);
  console.log(`Answer:\n${result.answer}\n`);

  if (result.citations.length > 0) {
    console.log('Citations:');
    for (const citation of result.citations) {
      console.log(`- ${citation.title}: ${citation.url ?? citation.sourceKey}`);
    }
  }

  if (result.articleRecommendations.length > 0) {
    console.log('Article recommendations:');
    for (const article of result.articleRecommendations) {
      console.log(`- ${article.title}: ${article.url}`);
    }
  }

  if (result.actions.length > 0) {
    console.log('Actions:');
    for (const action of result.actions) {
      console.log(`- ${action.type}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function getQuestion(): string {
  return args
    .filter((arg, index) => {
      if (arg === '--retrieve-only' || arg === '--external-profile-history') {
        return false;
      }

      if (
         arg === '--history-json' ||
         arg === '--page-path' ||
         arg === '--page-title' ||
         arg === '--section' ||
         (historyJsonIndex !== -1 && index === historyJsonIndex + 1) ||
         (pagePathIndex !== -1 && index === pagePathIndex + 1) ||
         (pageTitleIndex !== -1 && index === pageTitleIndex + 1) ||
         (sectionIndex !== -1 && index === sectionIndex + 1)
      ) {
        return false;
      }

      if (
        (pagePathIndex === -1 && arg === pagePath) ||
        (pageTitleIndex === -1 && arg === pageTitle) ||
        (sectionIndex === -1 && arg === activeSection)
      ) {
        return false;
      }

      return true;
    })
    .join(' ')
    .trim();
}

function parseMessages(): ChatMessage[] {
  if (historyDemo) {
    return [
      {
        role: 'user',
        content: 'What external profiles mention ARG Software?',
      },
      {
        role: 'assistant',
        content: 'DesignRush, GoodFirms, TechBehemoths, and LinkedIn.',
      },
    ];
  }

  if (historyJsonIndex === -1) {
    return [];
  }

  const rawHistory = args[historyJsonIndex + 1];

  if (!rawHistory) {
    throw new Error('--history-json requires a JSON array argument');
  }

  return JSON.parse(rawHistory) as ChatMessage[];
}

function parsePageContext(): PageContext | undefined {
  if (!pagePath) {
    return undefined;
  }

  return {
    pathname: pagePath,
    title: pageTitle || '',
    ...(activeSection ? { activeSection: activeSection as PageContext['activeSection'] } : {}),
  };
}

function getOptionValue(option: string): string | undefined {
  const optionIndex = args.indexOf(option);

  if (optionIndex !== -1) {
    return args[optionIndex + 1];
  }

  const envName = `npm_config_${option.slice(2).replace(/-/g, '_')}`;
  const value = process.env[envName];
  return value && value !== 'true' ? value : undefined;
}
