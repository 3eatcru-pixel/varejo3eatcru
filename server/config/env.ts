export function requireEnv(name: string, fallback: string): string {
  const val = process.env[name];
  if (!val) {
    console.warn(`[CONFIG WARNING] Environment variable "${name}" is not set. Using secure default fallback.`);
    return fallback;
  }
  return val;
}

export const JWT_SECRET = requireEnv('JWT_SECRET', 'varejopro_super_secret_key_2026');
export const CRON_SECRET = requireEnv('CRON_SECRET', 'varejopro_internal_scheduler_secret_2026');
