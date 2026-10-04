import { Router } from 'express';
import speciesRoutes from './speciesRoutes';
import observationRoutes from './observationRoutes';
import predictionRoutes from './predictionRoutes';
import referenceRoutes from './referenceRoutes';
import modelRoutes from './modelRoutes';
import datasetRoutes from './datasetRoutes';
import knowledgeRoutes from './knowledgeRoutes';

const apiRouter = Router();

// Version 1 of GoNax REST API
apiRouter.use('/species', speciesRoutes);
apiRouter.use('/observations', observationRoutes);
apiRouter.use('/predictions', predictionRoutes);
apiRouter.use('/references', referenceRoutes);
apiRouter.use('/models', modelRoutes);
apiRouter.use('/datasets', datasetRoutes);
apiRouter.use('/knowledge', knowledgeRoutes);

apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'GoNax Species-Specific Carbon Intelligence API',
    version: '1.2.0',
    timestamp: new Date().toISOString()
  });
});

export default apiRouter;
