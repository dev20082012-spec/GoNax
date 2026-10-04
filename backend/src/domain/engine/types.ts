export type ConfidenceStatus = 'HIGH' | 'MEDIUM' | 'CALIBRATED_RANGE' | 'EXTRAPOLATION_WARNING';

export interface TreeMeasurementInput {
  speciesId: string;
  dbhCm: number;
  heightM: number;
  crownDiameterM?: number;
  woodDensityOverride?: number;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ModelParameters {
  a: number;
  b: number;
  c?: number;
  dbhMinCm: number;
  dbhMaxCm: number;
  heightMinM: number;
  heightMaxM: number;
  [key: string]: any;
}

export interface PredictionEngineInput {
  species: {
    id: string;
    scientificName: string;
    commonName: string;
    woodDensityMean: number;
    woodDensitySd: number;
  };
  model: {
    id: string;
    name: string;
    version: string;
    formulaExpression: string;
    parameters: ModelParameters;
    carbonFraction: number;
    uncertaintyPercentage: number;
    isPrototype: boolean;
  };
  measurements: {
    dbhCm: number;
    heightM: number;
    crownDiameterM?: number;
    woodDensityOverride?: number;
  };
}

export interface CalculationStep {
  step: string;
  formula: string;
  substituted: string;
  result: number | string;
  unit: string;
  description: string;
}

export interface PredictionEngineOutput {
  estimatedBiomassKg: number;
  estimatedCarbonKg: number;
  estimatedCo2eKg: number;
  confidenceStatus: ConfidenceStatus;
  confidenceLowerBoundKg: number;
  confidenceUpperBoundKg: number;
  uncertaintyPercentage: number;
  isPrototype: boolean;
  provenance: {
    engineId: string;
    engineType: 'formula' | 'ml_model';
    formulaExpression: string;
    parametersUsed: Record<string, any>;
    woodDensityUsed: number;
    carbonFractionUsed: number;
    co2eMultiplier: number;
    steps: CalculationStep[];
    warnings: string[];
    calculatedAt: string;
  };
}
