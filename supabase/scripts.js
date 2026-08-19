import { spawn } from 'node:child_process';
import { readdir, readFile, rm, mkdir, writeFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

config({ path: '.env', quiet: true });

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const supabaseRoot = path.join(repoRoot, 'supabase');
const target = process.argv[2];
const command = process.argv[3];

const targets = {
  admin: {
    accessTokenEnv: 'ADMIN_DATABASE_ACCESS_TOKEN',
    migrationsDir: path.join(supabaseRoot, 'admin', 'migrations'),
    projectId: 'arg-software-admin',
    projectRefEnv: 'ADMIN_DATABASE_PROJECT_REF',
  },
  rag: {
    accessTokenEnv: 'RAG_DATABASE_ACCESS_TOKEN',
    migrationsDir: path.join(supabaseRoot, 'rag', 'migrations'),
    projectId: 'arg-software-rag',
    projectRefEnv: 'RAG_DATABASE_PROJECT_REF',
  },
};

if (!targets[target] || command !== 'push') {
  throw new Error('Usage: node supabase/scripts.js <admin|rag> push');
}

const selectedTarget = targets[target];
const projectRef = requiredEnv(selectedTarget.projectRefEnv);
const accessToken = requiredEnv(selectedTarget.accessTokenEnv);
const tempRoot = path.join(
  await mkTemporaryDirectory(),
  `${target}-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

try {
  await stageSupabaseProject(tempRoot, selectedTarget);
  await runSupabase(['supabase', 'link', '--project-ref', projectRef], tempRoot, accessToken);
  await runSupabase(['supabase', 'db', 'push'], tempRoot, accessToken);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

async function stageSupabaseProject(root, selectedTarget) {
  const stagedSupabaseRoot = path.join(root, 'supabase');
  const stagedMigrationsDir = path.join(stagedSupabaseRoot, 'migrations');
  const configTemplate = await readFile(path.join(supabaseRoot, 'config.toml'), 'utf8');
  const migrationFiles = await readdir(selectedTarget.migrationsDir);

  await mkdir(stagedMigrationsDir, { recursive: true });
  await writeFile(
    path.join(stagedSupabaseRoot, 'config.toml'),
    configTemplate.replace(/^project_id = .+$/m, `project_id = "${selectedTarget.projectId}"`)
  );

  for (const fileName of migrationFiles.filter(fileName => fileName.endsWith('.sql')).sort()) {
    await copyFile(
      path.join(selectedTarget.migrationsDir, fileName),
      path.join(stagedMigrationsDir, fileName)
    );
  }
}

function runSupabase(args, cwd, accessToken) {
  return new Promise((resolve, reject) => {
    const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(executable, args, {
      cwd,
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: accessToken,
      },
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Supabase command failed with exit code ${code ?? 1}`));
    });
  });
}

async function mkTemporaryDirectory() {
  const root = path.join(tmpdir(), 'arg-software-supabase');
  await mkdir(root, { recursive: true });
  return root;
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
