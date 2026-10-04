import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const reqId = req.id || '-';

  console.error(`[Error] [${reqId}] [${req.method}] ${req.url} -> ${status}:`, err);

  res.status(status).json({
    success: false,
    requestId: reqId,
    error: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

