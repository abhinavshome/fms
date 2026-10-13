import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, closeDatabase } from './db.js';

const name = process.env.SAMPLE_USER_NAME ?? 'Sample User';
const email = (process.env.SAMPLE_USER_EMAIL ?? 'admin@factory.local').trim().toLowerCase();
const password = process.env.SAMPLE_USER_PASSWORD ?? 'test123';

async function seed() {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.one<{ id: number; email: string }>(
    `INSERT INTO users(name, email, password_hash)
     VALUES($1, $2, $3)
     ON CONFLICT(email) DO UPDATE
       SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
     RETURNING id, email`,
    [name, email, passwordHash]
  );

  console.log(`Sample user ready: ${user.email} (id ${user.id})`);
  console.log(`Password: ${password}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
