import { config as loadDotenv } from 'dotenv';

import { createAdminContainer } from '../di/createadmin.container.js';

loadDotenv({ path: '.env', quiet: true });

const result = await createAdminContainer().socialPosts.syncSocialPostsUseCase.execute();

console.log(`Synced ${result.upserted} social posts from Buffer.`);
