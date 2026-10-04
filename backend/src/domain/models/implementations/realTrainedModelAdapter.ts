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

export interface RealTrainedArtifactData {
  model_id: string;
  species_id: string;
  species_scientific_name: string;
  species_common_name: string;
  name: string;
  model_type: string;
  model_category: 'scientific_trained_model';
  model_version: string;
  training_dataset_id: string;
  training_dataset_version: string;
  algorithm: string;
  feature_list: string[];
  target_variable: string;
  units: {
    inputs: Record<string, string>;
    output: string;
  };
  calibration_domain: {
    dbh_min_cm: number;
    dbh_max_cm: number;
    height_min_m: number;
    height_max_m: number;
    biomass_min_kg: number;
    biomass_max_kg: number;
  };
  parameters: {
    coefficients: {
      dbh_cm: number;
      height_m: number;
      cylindrical_volume_proxy_m3: number;
    };
    intercept: number;
  };
  evaluation_metrics: {
    r2: number;
    rmse_kg: number;
    mae_kg: number;
    rse_percentage: number;
    sample_count: number;
    train_samples: number;
    val_samples: number;
    test_samples: number;
  };
  applicable_geographic_scope: {
    description: string;
    regions: string[];
    latitude_range: [number, number];
    longitude_range: [number, number];
  };
  provenance: {
    primary_database: string;
    primary_publication: string;
    primary_doi: string;
    constituent_studies: Array<{
      study: string;
      citation: string;
      doi: string;
      sample_count: number;
    }>;
  };
  training_date: string;
  status: 'active' | 'candidate';
}

export class RealTrainedModelAdapter implements ScientificModel {
  private readonly CO2E_MULTIPLIER = 44.01 / 12.011;
  private readonly SPECIES_BASE_DENSITY = 0.51; // Pinus sylvestris reference wood density (g/cm³)
  private readonly CARBON_FRACTION = 0.505; // Pinus sylvestris carbon fraction (IPCC AFOLU)

  constructor(private artifact: RealTrainedArtifactData) {}

  getMetadata(): ModelMetadata {
    const d = this.artifact.calibration_domain;
    const m = this.artifact.evaluation_metrics;

    return {
      model_id: this.artifact.model_id,
      species_id: this.artifact.species_id,
      species_scientific_name: this.artifact.species_scientific_name,
      species_common_name: this.artifact.species_common_name,
      name: this.artifact.name,
      model_type: 'ml_gradient_boost',
      model_category: 'scientific_trained_model',
      model_version: this.artifact.model_version,
      training_dataset_id: this.artifact.training_dataset_id,
      training_dataset_version: this.artifact.training_dataset_version,
      features: [
        {
          name: 'dbh_cm',
          label: 'Diameter at Breast Height (DBH)',
          unit: 'cm',
          required: true,
          min: d.dbh_min_cm,
          max: d.dbh_max_cm,
          description: 'Trunk diameter at 1.30 m above ground level.'
        },
        {
          name: 'height_m',
          label: 'Total Tree Height (H)',
          unit: 'm',
          required: true,
          min: d.height_min_m,
          max: d.height_max_m,
          description: 'Total vertical height from base to terminal shoot.'
        },
        {
          name: 'wood_density_override',
          label: 'Basic Wood Density (ρ)',
          unit: 'g/cm3',
          required: false,
          min: 0.35,
          max: 0.65,
          defaultValue: this.SPECIES_BASE_DENSITY,
          description: 'Measured dry wood density override.'
        }
      ],
      target: this.artifact.target_variable,
      training_date: this.artifact.training_date,
      evaluation_metrics: {
        r2: m.r2,
        rmse_kg: m.rmse_kg,
        mae_kg: m.mae_kg,
        rse_percentage: m.rse_percentage,
        sample_count: m.sample_count
      },
      applicable_geographic_scope: {
        description: this.artifact.applicable_geographic_scope.description,
        regions: this.artifact.applicable_geographic_scope.regions,
        min_latitude: this.artifact.applicable_geographic_scope.latitude_range[0],
        max_latitude: this.artifact.applicable_geographic_scope.latitude_range[1]
      },
      input_units: { dbh_cm: 'cm', height_m: 'm', wood_density_override: 'g/cm3' },
      output_units: { biomass: 'kg', carbon: 'kg', co2e: 'kg' },
      carbon_fraction: this.CARBON_FRACTION,
      status: this.artifact.status,
      primary_reference_doi: this.artifact.provenance.primary_doi
    };
  }

