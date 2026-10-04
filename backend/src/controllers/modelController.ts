import { Request, Response, NextFunction } from 'express';
import { ModelRegistry } from '../domain/models/modelRegistry';
import { SpeciesRepository } from '../repositories/speciesRepository';

export class ModelController {
  private registry: ModelRegistry;
  private speciesRepo: SpeciesRepository;

  constructor() {
    this.registry = ModelRegistry.getInstance();
    this.speciesRepo = new SpeciesRepository();
  }

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const models = this.registry.getAllModelsMetadata();
      res.json({
        success: true,
        count: models.length,
        data: models
      });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const model = this.registry.getModel(req.params.id);
      if (!model) {
        res.status(404).json({ success: false, error: `Model '${req.params.id}' not found.` });
        return;
      }
      res.json({
        success: true,
        data: model.getMetadata()
      });
    } catch (err) {
      next(err);
    }
  };

  getModelForSpecies = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let speciesId = req.params.id.toLowerCase().replace(/\s+/g, '_');
      let models = this.registry.getModelsForSpecies(speciesId);

      // If not found, try looking up species by UUID
      if (models.length === 0) {
        try {
          const sp = await this.speciesRepo.findById(req.params.id);
          if (sp) {
            speciesId = sp.slug || sp.scientific_name.toLowerCase().replace(/\s+/g, '_');
            models = this.registry.getModelsForSpecies(speciesId);
          }
        } catch {
          // ignore repo lookup error and continue to fallback
        }
      }

      if (models.length === 0) {
        // Fallback search by scientific name substring
        const all = this.registry.getAllModelsMetadata();
        const match = all.find(m => m.species_scientific_name.toLowerCase().includes(req.params.id.toLowerCase()));
        if (match) {
          res.json({ success: true, data: match });
          return;
        }
        res.status(404).json({ success: false, error: `No active model found for species '${req.params.id}'.` });
        return;
      }
      res.json({
        success: true,
        data: models[0].getMetadata()
      });
    } catch (err) {
      next(err);
    }
  };
}
