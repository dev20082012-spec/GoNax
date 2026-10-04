export interface LLMContext {
  prediction_id: string;
  species: {
    scientific_name: string;
    common_name: string;
    family: string;
    wood_density_mean: number;
    wood_density_sd: number;
  };
  observation: {
    dbh_cm: number;
    height_m: number;
    crown_diameter_m?: number | null;
    wood_density_override?: number | null;
    age_years?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string | null;
  };
  model: {
    model_id: string;
    name: string;
    model_type: string;
    version: string;
    formula_expression?: string;
    carbon_fraction: number;
    uncertainty_percentage: number;
    r2?: number;
    rmse_kg?: number;
  };
  results: {
    estimated_biomass_kg: number;
    estimated_carbon_kg: number;
    estimated_co2e_kg: number;
  };
  uncertainty: {
    confidence_tier: string;
    model_uncertainty_rse: number;
    prediction_interval_95: [number, number];
    extrapolation_warnings: string[];
    geographic_mismatch?: string;
    missing_variables: string[];
  };
  references: Array<{
    doi: string;
    citation: string;
    title: string;
  }>;
  provenance_steps: Array<{
    step: string;
    formula: string;
    substituted: string;
    result: any;
    unit: string;
  }>;
}

export interface LLMResponse {
  answer: string;
  provider: 'gemini' | 'openai' | 'mock-scientific-synthesizer';
  rule_enforced: string;
  citations: string[];
  latency_ms: number;
}

export interface LLMProvider {
  readonly providerId: 'gemini' | 'openai' | 'mock-scientific-synthesizer';
  generateExplanation(context: LLMContext, question: string): Promise<LLMResponse>;
}
