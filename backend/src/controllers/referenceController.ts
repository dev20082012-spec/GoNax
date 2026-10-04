import { Request, Response, NextFunction } from 'express';
import { ReferenceRepository } from '../repositories/referenceRepository';

export class ReferenceController {
  constructor(private refRepo: ReferenceRepository = new ReferenceRepository()) {}

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refs = await this.refRepo.findAll();
      res.json({ success: true, data: refs, count: refs.length });
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ref = await this.refRepo.findById(req.params.id);
      if (!ref) {
        res.status(404).json({ success: false, error: 'Reference not found' });
        return;
      }
      res.json({ success: true, data: ref });
    } catch (err) {
      next(err);
    }
  };
}
