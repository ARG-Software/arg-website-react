import {
  config,
  createKeepDatabaseAliveApi,
} from '../../src/backend/rag/apps/gaspar/keepDatabaseAliveApi.js';

export { config };

export default createKeepDatabaseAliveApi({ env: process.env });
