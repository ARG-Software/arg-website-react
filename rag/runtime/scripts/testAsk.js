import { loadLocalEnv } from '../../config/loadLocalEnv.js';
import { askQuestion, retrieveRelevantChunks } from '../ask.js';

loadLocalEnv();

const args = process.argv.slice(2);
const retrieveOnly =
  args.includes('--retrieve-only') || process.env.npm_config_retrieve_only === 'true';
const historyDemo =
  args.includes('--external-profile-history') ||
  process.env.npm_config_external_profile_history === 'true';
const historyJsonIndex = args.indexOf('--history-json');

try {
  const messages = parseMessages();
  const question = getQuestion();

  if (!question) {
    console.error(
      'Usage: npm run rag:ask:test -- [--retrieve-only] [--external-profile-history] [--history-json <json>] "What does ARG Software do?"'
    );
    process.exit(1);
  }

  if (retrieveOnly) {
    const contexts = await retrieveRelevantChunks({ question, messages });
    console.log(`\nQuestion: ${question}\n`);
    console.log(`Retrieved chunks: ${contexts.length}`);

    for (const context of contexts) {
      console.log(
        `- ${context.title} (${context.sourceType}/${context.sourceKey}) similarity=${context.similarity.toFixed(3)}`
      );
    }

    process.exit(0);
  }

  const result = await askQuestion({ question, messages });
  console.log(`\nQuestion: ${question}\n`);
  console.log(`Answer:\n${result.answer}\n`);

  if (result.citations.length > 0) {
    console.log('Citations:');
    for (const citation of result.citations) {
      console.log(`- ${citation.title}: ${citation.url ?? citation.sourceKey}`);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

function getQuestion() {
  return args
    .filter((arg, index) => {
      if (arg === '--retrieve-only' || arg === '--external-profile-history') {
        return false;
      }

      if (arg === '--history-json' || (historyJsonIndex !== -1 && index === historyJsonIndex + 1)) {
        return false;
      }

      return true;
    })
    .join(' ')
    .trim();
}

function parseMessages() {
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

  return JSON.parse(rawHistory);
}
