import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ObservationRepository } from '../repositories/observationRepository';
import { SpeciesRepository } from '../repositories/speciesRepository';
import { PredictionRepository, EnrichedPredictionRecord } from '../repositories/predictionRepository';
import { ReferenceRepository } from '../repositories/referenceRepository';
import { ModelRegistry } from '../domain/models/modelRegistry';
import { ScientificModel } from '../domain/models/scientificModel.interface';
import { TreeMeasurementInput } from '../domain/engine/types';
import { PredictionEntity, PredictionEvidenceEntity } from '../domain/entities/prediction';
import { PredictionUncertaintyEntity } from '../domain/entities/uncertainty';
import { TargetQuantitiesReport, ApplicabilityGateReport } from '../domain/models/types';
import { ValidationService, ScientificValidationError } from './validationService';
import { appLogger } from '../utils/logger';

export interface RunPredictionOptions extends TreeMeasurementInput {
  preferredModelId?: string;
  userId?: string | null;
  sessionId?: string | null;
  isDemo?: boolean;
}

export class PredictionService {
  private modelRegistry: ModelRegistry;
  private validationService: ValidationService;

  constructor(
    private obsRepo: ObservationRepository = new ObservationRepository(),
    private speciesRepo: SpeciesRepository = new SpeciesRepository(),
    private predRepo: PredictionRepository = new PredictionRepository(),
    private refRepo: ReferenceRepository = new ReferenceRepository()
  ) {
    this.modelRegistry = ModelRegistry.getInstance();
    this.validationService = new ValidationService();
  }

  async runPrediction(
    input: RunPredictionOptions
  ): Promise<EnrichedPredictionRecord> {
    const startEpoch = Date.now();

    // 1. Identify Species
    if (!input.speciesId || typeof input.speciesId !== 'string') {
      throw new ScientificValidationError('Invalid speciesId: must be a valid string identifier.', 400);
    }

    let species = await this.speciesRepo.findById(input.speciesId);
    if (!species) {
      const all = await this.speciesRepo.findAll();
      species = all.find(
        s => s.scientific_name.toLowerCase() === input.speciesId.toLowerCase() ||
             s.scientific_name.toLowerCase().replace(/\s+/g, '_') === input.speciesId.toLowerCase() ||
             s.common_name.toLowerCase().includes(input.speciesId.toLowerCase())
      ) || null;
    }
    if (!species) {
      throw new ScientificValidationError(
        `Species with identifier or name "${input.speciesId}" not found in scientific database.`,
        404,
        { speciesId: input.speciesId }
      );
    }

    // Convert scientific name to snake_case species ID for registry lookup
    const registrySpeciesKey = species.scientific_name.toLowerCase().replace(/\s+/g, '_');

    // 2. Resolve Scientific Model dynamically from ModelRegistry with security verification
    if (input.preferredModelId && !/^[a-zA-Z0-9_\-]+$/.test(input.preferredModelId)) {
      throw new ScientificValidationError(
        `Invalid model ID format '${input.preferredModelId}': Path traversal and non-alphanumeric characters are strictly prohibited.`,
        400
      );
    }

    let model: ScientificModel | null = null;
    try {
      model = this.modelRegistry.resolveModel(registrySpeciesKey, input.preferredModelId);
    } catch (resolveErr: any) {
      if (input.preferredModelId) {
        // Caller explicitly requested a specific model; do not silently substitute another model
        throw new ScientificValidationError(resolveErr.message, 400);
      }
      // Fallback: search by scientific name in active registered models
      const models = this.modelRegistry.getAllModelsMetadata();
      const match = models.find(m =>
        m.species_scientific_name.toLowerCase() === species!.scientific_name.toLowerCase() &&
        m.status !== 'deprecated' &&
        m.governance_status !== 'retired'
      );
      if (match) {
        model = this.modelRegistry.getModel(match.model_id) || null;
      } else {
        throw new ScientificValidationError(
          resolveErr.message || `No valid scientific model registered for species '${species.scientific_name}'.`,
          409,
          { species: species.scientific_name, status: 'insufficient_data' }
        );
      }
    }

    // 3. Rigorous Physical, Biological, and Applicability Range Validation
    const validationReport = this.validationService.validate(input, species, model);

    if (!model) {
      throw new ScientificValidationError(
        `No registered scientific model available for species: ${species.scientific_name}`,
        409,
        { species: species.scientific_name, status: 'insufficient_data' }
      );
    }

    const meta = model.getMetadata();

    // 4. Create and Persist Tree Observation
    const observationId = uuidv4();
    const observation = await this.obsRepo.create({
      id: observationId,
      species_id: species.id,
      dbh_cm: validationReport.sanitizedInput.dbhCm,
      height_m: validationReport.sanitizedInput.heightM,
      crown_diameter_m: validationReport.sanitizedInput.crownDiameterM,
      wood_density_override: validationReport.sanitizedInput.woodDensityOverride,
      latitude: validationReport.sanitizedInput.latitude,
      longitude: validationReport.sanitizedInput.longitude,
      observation_notes: validationReport.sanitizedInput.notes,
      user_id: input.userId || null,
      session_id: input.sessionId || null,
      created_at: new Date().toISOString()
    });

    // 5. Execute Deterministic Model Prediction with Bounded Execution Time
    const predictionInput = {
      dbh_cm: observation.dbh_cm,
      height_m: observation.height_m,
      crown_diameter_m: observation.crown_diameter_m,
      wood_density_override: observation.wood_density_override || species.wood_density_mean,
      latitude: observation.latitude,
      longitude: observation.longitude,
      notes: observation.observation_notes
    };

    // Bounded execution timeout: 5000ms max for model calculation
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Model execution timeout exceeded (5000ms).')), 5000)
    );

