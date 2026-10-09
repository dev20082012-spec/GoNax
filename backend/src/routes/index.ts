import { Router } from 'express';
import speciesRoutes from './speciesRoutes';
import observationRoutes from './observationRoutes';
import predictionRoutes from './predictionRoutes';
import referenceRoutes from './referenceRoutes';
import modelRoutes from './modelRoutes';
import datasetRoutes from './datasetRoutes';
import knowledgeRoutes from './knowledgeRoutes';
import authRoutes from './authRoutes';
import adminRoutes from './adminRoutes';
import healthRoutes from './healthRoutes';

const apiRouter = Router();

// Version 1 of GoNax REST API
apiRouter.use('/species', speciesRoutes);
apiRouter.use('/observations', observationRoutes);
apiRouter.use('/predictions', predictionRoutes);
apiRouter.use('/references', referenceRoutes);
apiRouter.use('/models', modelRoutes);
apiRouter.use('/datasets', datasetRoutes);
apiRouter.use('/knowledge', knowledgeRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/health', healthRoutes);

export default apiRouter;
