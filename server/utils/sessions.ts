import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import type { DatabaseSync } from 'node:sqlite';

const lifetime = 7 * 24 * 60 * 60 * 1000;

export function tokenHash(req: Request) {
  const token =
    req.headers.cookie
      ?.split(';')
      .map(function trim(v) {
        return v.trim();
      })
      .find(function match(v) {
        return v.startsWith('session=');
      })
      ?.slice(8) || '';
  return createHash('sha256').update(token).digest('hex');
}
export function openSession(db: DatabaseSync, res: Response, id: number) {
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
  db.prepare(
    'INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)',
  ).run(
    createHash('sha256').update(token).digest('hex'),
    id,
    Date.now() + lifetime,
  );
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: lifetime,
    path: '/',
  });
}
