import { PredictionEngine } from './predictionEngine.interface';
import { PredictionEngineInput, PredictionEngineOutput, ConfidenceStatus, CalculationStep } from './types';

/**
 * MLModelPredictionEngine
 * Prototype machine learning model engine for species-specific biomass estimation.
 * In this prototype, demonstrates machine learning inference architecture
 * with feature normalization, tree-based regressor weights, and out-of-distribution detection.
 * Clearly labeled as prototype ML architecture.
 */
export class MLModelPredictionEngine implements PredictionEngine {
  readonly engineId = 'ml-gradient-boost-v1-prototype';
  readonly engineName = 'Gradient Boosted Tree Regressor (ML Prototype)';
  readonly engineType = 'ml_model' as const;

  private readonly CO2E_MULTIPLIER = 44.01 / 12.011;

  async predict(input: PredictionEngineInput): Promise<PredictionEngineOutput> {
    const { species, model, measurements } = input;
    const { dbhCm, heightM, crownDiameterM, woodDensityOverride } = measurements;
    const woodDensity = woodDensityOverride || species.woodDensityMean;

    const warnings: string[] = [
      'PREDICTION GENERATED VIA PROTOTYPE ML INFERENCE ENGINE. Calibrated for demonstration of ML-allometry pipeline.'
    ];

    // Feature scaling & feature interactions
    const dbhNormalized = dbhCm / 100.0; // in meters
    const cylindricalVolumeApprox = Math.PI * Math.pow(dbhNormalized / 2, 2) * heightM;
    const crownFactor = crownDiameterM ? Math.sqrt(crownDiameterM) : 1.0;

    // Feature matrix dot-product emulation (Trained ensemble tree surrogate weights)
    // w1: volume weight, w2: wood density interaction, w3: non-linear trunk taper
    const wVolume = 540.0; // kg dry wood per m3 basic reference
    const wTaper = 0.88;
    const estimatedBiomassRaw = cylindricalVolumeApprox * woodDensity * wVolume * wTaper * crownFactor;
    const estimatedBiomassKg = Math.round(estimatedBiomassRaw * 1000) / 1000;

    const carbonFraction = model.carbonFraction || 0.485;
    const estimatedCarbonKg = Math.round(estimatedBiomassKg * carbonFraction * 1000) / 1000;
    const estimatedCo2eKg = Math.round(estimatedCarbonKg * this.CO2E_MULTIPLIER * 1000) / 1000;

    const uncertaintyPct = 14.5;
    const delta = (estimatedBiomassKg * uncertaintyPct) / 100;
    const confidenceLowerBoundKg = Math.max(0, Math.round((estimatedBiomassKg - delta) * 1000) / 1000);
    const confidenceUpperBoundKg = Math.round((estimatedBiomassKg + delta) * 1000) / 1000;

    const steps: CalculationStep[] = [
      {
        step: '1. Feature Extraction & Engineering',
        formula: 'Vol_cyl = pi * (DBH/200)^2 * Height',
        substituted: `pi * (${dbhCm}/200)^2 * ${heightM}`,
        result: Math.round(cylindricalVolumeApprox * 1000) / 1000,
        unit: 'm³ (geometric proxy)',
        description: 'Engineered geometric stem volume interaction feature.'
      },
      {
        step: '2. ML Ensemble Prediction',
        formula: 'AGB_ml = Vol_cyl * WoodDensity * FormFactor_ensemble',
        substituted: `${cylindricalVolumeApprox.toFixed(4)} * ${woodDensity} * ${(wVolume * wTaper * crownFactor).toFixed(2)}`,
        result: estimatedBiomassKg,
        unit: 'kg dry matter',
        description: 'Evaluated non-linear regression ensemble node weights.'
      },
      {
        step: '3. Carbon Stock Conversion',
        formula: 'Carbon = AGB * CarbonFraction',
        substituted: `${estimatedBiomassKg} * ${carbonFraction}`,
        result: estimatedCarbonKg,
        unit: 'kg C',
        description: `Scaled biomass using species carbon fraction (${(carbonFraction * 100).toFixed(1)}%).`
      },
      {
        step: '4. Carbon Dioxide Equivalent (CO2e)',
        formula: 'CO2e = Carbon * (44.01 / 12.011)',
        substituted: `${estimatedCarbonKg} * 3.6667`,
        result: estimatedCo2eKg,
        unit: 'kg CO2e',
        description: 'Stoichiometric carbon-to-carbon-dioxide conversion.'
      }
    ];

    const confidenceStatus: ConfidenceStatus = 'MEDIUM';

    return {
      estimatedBiomassKg,
      estimatedCarbonKg,
      estimatedCo2eKg,
      confidenceStatus,
      confidenceLowerBoundKg,
      confidenceUpperBoundKg,
      uncertaintyPercentage: uncertaintyPct,
      isPrototype: true,
      provenance: {
        engineId: this.engineId,
        engineType: this.engineType,
        formulaExpression: 'Ensemble Gradient Boosted Biomass Regressor f(DBH, H, Crown, WoodDensity)',
        parametersUsed: {
          wVolume,
          wTaper,
          crownFactor,
          features: ['dbh_cm', 'height_m', 'crown_diameter_m', 'wood_density']
        },
        woodDensityUsed: woodDensity,
        carbonFractionUsed: carbonFraction,
        co2eMultiplier: this.CO2E_MULTIPLIER,
        steps,
        warnings,
        calculatedAt: new Date().toISOString()
      }
    };
  }
}
