import { Request, Response, NextFunction } from 'express';
import { ObservationService } from '../services/observationService';

export class ObservationController {
  constructor(private obsService: ObservationService = new ObservationService()) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.obsService.validateAndCreate(req.body);
      res.status(201).json({
        success: true,
        data: result.observation
      });
    } catch (err: any) {
      const status = err.statusCode || 400;
      res.status(status).json({
        success: false,
        error: err.message,
        details: err.details
      });
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const obs = await this.obsService.getObservationById(req.params.id);
      if (!obs) {
        res.status(404).json({ success: false, error: 'Observation not found' });
        return;
      }
      res.json({ success: true, data: obs });
    } catch (err) {
      next(err);
    }
  };
}
