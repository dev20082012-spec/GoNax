import { ScientificModel } from '../scientificModel.interface';
import {
  ModelMetadata,
  ValidationResult,
  ValidationIssue,
  ModelPredictionResult,
  UncertaintyAssessment,
  ExtrapolationWarning,
  ModelProvenance,
  CalculationStep,
  ConfidenceTier
} from '../types';

export interface FormulaModelConfig {
  metadata: ModelMetadata;
  parameters: {
    a: number;
    b: number;
    c: number;
    correction_factor?: number;
    see_log?: number;
  };
  references: Array<{
    doi: string;
    citation: string;
    title: string;
  }>;
}

export class PrototypeFormulaModel implements ScientificModel {
  private readonly CO2E_MULTIPLIER = 44.01 / 12.011;

  constructor(private config: FormulaModelConfig) {}

  getMetadata(): ModelMetadata {
    return this.config.metadata;
  }

  validateInput(input: Record<string, any>): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const sanitizedInput: Record<string, any> = {};

    const meta = this.getMetadata();

    // 1. Check required features
    for (const feat of meta.features) {
      const val = input[feat.name];

      if (feat.required && (val === undefined || val === null || val === '')) {
        errors.push({
          field: feat.name,
          severity: 'error',
          message: `Missing required scientific feature '${feat.label}' (${feat.name}) in unit '${feat.unit}'.`
        });
        continue;
      }

      if (val !== undefined && val !== null && val !== '') {
        const numVal = Number(val);
        if (isNaN(numVal)) {
          errors.push({
            field: feat.name,
            severity: 'error',
            message: `Feature '${feat.name}' must be a numerical value. Received: ${val}`,
            value: val
          });
          continue;
        }

        // Physical impossibility check
        if (feat.name === 'dbh_cm') {
          if (numVal <= 0 || numVal > 500) {
            errors.push({
              field: feat.name,
              severity: 'error',
              message: `Physically impossible DBH value (${numVal} cm). Must be within (0, 500] cm.`,
              value: numVal
            });
            continue;
          }
        }

        if (feat.name === 'height_m') {
          if (numVal <= 0 || numVal > 140) {
            errors.push({
              field: feat.name,
              severity: 'error',
              message: `Physically impossible tree height (${numVal} m). Must be within (0, 140] m.`,
              value: numVal
            });
            continue;
          }
        }

        if (feat.name === 'wood_density_override') {
          if (numVal < 0.1 || numVal > 1.5) {
            errors.push({
              field: feat.name,
              severity: 'error',
              message: `Unphysical xylem basic wood density (${numVal} g/cm³). Must be within (0.1, 1.5] g/cm³.`,
              value: numVal
            });
            continue;
          }
        }

        sanitizedInput[feat.name] = numVal;
      } else if (feat.defaultValue !== undefined) {
        sanitizedInput[feat.name] = feat.defaultValue;
      }
    }

    // Preserve optional metadata (coordinates, notes)
    if (input.latitude !== undefined && input.latitude !== null && !isNaN(Number(input.latitude))) {
      const lat = Number(input.latitude);
      if (lat < -90 || lat > 90) {
        errors.push({ field: 'latitude', severity: 'error', message: 'Latitude must be between -90 and 90.' });
      } else {
        sanitizedInput.latitude = lat;
      }
    }

    if (input.longitude !== undefined && input.longitude !== null && !isNaN(Number(input.longitude))) {
      const lon = Number(input.longitude);
      if (lon < -180 || lon > 180) {
        errors.push({ field: 'longitude', severity: 'error', message: 'Longitude must be between -180 and 180.' });
      } else {
        sanitizedInput.longitude = lon;
      }
    }

