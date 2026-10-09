import { Router } from 'express';
import { AdminGovernanceController } from '../controllers/adminGovernanceController';
import { requireAdmin } from '../middlewares/authMiddleware';

const router = Router();
const adminController = new AdminGovernanceController();

// All routes require administrative authorization (admin_maintainer role or X-Admin-Key)
router.use(requireAdmin);

// Model governance
router.get('/models/review', adminController.reviewModels);
router.post('/models/:id/approve', adminController.approveModel);
router.post('/models/:id/retire', adminController.retireModel);
router.post('/models/compare', adminController.compareModels);

// Dataset governance & quality validation
router.post('/datasets/validate', adminController.validateDataset);
router.get('/datasets/:id/quality-report', adminController.getDatasetQualityReport);
router.post('/datasets/register', adminController.registerDataset);

// Audit logs
router.get('/audit-log', adminController.getAuditLogs);

// Backup & disaster recovery
router.post('/backups', adminController.createBackup);
router.get('/backups', adminController.listBackups);
router.post('/backups/test-restore', adminController.testRestoration);

export default router;
