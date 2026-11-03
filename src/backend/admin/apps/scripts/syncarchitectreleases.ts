import { config as loadDotenv } from 'dotenv';

import { createAdminContainer } from '../di/createadmin.container.js';

loadDotenv({ path: '.env', quiet: true });

const result = await createAdminContainer().architectReleases.syncArchitectReleasesUseCase.execute();

console.log(`Synced ${result.upserted} architect releases from GitHub.`);
