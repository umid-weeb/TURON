import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: envPath });

function getConnectionString() {
  return process.env.DIRECT_URL || process.env.DATABASE_URL;
}

function needsSsl(connectionString: string) {
  return /sslmode=require/i.test(connectionString) || connectionString.includes('supabase.com');
}

function normalizeConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('sslcert');
  url.searchParams.delete('sslkey');
  url.searchParams.delete('sslrootcert');
  return url.toString();
}

const SCHEMA_MIGRATIONS_TABLE = 'public.app_schema_migrations';

const FOUNDATION_TABLES = [
  'users',
  'addresses',
  'menu_categories',
  'menu_items',
  'promo_codes',
  'orders',
  'order_items',
  'courier_assignments',
  'payments',
  'notifications',
  'audit_logs',
];

const RLS_POLICIES = [
  'users_select_own',
  'users_update_own_profile',
  'addresses_insert_own',
  'addresses_select_owned_or_delivery',
  'addresses_update_own',
  'menu_categories_select_active',
  'menu_items_select_active_available',
  'orders_select_self_or_assigned',
  'order_items_select_via_accessible_order',
  'courier_assignments_select_own',
  'notifications_select_own',
  'notifications_update_own_read_state',
];

async function ensureMigrationTable(client: Client) {
  await client.query(`
    create table if not exists ${SCHEMA_MIGRATIONS_TABLE} (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function getAppliedMigrations(client: Client) {
  const { rows } = await client.query<{ name: string }>(
    `select name from ${SCHEMA_MIGRATIONS_TABLE}`
  );
  return new Set(rows.map((row) => row.name));
}

async function markMigrationApplied(client: Client, file: string) {
  await client.query(
    `insert into ${SCHEMA_MIGRATIONS_TABLE} (name) values ($1) on conflict (name) do nothing`,
    [file]
  );
}

async function countExistingTables(client: Client, tableNames: string[]) {
  const { rows } = await client.query<{ count: string }>(
    `
      select count(*)::text as count
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
    `,
    [tableNames]
  );

  return Number(rows[0]?.count ?? 0);
}

async function countExistingPolicies(client: Client, policyNames: string[]) {
  const { rows } = await client.query<{ count: string }>(
    `
      select count(*)::text as count
      from pg_policies
      where schemaname = 'public'
        and policyname = any($1::text[])
    `,
    [policyNames]
  );

  return Number(rows[0]?.count ?? 0);
}

async function countRlsEnabledTables(client: Client, tableNames: string[]) {
  const { rows } = await client.query<{ count: string }>(
    `
      select count(*)::text as count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1::text[])
        and c.relrowsecurity = true
    `,
    [tableNames]
  );

  return Number(rows[0]?.count ?? 0);
}

async function migrationAlreadyRepresented(client: Client, file: string) {
  switch (file) {
    case '20260331210000_delivery_foundation.sql': {
      const tableCount = await countExistingTables(client, FOUNDATION_TABLES);
      return tableCount === FOUNDATION_TABLES.length;
    }
    case '20260331213000_delivery_rls.sql': {
      const rlsTableCount = await countRlsEnabledTables(client, FOUNDATION_TABLES);
      const policyCount = await countExistingPolicies(client, RLS_POLICIES);
      return rlsTableCount === FOUNDATION_TABLES.length && policyCount === RLS_POLICIES.length;
    }
    default:
      return false;
  }
}

async function main() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    throw new Error('DATABASE_URL or DIRECT_URL must be set before running migrations.');
  }

  const migrationsDir = path.resolve(__dirname, 'sql');
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = new Client({
    connectionString: normalizeConnectionString(connectionString),
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    await ensureMigrationTable(client);
    const appliedMigrations = await getAppliedMigrations(client);

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      if (await migrationAlreadyRepresented(client, file)) {
        console.log(`Marking existing migration as applied without re-running: ${file}`);
        await markMigrationApplied(client, file);
        continue;
      }

      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      console.log(`Applying SQL migration: ${file}`);
      await client.query(sql);
      await markMigrationApplied(client, file);
    }
  } finally {
    await client.end();
  }

  console.log(`Applied ${files.length} SQL migration file(s).`);
}

main().catch((error) => {
  console.error('Supabase SQL migration failed:', error);
  process.exit(1);
});
