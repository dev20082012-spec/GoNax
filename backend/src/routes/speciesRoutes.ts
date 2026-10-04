import { Router } from 'express';
import { SpeciesController } from '../controllers/speciesController';
import { ModelController } from '../controllers/modelController';

const router = Router();
const controller = new SpeciesController();
const modelController = new ModelController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.get('/:id/datasets', controller.getDatasets);
router.get('/:id/models', controller.getModels);
router.get('/:id/model', modelController.getModelForSpecies);

export default router;
