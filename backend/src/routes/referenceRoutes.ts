import { Router } from 'express';
import { ReferenceController } from '../controllers/referenceController';

const router = Router();
const controller = new ReferenceController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);

export default router;
