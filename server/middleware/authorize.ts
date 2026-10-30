import type { Request, Response, NextFunction } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { tokenHash } from '../utils/sessions.js';

export function createAuthorization(db: DatabaseSync) {
  function authorize(req: Request, res: Response, next: NextFunction) {
    const user = db
      .prepare(
        'SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires > ?',
      )
      .get(tokenHash(req), Date.now());
    if (!user) {
      res.status(401).json({ message: 'Сессия завершена. Войдите снова.' });
      return;
    }
    res.locals.user = user;
    next();
  }
  return authorize;
}
