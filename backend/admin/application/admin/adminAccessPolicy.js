import { createAdminError } from '../errors.js';

export function createAdminAccessPolicy(adminEmails) {
  const normalizedEmails = adminEmails.map(email => email.trim().toLowerCase()).filter(Boolean);

  if (!normalizedEmails.length) {
    throw createAdminError(503, 'configuration_error', 'No outreach admin emails configured');
  }

  const allowedEmails = new Set(normalizedEmails);

  return {
    canAccess(email) {
      return allowedEmails.has(email.toLowerCase());
    },
  };
}
