import { Request, Response, NextFunction } from 'express';
import { ModelRegistry } from '../domain/models/modelRegistry';
import { DatasetService } from '../services/datasetService';
import { DataQualityService } from '../services/dataQualityService';
import { GovernanceAuditRepository } from '../repositories/auditRepository';
import { BackupService } from '../services/backupService';
import { appLogger } from '../utils/logger';

export class AdminGovernanceController {
  private modelRegistry = ModelRegistry.getInstance();
  private datasetService = new DatasetService();
  private dataQualityService = new DataQualityService();
  private auditRepo = new GovernanceAuditRepository();
  private backupService = new BackupService();

  // Model review & management
  reviewModels = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const all = this.modelRegistry.getAllModelsMetadata();
      res.json({
        success: true,
        count: all.length,
        data: all
      });
    } catch (err) {
      next(err);
    }
  };

  approveModel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const modelId = req.params.id;
      const { notes } = req.body;
      const reviewer = req.user?.email || 'admin_maintainer';

      const updated = this.modelRegistry.approveModel(
        modelId,
        reviewer,
        notes || 'Model approved following empirical validation audit.'
      );

      await this.auditRepo.logAction(
        'MODEL_APPROVED',
        req.user?.userId,
        req.user?.role || 'admin_maintainer',
        'model',
        modelId,
        { reviewer, notes },
        req.ip
      );

      appLogger.info('SECURITY', `Model ${modelId} approved by ${reviewer}`);

      res.json({
        success: true,
        message: `Model '${modelId}' successfully approved for production inference.`,
        data: updated
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  retireModel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const modelId = req.params.id;
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ success: false, error: 'Retirement reason is required.' });
      }

      const updated = this.modelRegistry.retireModel(modelId, reason);

      await this.auditRepo.logAction(
        'MODEL_RETIRED',
        req.user?.userId,
        req.user?.role || 'admin_maintainer',
        'model',
        modelId,
        { reason },
        req.ip
      );

      appLogger.info('SECURITY', `Model ${modelId} retired. Reason: ${reason}`);

      res.json({
        success: true,
        message: `Model '${modelId}' successfully retired from inference.`,
        data: updated
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  compareModels = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { modelIdA, modelIdB } = req.body;
      if (!modelIdA || !modelIdB) {
        return res.status(400).json({ success: false, error: 'Both modelIdA and modelIdB are required.' });
      }
      const comparison = this.modelRegistry.compareModels(modelIdA, modelIdB);
      res.json({
        success: true,
        data: comparison
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  // Dataset quality & audit
  validateDataset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { datasetMetadata, records, sourceFilePath } = req.body;
      if (!datasetMetadata || !records || !Array.isArray(records)) {
        return res.status(400).json({
          success: false,
          error: 'datasetMetadata and records array are required.'
        });
      }

      const report = this.dataQualityService.evaluateDataset(datasetMetadata, records, sourceFilePath);

      await this.auditRepo.logAction(
        'DATASET_VALIDATED',
        req.user?.userId,
        req.user?.role || 'admin_maintainer',
        'dataset',
        datasetMetadata.dataset_id,
        {
          total_observations: report.total_observations,
          quality_score: report.quality_score_percentage,
          is_ready: report.is_training_ready
        },
        req.ip
      );

      res.json({
        success: true,
        data: report
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  getDatasetQualityReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const datasetId = req.params.id;
      const ds = this.datasetService.getDatasetById(datasetId);
      if (!ds) {
        return res.status(404).json({ success: false, error: `Dataset '${datasetId}' not found.` });
      }

      const report = this.dataQualityService.evaluateStoredDataset(ds);
      res.json({
        success: true,
        data: report
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  registerDataset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metadata = req.body;
      if (!metadata.dataset_id || !metadata.version) {
        return res.status(400).json({ success: false, error: 'dataset_id and version required.' });
      }

      this.datasetService.registerDataset(metadata);

      await this.auditRepo.logAction(
        'DATASET_REGISTERED',
        req.user?.userId,
        req.user?.role || 'admin_maintainer',
        'dataset',
        metadata.dataset_id,
        { version: metadata.version, sample_count: metadata.sample_count },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: `Dataset '${metadata.dataset_id}' registered successfully.`,
        data: metadata
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  // Audit trail
  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string || '50', 10);
      const logs = await this.auditRepo.getRecentLogs(limit);
      res.json({
        success: true,
        count: logs.length,
        data: logs
      });
    } catch (err) {
      next(err);
    }
  };

  // Backups & recovery
  createBackup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const backup = await this.backupService.createBackup();

      await this.auditRepo.logAction(
        'BACKUP_CREATED',
        req.user?.userId,
        req.user?.role || 'admin_maintainer',
        'system',
        backup.backup_id,
        { sha256: backup.sha256, total_records: backup.total_records },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Backup snapshot created successfully.',
        data: backup
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };

  listBackups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const backups = await this.backupService.listBackups();
      res.json({
        success: true,
        count: backups.length,
        data: backups
      });
    } catch (err) {
      next(err);
    }
  };

  testRestoration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.backupService.testRestoration();
      res.json({
        success: true,
        message: 'Database backup and restoration pipeline verified successfully.',
        data: result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
}