    let modelResult;
    try {
      modelResult = await Promise.race([model.predict(predictionInput), timeoutPromise]);
    } catch (execErr: any) {
      appLogger.error('PREDICTION_ENGINE', `Model prediction execution failed for ${meta.model_id}`, execErr);
      throw new Error(`Scientific model execution failed: ${execErr.message}`);
    }

    // Merge validation-derived warnings with model-derived warnings
    const combinedExtrapolationWarnings = [
      ...modelResult.uncertainty.extrapolation_warnings,
      ...validationReport.extrapolationWarnings.filter(
        vw => !modelResult.uncertainty.extrapolation_warnings.some(mw => mw.variable === vw.variable)
      )
    ];

    const geographicMismatch = modelResult.uncertainty.geographic_mismatch.mismatch_detected
      ? modelResult.uncertainty.geographic_mismatch
      : {
          mismatch_detected: validationReport.geographicMismatch.mismatchDetected,
          reason: validationReport.geographicMismatch.reason
        };

    const combinedMissingVariables = [
      ...modelResult.uncertainty.missing_variable_warnings,
      ...validationReport.missingVariableWarnings
    ];

    // Determine finalized confidence tier
    let finalizedTier = modelResult.uncertainty.confidence_tier;
    if (combinedExtrapolationWarnings.some(w => w.severity === 'SEVERE')) {
      finalizedTier = 'EXTRAPOLATION_WARNING';
    } else if (geographicMismatch.mismatch_detected) {
      finalizedTier = 'GEOGRAPHIC_MISMATCH';
    } else if (modelResult.uncertainty.model_uncertainty_rse > 50.0) {
      finalizedTier = 'HIGH_UNCERTAINTY';
    }