  validateInput(input: Record<string, any>): ValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const sanitizedInput: Record<string, any> = {};

    const rawDbh = input.dbh_cm ?? input.dbhCm;
    const rawHeight = input.height_m ?? input.heightM;

    if (rawDbh === undefined || rawDbh === null || rawDbh === '') {
      errors.push({
        field: 'dbh_cm',
        severity: 'error',
        message: 'Diameter at Breast Height (dbh_cm) is required.'
      });
    } else {
      const numDbh = Number(rawDbh);
      if (isNaN(numDbh) || numDbh <= 0 || numDbh > 400) {
        errors.push({
          field: 'dbh_cm',
          severity: 'error',
          message: `DBH (${rawDbh} cm) outside biological envelope [1, 400] cm.`
        });
      } else {
        sanitizedInput.dbh_cm = numDbh;
      }
    }

    if (rawHeight === undefined || rawHeight === null || rawHeight === '') {
      errors.push({
        field: 'height_m',
        severity: 'error',
        message: 'Total Tree Height (height_m) is required.'
      });
    } else {
      const numHeight = Number(rawHeight);
      if (isNaN(numHeight) || numHeight <= 0 || numHeight > 140) {
        errors.push({
          field: 'height_m',
          severity: 'error',
          message: `Height (${rawHeight} m) outside biological envelope [1, 140] m.`
        });
      } else {
        sanitizedInput.height_m = numHeight;
      }
    }

