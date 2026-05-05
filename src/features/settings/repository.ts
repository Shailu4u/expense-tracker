import { getDb } from '@/storage/db';

export interface AppSettings {
  monthStartDay: number;
  currency: string;
  lockKind: 'none' | 'pin' | 'biometric' | 'pin_or_biometric';
  lockGraceSeconds: number;
  theme: string;
  smsImportEnabled: boolean;
  onboardedAt: string | null;
}

interface DbSettingsRow {
  month_start_day: number;
  currency: string;
  lock_kind: AppSettings['lockKind'];
  lock_grace_seconds: number;
  theme: string;
  sms_import_enabled: number;
  onboarded_at: string | null;
}

export async function get(): Promise<AppSettings> {
  const db = await getDb();
  const r = await db.getFirstAsync<DbSettingsRow>('SELECT * FROM app_settings WHERE id = 1');
  if (!r) throw new Error('app_settings row missing');
  return {
    monthStartDay: r.month_start_day,
    currency: r.currency,
    lockKind: r.lock_kind,
    lockGraceSeconds: r.lock_grace_seconds,
    theme: r.theme,
    smsImportEnabled: r.sms_import_enabled === 1,
    onboardedAt: r.onboarded_at,
  };
}

export async function update(patch: Partial<AppSettings>): Promise<AppSettings> {
  const db = await getDb();
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const map: Record<string, [string, (v: unknown) => string | number | null]> = {
    monthStartDay: ['month_start_day', (v) => v as number],
    currency: ['currency', (v) => v as string],
    lockKind: ['lock_kind', (v) => v as string],
    lockGraceSeconds: ['lock_grace_seconds', (v) => v as number],
    theme: ['theme', (v) => v as string],
    smsImportEnabled: ['sms_import_enabled', (v) => (v ? 1 : 0)],
    onboardedAt: ['onboarded_at', (v) => (v as string | null) ?? null],
  };
  for (const [k, [col, conv]] of Object.entries(map)) {
    const v = (patch as Record<string, unknown>)[k];
    if (v !== undefined) {
      sets.push(`${col} = ?`);
      args.push(conv(v));
    }
  }
  if (sets.length > 0) {
    args.push(1);
    await db.runAsync(`UPDATE app_settings SET ${sets.join(', ')} WHERE id = ?`, args);
  }
  return get();
}
