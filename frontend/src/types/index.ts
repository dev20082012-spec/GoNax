export type ConfidenceStatus = 'HIGH_CONFIDENCE' | 'CALIBRATED_RANGE' | 'EXTRAPOLATION_WARNING' | 'GEOGRAPHIC_MISMATCH' | 'HIGH_UNCERTAINTY';

export interface Species {
  id: string;
  scientific_name: string;
  common_name: string;
  family: string;
  wood_density_mean: number;
  wood_density_sd: number;
  applicable_variables: string[];
  geographic_applicability: string[];
  created_at?: string;
  updated_at?: string;
}

export interface SpeciesDataset {
  id: string;
  name: string;
  version: string;
  description: string;
  sample_size: number;
  geographic_coverage: string;
  reference_id: string;
  created_at?: string;
}

export interface SpeciesModel {
  id: string;
  species_id: string;
  dataset_id: string;
  name: string;
  model_type: string;
  version: string;
  formula_expression: string;
  parameters: any;
  carbon_fraction: number;
  uncertainty_percentage: number;
  is_prototype: boolean;
  created_at?: string;
}

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
  model_type: 'allometric_formula' | 'ml_gradient_boost' | 'ml_random_forest' | 'ml_polynomial';
  model_category: 'scientific_trained_model' | 'prototype_demonstration_model';
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
  status: 'active' | 'prototype' | 'candidate' | 'deprecated';
  primary_reference_doi?: string;
}

export interface DatasetMetadata {
  dataset_id: string;
  name: string;
  species_id: string;
  scientific_name: string;
  common_name: string;
  family: string;
  version: string;
  source: string;
  publication_reference: {
    doi: string;
    citation: string;
    institution: string;
  };
  geographic_scope: {
    description: string;
    regions: string[];
    latitude_bounds: [number, number];
    longitude_bounds: [number, number];
    climate_zones: string[];
  };
  sample_count: number;
  collection_methodology: string;
  measurement_definitions: Record<string, any>;
  allowed_input_variables: string[];
  target_variables: string[];
  preprocessing_information: Record<string, any>;
  release_date: string;
  status: string;
}

export interface ScientificReference {
  id: string;
  doi: string;
  citation_text: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  url: string;
  created_at?: string;
}

export interface CalculationStep {
  step: string;
  formula: string;
  substituted: string;
  result: number | string;
  unit: string;
  description: string;
}

export interface ExtrapolationWarning {
  variable: string;
  measured_value: number;
  calibrated_range: [number, number];
  severity: 'MILD' | 'SEVERE';
  message: string;
}

export interface UncertaintyAssessment {
  confidence_tier: ConfidenceStatus;
  model_uncertainty_rse: number;
  prediction_interval_95: [number, number];
  prediction_interval_90: [number, number];
  extrapolation_warnings: ExtrapolationWarning[];
  geographic_mismatch: {
    mismatch_detected: boolean;
    reason?: string;
  };
  missing_variable_warnings: string[];
  dataset_limitations: string;
}