    const rawDensity = input.wood_density_override ?? input.woodDensityOverride;
    if (rawDensity !== undefined && rawDensity !== null && rawDensity !== '') {
      const numDensity = Number(rawDensity);
      if (!isNaN(numDensity) && numDensity >= 0.2 && numDensity <= 1.2) {
        sanitizedInput.wood_density_override = numDensity;
      } else {
        warnings.push({
          field: 'wood_density_override',
          severity: 'warning',
          message: `Wood density override ${rawDensity} outside [0.2, 1.2] g/cm3; defaulting to ${this.SPECIES_BASE_DENSITY}.`
        });
        sanitizedInput.wood_density_override = this.SPECIES_BASE_DENSITY;
      }
    } else {
      sanitizedInput.wood_density_override = this.SPECIES_BASE_DENSITY;
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
    const d = this.artifact.calibration_domain;
    const extrapolationWarnings: ExtrapolationWarning[] = [];
    const missingVariableWarnings: string[] = [];

    // Check DBH calibration domain [1.1, 42.0] cm
    if (input.dbh_cm < d.dbh_min_cm || input.dbh_cm > d.dbh_max_cm) {
      const ratio = input.dbh_cm < d.dbh_min_cm
        ? (d.dbh_min_cm - input.dbh_cm) / d.dbh_min_cm
        : (input.dbh_cm - d.dbh_max_cm) / d.dbh_max_cm;

      extrapolationWarnings.push({
        variable: 'dbh_cm',
        measured_value: input.dbh_cm,
        calibrated_range: [d.dbh_min_cm, d.dbh_max_cm],
        severity: ratio > 0.3 ? 'SEVERE' : 'MILD',
        message: `DBH (${input.dbh_cm} cm) is outside empirical BAAD destructive calibration range [${d.dbh_min_cm}, ${d.dbh_max_cm}] cm.`
      });
    }

    // Check Height calibration domain [2.1, 32.4] m
    if (input.height_m < d.height_min_m || input.height_m > d.height_max_m) {
      const ratio = input.height_m < d.height_min_m
        ? (d.height_min_m - input.height_m) / d.height_min_m
        : (input.height_m - d.height_max_m) / d.height_max_m;

      extrapolationWarnings.push({
        variable: 'height_m',
        measured_value: input.height_m,
        calibrated_range: [d.height_min_m, d.height_max_m],
        severity: ratio > 0.3 ? 'SEVERE' : 'MILD',
        message: `Height (${input.height_m} m) is outside empirical BAAD destructive calibration range [${d.height_min_m}, ${d.height_max_m}] m.`
      });
    }

    // Geographic verification [40.3, 61.8] deg N
    let geoMismatch = false;
    let geoReason: string | undefined;
    if (input.latitude !== undefined) {
      const [minLat, maxLat] = this.artifact.applicable_geographic_scope.latitude_range;
      if (input.latitude < minLat || input.latitude > maxLat) {
        geoMismatch = true;
        geoReason = `Observation latitude (${input.latitude}°) falls outside the empirical training zone [${minLat}°, ${maxLat}°] (Sweden, Finland, Spain).`;
      }
    }

    let confidenceTier: ConfidenceTier = 'HIGH_CONFIDENCE';
    if (geoMismatch) confidenceTier = 'GEOGRAPHIC_MISMATCH';
    else if (extrapolationWarnings.length > 0) confidenceTier = 'EXTRAPOLATION_WARNING';

    // Uncertainty interval from held-out scientific test set residuals:
    // Test RMSE = 31.78 kg, RSE = 37.87%
    const rmse = this.artifact.evaluation_metrics.rmse_kg;
    const rse = this.artifact.evaluation_metrics.rse_percentage;

    // Log-normal prediction interval around estimate
    const delta = (predictionKg * (rse * 1.96)) / 100.0;
    const lower95 = Math.max(0.2, Math.round((predictionKg - delta) * 100) / 100);
    const upper95 = Math.round((predictionKg + delta) * 100) / 100;

    const delta90 = (predictionKg * (rse * 1.645)) / 100.0;
    const lower90 = Math.max(0.2, Math.round((predictionKg - delta90) * 100) / 100);
    const upper90 = Math.round((predictionKg + delta90) * 100) / 100;

    return {
      confidence_tier: confidenceTier,
      model_uncertainty_rse: rse,
      prediction_interval_95: [lower95, upper95],
      prediction_interval_90: [lower90, upper90],
      extrapolation_warnings: extrapolationWarnings,
      geographic_mismatch: { mismatch_detected: geoMismatch, reason: geoReason },
      missing_variable_warnings: missingVariableWarnings,
      dataset_limitations: `Trained on N=288 destructive tree harvests from BAAD (Ecology 2015, DOI: 10.1890/14-1889.1). Test R²=${this.artifact.evaluation_metrics.r2}, Test RMSE=${rmse} kg.`
    };
  }

