export interface PredictionExplanationEntity {
  id: string;
  prediction_id: string;
  question: string;
  answer: string;
  provider: string;
  model_name: string;
  created_at?: string;
}
