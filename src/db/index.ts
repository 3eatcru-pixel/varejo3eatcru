import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const config: any = {
      max: 10,
      connectionTimeoutMillis: 10000,
    };

    if (process.env.SQL_HOST) config.host = process.env.SQL_HOST;
    if (process.env.SQL_USER) config.user = process.env.SQL_USER;
    if (process.env.SQL_PASSWORD) config.password = process.env.SQL_PASSWORD;
    if (process.env.SQL_DB_NAME) config.database = process.env.SQL_DB_NAME;
    if (process.env.SQL_PORT) config.port = Number(process.env.SQL_PORT);

    global._postgresPool = new Pool(config);

    global._postgresPool.on('error', (err) => {
      console.warn('PostgreSQL idle client warning:', err.message);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });
