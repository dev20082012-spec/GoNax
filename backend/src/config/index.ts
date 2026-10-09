import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'test' | 'production';
  cors: {
    allowedOrigins: string[];
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    adminApiKey: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    maxUploadBytes: number;
  };
  database: {
    url: string;
    driver: string;
    sqlitePath: string;
    backupDir: string;
    retentionDays: number;
  };
  ai: {
    geminiApiKey: string;
    model: string;
    timeoutMs: number;
    maxContextTokens: number;
  };
}

const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';

// In production, ensure sensible security defaults
const defaultJwtSecret = nodeEnv === 'production'
  ? ''
  : 'gonax-dev-secret-key-change-in-production-min32chars!';

const defaultAdminKey = nodeEnv === 'production'
  ? ''
  : 'gonax-admin-dev-key-change-in-production!';

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(s => s.trim())
      : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173']
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || defaultJwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    adminApiKey: process.env.ADMIN_API_KEY || defaultAdminKey,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    maxUploadBytes: parseInt(process.env.MAX_UPLOAD_BYTES || '5242880', 10) // 5 MB
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gonax_db',
    driver: process.env.DATABASE_DRIVER || 'auto',
    sqlitePath: path.resolve(__dirname, '../../data/gonax_local.json'),
    backupDir: path.resolve(__dirname, '../../data/backups'),
    retentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '90', 10)
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.LLM_MODEL || 'gemini-1.5-flash',
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '10000', 10), // 10s timeout
    maxContextTokens: parseInt(process.env.LLM_MAX_CONTEXT_TOKENS || '2048', 10)
  }
};

/**
 * Validate configuration at startup.
 * Fail safely if critical configuration is missing in production.
 */
export function validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      errors.push('CRITICAL: JWT_SECRET must be set to at least 32 characters in production.');
    }
    if (!process.env.ADMIN_API_KEY || process.env.ADMIN_API_KEY.length < 16) {
      errors.push('CRITICAL: ADMIN_API_KEY must be set to at least 16 characters in production.');
    }
    if (config.database.driver === 'postgres' && config.database.url.includes('postgres:postgres@localhost')) {
      warnings.push('WARNING: Using default postgres:postgres credentials in production.');
    }
    if (config.cors.allowedOrigins.includes('*')) {
      errors.push('CRITICAL: Wildcard CORS origin (*) is prohibited in production.');
    }
  } else {
    if (!process.env.GEMINI_API_KEY) {
      warnings.push('NOTICE: GEMINI_API_KEY is not set. GoNax will use deterministic grounded scientific reasoning.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get sanitized configuration representation safe for logging or diagnostics.
 * Masks all secrets, credentials, and API keys.
 */
export function getSanitizedConfig(): Record<string, any> {
  return {
    port: config.port,
    nodeEnv: config.nodeEnv,
    corsOrigins: config.cors.allowedOrigins,
    security: {
      jwtConfigured: !!config.security.jwtSecret,
      adminKeyConfigured: !!config.security.adminApiKey,
      rateLimitWindowMs: config.security.rateLimitWindowMs,
      rateLimitMaxRequests: config.security.rateLimitMaxRequests
    },
    database: {
      driver: config.database.driver,
      retentionDays: config.database.retentionDays,
      urlMasked: config.database.url.replace(/\/\/[^@]+@/, '//***:***@')
    },
    ai: {
      model: config.ai.model,
      geminiApiKeyConfigured: !!config.ai.geminiApiKey,
      geminiApiKeyMasked: config.ai.geminiApiKey
        ? `***${config.ai.geminiApiKey.slice(-4)}`
        : 'NONE',
      timeoutMs: config.ai.timeoutMs
    }
  };
}
