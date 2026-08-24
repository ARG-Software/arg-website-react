import type { IClock } from '../../application/ports/IClock.js';

export const systemClock: IClock = {
  today() {
    return new Date().toISOString().slice(0, 10);
  },
};