export interface ProvenanceDetails {
  engineId?: string;
  engineType?: string;
  formulaExpression?: string;
  traceability_chain?: {
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
  calculation_steps?: CalculationStep[];
  steps?: CalculationStep[];
  uncertainty?: UncertaintyAssessment;
  applied_wood_density_g_cm3?: number;
  woodDensityUsed?: number;
  applied_carbon_fraction?: number;
  carbonFractionUsed?: number;
  stoichiometric_co2e_ratio?: number;
  co2eMultiplier?: number;
  scientific_references?: any[];
  warnings?: string[];
  calculatedAt?: string;
}

export interface EnrichedPrediction {
  prediction: {
    id: string;
    observation_id: string;
    species_model_id: string;
    estimated_biomass_kg: number;
    estimated_carbon_kg: number;
    estimated_co2e_kg: number;
    confidence_status: ConfidenceStatus;
    confidence_lower_bound_kg: number;
    confidence_upper_bound_kg: number;
    is_prototype: boolean;
    is_demo_run?: boolean;
    created_at: string;
  };
  observation: {
    id: string;
    dbh_cm: number;
    height_m: number;
    crown_diameter_m?: number | null;
    wood_density_override?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    observation_notes?: string | null;
    created_at?: string;
  };
  species: {
    id: string;
    scientific_name: string;
    common_name: string;
    family: string;
    wood_density_mean: number;
    wood_density_sd: number;
  };
  model: {
    id: string;
    name: string;
    model_type: string;
    version: string;
    formula_expression: string;
    parameters: any;
    carbon_fraction: number;
    uncertainty_percentage: number;
    is_prototype: boolean;
  };
  uncertainty?: any;
  explanations?: Array<{
    id: string;
    question: string;
    answer: string;
    provider: string;
    model_name: string;
    created_at?: string;
  }>;
  evidences: Array<{
    id: string;
    evidence_type: string;
    provenance_details: ProvenanceDetails;
    reference: ScientificReference | null;
  }>;
}

export interface ExplanationResult {
  answer: string;
  provider: 'gemini' | 'openai' | 'mock-scientific-synthesizer';
  rule_enforced: string;
  citations: string[];
  latency_ms: number;
}

export type AnswerType =
  | 'SUPPORTED_BY_GONAX_DATA'
  | 'SUPPORTED_BY_SCIENTIFIC_SOURCES'
  | 'INFERENCE_FROM_PROVIDED_EVIDENCE'
  | 'INSUFFICIENT_EVIDENCE';

export type QuestionType =
  | 'species_knowledge'
  | 'measurement_explanation'
  | 'model_explanation'
  | 'prediction_explanation'
  | 'uncertainty_explanation'
  | 'scientific_evidence'
  | 'dataset_inquiry'
  | 'applicability'
  | 'species_comparison'
  | 'general_scientific';

export interface ScientificCitation {
  sourceId: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  url: string;
  section: string;
  chunkId: string;
  relationshipToAnswer: string;
  qualityTier: 'authoritative_peer_reviewed' | 'institutional_standard' | 'verified_project_doc';
}

export interface GroundedScientificAnswer {
  question: string;
  questionType: QuestionType;
  answerType: AnswerType;
  answer: string;
  citations: ScientificCitation[];
  groundedClaims: string[];
  predictionContextUsed?: {
    speciesName: string;
    predictionId?: string;
    dbhCm?: number;
    heightM?: number;
    biomassKg?: number;
    carbonKg?: number;
    co2eKg?: number;
    confidenceTier?: string;
    modelName?: string;
    modelType?: string;
    formulaOrAlgorithm?: string;
    carbonFractionApplied?: number;
    stoichiometricFactor?: number;
    uncertaintyPercentage?: number;
  };
  retrievalMetadata: {
    totalChunksEvaluated: number;
    retrievedCount: number;
    topSimilarity: number;
    topCombinedScore: number;
    speciesFilterApplied?: string;
    topicFilterApplied?: string[];
  };
  provider: 'gemini' | 'scientific-grounded-engine';
}

export interface ScientificSourceSummary {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  url: string;
  publisher: string;
  source_type: string;
  quality_tier: string;
  species_tags: string[];
  topic_tags: string[];
  geographic_scope: string;
  version: string;
  is_active: boolean;
}

export interface ScientificSourceDetails {
  source: ScientificSourceSummary;
  document: {
    fileName: string;
    sha256: string;
    sectionCount: number;
    wordCount: number;
    version: string;
  } | null;
  chunksCount: number;
  chunks: Array<{
    id: string;
    sectionTitle: string;
    chunkIndex: number;
    tokenCount: number;
    chunkText: string;
    speciesTags: string[];
    topicTags: string[];
    evidenceType: string;
  }>;
  claims: Array<{
    id: string;
    claim_text: string;
    claim_type: string;
    evidence_level: string;
    uncertainty_note?: string;
  }>;
}

export interface BenchmarkSummaryReport {
  timestamp: string;
  totalQuestions: number;
  retrievalRecallAt3: number;
  retrievalPrecisionAt3: number;
  citationCorrectnessPct: number;
  groundednessPct: number;
  unsupportedDetectionRatePct: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  results: Array<{
    id: string;
    question: string;
    category: string;
    isUnsupported: boolean;
    retrievalSuccess: boolean;
    citationCorrect: boolean;
    groundednessPass: boolean;
    unsupportedHandledCorrectly: boolean;
    latencyMs: number;
    answerType: string;
    topSourceRetrieved?: string;
    citationsCount: number;
  }>;
}

