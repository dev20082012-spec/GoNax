import { getDatabase } from '../database/connection';
import { SpeciesEntity, SpeciesDatasetEntity, SpeciesModelEntity } from '../domain/entities/species';

export class SpeciesRepository {
  private parseSpecies(row: any): SpeciesEntity {
    return {
      ...row,
      wood_density_mean: Number(row.wood_density_mean),
      wood_density_sd: Number(row.wood_density_sd),
      applicable_variables: typeof row.applicable_variables === 'string'
        ? JSON.parse(row.applicable_variables)
        : row.applicable_variables,
      geographic_applicability: typeof row.geographic_applicability === 'string'
        ? JSON.parse(row.geographic_applicability)
        : row.geographic_applicability
    };
  }

  private parseModel(row: any): SpeciesModelEntity {
    return {
      ...row,
      carbon_fraction: Number(row.carbon_fraction),
      uncertainty_percentage: Number(row.uncertainty_percentage),
      is_prototype: Boolean(row.is_prototype),
      parameters: typeof row.parameters === 'string'
        ? JSON.parse(row.parameters)
        : row.parameters
    };
  }

  async findAll(): Promise<SpeciesEntity[]> {
    const db = await getDatabase();
    const rows = await db.query(
      'SELECT id, scientific_name, common_name, family, wood_density_mean, wood_density_sd, applicable_variables, geographic_applicability, created_at, updated_at FROM species ORDER BY scientific_name ASC'
    );
    return rows.map(r => this.parseSpecies(r));
  }

  async findById(id: string): Promise<SpeciesEntity | null> {
    const db = await getDatabase();
    const rows = await db.query(
      'SELECT id, scientific_name, common_name, family, wood_density_mean, wood_density_sd, applicable_variables, geographic_applicability, created_at, updated_at FROM species WHERE id = $1',
      [id]
    );
    return rows.length > 0 ? this.parseSpecies(rows[0]) : null;
  }

  async findByScientificName(scientificName: string): Promise<SpeciesEntity | null> {
    const db = await getDatabase();
    const rows = await db.query(
      'SELECT id, scientific_name, common_name, family, wood_density_mean, wood_density_sd, applicable_variables, geographic_applicability, created_at, updated_at FROM species WHERE scientific_name = $1',
      [scientificName]
    );
    return rows.length > 0 ? this.parseSpecies(rows[0]) : null;
  }

  async getDatasetsBySpeciesId(speciesId: string): Promise<SpeciesDatasetEntity[]> {
    const db = await getDatabase();
    // In our relational schema, species models connect species to dataset
    const models = await this.getModelsBySpeciesId(speciesId);
    if (models.length === 0) return [];
    
    const datasets: SpeciesDatasetEntity[] = [];
    for (const m of models) {
      const dRows = await db.query<SpeciesDatasetEntity>(
        'SELECT id, name, version, description, sample_size, geographic_coverage, reference_id, created_at FROM species_datasets WHERE id = $1',
        [m.dataset_id]
      );
      if (dRows[0] && !datasets.some(d => d.id === dRows[0].id)) {
        datasets.push(dRows[0]);
      }
    }
    return datasets;
  }

  async getModelsBySpeciesId(speciesId: string): Promise<SpeciesModelEntity[]> {
    const db = await getDatabase();
    const rows = await db.query(
      'SELECT id, species_id, dataset_id, name, model_type, version, formula_expression, parameters, carbon_fraction, uncertainty_percentage, is_prototype, created_at FROM species_models WHERE species_id = $1',
      [speciesId]
    );
    return rows.map(r => this.parseModel(r));
  }

  async findModelById(modelId: string): Promise<SpeciesModelEntity | null> {
    const db = await getDatabase();
    const rows = await db.query(
      'SELECT id, species_id, dataset_id, name, model_type, version, formula_expression, parameters, carbon_fraction, uncertainty_percentage, is_prototype, created_at FROM species_models WHERE id = $1',
      [modelId]
    );
    return rows.length > 0 ? this.parseModel(rows[0]) : null;
  }

  async createSpecies(species: SpeciesEntity): Promise<SpeciesEntity> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO species (id, scientific_name, common_name, family, wood_density_mean, wood_density_sd, applicable_variables, geographic_applicability, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        species.id,
        species.scientific_name,
        species.common_name,
        species.family,
        species.wood_density_mean,
        species.wood_density_sd,
        JSON.stringify(species.applicable_variables),
        JSON.stringify(species.geographic_applicability),
        species.created_at || new Date().toISOString(),
        species.updated_at || new Date().toISOString()
      ]
    );
    return species;
  }

  async createDataset(dataset: SpeciesDatasetEntity): Promise<SpeciesDatasetEntity> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO species_datasets (id, name, version, description, sample_size, geographic_coverage, reference_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        dataset.id,
        dataset.name,
        dataset.version,
        dataset.description,
        dataset.sample_size,
        dataset.geographic_coverage,
        dataset.reference_id,
        dataset.created_at || new Date().toISOString()
      ]
    );
    return dataset;
  }

  async createModel(model: SpeciesModelEntity): Promise<SpeciesModelEntity> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO species_models (id, species_id, dataset_id, name, model_type, version, formula_expression, parameters, carbon_fraction, uncertainty_percentage, is_prototype, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        model.id,
        model.species_id,
        model.dataset_id,
        model.name,
        model.model_type,
        model.version,
        model.formula_expression,
        JSON.stringify(model.parameters),
        model.carbon_fraction,
        model.uncertainty_percentage,
        model.is_prototype,
        model.created_at || new Date().toISOString()
      ]
    );
    return model;
  }

  async createDatasetVersion(version: any): Promise<any> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO dataset_versions (id, dataset_id, version, sample_count, geographic_scope, features_json, status, metadata_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        version.id,
        version.dataset_id,
        version.version,
        version.sample_count,
        version.geographic_scope,
        typeof version.features_json === 'string' ? version.features_json : JSON.stringify(version.features_json || []),
        version.status || 'active',
        typeof version.metadata_json === 'string' ? version.metadata_json : JSON.stringify(version.metadata_json || {}),
        version.created_at || new Date().toISOString()
      ]
    );
    return version;
  }

  async getDatasetVersions(datasetId: string): Promise<any[]> {
    const db = await getDatabase();
    return db.query('SELECT * FROM dataset_versions WHERE dataset_id = $1 ORDER BY created_at DESC', [datasetId]);
  }

  async createModelVersion(version: any): Promise<any> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO model_versions (id, model_id, version, formula_expression, parameters_json, evaluation_metrics_json, is_active, is_prototype, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        version.id,
        version.model_id,
        version.version,
        version.formula_expression,
        typeof version.parameters_json === 'string' ? version.parameters_json : JSON.stringify(version.parameters_json || {}),
        typeof version.evaluation_metrics_json === 'string' ? version.evaluation_metrics_json : JSON.stringify(version.evaluation_metrics_json || {}),
        version.is_active ?? true,
        version.is_prototype ?? false,
        version.created_at || new Date().toISOString()
      ]
    );
    return version;
  }

  async getModelVersions(modelId: string): Promise<any[]> {
    const db = await getDatabase();
    return db.query('SELECT * FROM model_versions WHERE model_id = $1 ORDER BY created_at DESC', [modelId]);
  }
}

