export type ModelType = 'allometric_formula' | 'ml_gradient_boost' | 'ml_random_forest' | 'ml_polynomial';
export type ModelCategory = 'scientific_trained_model' | 'prototype_demonstration_model';
export type ModelStatus = 'active' | 'prototype' | 'candidate' | 'deprecated';
export type ConfidenceTier = 'HIGH_CONFIDENCE' | 'CALIBRATED_RANGE' | 'EXTRAPOLATION_WARNING' | 'GEOGRAPHIC_MISMATCH' | 'HIGH_UNCERTAINTY';

export interface FeatureDefinition {
  name: string;
  label: string;
  unit: string;
  required: boolean;
  min: number;
  max: number;
  description: string;
  defaultValue?: number;
}

export interface EvaluationMetricsSummary {
  r2: number;
  rmse_kg: number;
  mae_kg: number;
  rse_percentage: number;
  sample_count: number;
}

export interface GeographicScope {
  description: string;
  regions: string[];
  min_latitude: number;
  max_latitude: number;
  min_longitude?: number;
  max_longitude?: number;
  min_elevation_m?: number;
  max_elevation_m?: number;
}

export interface ModelMetadata {
  model_id: string;
  species_id: string;
  species_scientific_name: string;
  species_common_name: string;
  name: string;
  model_type: ModelType;
  model_category: ModelCategory;
  model_version: string;
  training_dataset_id: string;
  training_dataset_version: string;
  features: FeatureDefinition[];
  target: string;
  training_date: string;
  evaluation_metrics: EvaluationMetricsSummary;
  applicable_geographic_scope: GeographicScope;
  input_units: Record<string, string>;
  output_units: Record<string, string>;
  carbon_fraction: number;
  status: ModelStatus;
  primary_reference_doi?: string;
}

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  sanitizedInput: Record<string, any>;
}

export interface ExtrapolationWarning {
  variable: string;
  measured_value: number;
  calibrated_range: [number, number];
  severity: 'MILD' | 'SEVERE';
  message: string;
}

export interface UncertaintyAssessment {
  confidence_tier: ConfidenceTier;
  model_uncertainty_rse: number; // e.g. 10.4%
  prediction_interval_95: [number, number]; // [lower_kg, upper_kg]
  prediction_interval_90: [number, number];
  extrapolation_warnings: ExtrapolationWarning[];
  geographic_mismatch: {
    mismatch_detected: boolean;
    reason?: string;
  };
  missing_variable_warnings: string[];
  dataset_limitations: string;
}

export interface CalculationStep {
  step: string;
  formula: string;
  substituted: string;
  result: number | string;
  unit: string;
  description: string;
}

export interface ModelProvenance {
  traceability_chain: {
    species_id: string;
    species_scientific_name: string;
    dataset_id: string;
    dataset_version: string;
    model_id: string;
    model_version: string;
    model_type: string;
    preprocessing_version: string;
    executed_at: string;
  };
  input_features_applied: Record<string, any>;
  applied_wood_density_g_cm3: number;
  applied_carbon_fraction: number;
  stoichiometric_co2e_ratio: number;
  calculation_steps: CalculationStep[];
  scientific_references: Array<{
    doi: string;
    citation: string;
    title: string;
  }>;
}

export interface ModelPredictionResult {
  estimated_biomass_kg: number;
  estimated_carbon_kg: number;
  estimated_co2e_kg: number;
  uncertainty: UncertaintyAssessment;
  provenance: ModelProvenance;
  metadata: ModelMetadata;
}
