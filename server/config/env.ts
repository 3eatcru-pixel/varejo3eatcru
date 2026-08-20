export function requireEnv(name: string, fallback: string): string {
  const val = process.env[name];
  if (!val) {
    if (process.env.NODE_ENV === 'production' || process.env.VITE_USER_NODE_ENV === 'production') {
      throw new Error(`[FATAL CRITICAL] VarejoPro Security Shield: Environment variable "${name}" is missing in production. Startup aborted.`);
    }
    return fallback;
  }
  return val;
}

export const JWT_SECRET = requireEnv('JWT_SECRET', 'varejopro_super_secret_key_2026');
export const CRON_SECRET = requireEnv('CRON_SECRET', 'varejopro_internal_scheduler_secret_2026');
