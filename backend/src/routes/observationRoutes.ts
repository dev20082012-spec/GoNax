import { Router } from 'express';
import { ObservationController } from '../controllers/observationController';

const router = Router();
const controller = new ObservationController();

router.post('/', controller.create);
router.get('/:id', controller.getById);

export default router;
