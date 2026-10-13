import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDatabase } from './db.js';

type Migration = { id: string; up: string; down: string };
const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../migrations');

async function loadMigrations(): Promise<Migration[]> {
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  return Promise.all(files.map(async (file) => {
    const source = await readFile(path.join(migrationsDir, file), 'utf8');
    const [up = '', down = ''] = source.split('-- down');
    return { id: file.split('.')[0], up: up.replace('-- up', '').trim(), down: down.trim() };
  }));
}

async function ensureTable() {
  await db.none(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
}

async function run(direction: 'up' | 'down' | 'status') {
  await ensureTable();
  const migrations = await loadMigrations();
  const applied = await db.manyOrNone<{ id: string }>('SELECT id FROM schema_migrations ORDER BY id');
  const appliedIds = new Set(applied.map(({ id }) => id));

  if (direction === 'status') {
    for (const migration of migrations) console.log(`${appliedIds.has(migration.id) ? 'up  ' : 'down'} ${migration.id}`);
    return;
  }

  if (direction === 'up') {
    for (const migration of migrations.filter(({ id }) => !appliedIds.has(id))) {
      await db.tx(async (transaction) => {
        await transaction.none(migration.up);
        await transaction.none('INSERT INTO schema_migrations(id) VALUES($1)', migration.id);
      });
      console.log(`Applied ${migration.id}`);
    }
    return;
  }

  const last = migrations.filter(({ id }) => appliedIds.has(id)).at(-1);
  if (!last) return console.log('No migrations to roll back.');
  await db.tx(async (transaction) => {
    await transaction.none(last.down);
    await transaction.none('DELETE FROM schema_migrations WHERE id = $1', last.id);
  });
  console.log(`Rolled back ${last.id}`);
}

const direction = process.argv[2] as 'up' | 'down' | 'status' | undefined;
if (!direction || !['up', 'down', 'status'].includes(direction)) {
  console.error('Usage: pnpm migrate:up | migrate:down | migrate:status');
  process.exitCode = 1;
} else {
  run(direction).catch((error) => { console.error(error); process.exitCode = 1; }).finally(closeDatabase);
}
