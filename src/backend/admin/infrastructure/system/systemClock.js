export const systemClock = {
  today() {
    return new Date().toISOString().slice(0, 10);
  },
};
