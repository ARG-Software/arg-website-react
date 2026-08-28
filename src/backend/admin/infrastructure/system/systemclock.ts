import type { IClock } from '../../application/ports/iclock.js';

export const systemClock: IClock = {
  today() {
    return new Date().toISOString().slice(0, 10);
  },
};
