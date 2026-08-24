import type { IAdminUserRepository } from '../../application/ports/repositories/IAdminUserRepository.js';

export class SupabaseAdminUserRepository implements IAdminUserRepository {
  constructor(private readonly client: any) {}

  async findActiveByEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) return null;

    const { data, error } = await this.client
      .from('admin_users')
      .select('email, role, is_active')
      .eq('email', normalizedEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      email: data.email,
      role: data.role,
    };
  }
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}
