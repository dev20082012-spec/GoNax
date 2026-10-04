import { PredictionEngine } from './predictionEngine.interface';
import { PredictionEngineInput, PredictionEngineOutput, ConfidenceStatus, CalculationStep } from './types';

export class FormulaPredictionEngine implements PredictionEngine {
  readonly engineId = 'formula-allometric-v1';
  readonly engineName = 'Deterministic Allometric Formula Engine';
  readonly engineType = 'formula' as const;

  // Molecular weight ratio CO2 (44.01 g/mol) / C (12.011 g/mol)
  private readonly CO2E_MULTIPLIER = 44.01 / 12.011;

  async predict(input: PredictionEngineInput): Promise<PredictionEngineOutput> {
    const { species, model, measurements } = input;
    const { dbhCm, heightM, woodDensityOverride } = measurements;
    const { a, b, c = 1.0, dbhMinCm, dbhMaxCm, heightMinM, heightMaxM } = model.parameters;

    const warnings: string[] = [];
    let confidenceStatus: ConfidenceStatus = 'CALIBRATED_RANGE';

    // 1. Biological and Calibration Range Checks
    if (dbhCm < dbhMinCm || dbhCm > dbhMaxCm) {
      confidenceStatus = 'EXTRAPOLATION_WARNING';
      warnings.push(
        `DBH (${dbhCm} cm) falls outside empirical calibration bounds [${dbhMinCm}, ${dbhMaxCm}] cm for model "${model.name}". Results represent mathematical extrapolation.`
      );
    }

    if (heightM < heightMinM || heightM > heightMaxM) {
      confidenceStatus = 'EXTRAPOLATION_WARNING';
      warnings.push(
        `Height (${heightM} m) falls outside empirical calibration bounds [${heightMinM}, ${heightMaxM}] m for model "${model.name}".`
      );
    }

    if (warnings.length === 0) {
      confidenceStatus = model.uncertaintyPercentage <= 10.0 ? 'HIGH' : 'MEDIUM';
    }

    // Wood density determination
    const woodDensityUsed = woodDensityOverride !== undefined && woodDensityOverride > 0
      ? woodDensityOverride
      : species.woodDensityMean;

    // 2. Compute Above-Ground Biomass (AGB in kg)
    // Formula standard: AGB = a * (DBH ^ b) * (H ^ c)
    const dbhTerm = Math.pow(dbhCm, b);
    const heightTerm = Math.pow(heightM, c);
    const rawBiomassKg = a * dbhTerm * heightTerm;
    const estimatedBiomassKg = Math.round(rawBiomassKg * 1000) / 1000;

    // 3. Compute Carbon Stock (kg C)
    const carbonFraction = model.carbonFraction || 0.485;
    const rawCarbonKg = rawBiomassKg * carbonFraction;
    const estimatedCarbonKg = Math.round(rawCarbonKg * 1000) / 1000;

    // 4. Compute CO2 Equivalent (kg CO2e)
    const rawCo2eKg = rawCarbonKg * this.CO2E_MULTIPLIER;
    const estimatedCo2eKg = Math.round(rawCo2eKg * 1000) / 1000;

    // 5. Uncertainty & Bounds
    const uncertaintyPct = model.uncertaintyPercentage || 12.0;
    const delta = (rawBiomassKg * uncertaintyPct) / 100;
    const confidenceLowerBoundKg = Math.max(0, Math.round((rawBiomassKg - delta) * 1000) / 1000);
    const confidenceUpperBoundKg = Math.round((rawBiomassKg + delta) * 1000) / 1000;

    // 6. Detailed Mathematical Provenance Steps
    const steps: CalculationStep[] = [
      {
        step: '1. Model Identification',
        formula: model.formulaExpression,
        substituted: `a = ${a}, b = ${b}, c = ${c}`,
        result: `${model.name} (${model.version})`,
        unit: 'metadata',
        description: 'Selected species-calibrated allometric formula from peer-reviewed forestry literature.'
      },
      {
        step: '2. Above-Ground Dry Biomass (AGB)',
        formula: 'AGB = a * (DBH ^ b) * (Height ^ c)',
        substituted: `${a} * (${dbhCm} ^ ${b}) * (${heightM} ^ ${c})`,
        result: estimatedBiomassKg,
        unit: 'kg dry matter',
        description: 'Evaluated non-linear power-law allometric equation.'
      },
      {
        step: '3. Wood Density Context',
        formula: 'rho_mean +/- rho_sd',
        substituted: `${species.woodDensityMean} +/- ${species.woodDensitySd}`,
        result: woodDensityUsed,
        unit: 'g/cm³',
        description: woodDensityOverride
          ? 'User specified field-measured wood density override applied.'
          : 'Species-specific reference dry wood density applied.'
      },
      {
        step: '4. Carbon Stock Allocation',
        formula: 'Carbon = AGB * CarbonFraction',
        substituted: `${estimatedBiomassKg} * ${carbonFraction}`,
        result: estimatedCarbonKg,
        unit: 'kg C',
        description: `Scaled biomass using species carbon fraction (${(carbonFraction * 100).toFixed(1)}%).`
      },
      {
        step: '5. Carbon Dioxide Equivalent (CO2e)',
        formula: 'CO2e = Carbon * (44.01 / 12.011)',
        substituted: `${estimatedCarbonKg} * 3.6667`,
        result: estimatedCo2eKg,
        unit: 'kg CO2e',
        description: 'Multiplied atomic carbon mass by molecular weight ratio of CO2 to C.'
      },
      {
        step: '6. Uncertainty Interval',
        formula: `AGB +/- ${uncertaintyPct}% (RSE 95% CI)`,
        substituted: `${estimatedBiomassKg} +/- ${delta.toFixed(2)}`,
        result: `[${confidenceLowerBoundKg} - ${confidenceUpperBoundKg}]`,
        unit: 'kg dry matter',
        description: `Estimated empirical confidence interval based on ${uncertaintyPct}% residual error.`
      }
    ];

    return {
      estimatedBiomassKg,
      estimatedCarbonKg,
      estimatedCo2eKg,
      confidenceStatus,
      confidenceLowerBoundKg,
      confidenceUpperBoundKg,
      uncertaintyPercentage: uncertaintyPct,
      isPrototype: model.isPrototype,
      provenance: {
        engineId: this.engineId,
        engineType: this.engineType,
        formulaExpression: model.formulaExpression,
        parametersUsed: { a, b, c, dbhMinCm, dbhMaxCm, heightMinM, heightMaxM },
        woodDensityUsed,
        carbonFractionUsed: carbonFraction,
        co2eMultiplier: this.CO2E_MULTIPLIER,
        steps,
        warnings,
        calculatedAt: new Date().toISOString()
      }
    };
  }
}
