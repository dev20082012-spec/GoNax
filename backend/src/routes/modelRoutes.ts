import { Router } from 'express';
import { ModelController } from '../controllers/modelController';

const router = Router();
const controller = new ModelController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);

export default router;
