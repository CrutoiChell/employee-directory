import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof SyntaxError) {
    res.status(400).json({ message: 'Некорректный формат запроса.' });
    return;
  }
  console.error(
    'Request failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  res
    .status(500)
    .json({ message: 'Не удалось выполнить запрос. Повторите попытку.' });
}
