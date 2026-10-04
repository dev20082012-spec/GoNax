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

export interface MLModelArtifactConfig {
  metadata: ModelMetadata;
  feature_weights: {
    w_mass_proxy: number;
    w_volume: number;
    w_crown: number;
    w_age: number;
    intercept: number;
  };
  feature_scaling: {
    mass_proxy_mean: number; mass_proxy_std: number;
    volume_mean: number; volume_std: number;
    crown_mean: number; crown_std: number;
  };
  references: Array<{
    doi: string;
    citation: string;
    title: string;
  }>;
}

export class MLModelAdapter implements ScientificModel {
  private readonly CO2E_MULTIPLIER = 44.01 / 12.011;

  constructor(private artifact: MLModelArtifactConfig) {}

  getMetadata(): ModelMetadata {
    return this.artifact.metadata;
  }

  validateInput(input: Record<string, any>): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const sanitizedInput: Record<string, any> = {};

    const meta = this.getMetadata();

    for (const feat of meta.features) {
      const val = input[feat.name];

      if (feat.required && (val === undefined || val === null || val === '')) {
        errors.push({
          field: feat.name,
          severity: 'error',
          message: `ML model '${meta.model_id}' requires feature '${feat.label}' (${feat.name}) in unit '${feat.unit}'.`
        });
        continue;
      }

      if (val !== undefined && val !== null && val !== '') {
        const numVal = Number(val);
        if (isNaN(numVal)) {
          errors.push({
            field: feat.name,
            severity: 'error',
            message: `Feature '${feat.name}' must be numeric. Received: ${val}`
          });
          continue;
        }

        // Biological limits
        if (feat.name === 'dbh_cm' && (numVal <= 0 || numVal > 500)) {
          errors.push({ field: feat.name, severity: 'error', message: `DBH (${numVal} cm) outside biological envelope.` });
          continue;
        }
        if (feat.name === 'height_m' && (numVal <= 0 || numVal > 140)) {
          errors.push({ field: feat.name, severity: 'error', message: `Height (${numVal} m) outside biological envelope.` });
          continue;
        }

        sanitizedInput[feat.name] = numVal;
      } else if (feat.defaultValue !== undefined) {
        sanitizedInput[feat.name] = feat.defaultValue;
      }
    }

    if (input.latitude !== undefined && !isNaN(Number(input.latitude))) sanitizedInput.latitude = Number(input.latitude);
    if (input.longitude !== undefined && !isNaN(Number(input.longitude))) sanitizedInput.longitude = Number(input.longitude);
    if (input.notes) sanitizedInput.notes = String(input.notes).replace(/[<>]/g, '').slice(0, 1000);

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

    for (const feat of meta.features) {
      const val = input[feat.name];
      if (val !== undefined && val !== null) {
        if (val < feat.min || val > feat.max) {
          const ratio = val < feat.min ? (feat.min - val) / feat.min : (val - feat.max) / feat.max;
          extrapolationWarnings.push({
            variable: feat.name,
            measured_value: val,
            calibrated_range: [feat.min, feat.max],
            severity: ratio > 0.35 ? 'SEVERE' : 'MILD',
            message: `Feature '${feat.label}' (${val} ${feat.unit}) outside training range [${feat.min}, ${feat.max}]. ML regressor confidence reduced.`
          });
        }
      } else if (!feat.required) {
        missingVariableWarnings.push(`Optional feature '${feat.label}' omitted; using default prior.`);
      }
    }

    let geoMismatch = false;
    let geoReason: string | undefined;
    if (input.latitude !== undefined && meta.applicable_geographic_scope.min_latitude !== undefined) {
      const lat = input.latitude;
      const { min_latitude, max_latitude, description } = meta.applicable_geographic_scope;
      if (lat < min_latitude || lat > max_latitude) {
        geoMismatch = true;
        geoReason = `Observation latitude (${lat}°) falls outside training domain '${description}' [${min_latitude}°, ${max_latitude}°].`;
      }
    }

    let confidenceTier: ConfidenceTier = 'HIGH_CONFIDENCE';
    if (geoMismatch) confidenceTier = 'GEOGRAPHIC_MISMATCH';
    else if (extrapolationWarnings.length > 0) confidenceTier = 'EXTRAPOLATION_WARNING';
    else if (meta.evaluation_metrics.rse_percentage > 18.0) confidenceTier = 'CALIBRATED_RANGE';

    const rse = meta.evaluation_metrics.rse_percentage || 12.5;
    const delta95 = (predictionKg * (rse * 1.96)) / 100;
    const lower95 = Math.max(0, Math.round((predictionKg - delta95) * 100) / 100);
    const upper95 = Math.round((predictionKg + delta95) * 100) / 100;

