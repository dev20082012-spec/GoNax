import express from 'express';
import cors from 'cors';
import { config } from './config';
import apiRouter from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/logger';
import { requestIdMiddleware } from './middlewares/requestId';
import { runSeed } from './database/seeds/seed';

const app = express();

// Security and middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);
app.use(requestLogger);

// API Routes
app.use('/api/v1', apiRouter);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    project: 'GoNax — Species-Specific Carbon Intelligence',
    version: '1.0.0',
    status: 'online',
    apiDocs: '/api/v1/health',
    endpoints: {
      species: '/api/v1/species',
      observations: '/api/v1/observations',
      predictions: '/api/v1/predictions',
      history: '/api/v1/predictions/history',
      references: '/api/v1/references'
    }
  });
});

// Centralized error handler
app.use(errorHandler);

// Server startup
async function startServer() {
  try {
    // Run migrations and seed data on startup
    await runSeed();

    app.listen(config.port, () => {
      console.log(`=======================================================`);
      console.log(`GoNax Carbon Intelligence Server Running`);
      console.log(`Port: ${config.port}`);
      console.log(`API Endpoint: http://localhost:${config.port}/api/v1`);
      console.log(`Mode: ${config.nodeEnv}`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export default app;
