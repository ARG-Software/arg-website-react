import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  IAdminUser,
  IAdminUserRepository,
} from '../../application/ports/repositories/IAdminUserRepository.js';

export class SupabaseAdminUserRepository implements IAdminUserRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findActiveByEmail(email: string): Promise<IAdminUser | null> {
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

function normalizeEmail(email: string): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}
