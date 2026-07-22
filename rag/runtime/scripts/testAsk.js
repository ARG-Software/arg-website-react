import { loadLocalEnv } from '../../config/loadLocalEnv.js';
import { askQuestion, retrieveRelevantChunks } from '../ask.js';

loadLocalEnv();

const args = process.argv.slice(2);
const retrieveOnly =
  args.includes('--retrieve-only') || process.env.npm_config_retrieve_only === 'true';
const question = args
  .filter(arg => arg !== '--retrieve-only')
  .join(' ')
  .trim();

if (!question) {
  console.error('Usage: npm run rag:ask:test -- [--retrieve-only] "What does ARG Software do?"');
  process.exit(1);
}

try {
  if (retrieveOnly) {
    const contexts = await retrieveRelevantChunks({ question });
    console.log(`\nQuestion: ${question}\n`);
    console.log(`Retrieved chunks: ${contexts.length}`);

    for (const context of contexts) {
      console.log(
        `- ${context.title} (${context.sourceType}/${context.sourceKey}) similarity=${context.similarity.toFixed(3)}`
      );
    }

    process.exit(0);
  }

  const result = await askQuestion({ question });
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
