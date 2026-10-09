import express from 'express';
import cors from 'cors';
import { config, validateConfig, getSanitizedConfig } from './config';
import apiRouter from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/logger';
import { requestIdMiddleware } from './middlewares/requestId';
import { securityHeaders } from './middlewares/securityHeaders';
import { inputSanitizer } from './middlewares/inputSanitizer';
import { globalRateLimiter } from './middlewares/rateLimiter';
import { runSeed } from './database/seeds/seed';
import { appLogger } from './utils/logger';

const app = express();

// Security Headers
app.use(securityHeaders);

// CORS configuration (strictly enforced in production)
const corsOrigin = config.nodeEnv === 'production'
  ? config.cors.allowedOrigins
  : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server) or matching origins
      callback(null, true);
    };

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Admin-Key', 'X-Session-Id']
}));

// Request size limits (prevent resource exhaustion)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request tracing and logging
app.use(requestIdMiddleware);
app.use(requestLogger);

// XSS and input sanitization
app.use(inputSanitizer);

// Global rate limiting
app.use('/api', globalRateLimiter);

// API Routes
app.use('/api/v1', apiRouter);

// Health endpoints accessible directly at root or under /api/v1
import healthRoutes from './routes/healthRoutes';
app.use('/health', healthRoutes);

// Frontend static asset serving (serves the web app on port 5000 as well)
import path from 'path';
import fs from 'fs';

const candidateDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist')
];

let staticDir: string | null = null;
for (const p of candidateDistPaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    staticDir = p;
    break;
  }
}

if (staticDir) {
  app.use(express.static(staticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(staticDir!, 'index.html'));
  });
} else {
  // Root informational endpoint fallback
  app.get('/', (req, res) => {
    res.json({
      project: 'GoNax — Species-Specific Carbon Intelligence',
      version: '1.2.0-hardened',
      status: 'online',
      health: '/api/v1/health',
      ready: '/api/v1/health/ready'
    });
  });
}

// Centralized error handler (prevents credential/stack leaks)
app.use(errorHandler);

// Server startup
async function startServer() {
  try {
    // 1. Validate configuration and fail safely if critical secrets missing in production
    const validation = validateConfig();
    for (const w of validation.warnings) {
      console.warn(w);
    }
    if (!validation.valid) {
      for (const err of validation.errors) {
        console.error(err);
      }
      throw new Error('Server configuration validation failed. Halting startup.');
    }

    // 2. Run migrations and seed data
    await runSeed();

    // 3. Start listening
    app.listen(config.port, () => {
      appLogger.info('STARTUP', `GoNax server started on port ${config.port}`, {
        sanitizedConfig: getSanitizedConfig()
      });
      console.log(`=======================================================`);
      console.log(`GoNax Carbon Intelligence Server Running (Hardened)`);
      console.log(`Port: ${config.port}`);
      console.log(`API Endpoint: http://localhost:${config.port}/api/v1`);
      console.log(`Mode: ${config.nodeEnv}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    appLogger.error('STARTUP', 'Fatal error during GoNax server initialization', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;
