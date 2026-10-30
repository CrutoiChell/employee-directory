import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { openDatabase } from './db/index.js';
import { sameOrigin } from './middleware/sameOrigin.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAuthRouter } from './routes/auth.js';
import { createEmployeesRouter } from './routes/employees.js';

export function createApp(
  databasePath = 'data/directory.sqlite',
  options: { seed?: boolean } = {},
) {
  const db = openDatabase(databasePath, options.seed);
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      strictTransportSecurity:
        process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );
  app.use('/api', function noCache(_req, res, next) {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', sameOrigin);
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 50,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Слишком много попыток. Попробуйте через 15 минут.' },
    }),
  );

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/employees', createEmployeesRouter(db));
  app.use('/api', function notFound(_req, res) {
    res.status(404).json({ message: 'Запрошенный адрес не найден.' });
  });
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}', function index(_req, res) {
    res.sendFile(path.resolve('dist/index.html'));
  });
  app.use(errorHandler);
  return { app, db };
}
