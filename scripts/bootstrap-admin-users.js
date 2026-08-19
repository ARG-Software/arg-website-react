import crypto from 'node:crypto';

import { config as loadDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

loadDotenv({ path: '.env', quiet: true });

const emails = getEmails();
const supabase = createClient(
  requiredEnv('ADMIN_DATABASE_URL'),
  requiredEnv('ADMIN_DATABASE_SERVICE_ROLE_KEY'),
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
const generatedUsers = [];

for (const [index, email] of emails.entries()) {
  const password = createTemporaryPassword();
  const role = index === 0 ? 'owner' : 'admin';
  const user = await upsertAuthUser(email, password);

  await upsertAdminUser(email, role);

  generatedUsers.push({
    email,
    role,
    password,
    authUserId: user.id,
  });
}

console.log('Temporary admin passwords generated. Store them securely and change them after login.');
console.table(generatedUsers);

function getEmails() {
  const values = process.argv.slice(2).length
    ? process.argv.slice(2)
    : (process.env.OUTREACH_ADMIN_BOOTSTRAP_EMAILS || '').split(',');
  const normalizedEmails = values.map(normalizeEmail).filter(Boolean);

  if (!normalizedEmails.length) {
    throw new Error(
      'Usage: node scripts/bootstrap-admin-users.js <email...> or set OUTREACH_ADMIN_BOOTSTRAP_EMAILS'
    );
  }

  return [...new Set(normalizedEmails)];
}

async function upsertAuthUser(email, password) {
  const existingUser = await findAuthUserByEmail(email);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
    });

    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;
  return data.user;
}

async function findAuthUserByEmail(email) {
  let page = 1;

  while (page < 100) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const user = data.users.find(user => normalizeEmail(user.email) === email);
    if (user) return user;
    if (data.users.length < 100) return null;

    page += 1;
  }

  return null;
}

async function upsertAdminUser(email, role) {
  const { error } = await supabase.from('admin_users').upsert(
    {
      email,
      role,
      is_active: true,
    },
    { onConflict: 'email' }
  );

  if (error) throw error;
}

function createTemporaryPassword() {
  return `${crypto.randomBytes(18).toString('base64url')}A1!`;
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
