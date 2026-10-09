import { Request, Response, NextFunction } from 'express';
import { appLogger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const reqId = req.id || (req.headers['x-request-id'] as string) || '-';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';

    appLogger.log({
      timestamp: new Date().toISOString(),
      level,
      category: 'HTTP',
      event: `${req.method} ${req.originalUrl} ${res.statusCode}`,
      requestId: reqId,
      durationMs: duration,
      details: {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ip: req.ip || 'unknown'
      }
    });
  });

  next();
}
