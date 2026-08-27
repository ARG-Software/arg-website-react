import { runVisitEventsRetention } from '../../src/backend/maintenance/apps/api/api.ts';

export const config = {
  schedule: '0 4 * * *',
};

export default runVisitEventsRetention;
