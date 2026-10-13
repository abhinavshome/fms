import cors from 'cors';
import express from 'express';
import { db } from './db.js';
import { createSopsRouter, sopsRouter, type SopDatabase } from './routes/sops.js';
import { usersRouter } from './routes/users.js';

export function createApp(database: SopDatabase = db) {
  const app = express();
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
  app.use(express.json());
  app.use('/api/users', usersRouter);
  app.use('/api/sops', database === db ? sopsRouter : createSopsRouter(database));

  app.get('/api/health', async (_request, response) => {
    try {
      await database.one('SELECT 1 AS ok');
      response.json({ status: 'ok', database: 'connected' });
    } catch {
      response.status(503).json({ status: 'degraded', database: 'unavailable' });
    }
  });
  return app;
}