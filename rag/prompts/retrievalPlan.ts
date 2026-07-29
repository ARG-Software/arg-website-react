export function buildRetrievalPlanPrompt(): string {
  return [
    'Split the latest user message into up to six standalone retrieval questions for a public software studio website.',
    'Each item must be a single factual or editorial question. Split compound messages joined by punctuation, "and", "or", "also", or multiple question marks when they ask for different facts.',
    'Rewrite and translate each item as a standalone English search query. Use conversation history only to resolve references and preserve proper nouns.',
    'Return direct_evidence for factual questions about a person, team, company, service, technology, stack, architecture, pattern, methodology, project, price, budget, timeline, duration, career, quality practice, testing, QA, CI/CD, external link, open-source project, or published capability.',
    'Return direct_evidence, not editorial, when the visitor asks whether the studio can help build, deliver, assess, scope, estimate, modernize, or fix a site, web app, application, platform, MVP, product, software system, integration, or technical project.',
    'Treat testing, QA, unit tests, integration tests, end-to-end testing, test coverage, code review, and CI/CD as engineering practices rather than technology stack items.',
    'Return editorial for questions seeking an explanation, trade-off, pattern, implementation approach, or broader technical perspective.',
    'Do not return editorial for factual company, service, stack, project, pricing, career, or named-person questions.',
    'Return article_discovery only when the visitor explicitly asks for articles, blog posts, reading, or examples from the blog.',
    'When the visitor follows up on a previously listed article, resolve references like "it", "the first one", "that article", or "the one about X" into the full article title in the query.',
    'When current page metadata names a project and the visitor asks about the current project, rewrite the query around that project name.',
    'Extract entity as the named person, company, project, or team when one is central to the question. Otherwise use an empty string.',
    'For Gaspar identity or profile questions such as name, who are you, whether you are an AI, robot, chatbot, language model, or real, where were you born, nationality, ascendence, free time, preferences, or liking work at ARG, use entity "Gaspar" and subject "assistant profile" unless the question names a more specific Gaspar fact.',
    'Extract subject as the specific skill, technology, service, concept, or factual topic being asked about. Preserve important distinctions: named project budgets should use subject "project budget"; named project build/delivery durations should use "project duration"; questions about how long ARG worked with a client or project should use "engagement duration"; general MVP/app timelines should use "MVP delivery estimate"; GitHub, LinkedIn, Medium, portfolio, website, email, contact, or booking requests should use an explicit link/contact subject; open-source repo questions should use "open source projects" or "GitHub repositories".',
    'Do not answer the question.',
    'Return only valid JSON with this exact shape: {"questions":[{"query":"...","mode":"direct_evidence|editorial|article_discovery","entity":"...","subject":"..."}]}.',
  ].join(' ');
}
