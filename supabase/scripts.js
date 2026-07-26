import { spawn } from 'node:child_process';

import { config } from 'dotenv';

config({ path: '.env', quiet: true });

const command = process.argv[2];

if (!command) {
  throw new Error('Usage: node supabase/scripts.js <link|push>');
}

const argsByCommand = {
  link: ['supabase', 'link', '--project-ref', process.env.DATABASE_PROJECT_REF],
  push: ['supabase', 'db', 'push'],
};

const args = argsByCommand[command];

if (!args) {
  throw new Error(`Unsupported Supabase command: ${command}`);
}

if (command === 'link' && !process.env.DATABASE_PROJECT_REF) {
  throw new Error('Missing required environment variable: DATABASE_PROJECT_REF');
}

if (!process.env.DATABASE_ACCESS_TOKEN) {
  throw new Error('Missing required environment variable: DATABASE_ACCESS_TOKEN');
}

const childEnv = {
  ...process.env,
  SUPABASE_ACCESS_TOKEN: process.env.DATABASE_ACCESS_TOKEN,
};

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(executable, args, {
  env: childEnv,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

child.on('exit', code => {
  process.exit(code ?? 1);
});
