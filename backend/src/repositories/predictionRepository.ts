import { getDatabase } from '../database/connection';
import { PredictionEntity, PredictionEvidenceEntity } from '../domain/entities/prediction';
import { PredictionUncertaintyEntity } from '../domain/entities/uncertainty';
import { PredictionExplanationEntity } from '../domain/entities/explanation';
import { ConfidenceStatus } from '../domain/engine/types';

export interface EnrichedPredictionRecord {
  prediction: PredictionEntity;
  observation: {
    id: string;
    species_id: string;
    dbh_cm: number;
    height_m: number;
    crown_diameter_m?: number | null;
    wood_density_override?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    observation_notes?: string | null;
    created_at?: string;
  };
  species: {
    id: string;
    scientific_name: string;
    common_name: string;
    family: string;
    wood_density_mean: number;
    wood_density_sd: number;
  };
  model: {
    id: string;
    name: string;
    model_type: string;
    version: string;
    formula_expression: string;
    parameters: any;
    carbon_fraction: number;
    uncertainty_percentage: number;
    is_prototype: boolean;
  };
  uncertainty?: PredictionUncertaintyEntity | null;
  explanations?: PredictionExplanationEntity[];
  evidences: Array<{
    id: string;
    evidence_type: string;
    provenance_details: any;
    reference: {
      id: string;
      doi: string;
      citation_text: string;
      title: string;
      authors: string;
      year: number;
      journal: string;
      url: string;
    } | null;
  }>;
}

export class PredictionRepository {
  private parsePrediction(row: any): PredictionEntity {
    return {
      id: row.id,
      observation_id: row.observation_id,
      species_model_id: row.species_model_id,
      estimated_biomass_kg: Number(row.estimated_biomass_kg),
      estimated_carbon_kg: Number(row.estimated_carbon_kg),
      estimated_co2e_kg: Number(row.estimated_co2e_kg),
      confidence_status: row.confidence_status as ConfidenceStatus,
      confidence_lower_bound_kg: Number(row.confidence_lower_bound_kg),
      confidence_upper_bound_kg: Number(row.confidence_upper_bound_kg),
      is_prototype: Boolean(row.is_prototype),
      created_at: row.created_at
    };
  }

