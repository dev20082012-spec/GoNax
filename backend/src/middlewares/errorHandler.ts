import { Request, Response, NextFunction } from 'express';
import { appLogger } from '../utils/logger';
import { config } from '../config';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = err.status || err.statusCode || 500;
  const reqId = req.id || (req.headers['x-request-id'] as string) || '-';

  // Determine user-safe message
  let userMessage = err.message || 'Internal Server Error';
  if (status === 500 && config.nodeEnv === 'production') {
    userMessage = 'An unexpected internal error occurred. Please reference the Request ID when contacting support.';
  }

  // Structured logging of error
  appLogger.error(
    'HTTP',
    `Unhandled error in ${req.method} ${req.originalUrl} (${status})`,
    err,
    {
      statusCode: status,
      path: req.originalUrl,
      details: err.details || undefined
    },
    reqId
  );

  res.status(status).json({
    success: false,
    requestId: reqId,
    error: userMessage,
    ...(err.details ? { details: err.details } : {}),
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {})
  });
}
