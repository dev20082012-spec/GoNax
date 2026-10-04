import { PredictionEngineInput, PredictionEngineOutput } from './types';

export interface PredictionEngine {
  readonly engineId: string;
  readonly engineName: string;
  readonly engineType: 'formula' | 'ml_model';
  
  predict(input: PredictionEngineInput): Promise<PredictionEngineOutput>;
}
