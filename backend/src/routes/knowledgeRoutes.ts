import { Router } from 'express';
import { KnowledgeController } from '../controllers/knowledgeController';

const router = Router();
const controller = new KnowledgeController();

router.post('/ask', (req, res) => controller.askQuestion(req, res));
router.post('/query', (req, res) => controller.queryEvidence(req, res));
router.get('/sources', (req, res) => controller.getSources(req, res));
router.get('/sources/:id', (req, res) => controller.getSourceById(req, res));
router.get('/topics', (req, res) => controller.getTopics(req, res));
router.get('/claims', (req, res) => controller.getClaims(req, res));
router.get('/models', (req, res) => controller.getModelDocs(req, res));
router.get('/datasets', (req, res) => controller.getDatasetDocs(req, res));
router.post('/ingest', (req, res) => controller.ingestSource(req, res));
router.get('/audit-log', (req, res) => controller.getAuditLog(req, res));
router.get('/benchmark', (req, res) => controller.runBenchmark(req, res));

export default router;
