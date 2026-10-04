import { Router } from 'express';
import { DatasetController } from '../controllers/datasetController';

const router = Router();
const controller = new DatasetController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);

export default router;
