import { config as loadDotenv } from 'dotenv';

export function loadLocalEnv(path = '.env'): void {
  const result = loadDotenv({ path, quiet: true });

  if (result.error) {
    throw result.error;
  }
}
