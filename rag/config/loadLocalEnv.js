import { config } from 'dotenv';

export function loadLocalEnv(path = '.env') {
  const result = config({ path });

  if (result.error) {
    throw result.error;
  }

  return result.parsed ?? {};
}
