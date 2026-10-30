import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { credentialsSchema } from '../../shared/validation.js';
import { createAuthorization } from '../middleware/authorize.js';
import { tokenHash, openSession } from '../utils/sessions.js';

const scrypt = promisify(scryptCallback);

export function createAuthRouter(db: DatabaseSync) {
  const router = Router();
  const authorize = createAuthorization(db);
  router.post('/register', async function register(req, res) {
    const result = credentialsSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: 'Проверьте email и пароль.',
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }
    const { email, password } = result.data;
    const salt = randomBytes(16).toString('hex');
    const hash = ((await scrypt(password, salt, 64)) as Buffer).toString('hex');
    try {
      const row = db
        .prepare('INSERT INTO users (email, password) VALUES (?, ?)')
        .run(email, `${salt}:${hash}`);
      const id = Number(row.lastInsertRowid);
      openSession(db, res, id);
      res.status(201).json({ user: { id, email } });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('UNIQUE constraint')
      ) {
        res.status(409).json({
          message: 'Этот email уже зарегистрирован. Войдите в аккаунт.',
        });
        return;
      }
      throw error;
    }
  });
  router.post('/login', async function login(req, res) {
    const result = credentialsSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: 'Проверьте email и пароль.',
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }
    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(result.data.email) as
      { id: number; email: string; password: string } | undefined;
    const [salt, stored] = (
      user?.password || `${'0'.repeat(32)}:${'0'.repeat(128)}`
    ).split(':');
    const hash = (await scrypt(result.data.password, salt, 64)) as Buffer;
    if (!user || !timingSafeEqual(Buffer.from(stored, 'hex'), hash)) {
      res.status(401).json({ message: 'Неверный email или пароль.' });
      return;
    }
    openSession(db, res, user.id);
    res.json({ user: { id: user.id, email: user.email } });
  });
  router.get('/me', authorize, function me(_req, res) {
    res.json({ user: res.locals.user });
  });
  router.post('/logout', function logout(req, res) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(tokenHash(req));
    res.clearCookie('session', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    res.json({ ok: true });
  });
  return router;
}