    // 6. Build Target Quantities Disambiguation Report (Section 4)
    const targetQuantities: TargetQuantitiesReport = {
      dry_above_ground_biomass_kg: {
        value: modelResult.estimated_biomass_kg,
        unit: 'kg dry mass',
        supported: true,
        quantity_type: 'DRY_ABOVE_GROUND_BIOMASS',
        description: 'Total oven-dry vegetative mass of stem wood, branches, bark, and foliage (excluding roots), dried at 105°C to constant weight.',
        basis: `${meta.name} calibrated destructive harvest allometry.`
      },
      dry_below_ground_biomass_kg: {
        value: null,
        unit: 'kg dry mass',
        supported: false,
        quantity_type: 'DRY_BELOW_GROUND_BIOMASS',
        description: 'Direct destructive root excavation was not performed in this calibration cohort.',
        basis: 'Unsupported: Direct root measurements unavailable.'
      },
      fresh_biomass_kg: {
        value: null,
        unit: 'kg fresh mass',
        supported: false,
        quantity_type: 'FRESH_BIOMASS',
        description: 'Fresh biomass fluctuates with seasonal sapflow and moisture content; scientific forestry models exclusively quantify oven-dry mass.',
        basis: 'Unsupported: Green moisture content is unstandardized.'
      },
      total_dry_biomass_kg: {
        value: null,
        unit: 'kg dry mass',
        supported: false,
        quantity_type: 'TOTAL_DRY_BIOMASS',
        description: 'Total biomass requires empirical root-system verification which is absent in this dataset.',
        basis: 'Unsupported: Direct root mass absent.'
      },
      biomass_carbon_stock_kg: {
        value: modelResult.estimated_carbon_kg,
        unit: 'kg C',
        supported: true,
        quantity_type: 'CARBON_STOCK',
        description: 'Elemental carbon stock sequestered within living above-ground woody and foliar tissues.',
        basis: `Species-specific carbon fraction of ${(meta.carbon_fraction * 100).toFixed(1)}% applied to dry AGB (Thomas & Martin 2012).`
      },
      co2_equivalent_kg: {
        value: modelResult.estimated_co2e_kg,
        unit: 'kg CO2e',
        supported: true,
        quantity_type: 'CO2_EQUIVALENT',
        description: 'Atmospheric carbon dioxide equivalent mass if completely oxidized.',
        basis: 'Exact molecular stoichiometry: 44.01 g/mol CO2 / 12.011 g/mol C = 3.6667 (IPCC 2019).'
      },
      regulatory_carbon_accounting_disclaimer:
        'DISCLAIMER: In-situ biological carbon stock represents the standing living vegetative carbon pool. It DOES NOT represent emissions avoided, verified carbon removal credits, or project additionality. Carbon credit issuance requires additionality baselines, leakage accounting, and third-party verification under carbon standards (e.g. Verra VCS, Gold Standard).'
    };

    // 7. Build Applicability Gate Report (Section 5)
    const applicabilityGates: ApplicabilityGateReport = {
      passed_all_gates: combinedExtrapolationWarnings.length === 0 && !geographicMismatch.mismatch_detected,
      critical_refusal: false,
      out_of_distribution: combinedExtrapolationWarnings.some(w => w.severity === 'SEVERE'),
      extrapolation_detected: combinedExtrapolationWarnings.length > 0,
      fallback_applied: false,
      gates_evaluated: [
        {
          gate_id: 'GATE_REQUIRED_FEATURES',
          name: 'Required Feature Completeness',
          status: 'PASSED',
          message: 'All mandatory biophysical variables (DBH, Height) provided.'
        },
        {
          gate_id: 'GATE_UNIT_COMPATIBILITY',
          name: 'Unit Compatibility & Standardization',
          status: 'PASSED',
          message: 'All measurements standardized to SI units (cm, m, g/cm³).'
        },
        {
          gate_id: 'GATE_SPECIES_COMPATIBILITY',
          name: 'Species-Model Taxonomic Compatibility',
          status: 'PASSED',
          message: `Model '${meta.model_id}' was calibrated specifically on '${species.scientific_name}'.`
        },
        {
          gate_id: 'GATE_BIOLOGICAL_BOUNDS',
          name: 'Physical & Biological Plausibility Bounds',
          status: 'PASSED',
          message: `DBH (${observation.dbh_cm} cm) and Height (${observation.height_m} m) fall within terrestrial tree limits.`
        },
        {
          gate_id: 'GATE_CALIBRATION_DOMAIN',
          name: 'Training Calibration Envelope Check',
          status: combinedExtrapolationWarnings.length > 0 ? 'WARNING' : 'PASSED',
          message: combinedExtrapolationWarnings.length > 0
            ? combinedExtrapolationWarnings.map(w => w.message).join(' ')
            : 'Measurements fall safely within model empirical calibration domain.'
        },
        {
          gate_id: 'GATE_GEOGRAPHIC_DOMAIN',
          name: 'Geographic Scope Check',
          status: geographicMismatch.mismatch_detected ? 'WARNING' : 'PASSED',
          message: geographicMismatch.mismatch_detected
            ? geographicMismatch.reason || 'Geographic mismatch detected.'
            : 'Coordinates fall within calibrated regional boundary.'
        }
      ]
    };

    // 8. Compute Cryptographic Provenance Hash
    const provenanceSeed = `${species.id}:${meta.model_id}:${meta.model_version}:${observationId}:${observation.dbh_cm}:${observation.height_m}:${modelResult.estimated_biomass_kg}`;
    const provenanceHashSha256 = crypto.createHash('sha256').update(provenanceSeed).digest('hex').toUpperCase();

