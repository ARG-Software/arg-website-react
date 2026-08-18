import {
  config,
  createKeepDatabaseAliveApi,
} from '../../backend/rag/api/keepDatabaseAliveApi.js';

export { config };

export default createKeepDatabaseAliveApi({ env: process.env });
