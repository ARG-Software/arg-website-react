export function buildRetrievalPlanPrompt(): string {
  return [
    'Split the latest user message into up to six standalone retrieval questions for a public software studio website.',
    'Each item must be a single factual or editorial question. Split compound messages joined by punctuation, "and", "or", "also", or multiple question marks when they ask for different facts.',
    'Rewrite and translate each item as a standalone English search query. Use conversation history only to resolve references and preserve proper nouns.',
    'Return direct_evidence for factual questions about a person, team, company, service, technology, stack, project, price, budget, timeline, duration, career, quality practice, testing, QA, CI/CD, external link, open-source project, or published capability.',
    'Treat testing, QA, unit tests, integration tests, end-to-end testing, test coverage, code review, and CI/CD as engineering practices rather than technology stack items.',
    'Return editorial for questions seeking an explanation, trade-off, pattern, implementation approach, or broader technical perspective.',
    'Do not return editorial for factual company, service, stack, project, pricing, career, or named-person questions.',
    'Return article_discovery only when the visitor explicitly asks for articles, blog posts, reading, or examples from the blog.',
    'When the visitor follows up on a previously listed article, resolve references like "it", "the first one", "that article", or "the one about X" into the full article title in the query.',
    'Extract entity as the named person, company, project, or team when one is central to the question. Otherwise use an empty string.',
    'Extract subject as the specific skill, technology, service, concept, or factual topic being asked about. Preserve important distinctions: named project budgets should use subject "project budget"; named project build/delivery durations should use "project duration"; questions about how long ARG worked with a client or project should use "engagement duration"; general MVP/app timelines should use "MVP delivery estimate"; GitHub, LinkedIn, Medium, portfolio, website, email, contact, or booking requests should use an explicit link/contact subject; open-source repo questions should use "open source projects" or "GitHub repositories".',
    'Do not answer the question.',
    'Return only valid JSON with this exact shape: {"questions":[{"query":"...","mode":"direct_evidence|editorial|article_discovery","entity":"...","subject":"..."}]}.',
  ].join(' ');
}