    const delta90 = (predictionKg * (rse * 1.645)) / 100;
    const lower90 = Math.max(0, Math.round((predictionKg - delta90) * 100) / 100);
    const upper90 = Math.round((predictionKg + delta90) * 100) / 100;

    return {
      confidence_tier: confidenceTier,
      model_uncertainty_rse: rse,
      prediction_interval_95: [lower95, upper95],
      prediction_interval_90: [lower90, upper90],
      extrapolation_warnings: extrapolationWarnings,
      geographic_mismatch: { mismatch_detected: geoMismatch, reason: geoReason },
      missing_variable_warnings: missingVariableWarnings,
      dataset_limitations: `Trained on dataset ${meta.training_dataset_id} (N=${meta.evaluation_metrics.sample_count}). Test R²=${meta.evaluation_metrics.r2}.`
    };
  }

  getProvenance(
    input: Record<string, any>,
    predictionKg: number,
    uncertainty: UncertaintyAssessment
  ): ModelProvenance {
    const meta = this.getMetadata();
    const cf = meta.carbon_fraction;
    const carbonKg = Math.round(predictionKg * cf * 1000) / 1000;
    const co2eKg = Math.round(carbonKg * this.CO2E_MULTIPLIER * 1000) / 1000;

    const dbh_m = input.dbh_cm / 100.0;
    const stem_vol = Math.PI * Math.pow(dbh_m / 2.0, 2) * input.height_m;
    const woodDensity = input.wood_density_override || 0.65;
    const mass_proxy = stem_vol * (woodDensity * 1000);

    const steps: CalculationStep[] = [
      {
        step: '1. Feature Pipeline & Geometric Transformation',
        formula: 'StemVol = pi * (DBH/200)^2 * H; MassProxy = StemVol * WoodDensity * 1000',
        substituted: `pi * (${input.dbh_cm}/200)^2 * ${input.height_m} = ${stem_vol.toFixed(3)} m³; MassProxy = ${mass_proxy.toFixed(1)} kg`,
        result: Math.round(mass_proxy * 10) / 10,
        unit: 'kg proxy',
        description: 'Engineered non-linear physical interaction features.'
      },
      {
        step: '2. ML Multi-Feature Inference',
        formula: 'AGB = Intercept + w1 * MassProxy + w2 * CrownVol + w3 * Age',
        substituted: `${this.artifact.feature_weights.intercept} + (${this.artifact.feature_weights.w_mass_proxy} * ${mass_proxy.toFixed(1)})`,
        result: predictionKg,
        unit: 'kg dry matter',
        description: `Trained ML regressor execution (Test R² = ${meta.evaluation_metrics.r2}).`
      },
      {
        step: '3. Elemental Carbon Fraction',
        formula: 'Carbon = AGB * CarbonFraction',
        substituted: `${predictionKg} * ${cf}`,
        result: carbonKg,
        unit: 'kg C',
        description: `Species-specific carbon conversion (${(cf * 100).toFixed(1)}%).`
      },
      {
        step: '4. Atmospheric CO2 Equivalent',
        formula: 'CO2e = Carbon * (44.01 / 12.011)',
        substituted: `${carbonKg} * 3.6667`,
        result: co2eKg,
        unit: 'kg CO2e',
        description: 'Molar mass conversion ratio.'
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
      scientific_references: this.artifact.references
    };
  }

  async predict(input: Record<string, any>): Promise<ModelPredictionResult> {
    const valResult = this.validateInput(input);
    if (!valResult.valid) {
      throw new Error(`ML Model validation failed: ${valResult.errors.map(e => e.message).join('; ')}`);
    }

    const { sanitizedInput } = valResult;
    const dbh_m = sanitizedInput.dbh_cm / 100.0;
    const stem_vol = Math.PI * Math.pow(dbh_m / 2.0, 2) * sanitizedInput.height_m;
    const woodDensity = sanitizedInput.wood_density_override || 0.65;
    const mass_proxy = stem_vol * (woodDensity * 1000.0);
    const crown = sanitizedInput.crown_diameter_m || (1.5 + 0.16 * sanitizedInput.dbh_cm);
    const crown_vol = (Math.PI / 4.0) * Math.pow(crown, 2) * (sanitizedInput.height_m / 3.0);
    const age = sanitizedInput.age_years || (sanitizedInput.dbh_cm * 1.5);

    const { w_mass_proxy, intercept } = this.artifact.feature_weights;
    const rawEst = intercept +
      (w_mass_proxy * mass_proxy) +
      (0.015 * crown_vol) +
      (0.12 * age);

    const estimatedBiomassKg = Math.max(1.0, Math.round(rawEst * 1000) / 1000);
    const uncertainty = this.getUncertainty(sanitizedInput, estimatedBiomassKg);
    const provenance = this.getProvenance(sanitizedInput, estimatedBiomassKg, uncertainty);

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