    if (input.notes) {
      sanitizedInput.notes = String(input.notes).replace(/[<>]/g, '').slice(0, 1000);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedInput
    };
  }

  getUncertainty(input: Record<string, any>, predictionKg: number): UncertaintyAssessment {
    const meta = this.getMetadata();
    const extrapolationWarnings: ExtrapolationWarning[] = [];
    const missingVariableWarnings: string[] = [];

    // Check calibration ranges
    for (const feat of meta.features) {
      const val = input[feat.name];
      if (val !== undefined && val !== null) {
        if (val < feat.min || val > feat.max) {
          const distanceRatio = val < feat.min ? (feat.min - val) / feat.min : (val - feat.max) / feat.max;
          const severity: 'MILD' | 'SEVERE' = distanceRatio > 0.35 ? 'SEVERE' : 'MILD';

          extrapolationWarnings.push({
            variable: feat.name,
            measured_value: val,
            calibrated_range: [feat.min, feat.max],
            severity,
            message: `Feature '${feat.label}' (${val} ${feat.unit}) falls outside calibration interval [${feat.min}, ${feat.max}] ${feat.unit} (Severity: ${severity}). Prediction represents mathematical extrapolation.`
          });
        }
      } else if (!feat.required) {
        missingVariableWarnings.push(
          `Optional variable '${feat.label}' (${feat.name}) not supplied; defaulted to species mean.`
        );
      }
    }

    // Geographic domain check
    let geoMismatch = false;
    let geoReason: string | undefined;
    if (input.latitude !== undefined && meta.applicable_geographic_scope.min_latitude !== undefined) {
      const lat = input.latitude;
      const { min_latitude, max_latitude, description } = meta.applicable_geographic_scope;
      if (lat < min_latitude || lat > max_latitude) {
        geoMismatch = true;
        geoReason = `Observation latitude (${lat}°) is outside calibrated eco-region '${description}' [${min_latitude}°, ${max_latitude}°]. Potential climate-allometric divergence.`;
      }
    }

    // Determine overall confidence tier
    let confidenceTier: ConfidenceTier = 'HIGH_CONFIDENCE';
    if (geoMismatch) {
      confidenceTier = 'GEOGRAPHIC_MISMATCH';
    } else if (extrapolationWarnings.some(w => w.severity === 'SEVERE')) {
      confidenceTier = 'EXTRAPOLATION_WARNING';
    } else if (extrapolationWarnings.length > 0) {
      confidenceTier = 'EXTRAPOLATION_WARNING';
    } else if (meta.evaluation_metrics.rse_percentage > 15.0) {
      confidenceTier = 'CALIBRATED_RANGE';
    }

    const rse = meta.evaluation_metrics.rse_percentage || 10.4;
    // 95% CI is approximately +/- 1.96 * RSE
    const delta95 = (predictionKg * (rse * 1.96)) / 100;
    const lower95 = Math.max(0, Math.round((predictionKg - delta95) * 100) / 100);
    const upper95 = Math.round((predictionKg + delta95) * 100) / 100;

    // 90% CI is approximately +/- 1.645 * RSE
    const delta90 = (predictionKg * (rse * 1.645)) / 100;
    const lower90 = Math.max(0, Math.round((predictionKg - delta90) * 100) / 100);
    const upper90 = Math.round((predictionKg + delta90) * 100) / 100;

    return {
      confidence_tier: confidenceTier,
      model_uncertainty_rse: rse,
      prediction_interval_95: [lower95, upper95],
      prediction_interval_90: [lower90, upper90],
      extrapolation_warnings: extrapolationWarnings,
      geographic_mismatch: {
        mismatch_detected: geoMismatch,
        reason: geoReason
      },
      missing_variable_warnings: missingVariableWarnings,
      dataset_limitations: `Calibrated on dataset ${meta.training_dataset_id} (N=${meta.evaluation_metrics.sample_count}). Accuracy decreases near boundary envelope.`
    };
  }

  getProvenance(
    input: Record<string, any>,
    predictionKg: number,
    uncertainty: UncertaintyAssessment
  ): ModelProvenance {
    const meta = this.getMetadata();
    const { a, b, c } = this.config.parameters;
    const dbh = input.dbh_cm;
    const h = input.height_m;
    const woodDensity = input.wood_density_override || 0.65;
    const cf = meta.carbon_fraction;

    const carbonKg = Math.round(predictionKg * cf * 1000) / 1000;
    const co2eKg = Math.round(carbonKg * this.CO2E_MULTIPLIER * 1000) / 1000;

    const steps: CalculationStep[] = [
      {
        step: '1. Model Routing & Feature Resolution',
        formula: 'Model Registry Lookup',
        substituted: `Species: ${meta.species_scientific_name} -> Model: ${meta.model_id} (v${meta.model_version})`,
        result: meta.model_id,
        unit: 'metadata',
        description: 'Successfully resolved species-specific allometric model.'
      },
      {
        step: '2. Above-Ground Dry Biomass (AGB)',
        formula: 'AGB = a * (DBH ^ b) * (Height ^ c)',
        substituted: `${a} * (${dbh} ^ ${b}) * (${h} ^ ${c})`,
        result: predictionKg,
        unit: 'kg dry matter',
        description: 'Evaluated deterministic allometric power-law scaling.'
      },
      {
        step: '3. Elemental Carbon Conversion',
        formula: 'Carbon = AGB * CarbonFraction',
        substituted: `${predictionKg} * ${cf}`,
        result: carbonKg,
        unit: 'kg C',
        description: `Applied species-specific carbon fraction (${(cf * 100).toFixed(1)}%).`
      },
      {
        step: '4. Atmospheric CO2 Equivalent',
        formula: 'CO2e = Carbon * (44.01 / 12.011)',
        substituted: `${carbonKg} * 3.6667`,
        result: co2eKg,
        unit: 'kg CO2e',
        description: 'Multiplied carbon mass by molar weight ratio of CO2 to C.'
      },
      {
        step: '5. Statistical Prediction Interval',
        formula: 'CI_95% = AGB +/- (1.96 * RSE)',
        substituted: `${predictionKg} +/- ${(predictionKg * uncertainty.model_uncertainty_rse * 1.96 / 100).toFixed(1)}`,
        result: `[${uncertainty.prediction_interval_95[0]} - ${uncertainty.prediction_interval_95[1]}]`,
        unit: 'kg',
        description: `95% empirical prediction envelope with RSE = ${uncertainty.model_uncertainty_rse}%.`
      }
    ];

    return {
      traceability_chain: {
        species_id: meta.species_id,
        species_scientific_name: meta.species_scientific_name,
        dataset_id: meta.training_dataset_id,
        dataset_version: meta.training_dataset_version,
        model_id: meta.model_id,
        model_version: meta.model_version,
        model_type: meta.model_type,
        preprocessing_version: '1.0.0',
        executed_at: new Date().toISOString()
      },
      input_features_applied: input,
      applied_wood_density_g_cm3: woodDensity,
      applied_carbon_fraction: cf,
      stoichiometric_co2e_ratio: this.CO2E_MULTIPLIER,
      calculation_steps: steps,
      scientific_references: this.config.references
    };
  }

  async predict(input: Record<string, any>): Promise<ModelPredictionResult> {
    const valResult = this.validateInput(input);
    if (!valResult.valid) {
      throw new Error(`Input validation failed: ${valResult.errors.map(e => e.message).join('; ')}`);
    }

    const { a, b, c } = this.config.parameters;
    const dbh = valResult.sanitizedInput.dbh_cm;
    const h = valResult.sanitizedInput.height_m;

    const rawBiomass = a * Math.pow(dbh, b) * Math.pow(h, c);
    const estimatedBiomassKg = Math.round(rawBiomass * 1000) / 1000;

    const uncertainty = this.getUncertainty(valResult.sanitizedInput, estimatedBiomassKg);
    const provenance = this.getProvenance(valResult.sanitizedInput, estimatedBiomassKg, uncertainty);

    const cf = this.getMetadata().carbon_fraction;
    const estimatedCarbonKg = Math.round(estimatedBiomassKg * cf * 1000) / 1000;
    const estimatedCo2eKg = Math.round(estimatedCarbonKg * this.CO2E_MULTIPLIER * 1000) / 1000;

    return {
      estimated_biomass_kg: estimatedBiomassKg,
      estimated_carbon_kg: estimatedCarbonKg,
      estimated_co2e_kg: estimatedCo2eKg,
      uncertainty,
      provenance,
      metadata: this.getMetadata()
    };
  }
}