  async createPrediction(pred: PredictionEntity): Promise<PredictionEntity> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO predictions (id, observation_id, species_model_id, estimated_biomass_kg, estimated_carbon_kg, estimated_co2e_kg, confidence_status, confidence_lower_bound_kg, confidence_upper_bound_kg, is_prototype, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        pred.id,
        pred.observation_id,
        pred.species_model_id,
        pred.estimated_biomass_kg,
        pred.estimated_carbon_kg,
        pred.estimated_co2e_kg,
        pred.confidence_status,
        pred.confidence_lower_bound_kg,
        pred.confidence_upper_bound_kg,
        pred.is_prototype,
        pred.created_at || new Date().toISOString()
      ]
    );
    return pred;
  }

  async createEvidence(evidence: PredictionEvidenceEntity): Promise<PredictionEvidenceEntity> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO prediction_evidences (id, prediction_id, reference_id, evidence_type, provenance_details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        evidence.id,
        evidence.prediction_id,
        evidence.reference_id,
        evidence.evidence_type,
        typeof evidence.provenance_details === 'string'
          ? evidence.provenance_details
          : JSON.stringify(evidence.provenance_details),
        evidence.created_at || new Date().toISOString()
      ]
    );
    return evidence;
  }

  async createUncertainty(unc: PredictionUncertaintyEntity): Promise<PredictionUncertaintyEntity> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO prediction_uncertainties (id, prediction_id, confidence_tier, model_uncertainty_rse, prediction_interval_95_lower, prediction_interval_95_upper, prediction_interval_90_lower, prediction_interval_90_upper, extrapolation_warnings, geographic_mismatch, missing_variable_warnings, dataset_limitations, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        unc.id,
        unc.prediction_id,
        unc.confidence_tier,
        unc.model_uncertainty_rse,
        unc.prediction_interval_95_lower,
        unc.prediction_interval_95_upper,
        unc.prediction_interval_90_lower,
        unc.prediction_interval_90_upper,
        typeof unc.extrapolation_warnings === 'string' ? unc.extrapolation_warnings : JSON.stringify(unc.extrapolation_warnings || []),
        typeof unc.geographic_mismatch === 'string' ? unc.geographic_mismatch : JSON.stringify(unc.geographic_mismatch || {}),
        typeof unc.missing_variable_warnings === 'string' ? unc.missing_variable_warnings : JSON.stringify(unc.missing_variable_warnings || []),
        unc.dataset_limitations || '',
        unc.created_at || new Date().toISOString()
      ]
    );
    return unc;
  }

  async createExplanation(exp: PredictionExplanationEntity): Promise<PredictionExplanationEntity> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO prediction_explanations (id, prediction_id, question, answer, provider, model_name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        exp.id,
        exp.prediction_id,
        exp.question,
        exp.answer,
        exp.provider,
        exp.model_name,
        exp.created_at || new Date().toISOString()
      ]
    );
    return exp;
  }

  async getExplanationsByPredictionId(predictionId: string): Promise<PredictionExplanationEntity[]> {
    const db = await getDatabase();
    return db.query('SELECT * FROM prediction_explanations WHERE prediction_id = $1 ORDER BY created_at ASC', [predictionId]);
  }

  async findById(id: string): Promise<PredictionEntity | null> {
    const db = await getDatabase();
    const rows = await db.query('SELECT * FROM predictions WHERE id = $1', [id]);
    return rows.length > 0 ? this.parsePrediction(rows[0]) : null;
  }

  async getEnrichedPrediction(id: string): Promise<EnrichedPredictionRecord | null> {
    const db = await getDatabase();
    const predRows = await db.query('SELECT * FROM predictions WHERE id = $1', [id]);
    if (predRows.length === 0) return null;
    const prediction = this.parsePrediction(predRows[0]);

    // Fetch observation
    const obsRows = await db.query('SELECT * FROM tree_observations WHERE id = $1', [prediction.observation_id]);
    const rawObs = obsRows[0];
    const observation = {
      id: rawObs.id,
      species_id: rawObs.species_id,
      dbh_cm: Number(rawObs.dbh_cm),
      height_m: Number(rawObs.height_m),
      crown_diameter_m: rawObs.crown_diameter_m != null ? Number(rawObs.crown_diameter_m) : null,
      wood_density_override: rawObs.wood_density_override != null ? Number(rawObs.wood_density_override) : null,
      latitude: rawObs.latitude != null ? Number(rawObs.latitude) : null,
      longitude: rawObs.longitude != null ? Number(rawObs.longitude) : null,
      observation_notes: rawObs.observation_notes || null,
      created_at: rawObs.created_at
    };

    // Fetch model
    const modelRows = await db.query('SELECT * FROM species_models WHERE id = $1', [prediction.species_model_id]);
    let model: any;
    if (modelRows[0]) {
      const rawModel = modelRows[0];
      model = {
        id: rawModel.id,
        name: rawModel.name,
        model_type: rawModel.model_type,
        version: rawModel.version,
        formula_expression: rawModel.formula_expression,
        parameters: typeof rawModel.parameters === 'string' ? JSON.parse(rawModel.parameters) : rawModel.parameters,
        carbon_fraction: Number(rawModel.carbon_fraction),
        uncertainty_percentage: Number(rawModel.uncertainty_percentage),
        is_prototype: Boolean(rawModel.is_prototype)
      };
    } else {
      const { ModelRegistry } = require('../domain/models/modelRegistry');
      const regModel = ModelRegistry.getInstance().getModel(prediction.species_model_id);
      if (regModel) {
        const meta = regModel.getMetadata();
        model = {
          id: meta.model_id,
          name: meta.name,
          model_type: meta.model_type,
          version: meta.model_version,
          formula_expression: meta.name,
          parameters: meta.features,
          carbon_fraction: meta.carbon_fraction,
          uncertainty_percentage: meta.evaluation_metrics.rse_percentage,
          is_prototype: meta.model_category === 'prototype_demonstration_model'
        };
      } else {
        model = {
          id: prediction.species_model_id,
          name: prediction.species_model_id,
          model_type: 'allometric_formula',
          version: '1.0.0',
          formula_expression: 'AGB = a * (DBH^b) * (H^c)',
          parameters: {},
          carbon_fraction: 0.485,
          uncertainty_percentage: 12.0,
          is_prototype: true
        };
      }
    }

    // Fetch species
    let speciesRows = await db.query('SELECT * FROM species WHERE id = $1', [rawObs.species_id]);
    if (speciesRows.length === 0) {
      speciesRows = await db.query('SELECT * FROM species WHERE scientific_name = $1', [rawObs.species_id]);
    }
    const rawSpecies = speciesRows[0] || {
      id: rawObs.species_id,
      scientific_name: rawObs.species_id,
      common_name: rawObs.species_id,
      family: 'Unknown',
      wood_density_mean: 0.65,
      wood_density_sd: 0.05
    };
    const species = {
      id: rawSpecies.id,
      scientific_name: rawSpecies.scientific_name,
      common_name: rawSpecies.common_name,
      family: rawSpecies.family,
      wood_density_mean: Number(rawSpecies.wood_density_mean),
      wood_density_sd: Number(rawSpecies.wood_density_sd)
    };

    // Fetch uncertainty record
    const uncRows = await db.query('SELECT * FROM prediction_uncertainties WHERE prediction_id = $1', [prediction.id]);
    let uncertainty: PredictionUncertaintyEntity | null = null;
    if (uncRows[0]) {
      const u = uncRows[0];
      uncertainty = {
        id: u.id,
        prediction_id: u.prediction_id,
        confidence_tier: u.confidence_tier,
        model_uncertainty_rse: Number(u.model_uncertainty_rse),
        prediction_interval_95_lower: Number(u.prediction_interval_95_lower),
        prediction_interval_95_upper: Number(u.prediction_interval_95_upper),
        prediction_interval_90_lower: Number(u.prediction_interval_90_lower),
        prediction_interval_90_upper: Number(u.prediction_interval_90_upper),
        extrapolation_warnings: u.extrapolation_warnings,
        geographic_mismatch: u.geographic_mismatch,
        missing_variable_warnings: u.missing_variable_warnings,
        dataset_limitations: u.dataset_limitations,
        created_at: u.created_at
      };
    }

    // Fetch explanations
    const expRows = await db.query('SELECT * FROM prediction_explanations WHERE prediction_id = $1 ORDER BY created_at ASC', [prediction.id]);
    const explanations: PredictionExplanationEntity[] = expRows.map((e: any) => ({
      id: e.id,
      prediction_id: e.prediction_id,
      question: e.question,
      answer: e.answer,
      provider: e.provider,
      model_name: e.model_name,
      created_at: e.created_at
    }));

    // Fetch evidences
    const evidenceRows = await db.query('SELECT * FROM prediction_evidences WHERE prediction_id = $1', [prediction.id]);
    const evidences: EnrichedPredictionRecord['evidences'] = [];
    for (const ev of evidenceRows) {
      const refRows = await db.query('SELECT * FROM scientific_references WHERE id = $1', [ev.reference_id]);
      const ref = refRows[0] || null;
      evidences.push({
        id: ev.id,
        evidence_type: ev.evidence_type,
        provenance_details: typeof ev.provenance_details === 'string' ? JSON.parse(ev.provenance_details) : ev.provenance_details,
        reference: ref ? {
          id: ref.id,
          doi: ref.doi,
          citation_text: ref.citation_text,
          title: ref.title,
          authors: ref.authors,
          year: Number(ref.year),
          journal: ref.journal,
          url: ref.url
        } : null
      });
    }

    return {
      prediction,
      observation,
      species,
      model,
      uncertainty,
      explanations,
      evidences
    };
  }

  async findRecent(limit: number = 10): Promise<PredictionEntity[]> {
    const db = await getDatabase();
    const rows = await db.query('SELECT * FROM predictions ORDER BY created_at DESC');
    return rows.slice(0, limit).map(r => this.parsePrediction(r));
  }

  async findEnrichedById(id: string): Promise<EnrichedPredictionRecord | null> {
    return this.getEnrichedPrediction(id);
  }

  async getHistory(limit: number = 50, offset: number = 0): Promise<EnrichedPredictionRecord[]> {
    const db = await getDatabase();
    const predRows = await db.query('SELECT * FROM predictions ORDER BY created_at DESC');
    const sliced = predRows.slice(offset, offset + limit);
    const enrichedList: EnrichedPredictionRecord[] = [];
    for (const row of sliced) {
      const enriched = await this.getEnrichedPrediction(row.id);
      if (enriched) enrichedList.push(enriched);
    }
    return enrichedList;
  }
}

