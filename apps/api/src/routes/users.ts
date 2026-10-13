import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

export const usersRouter = Router();
const authCookie = 'fms_auth';
const jwtSecret = process.env.JWT_SECRET ?? 'development-only-secret';

function getAuthToken(cookieHeader: string | undefined) {
  return cookieHeader?.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${authCookie}=`))?.slice(authCookie.length + 1);
}

usersRouter.get('/me', async (request, response) => {
  const token = getAuthToken(request.headers.cookie);
  if (!token) {
    response.status(401).json({ error: 'Not authenticated.' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (typeof payload === 'string' || !payload.sub) throw new Error('Invalid token');
    const user = await db.oneOrNone<{ id: number; name: string; email: string }>(
      'SELECT id, name, email FROM users WHERE id = $1',
      payload.sub
    );
    if (!user) throw new Error('User not found');
    response.json({ user });
  } catch {
    response.status(401).json({ error: 'Not authenticated.' });
  }
});

usersRouter.post('/login', async (request, response) => {
  const { email, password } = request.body as { email?: unknown; password?: unknown };
  if (typeof email !== 'string' || typeof password !== 'string') {
    response.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = await db.oneOrNone<{ id: number; email: string; password_hash: string | null }>(
    'SELECT id, email, password_hash FROM users WHERE email = $1',
    email.trim().toLowerCase()
  );
  const valid = user?.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
  if (!user || !valid) {
    response.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = jwt.sign({ email: user.email }, jwtSecret, { subject: String(user.id), expiresIn: '7d' });
  response.cookie(authCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  response.json({ user: { id: user.id, email: user.email } });
});

usersRouter.post('/logout', (_request, response) => {
  response.clearCookie(authCookie, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  response.status(204).send();
});
