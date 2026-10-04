import { Request, Response, NextFunction } from 'express';
import { PredictionService } from '../services/predictionService';

export class PredictionController {
  constructor(private predService: PredictionService = new PredictionService()) {}

  predict = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.predService.runPrediction(req.body);
      res.status(201).json({
        success: true,
        data: result
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
      const result = await this.predService.getPredictionById(req.params.id);
      if (!result) {
        res.status(404).json({ success: false, error: 'Prediction not found' });
        return;
      }
      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  };

  getProvenance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.predService.getPredictionById(req.params.id);
      if (!result) {
        res.status(404).json({ success: false, error: 'Prediction not found' });
        return;
      }
      const primaryEvidence = result.evidences[0]?.provenance_details;
      res.json({
        success: true,
        data: {
          prediction_id: result.prediction.id,
          traceability: primaryEvidence?.traceability_chain || null,
          calculation_steps: primaryEvidence?.calculation_steps || primaryEvidence?.steps || [],
          uncertainty: primaryEvidence?.uncertainty || null,
          scientific_references: primaryEvidence?.scientific_references || result.evidences.map(e => e.reference)
        }
      });
    } catch (err) {
      next(err);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string || '50', 10);
      const offset = parseInt(req.query.offset as string || '0', 10);
      const history = await this.predService.getHistory(limit, offset);
      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (err) {
      next(err);
    }
  };
}
