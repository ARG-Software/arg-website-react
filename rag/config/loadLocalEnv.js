import { config } from 'dotenv';

export function loadLocalEnv(path = '.env') {
  const result = config({ path, quiet: true });

  if (result.error) {
    throw result.error;
  }

  return result.parsed ?? {};
}
