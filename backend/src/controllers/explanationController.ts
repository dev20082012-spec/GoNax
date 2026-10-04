import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PredictionService } from '../services/predictionService';
import { PredictionRepository } from '../repositories/predictionRepository';
import { LLMService } from '../services/llm/llmService';

export class ExplanationController {
  constructor(
    private predService: PredictionService = new PredictionService(),
    private predRepo: PredictionRepository = new PredictionRepository(),
    private llmService: LLMService = new LLMService()
  ) {}

  explain = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { question } = req.body;

      if (!question || typeof question !== 'string' || question.trim() === '') {
        res.status(400).json({ success: false, error: 'A valid question string is required.' });
        return;
      }

      const prediction = await this.predService.getPredictionById(id);
      if (!prediction) {
        res.status(404).json({ success: false, error: 'Prediction not found.' });
        return;
      }

      const sanitizedQuestion = question.replace(/[<>]/g, '').trim().slice(0, 500);
      const explanation = await this.llmService.explain(prediction, sanitizedQuestion);

      // Persist the explanation exchange for auditability and history
      try {
        await this.predRepo.createExplanation({
          id: uuidv4(),
          prediction_id: id,
          question: sanitizedQuestion,
          answer: explanation.answer,
          provider: explanation.provider,
          model_name: (explanation as any).model || explanation.provider,
          created_at: new Date().toISOString()
        });
      } catch (saveErr) {
        console.warn('[ExplanationController] Could not persist explanation record:', saveErr);
      }

      res.json({
        success: true,
        data: explanation
      });
    } catch (err: any) {
      next(err);
    }
  };

  getExplanation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const defaultQuestion = (req.query.question as string) || 'Provide a concise scientific summary of this tree carbon calculation.';

      const prediction = await this.predService.getPredictionById(id);
      if (!prediction) {
        res.status(404).json({ success: false, error: 'Prediction not found.' });
        return;
      }

      const explanation = await this.llmService.explain(prediction, defaultQuestion);
      res.json({
        success: true,
        data: explanation
      });
    } catch (err: any) {
      next(err);
    }
  };

  getExplanationsHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const prediction = await this.predService.getPredictionById(id);
      if (!prediction) {
        res.status(404).json({ success: false, error: 'Prediction not found.' });
        return;
      }

      const history = await this.predRepo.getExplanationsByPredictionId(id);
      res.json({
        success: true,
        data: history
      });
    } catch (err: any) {
      next(err);
    }
  };
}
