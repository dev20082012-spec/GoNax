import {
  ModelMetadata,
  ValidationResult,
  ModelPredictionResult,
  UncertaintyAssessment,
  ModelProvenance
} from './types';

export interface ScientificModel {
  getMetadata(): ModelMetadata;
  validateInput(input: Record<string, any>): ValidationResult;
  predict(input: Record<string, any>): Promise<ModelPredictionResult>;
  getUncertainty(input: Record<string, any>, predictionKg: number): UncertaintyAssessment;
  getProvenance(
    input: Record<string, any>,
    predictionKg: number,
    uncertainty: UncertaintyAssessment
  ): ModelProvenance;
}
