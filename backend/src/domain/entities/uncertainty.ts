export interface PredictionUncertaintyEntity {
  id: string;
  prediction_id: string;
  confidence_tier: string;
  model_uncertainty_rse: number;
  prediction_interval_95_lower: number;
  prediction_interval_95_upper: number;
  prediction_interval_90_lower: number;
  prediction_interval_90_upper: number;
  extrapolation_warnings: string; // JSON-encoded array
  geographic_mismatch: string; // JSON-encoded object
  missing_variable_warnings: string; // JSON-encoded array
  dataset_limitations: string;
  created_at?: string;
}
