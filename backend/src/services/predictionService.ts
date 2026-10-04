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
import { ValidationService, ScientificValidationError } from './validationService';

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
    input: TreeMeasurementInput & { preferredModelId?: string }
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

    console.log(`[Audit:PredictionRequest] Taxon="${species.scientific_name}" DBH=${input.dbhCm}cm Height=${input.heightM}m`);

    // Convert scientific name to snake_case species ID for registry lookup
    const registrySpeciesKey = species.scientific_name.toLowerCase().replace(/\s+/g, '_');

    // 2. Resolve Scientific Model dynamically from ModelRegistry
    let model: ScientificModel | null = null;
    try {
      model = this.modelRegistry.resolveModel(registrySpeciesKey, input.preferredModelId);
    } catch {
      // Fallback: search by scientific name in all registered models
      const models = this.modelRegistry.getAllModelsMetadata();
      const match = models.find(m => m.species_scientific_name.toLowerCase() === species.scientific_name.toLowerCase());
      if (match) {
        model = this.modelRegistry.getModel(match.model_id) || null;
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
    console.log(`[Audit:ModelRouting] Model="${meta.model_id}" Version="${meta.model_version}" Category="${meta.model_category}"`);

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
      created_at: new Date().toISOString()
    });

    // 5. Execute Deterministic Model Prediction
    // (LLMs NEVER calculate carbon values; only deterministic models or trained ML regressors)
    const predictionInput = {
      dbh_cm: observation.dbh_cm,
      height_m: observation.height_m,
      crown_diameter_m: observation.crown_diameter_m,
      wood_density_override: observation.wood_density_override || species.wood_density_mean,
      latitude: observation.latitude,
      longitude: observation.longitude,
      notes: observation.observation_notes
    };

    const modelResult = await model.predict(predictionInput);

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

    // 6. Store Prediction Record
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
      created_at: new Date().toISOString()
    };
    await this.predRepo.createPrediction(predictionRecord);

    // 7. Store Uncertainty Record
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

    // 8. Store Evidence & Provenance Record
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

    console.log(
      `[Audit:PredictionSuccess] ID="${predictionId}" Taxon="${species.scientific_name}" Biomass=${modelResult.estimated_biomass_kg}kg Carbon=${modelResult.estimated_carbon_kg}kg Tier="${finalizedTier}" Duration=${Date.now() - startEpoch}ms`
    );

    // 9. Retrieve and Return Enriched Structured Prediction
    const enriched = await this.predRepo.getEnrichedPrediction(predictionId);
    if (!enriched) {
      throw new Error('Failed to retrieve persisted prediction record.');
    }
    return enriched;
  }

  async getPredictionById(id: string): Promise<EnrichedPredictionRecord | null> {
    return this.predRepo.getEnrichedPrediction(id);
  }

  async getHistory(limit: number = 50, offset: number = 0): Promise<EnrichedPredictionRecord[]> {
    return this.predRepo.getHistory(limit, offset);
  }
}
