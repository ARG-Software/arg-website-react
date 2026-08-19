import {
  config,
  createKeepDatabaseAliveApi,
} from '../../src/backend/rag/api/keepDatabaseAliveApi.js';

export { config };

export default createKeepDatabaseAliveApi({ env: process.env });
