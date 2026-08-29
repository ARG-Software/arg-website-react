import { createAdminContainer } from './createadmin.container.js';

export type AdminContainer = ReturnType<typeof createAdminContainer>;

let container: AdminContainer | null = null;

export const adminContainer = {
  get logger() {
    return getAdminContainer().logger;
  },
  get auth() {
    return getAdminContainer().auth;
  },
  get users() {
    return getAdminContainer().users;
  },
  get outreach() {
    return getAdminContainer().outreach;
  },
  get visits() {
    return getAdminContainer().visits;
  },
  get assistantConversations() {
    return getAdminContainer().assistantConversations;
  },
  get loginRateLimitNotifier() {
    return getAdminContainer().loginRateLimitNotifier;
  },
};

function getAdminContainer(): AdminContainer {
  container ||= createAdminContainer();
  return container;
}
