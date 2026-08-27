import { createAdminContainer } from './createadmin.container.js';

type AdminContainer = ReturnType<typeof createAdminContainer>;

let container: AdminContainer | null = null;

export const adminContainer = {
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
};

function getAdminContainer(): AdminContainer {
  container ||= createAdminContainer();
  return container;
}
