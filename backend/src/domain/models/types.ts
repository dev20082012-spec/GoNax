export type ModelType = 'allometric_formula' | 'ml_gradient_boost' | 'ml_random_forest' | 'ml_polynomial';
export type ModelCategory = 'scientific_trained_model' | 'prototype_demonstration_model';
export type ModelStatus = 'active' | 'prototype' | 'candidate' | 'deprecated';
export type GovernanceStatus = 'approved_scientific_model' | 'candidate' | 'prototype' | 'retired';
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
  train_samples?: number;
  val_samples?: number;
  test_samples?: number;
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

export interface GovernanceReviewRecord {
  reviewed_by: string;
  review_date: string;
  status: GovernanceStatus;
  review_notes: string;
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
  // Enhanced Scientific Governance Fields
  purpose?: string;
  prediction_target_definition?: string;
  preprocessing_version?: string;
  artifact_checksum_sha256?: string;
  reproducible_configuration?: Record<string, any>;
  train_val_test_methodology?: string;
  baseline_comparison?: Record<string, any>;
  uncertainty_method?: string;
  known_limitations?: string[];
  governance_status?: GovernanceStatus;
  governance_review?: GovernanceReviewRecord;
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
  // Specific decoupled scientific uncertainty fields
  statistical_prediction_uncertainty?: {
    method: string;
    rse_percentage: number;
    interval_95: [number, number];
    interval_90: [number, number];
    log_normal_error_factor: number;
  };
  data_quality_limitations?: string;
  model_limitations?: string;
}

export interface CalculationStep {
  step: string;
  formula: string;
  substituted: string;
  result: number | string;
  unit: string;
  description: string;
}

export interface TargetQuantityDetail {
  value: number | null;
  unit: string;
  supported: boolean;
  quantity_type: 'DRY_ABOVE_GROUND_BIOMASS' | 'DRY_BELOW_GROUND_BIOMASS' | 'FRESH_BIOMASS' | 'TOTAL_DRY_BIOMASS' | 'CARBON_STOCK' | 'CO2_EQUIVALENT';
  description: string;
  basis: string;
}

export interface TargetQuantitiesReport {
  dry_above_ground_biomass_kg: TargetQuantityDetail;
  dry_below_ground_biomass_kg: TargetQuantityDetail;
  fresh_biomass_kg: TargetQuantityDetail;
  total_dry_biomass_kg: TargetQuantityDetail;
  biomass_carbon_stock_kg: TargetQuantityDetail;
  co2_equivalent_kg: TargetQuantityDetail;
  regulatory_carbon_accounting_disclaimer: string;
}

export interface ApplicabilityGateCheck {
  gate_id: string;
  name: string;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  message: string;
  details?: Record<string, any>;
}

export interface ApplicabilityGateReport {
  passed_all_gates: boolean;
  critical_refusal: boolean;
  gates_evaluated: ApplicabilityGateCheck[];
  out_of_distribution: boolean;
  extrapolation_detected: boolean;
  fallback_applied: boolean;
  fallback_description?: string;
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
  provenance_hash_sha256?: string;
  applicability_gates?: ApplicabilityGateReport;
  target_quantities?: TargetQuantitiesReport;
  regulatory_disclaimer?: string;
}

export interface ModelPredictionResult {
  estimated_biomass_kg: number;
  estimated_carbon_kg: number;
  estimated_co2e_kg: number;
  uncertainty: UncertaintyAssessment;
  provenance: ModelProvenance;
  metadata: ModelMetadata;
  target_quantities?: TargetQuantitiesReport;
  applicability_report?: ApplicabilityGateReport;
}
