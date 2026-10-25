import { createSource } from '../../../application/ingestion/source.factory.js';
import type { IRagSource } from '../../../domain/sources/ragsource.types.js';
import type { ICareersJson, IJobsJson } from '../sitedata.types.js';
import { readJsonFile, resolveRoot } from './loaderfiles.js';

const JOBS_FILE_PATH = 'src/frontend/data/jobs.json';
const CAREERS_URL = '/careers/';

// Mirrors the hasJobs branch in CareersPage.jsx: only the copy a visitor sees is ingested.
export async function loadCareersSources(rootDir: string, relativeFilePath: string): Promise<IRagSource[]> {
  const filePath = resolveRoot(rootDir, relativeFilePath);
  const jobsFilePath = resolveRoot(rootDir, JOBS_FILE_PATH);
  const page = await readJsonFile<ICareersJson>(filePath);
  const { workMode, jobs, careerTraits, hiringSteps } = await readJsonFile<IJobsJson>(jobsFilePath);
  const hasJobs = jobs.length > 0;
  const workModeLine = `ARG Software hires for ${workMode.toLowerCase()} work only. Work mode for every role: ${workMode}.`;
  const traitsContent = [
    'What ARG Software looks for in engineers:',
    ...careerTraits.map(trait => `${trait.title}: ${trait.body}`),
  ].join('\n');

  let pageContent: string;
  let jobsContent: string;

  if (hasJobs) {
    const status = `ARG Software is hiring. Open roles: ${jobs.map(job => job.title).join(', ')}. ${workModeLine}`;

    pageContent = [
      [status, page.seo.openRolesDescription, page.hero.openRolesSubtitle].join('\n'),
      `${page.roles.title} ${page.roles.titleHighlight} ${page.roles.subtitle}`,
      `${page.hiring.title} ${page.hiring.titleHighlight} ${page.hiring.subtitle}`,
      `${page.applicationForm.title}: ${page.applicationForm.description} ${page.applicationForm.helperText}`,
      `${page.cta.openRolesTitle} ${page.cta.openRolesTitleHighlight}`,
    ].join('\n\n');
    jobsContent = [
      status,
      ...jobs.map(
        job =>
          `Open role: ${job.title} (${job.department}, ${job.type}, ${job.location}). ${job.description}\nRequirements: ${job.requirements.join('; ')}.`
      ),
      [
        'How ARG Software hires:',
        ...hiringSteps.map((step, index) => `Step ${index + 1}, ${step.title}: ${step.body}`),
      ].join('\n'),
      traitsContent,
    ].join('\n\n');
  } else {
    const status = `ARG Software has no open roles and is not hiring for a specific role today. ${workModeLine}`;

    pageContent = [
      [status, page.seo.noRolesDescription, page.hero.noRolesSubtitle].join('\n'),
      `${page.who.title} ${page.who.titleHighlight} ${page.who.subtitle}`,
      [
        `${page.founders.title} ${page.founders.titleHighlight} ${page.founders.intro}`,
        ...page.founders.cards.map(
          card =>
            `Careers contact: ${card.name}, ${card.role}. Focus: ${card.focus}. Typical reply time: ${card.replyTime}.`
        ),
      ].join('\n'),
      `${page.cta.noRolesTitle} ${page.cta.noRolesTitleHighlight}`,
    ].join('\n\n');
    jobsContent = [`Open roles at ARG Software: none. ${status}`, traitsContent].join('\n\n');
  }

  const metadata = { source_file: filePath, source_files: [filePath, jobsFilePath] };

  return [
    createSource({
      sourceType: 'careers',
      sourceKey: 'careers-page',
      title: 'Careers Page',
      url: CAREERS_URL,
      path: filePath,
      metadata,
      content: pageContent,
    }),
    createSource({
      sourceType: 'careers',
      sourceKey: 'jobs',
      title: 'Jobs and Hiring Traits',
      url: CAREERS_URL,
      path: jobsFilePath,
      metadata,
      content: jobsContent,
    }),
  ];
}
