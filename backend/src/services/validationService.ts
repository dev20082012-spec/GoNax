import { TreeMeasurementInput } from '../domain/engine/types';
import { SpeciesEntity } from '../domain/entities/species';
import { ScientificModel } from '../domain/models/scientificModel.interface';
import { ModelMetadata, ExtrapolationWarning } from '../domain/models/types';

export class ScientificValidationError extends Error {
  public statusCode: number;
  public details: Record<string, any>;

  constructor(message: string, statusCode: number = 422, details: Record<string, any> = {}) {
    super(message);
    this.name = 'ScientificValidationError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface ValidationReport {
  isValid: boolean;
  sanitizedInput: {
    speciesId: string;
    dbhCm: number;
    heightM: number;
    crownDiameterM?: number | null;
    woodDensityOverride?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    notes?: string | null;
  };
  extrapolationWarnings: ExtrapolationWarning[];
  geographicMismatch: {
    mismatchDetected: boolean;
    reason?: string;
  };
  missingVariableWarnings: string[];
}

export class ValidationService {
  /**
   * Validate physical plausibility, unit requirements, species calibration status,
   * and model applicability range before numerical calculation.
   */
  public validate(
    input: TreeMeasurementInput,
    species: SpeciesEntity,
    model?: ScientificModel | null
  ): ValidationReport {
    // 1. Missing variable check
    if (input.dbhCm === undefined || input.dbhCm === null || isNaN(Number(input.dbhCm))) {
      throw new ScientificValidationError(
        'Missing required variable: Diameter at Breast Height (dbh_cm) must be specified in centimeters.',
        400,
        { variable: 'dbh_cm', unit: 'cm' }
      );
    }

    if (input.heightM === undefined || input.heightM === null || isNaN(Number(input.heightM))) {
      throw new ScientificValidationError(
        'Missing required variable: Total Tree Height (height_m) must be specified in meters.',
        400,
        { variable: 'height_m', unit: 'm' }
      );
    }

    const dbh = Number(input.dbhCm);
    const height = Number(input.heightM);

    // 2. Physical & biological plausibility bounds
    if (dbh <= 0) {
      throw new ScientificValidationError(
        `Physically impossible measurement: DBH must be strictly positive (> 0 cm). Provided: ${dbh} cm.`,
        422,
        { variable: 'dbh_cm', value: dbh, minimum: 0.1 }
      );
    }

    if (dbh > 400) {
      throw new ScientificValidationError(
        `Physically implausible measurement: DBH (${dbh} cm) exceeds biological maximum for terrestrial trees (400 cm).`,
        422,
        { variable: 'dbh_cm', value: dbh, maximum: 400 }
      );
    }

    if (height <= 0) {
      throw new ScientificValidationError(
        `Physically impossible measurement: Tree height must be strictly positive (> 0 m). Provided: ${height} m.`,
        422,
        { variable: 'height_m', value: height, minimum: 0.1 }
      );
    }

    if (height > 135) {
      throw new ScientificValidationError(
        `Physically implausible measurement: Tree height (${height} m) exceeds maximum global tree height bounds (135 m).`,
        422,
        { variable: 'height_m', value: height, maximum: 135 }
      );
    }

    // Wood density override plausibility
    let woodDensity: number | null = null;
    if (input.woodDensityOverride !== undefined && input.woodDensityOverride !== null && !isNaN(Number(input.woodDensityOverride))) {
      woodDensity = Number(input.woodDensityOverride);
      if (woodDensity < 0.15 || woodDensity > 1.45) {
        throw new ScientificValidationError(
          `Wood density override (${woodDensity} g/cm³) is outside physical bounds [0.15, 1.45] g/cm³.`,
          422,
          { variable: 'wood_density_override', value: woodDensity, bounds: [0.15, 1.45] }
        );
      }
    }

    // Crown diameter plausibility
    let crownDiameter: number | null = null;
    if (input.crownDiameterM !== undefined && input.crownDiameterM !== null && !isNaN(Number(input.crownDiameterM))) {
      crownDiameter = Number(input.crownDiameterM);
      if (crownDiameter <= 0 || crownDiameter > 70) {
        throw new ScientificValidationError(
          `Crown diameter (${crownDiameter} m) is outside biological plausibility limits (0, 70] m.`,
          422,
          { variable: 'crown_diameter_m', value: crownDiameter, bounds: [0.1, 70] }
        );
      }
    }

    // Geographic coordinates bounds
    let latitude: number | null = null;
    if (input.latitude !== undefined && input.latitude !== null && !isNaN(Number(input.latitude))) {
      latitude = Number(input.latitude);
      if (latitude < -90 || latitude > 90) {
        throw new ScientificValidationError(
          `Latitude coordinate (${latitude}) is outside valid range [-90, +90] degrees.`,
          422,
          { variable: 'latitude', value: latitude }
        );
      }
    }

    let longitude: number | null = null;
    if (input.longitude !== undefined && input.longitude !== null && !isNaN(Number(input.longitude))) {
      longitude = Number(input.longitude);
      if (longitude < -180 || longitude > 180) {
        throw new ScientificValidationError(
          `Longitude coordinate (${longitude}) is outside valid range [-180, +180] degrees.`,
          422,
          { variable: 'longitude', value: longitude }
        );
      }
    }

    // 3. Species calibration validation
    // If a species is known to have insufficient calibrated allometry (like Fraxinus excelsior)
    if (species.scientific_name.toLowerCase().includes('fraxinus') || !model) {
      if (!model) {
        throw new ScientificValidationError(
          `Data deficient species: "${species.scientific_name}" (${species.common_name}) currently lacks calibrated destructive sampling equations in the GoNax Model Registry. Prediction refused to prevent ungrounded estimates.`,
          409,
          {
            species: species.scientific_name,
            reason: 'INSUFFICIENT_CALIBRATION_DATA',
            recommendation: 'Destructive biomass calibration dataset must be registered before inference.'
          }
        );
      }
    }

    // 4. Model applicability range and extrapolation checks
    const extrapolationWarnings: ExtrapolationWarning[] = [];
    let geographicMismatch = {
      mismatchDetected: false,
      reason: undefined as string | undefined
    };
    const missingVariableWarnings: string[] = [];

    if (model) {
      const meta: ModelMetadata = model.getMetadata();

      // Check DBH and Height against model calibration boundaries
      const dbhFeature = meta.features.find(f => f.name === 'dbh_cm');
      if (dbhFeature) {
        if (dbh < dbhFeature.min) {
          extrapolationWarnings.push({
            variable: 'dbh_cm',
            measured_value: dbh,
            calibrated_range: [dbhFeature.min, dbhFeature.max],
            severity: dbh < dbhFeature.min * 0.7 ? 'SEVERE' : 'MILD',
            message: `DBH (${dbh} cm) is below the calibrated training range [${dbhFeature.min}, ${dbhFeature.max}] cm.`
          });
        } else if (dbh > dbhFeature.max) {
          extrapolationWarnings.push({
            variable: 'dbh_cm',
            measured_value: dbh,
            calibrated_range: [dbhFeature.min, dbhFeature.max],
            severity: dbh > dbhFeature.max * 1.3 ? 'SEVERE' : 'MILD',
            message: `DBH (${dbh} cm) exceeds the calibrated training domain [${dbhFeature.min}, ${dbhFeature.max}] cm.`
          });
        }
      }

      const heightFeature = meta.features.find(f => f.name === 'height_m');
      if (heightFeature) {
        if (height < heightFeature.min) {
          extrapolationWarnings.push({
            variable: 'height_m',
            measured_value: height,
            calibrated_range: [heightFeature.min, heightFeature.max],
            severity: height < heightFeature.min * 0.7 ? 'SEVERE' : 'MILD',
            message: `Height (${height} m) is below the calibrated training range [${heightFeature.min}, ${heightFeature.max}] m.`
          });
        } else if (height > heightFeature.max) {
          extrapolationWarnings.push({
            variable: 'height_m',
            measured_value: height,
            calibrated_range: [heightFeature.min, heightFeature.max],
            severity: height > heightFeature.max * 1.3 ? 'SEVERE' : 'MILD',
            message: `Height (${height} m) exceeds the calibrated training domain [${heightFeature.min}, ${heightFeature.max}] m.`
          });
        }
      }

      // Check geographic envelope
      if (latitude !== null && meta.applicable_geographic_scope) {
        const scope = meta.applicable_geographic_scope;
        if (scope.min_latitude !== undefined && scope.max_latitude !== undefined) {
          if (latitude < scope.min_latitude || latitude > scope.max_latitude) {
            geographicMismatch = {
              mismatchDetected: true,
              reason: `Observation latitude (${latitude.toFixed(2)}°) is outside calibrated regional domain (${scope.description}: ${scope.min_latitude}° to ${scope.max_latitude}°).`
            };
          }
        }
      }

      // Check missing optional features
      if (meta.features.some(f => f.name === 'crown_diameter_m') && crownDiameter === null) {
        missingVariableWarnings.push('Crown diameter omitted; using species allometric mean approximation.');
      }
      if (meta.features.some(f => f.name === 'wood_density_override') && woodDensity === null) {
        missingVariableWarnings.push(`Wood density override omitted; defaulting to taxon mean (${species.wood_density_mean.toFixed(2)} g/cm³).`);
      }
    }

    const sanitizedNotes = input.notes ? input.notes.replace(/[<>]/g, '').trim().slice(0, 1000) : null;

    return {
      isValid: true,
      sanitizedInput: {
        speciesId: species.id,
        dbhCm: dbh,
        heightM: height,
        crownDiameterM: crownDiameter,
        woodDensityOverride: woodDensity,
        latitude,
        longitude,
        notes: sanitizedNotes
      },
      extrapolationWarnings,
      geographicMismatch,
      missingVariableWarnings
    };
  }
}
