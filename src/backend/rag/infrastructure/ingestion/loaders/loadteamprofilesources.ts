import { createSource } from '../../../application/ingestion/source.factory.js';
import type { IAboutJson, ICareersJson, IHomepageJson } from '../sitedata.types.js';
import type { IRagSource } from '../../../domain/sources/ragsource.types.js';
import { readJsonFile, resolveRoot } from './loaderfiles.js';

const PERSON_SOURCE_KEYS: Record<string, string> = {
  jose: 'jose-antunes',
  rui: 'rui-rocha',
};

export async function loadTeamProfileSources(rootDir: string): Promise<IRagSource[]> {
  const homepagePath = resolveRoot(rootDir, 'src/frontend/data/homePage.json');
  const aboutPath = resolveRoot(rootDir, 'src/frontend/data/about.json');
  const careersPath = resolveRoot(rootDir, 'src/frontend/data/careersPage.json');
  const [homepage, about, careers] = await Promise.all([
    readJsonFile<IHomepageJson>(homepagePath),
    readJsonFile<IAboutJson>(aboutPath),
    readJsonFile<ICareersJson>(careersPath),
  ]);
  const sourceFiles = [homepagePath, aboutPath, careersPath];
  const sources: IRagSource[] = [
    createSource({
      sourceType: 'about',
      sourceKey: 'arg-team',
      title: 'ARG Team',
      url: '/about-us/',
      path: aboutPath,
      metadata: { source_files: sourceFiles },
      content: [
        'ARG Team',
        homepage.team.intro,
        'The only individually named public team members are the two co-founders:',
        ...about.founders.people.map(person => `${person.name}: ${person.role}. ${person.focus}.`),
        'ARG also works with a trusted network of collaborators whose individual names are not publicly listed.',
        ...about.collaborators.paragraphs,
        `Publicly described collaborator disciplines: ${about.collaborators.disciplines.join(', ')}.`,
      ].join('\n\n'),
    }),
    createSource({
      sourceType: 'about',
      sourceKey: 'arg-team-capabilities',
      title: 'ARG Team Capabilities',
      url: '/about-us/',
      path: aboutPath,
      metadata: { source_files: sourceFiles, evidence_scope: 'company' },
      content: [
        'ARG Team Capabilities',
        'Team-level capability summary derived from public ARG website content.',
        'The team combines backend systems, frontend applications, mobile development, cloud infrastructure, software architecture, product development, and technical leadership.',
        'The team has public experience with architecture-first delivery, scalable systems, backend design, frontend execution, APIs, QA automation, deployment, operational maintenance, code reviews, pair programming, testing, CI/CD, observability, refactoring legacy systems, DDD, CQRS, and SOLID-oriented design.',
        'Publicly described technologies and platforms include TypeScript, JavaScript, Node.js, React, Angular, .NET, C#, PostgreSQL, MySQL, MongoDB, Docker, AWS, Kafka, Elasticsearch, Kibana, Redis, GraphQL, Fastify, Storybook, GitHub Actions, Argo CD, and Datadog.',
      ].join('\n\n'),
    }),
  ];

  for (const person of about.founders.people) {
    const homepageMember = homepage.team.members.find(
      member => member.personKey.toLowerCase() === person.id.toLowerCase()
    );
    const careersCard = careers.founders.cards.find(
      card => card.personKey.toLowerCase() === person.id.toLowerCase()
    );

    sources.push(
      createSource({
        sourceType: 'about',
        sourceKey: PERSON_SOURCE_KEYS[person.id] ?? person.id,
        title: person.name,
        url: '/about-us/',
        path: aboutPath,
        metadata: {
          source_files: sourceFiles,
          person_key: person.id,
          evidence_scope: 'individual_public',
        },
        content: [
          person.name,
          person.role,
          `Professional background and education: ${person.bio}`,
          `Primary focus: ${person.focus}.`,
          person.languageExperience ? `Language experience: ${person.languageExperience}` : '',
          `Experience areas: ${person.tags.join(', ')}.`,
          homepageMember ? `Homepage role: ${homepageMember.role}.` : '',
          careersCard ? `Careers contact focus: ${careersCard.focus}.` : '',
        ]
          .filter(Boolean)
          .join('\n\n'),
      })
    );
  }

  return sources;
}
