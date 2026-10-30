import type { Request, Response, NextFunction } from 'express';

export function sameOrigin(req: Request, res: Response, next: NextFunction) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');
    if (
      (origin &&
        origin !==
          (process.env.APP_ORIGIN || `${req.protocol}://${req.get('host')}`)) ||
      !req.is('application/json')
    ) {
      res.status(403).json({
        message: 'Запрос отклонён. Обновите страницу и повторите попытку.',
      });
      return;
    }
  }
  next();
}