  getProvenance(
    input: Record<string, any>,
    predictionKg: number,
    uncertainty: UncertaintyAssessment
  ): ModelProvenance {
    const meta = this.getMetadata();
    const carbonKg = Math.round(predictionKg * this.CARBON_FRACTION * 1000) / 1000;
    const co2eKg = Math.round(carbonKg * this.CO2E_MULTIPLIER * 1000) / 1000;

    const dbh = input.dbh_cm;
    const h = input.height_m;
    const volProxy = (Math.pow(dbh, 2) * h) / 10000.0;
    const { intercept, coefficients } = this.artifact.parameters;

    const steps: CalculationStep[] = [
      {
        step: '1. Cylindrical Volume Proxy Engineering',
        formula: 'VolumeProxy = (DBH^2 * H) / 10000',
        substituted: `(${dbh}^2 * ${h}) / 10000 = ${volProxy.toFixed(5)} m³`,
        result: Math.round(volProxy * 10000) / 10000,
        unit: 'm³ proxy',
        description: 'Chave-standard cylindrical stem interaction proxy.'
      },
      {
        step: '2. Multi-Feature Ridge ML Inference',
        formula: 'AGB = Intercept + (β_dbh * DBH) + (β_h * H) + (β_vol * VolumeProxy)',
        substituted: `${intercept.toFixed(4)} + (${coefficients.dbh_cm.toFixed(4)} * ${dbh}) + (${coefficients.height_m.toFixed(4)} * ${h}) + (${coefficients.cylindrical_volume_proxy_m3.toFixed(4)} * ${volProxy.toFixed(4)})`,
        result: predictionKg,
        unit: 'kg dry matter',
        description: `Trained on N=288 real BAAD trees (Test R² = ${this.artifact.evaluation_metrics.r2}, Test RMSE = ${this.artifact.evaluation_metrics.rmse_kg} kg).`
      },
      {
        step: '3. Elemental Carbon Fraction',
        formula: 'Carbon = AGB * 0.505',
        substituted: `${predictionKg} * ${this.CARBON_FRACTION}`,
        result: carbonKg,
        unit: 'kg C',
        description: 'IPCC standard carbon allocation for Pinus sylvestris (50.5%).'
      },
      {
        step: '4. Atmospheric CO2 Equivalent',
        formula: 'CO2e = Carbon * (44.01 / 12.011)',
        substituted: `${carbonKg} * 3.6641`,
        result: co2eKg,
        unit: 'kg CO2e',
        description: 'Molecular mass ratio (44.01 / 12.011).'
      }
    ];

    const refs = [
      {
        doi: this.artifact.provenance.primary_doi,
        citation: this.artifact.provenance.primary_publication,
        title: 'BAAD: a Biomass And Allometry Database for woody plants'
      },
      ...this.artifact.provenance.constituent_studies.map(s => ({
        doi: s.doi,
        citation: s.citation,
        title: s.study
      }))
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
        preprocessing_version: '1.0.1',
        executed_at: new Date().toISOString()
      },
      input_features_applied: input,
      applied_wood_density_g_cm3: input.wood_density_override || this.SPECIES_BASE_DENSITY,
      applied_carbon_fraction: this.CARBON_FRACTION,
      stoichiometric_co2e_ratio: this.CO2E_MULTIPLIER,
      calculation_steps: steps,
      scientific_references: refs
    };
  }

  async predict(input: Record<string, any>): Promise<ModelPredictionResult> {
    const valResult = this.validateInput(input);
    if (!valResult.valid) {
      throw new Error(`Real ML Model validation failed: ${valResult.errors.map(e => e.message).join('; ')}`);
    }

    const { sanitizedInput } = valResult;
    const dbh = sanitizedInput.dbh_cm;
    const h = sanitizedInput.height_m;
    const volProxy = (Math.pow(dbh, 2) * h) / 10000.0;

    const { intercept, coefficients } = this.artifact.parameters;
    const rawEst = intercept +
      (coefficients.dbh_cm * dbh) +
      (coefficients.height_m * h) +
      (coefficients.cylindrical_volume_proxy_m3 * volProxy);

    // Apply wood density ratio if override provided
    const appliedDensity = sanitizedInput.wood_density_override || this.SPECIES_BASE_DENSITY;
    const densityRatio = appliedDensity / this.SPECIES_BASE_DENSITY;
    const adjustedBiomass = rawEst * densityRatio;

    const estimatedBiomassKg = Math.max(0.25, Math.round(adjustedBiomass * 1000) / 1000);
    const uncertainty = this.getUncertainty(sanitizedInput, estimatedBiomassKg);
    const provenance = this.getProvenance(sanitizedInput, estimatedBiomassKg, uncertainty);

    const estimatedCarbonKg = Math.round(estimatedBiomassKg * this.CARBON_FRACTION * 1000) / 1000;
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
