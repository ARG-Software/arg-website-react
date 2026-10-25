import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { chunkText } from '../../../../../src/backend/rag/application/ingestion/processing/chunking.js';
import { loadCareersSources } from '../../../../../src/backend/rag/infrastructure/ingestion/loaders/loadcareerssources.js';

const CAREERS_FILE_PATH = 'src/frontend/data/careersPage.json';
const JOBS_FILE_PATH = 'src/frontend/data/jobs.json';
const OPEN_ROLES_COPY = /Explore open roles|The team is growing|Apply for a role|Send your application/u;

test('careers sources say ARG is not hiring when there are no open roles', async () => {
  const sources = await loadCareersSources(process.cwd(), CAREERS_FILE_PATH);
  const [page, jobs] = sources;

  assert.deepEqual(
    sources.map(source => source.sourceKey),
    ['careers-page', 'jobs']
  );
  assert.match(chunkText(page.content)[0], /no open roles and is not hiring for a specific role today/u);
  assert.match(chunkText(jobs.content)[0], /Open roles at ARG Software: none/u);
  assert.match(chunkText(page.content)[0], /Work mode for every role: Remote\./u);
  assert.match(chunkText(jobs.content)[0], /hires for remote work only/u);

  for (const source of sources) {
    assert.doesNotMatch(source.content, OPEN_ROLES_COPY);
    assert.doesNotMatch(source.content, /undefined/u);
  }
});

test('careers sources list open roles and the hiring process when a job exists', async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'careers-sources-'));

  try {
    const jobsJson = JSON.parse(await readFile(JOBS_FILE_PATH, 'utf8'));
    jobsJson.jobs = [
      {
        id: 'backend-engineer',
        title: 'Senior Backend Engineer',
        department: 'Engineering',
        type: 'Full-time',
        location: 'Remote, Europe',
        description: 'Own backend services for fintech platforms.',
        requirements: ['.NET', 'PostgreSQL', 'Kafka'],
      },
    ];
    await mkdir(path.join(rootDir, 'src/frontend/data'), { recursive: true });
    await writeFile(path.join(rootDir, CAREERS_FILE_PATH), await readFile(CAREERS_FILE_PATH, 'utf8'));
    await writeFile(path.join(rootDir, JOBS_FILE_PATH), JSON.stringify(jobsJson));

    const [page, jobs] = await loadCareersSources(rootDir, CAREERS_FILE_PATH);

    assert.match(chunkText(page.content)[0], /ARG Software is hiring\. Open roles: Senior Backend Engineer\./u);
    assert.match(page.content, /Explore open roles/u);
    assert.match(jobs.content, /Open role: Senior Backend Engineer \(Engineering, Full-time, Remote, Europe\)/u);
    assert.match(jobs.content, /Requirements: \.NET; PostgreSQL; Kafka\./u);
    assert.match(chunkText(page.content)[0], /Work mode for every role: Remote\./u);
    assert.match(jobs.content, /Step 1, Send your application/u);

    for (const source of [page, jobs]) {
      assert.doesNotMatch(source.content, /not hiring|No Open Roles|undefined/iu);
    }
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});
