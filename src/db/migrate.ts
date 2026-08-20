import { createPool } from './index.ts';
import { seedInitialData } from '../../server/scripts/seed-users.ts';

export async function runMigrations() {
  try {
    const pool = createPool();
    console.log("Ensuring PostgreSQL schema and tables exist...");

    // 1. Ensure core tables exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        document TEXT,
        logo_url TEXT,
        plan_tier TEXT NOT NULL DEFAULT 'FREE',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        name TEXT NOT NULL,
        address TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        avatar_url TEXT,
        document_number TEXT,
        bio TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        token_version INTEGER NOT NULL DEFAULT 1,
        email_verified BOOLEAN DEFAULT true,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS memberships (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        company_id TEXT NOT NULL REFERENCES companies(id),
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        branch_id TEXT REFERENCES branches(id),
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'PDV',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        ip_address TEXT,
        activated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        name TEXT NOT NULL,
        barcode TEXT,
        sku TEXT,
        category TEXT,
        price DOUBLE PRECISION NOT NULL,
        cost_price DOUBLE PRECISION,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        image_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        product_id TEXT NOT NULL REFERENCES products(id),
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        stock_after INTEGER NOT NULL,
        reason TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cash_registers (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        branch_id TEXT REFERENCES branches(id),
        device_id TEXT REFERENCES devices(id),
        opened_by TEXT NOT NULL REFERENCES users(id),
        closed_by TEXT REFERENCES users(id),
        opening_balance DOUBLE PRECISION NOT NULL,
        closing_balance DOUBLE PRECISION,
        status TEXT NOT NULL DEFAULT 'OPEN',
        opened_at TEXT NOT NULL,
        closed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        branch_id TEXT REFERENCES branches(id),
        cash_register_id TEXT REFERENCES cash_registers(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        client_id TEXT,
        subtotal DOUBLE PRECISION NOT NULL,
        discount DOUBLE PRECISION DEFAULT 0,
        total DOUBLE PRECISION NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        idempotency_key TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL REFERENCES sales(id),
        product_id TEXT NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DOUBLE PRECISION NOT NULL,
        total_price DOUBLE PRECISION NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        name TEXT NOT NULL,
        document TEXT,
        email TEXT,
        phone TEXT,
        balance DOUBLE PRECISION NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS client_ledger (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id),
        company_id TEXT NOT NULL REFERENCES companies(id),
        type TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        balance_after DOUBLE PRECISION NOT NULL,
        reason TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS financial_records (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL REFERENCES companies(id),
        branch_id TEXT REFERENCES branches(id),
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        due_date TEXT NOT NULL,
        paid_at TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        email TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS platform_companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'FREE',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS platform_subscriptions (
        id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        current_period_end TEXT NOT NULL,
        cancel_at_period_end BOOLEAN DEFAULT false,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS platform_admins (
        id TEXT PRIMARY KEY REFERENCES users(id),
        granted_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS platform_audit_logs (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
      );
    `);

    // 2. Ensure columns exist for existing tables (in case schema evolved)
    await pool.query(`
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS document TEXT;
      ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'FREE';

      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS document_number TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true;

      ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DOUBLE PRECISION;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

      ALTER TABLE sales ADD COLUMN IF NOT EXISTS branch_id TEXT;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_register_id TEXT;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_id TEXT;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount DOUBLE PRECISION DEFAULT 0;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;

      ALTER TABLE financial_records ADD COLUMN IF NOT EXISTS branch_id TEXT;
      ALTER TABLE financial_records ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE financial_records ADD COLUMN IF NOT EXISTS created_by TEXT;
    `);

    console.log("Ensuring initial relational database seed...");
    await seedInitialData();
    console.log("Database initialized successfully.");
  } catch (e) {
    console.error("Database initialization notice:", e);
  }
}

