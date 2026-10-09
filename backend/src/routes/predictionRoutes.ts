import { Router } from 'express';
import { PredictionController } from '../controllers/predictionController';
import { ExplanationController } from '../controllers/explanationController';
import { optionalAuth } from '../middlewares/authMiddleware';
import { predictionRateLimiter, assistantRateLimiter } from '../middlewares/rateLimiter';

const router = Router();
const predController = new PredictionController();
const explController = new ExplanationController();

router.post('/', optionalAuth, predictionRateLimiter, predController.predict);
router.get('/history', optionalAuth, predController.getHistory);
router.get('/:id', optionalAuth, predController.getById);
router.get('/:id/provenance', optionalAuth, predController.getProvenance);
router.post('/:id/explanation', optionalAuth, assistantRateLimiter, explController.explain);
router.post('/:id/explain', optionalAuth, assistantRateLimiter, explController.explain);
router.get('/:id/explanation', optionalAuth, explController.getExplanation);
router.get('/:id/explanations', optionalAuth, explController.getExplanationsHistory);

export default router;