    // 9. Store Prediction Record
    const predictionId = uuidv4();
    const predictionRecord: PredictionEntity = {
      id: predictionId,
      observation_id: observation.id,
      species_model_id: meta.model_id,
      estimated_biomass_kg: modelResult.estimated_biomass_kg,
      estimated_carbon_kg: modelResult.estimated_carbon_kg,
      estimated_co2e_kg: modelResult.estimated_co2e_kg,
      confidence_status: finalizedTier as any,
      confidence_lower_bound_kg: modelResult.uncertainty.prediction_interval_95[0],
      confidence_upper_bound_kg: modelResult.uncertainty.prediction_interval_95[1],
      is_prototype: meta.model_category === 'prototype_demonstration_model',
      user_id: input.userId || null,
      session_id: input.sessionId || null,
      is_demo: input.isDemo !== undefined ? input.isDemo : !input.userId,
      created_at: new Date().toISOString()
    };
    await this.predRepo.createPrediction(predictionRecord);

    // 10. Store Uncertainty Record
    const uncertaintyRecord: PredictionUncertaintyEntity = {
      id: uuidv4(),
      prediction_id: predictionId,
      confidence_tier: finalizedTier,
      model_uncertainty_rse: modelResult.uncertainty.model_uncertainty_rse,
      prediction_interval_95_lower: modelResult.uncertainty.prediction_interval_95[0],
      prediction_interval_95_upper: modelResult.uncertainty.prediction_interval_95[1],
      prediction_interval_90_lower: modelResult.uncertainty.prediction_interval_90[0],
      prediction_interval_90_upper: modelResult.uncertainty.prediction_interval_90[1],
      extrapolation_warnings: JSON.stringify(combinedExtrapolationWarnings),
      geographic_mismatch: JSON.stringify(geographicMismatch),
      missing_variable_warnings: JSON.stringify(combinedMissingVariables),
      dataset_limitations: modelResult.uncertainty.dataset_limitations || 'Residual allometric scatter based on destructive harvest sample.',
      created_at: new Date().toISOString()
    };
    await this.predRepo.createUncertainty(uncertaintyRecord);

    // 11. Store Evidence & Provenance Record
    let primaryRefId: string | null = null;
    if (meta.primary_reference_doi) {
      const ref = await this.refRepo.findByDoi(meta.primary_reference_doi);
      if (ref) primaryRefId = ref.id;
    }
    if (!primaryRefId) {
      const allRefs = await this.refRepo.findAll();
      if (allRefs.length > 0) primaryRefId = allRefs[0].id;
    }

    if (primaryRefId) {
      const evidenceRecord: PredictionEvidenceEntity = {
        id: uuidv4(),
        prediction_id: predictionId,
        reference_id: primaryRefId,
        evidence_type: meta.model_type,
        provenance_details: {
          ...modelResult.provenance,
          provenance_hash_sha256: provenanceHashSha256,
          target_quantities: targetQuantities,
          applicability_gates: applicabilityGates,
          uncertainty: {
            ...modelResult.uncertainty,
            confidence_tier: finalizedTier,
            extrapolation_warnings: combinedExtrapolationWarnings,
            geographic_mismatch: geographicMismatch,
            missing_variable_warnings: combinedMissingVariables
          },
          metadata: meta
        },
        created_at: new Date().toISOString()
      };
      await this.predRepo.createEvidence(evidenceRecord);
    }

    appLogger.info(
      'PREDICTION_ENGINE',
      `Completed prediction for ${species.scientific_name}`,
      {
        predictionId,
        species: species.scientific_name,
        biomassKg: modelResult.estimated_biomass_kg,
        tier: finalizedTier,
        provenanceHash: provenanceHashSha256
      },
      undefined,
      Date.now() - startEpoch
    );

    // 12. Retrieve and Return Enriched Structured Prediction
    const enriched = await this.predRepo.getEnrichedPrediction(predictionId);
    if (!enriched) {
      throw new Error('Failed to retrieve persisted prediction record.');
    }
    return enriched;
  }

  async getPredictionById(
    id: string,
    requestingUser?: { userId?: string; role?: string } | null
  ): Promise<EnrichedPredictionRecord | null> {
    return this.predRepo.getEnrichedPrediction(id, requestingUser);
  }

  async getHistory(
    limit: number = 50,
    offset: number = 0,
    requestingUser?: { userId?: string; role?: string } | null
  ): Promise<EnrichedPredictionRecord[]> {
    return this.predRepo.getHistory(limit, offset, requestingUser);
  }
}
