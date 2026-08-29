import type { SupabaseClient } from '@supabase/supabase-js';

import type { ILogger } from '../../../../shared/logger/ilogger.js';
import { logOperation } from '../../../../shared/logger/logoperation.js';
import type {
  IAdminUser,
  IAdminUserRepository,
} from '../../../application/ports/repositories/iadminuser.repository.js';

export class SupabaseAdminUserRepository implements IAdminUserRepository {
  constructor(private readonly client: SupabaseClient, private readonly logger?: ILogger) {}

  async findActiveByEmail(email: string): Promise<IAdminUser | null> {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      this.logger?.warn('Supabase admin user lookup skipped', { reason: 'empty_email' });
      return null;
    }

    return logOperation(
      this.logger,
      'Supabase admin user lookup',
      { table: 'admin_users', emailHash: hashLogValue(normalizedEmail) },
      async () => {
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
      },
      result => ({ found: Boolean(result), role: result?.role })
    );
  }
}

function hashLogValue(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return `hash_${Math.abs(hash)}`;
}

function normalizeEmail(email: string): string {
  return String(email || '')
    .trim()
    .toLowerCase();
}
