import type { RagConfig } from '../../../core/types/config.js';
import type { RetrievedContext } from '../../../core/types/context.js';
import type { RagSourceMetadata } from '../../../core/types/source.js';
import type { RagReadRepository, RagSourceRecord } from '../../../repositories/RagReadRepository.js';

const PROJECT_REFERENCE_PATTERN =
  /\b(?:top|main|best|featured|reference|referenced|portfolio|case stud(?:y|ies)|public examples?|client examples?)\b.{0,80}\b(?:projects?|case stud(?:y|ies)|portfolio|examples?)\b|\b(?:projects?|case stud(?:y|ies)|portfolio|examples?)\b.{0,80}\b(?:top|main|best|featured|reference|referenced|public|client)\b/iu;
const TOP_COUNT_PATTERN = /\btop\s+(?<count>\d+)\b/iu;
const WORD_COUNT_PATTERN = /\btop\s+(?<count>one|two|three)\b/iu;
const WORD_COUNTS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
};

export function isProjectReferenceQuestion(question: string, subject: string): boolean {
  return PROJECT_REFERENCE_PATTERN.test(`${subject} ${question}`);
}

export async function retrieveProjectReferenceContexts({
  readRepository,
  config,
  question,
  subject,
}: {
  readRepository: RagReadRepository;
  config: RagConfig;
  question: string;
  subject: string;
}): Promise<RetrievedContext[]> {
  const sources = await readRepository.findSources({ sourceTypes: ['homepage', 'project'] });
  const homepageProjectsSource = sources.find(
    source => source.sourceType === 'homepage' && source.sourceKey === 'home:projects'
  );
  const projectSources = sources
    .filter(source => source.sourceType === 'project')
    .filter(hasReferenceRank)
    .sort((left, right) => getReferenceRank(left.metadata) - getReferenceRank(right.metadata))
    .slice(0, getRequestedProjectCount(`${subject} ${question}`, config.matchCount));

  return readRepository.findFirstChunksForSources([
    ...(homepageProjectsSource ? [homepageProjectsSource] : []),
    ...projectSources,
  ]);
}

function hasReferenceRank(source: RagSourceRecord): boolean {
  return Number.isFinite(getReferenceRank(source.metadata));
}

function getReferenceRank(metadata: RagSourceMetadata | null): number {
  const rank = metadata?.reference_rank;
  return typeof rank === 'number' ? rank : Number.POSITIVE_INFINITY;
}

function getRequestedProjectCount(value: string, matchCount: number): number {
  const numericCount = Number(value.match(TOP_COUNT_PATTERN)?.groups?.count);
  const wordCount = value.match(WORD_COUNT_PATTERN)?.groups?.count;
  const requestedCount = Number.isFinite(numericCount) && numericCount > 0
    ? numericCount
    : wordCount
      ? WORD_COUNTS[wordCount.toLowerCase()]
      : 3;

  return Math.max(1, Math.min(requestedCount ?? 3, Math.max(matchCount, 3)));
}
