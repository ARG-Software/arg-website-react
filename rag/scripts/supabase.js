import { spawn } from 'node:child_process';

import { loadLocalEnv } from '../config/loadLocalEnv.js';

loadLocalEnv();

const command = process.argv[2];

if (!command) {
  throw new Error('Usage: node rag/scripts/supabase.js <link|push>');
}

const argsByCommand = {
  link: ['supabase', 'link', '--project-ref', process.env.SUPABASE_PROJECT_REF],
  push: ['supabase', 'db', 'push'],
};

const args = argsByCommand[command];

if (!args) {
  throw new Error(`Unsupported Supabase command: ${command}`);
}

if (command === 'link' && !process.env.SUPABASE_PROJECT_REF) {
  throw new Error('Missing required environment variable: SUPABASE_PROJECT_REF');
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  throw new Error('Missing required environment variable: SUPABASE_ACCESS_TOKEN');
}

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(executable, args, {
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', code => {
  process.exit(code ?? 1);
});
