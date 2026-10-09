import { config } from '../config';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'credential',
  'cookie',
  'jwt_secret'
]);

function sanitizeLogPayload(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeLogPayload);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('key')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object') {
      sanitized[key] = sanitizeLogPayload(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export interface OperationalLogEvent {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  category:
    | 'STARTUP'
    | 'DATABASE'
    | 'PREDICTION_ENGINE'
    | 'MODEL_REGISTRY'
    | 'DATASET_REGISTRY'
    | 'LLM_ASSISTANT'
    | 'RATE_LIMIT'
    | 'SECURITY'
    | 'HTTP';
  event: string;
  requestId?: string;
  durationMs?: number;
  details?: Record<string, any>;
  error?: string;
}

export class AppLogger {
  public log(event: OperationalLogEvent) {
    const sanitized = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
      details: sanitizeLogPayload(event.details)
    };

    if (config.nodeEnv === 'production') {
      // In production, emit single-line JSON log for log aggregators (e.g. Datadog, CloudWatch)
      process.stdout.write(JSON.stringify(sanitized) + '\n');
    } else {
      // In development/test, emit human-readable format
      const prefix = `[${sanitized.timestamp}] [${sanitized.level}] [${sanitized.category}]`;
      const reqIdStr = sanitized.requestId ? ` [Req:${sanitized.requestId}]` : '';
      const durStr = sanitized.durationMs !== undefined ? ` (${sanitized.durationMs}ms)` : '';
      console.log(`${prefix}${reqIdStr} ${sanitized.event}${durStr}`, sanitized.details || '');
      if (sanitized.error) {
        console.error(` -> Error:`, sanitized.error);
      }
    }
  }

  public info(category: OperationalLogEvent['category'], event: string, details?: Record<string, any>, requestId?: string, durationMs?: number) {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category,
      event,
      details,
      requestId,
      durationMs
    });
  }

  public warn(category: OperationalLogEvent['category'], event: string, details?: Record<string, any>, requestId?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      category,
      event,
      details,
      requestId
    });
  }

  public error(category: OperationalLogEvent['category'], event: string, err?: any, details?: Record<string, any>, requestId?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category,
      event,
      details,
      error: err instanceof Error ? err.stack || err.message : String(err),
      requestId
    });
  }
}

export const appLogger = new AppLogger();
