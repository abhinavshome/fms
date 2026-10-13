import pgPromise from 'pg-promise';

const pgp = pgPromise();

export const db = pgp(process.env.DATABASE_URL ?? 'postgres://fms:fms@localhost:5432/fms');

export async function closeDatabase() {
  await pgp.end();
}
