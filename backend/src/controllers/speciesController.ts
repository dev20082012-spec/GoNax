import { Request, Response, NextFunction } from 'express';
import { SpeciesService } from '../services/speciesService';

export class SpeciesController {
  constructor(private speciesService: SpeciesService = new SpeciesService()) {}

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const list = await this.speciesService.getAllSpecies();
      res.json({
        success: true,
        data: list,
        count: list.length
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const details = await this.speciesService.getSpeciesById(req.params.id);
      if (!details) {
        res.status(404).json({ success: false, error: 'Species not found' });
        return;
      }
      res.json({
        success: true,
        data: details
      });
    } catch (err) {
      next(err);
    }
  };

  getDatasets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const datasets = await this.speciesService.getDatasets(req.params.id);
      res.json({ success: true, data: datasets });
    } catch (err) {
      next(err);
    }
  };

  getModels = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const models = await this.speciesService.getModels(req.params.id);
      res.json({ success: true, data: models });
    } catch (err) {
      next(err);
    }
  };
}
