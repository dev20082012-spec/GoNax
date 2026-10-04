import { Router } from 'express';
import { PredictionController } from '../controllers/predictionController';
import { ExplanationController } from '../controllers/explanationController';

const router = Router();
const predController = new PredictionController();
const explController = new ExplanationController();

router.post('/', predController.predict);
router.get('/history', predController.getHistory);
router.get('/:id', predController.getById);
router.get('/:id/provenance', predController.getProvenance);
router.post('/:id/explanation', explController.explain);
router.post('/:id/explain', explController.explain); // maintain backward compatibility
router.get('/:id/explanation', explController.getExplanation);
router.get('/:id/explanations', explController.getExplanationsHistory);

export default router;
