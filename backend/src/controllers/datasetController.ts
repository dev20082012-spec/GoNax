import { Request, Response, NextFunction } from 'express';
import { DatasetService } from '../services/datasetService';

export class DatasetController {
  private service: DatasetService;

  constructor() {
    this.service = new DatasetService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const datasets = this.service.getAllDatasets();
      res.json({
        success: true,
        count: datasets.length,
        data: datasets
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataset = this.service.getDatasetById(req.params.id);
      if (!dataset) {
        res.status(404).json({ success: false, error: `Dataset '${req.params.id}' not found.` });
        return;
      }
      res.json({
        success: true,
        data: dataset
      });
    } catch (err) {
      next(err);
    }
  };
}
