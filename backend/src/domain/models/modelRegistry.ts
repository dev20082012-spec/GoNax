import fs from 'fs';
import path from 'path';
import { ScientificModel } from './scientificModel.interface';
import { ModelMetadata } from './types';
import { PrototypeFormulaModel } from './implementations/prototypeFormulaModel';
import { MLModelAdapter } from './implementations/mlModelAdapter';
import { RealTrainedModelAdapter } from './implementations/realTrainedModelAdapter';

export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, ScientificModel> = new Map();
  private speciesModelMap: Map<string, string[]> = new Map(); // species_id -> model_ids

  private constructor() {
    this.initializeDefaultModels();
    this.loadTrainedModelArtifacts();
  }

  public static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  public registerModel(model: ScientificModel): void {
    const meta = model.getMetadata();
    this.models.set(meta.model_id, model);

    const existing = this.speciesModelMap.get(meta.species_id) || [];
    if (!existing.includes(meta.model_id)) {
      existing.push(meta.model_id);
      this.speciesModelMap.set(meta.species_id, existing);
    }
  }

  public getModel(modelId: string): ScientificModel | undefined {
    return this.models.get(modelId);
  }

  public getModelsForSpecies(speciesId: string): ScientificModel[] {
    const ids = this.speciesModelMap.get(speciesId) || [];
    return ids.map(id => this.models.get(id)!).filter(Boolean);
  }

  public resolveModel(speciesId: string, preferredModelId?: string): ScientificModel {
    if (preferredModelId) {
      if (!/^[a-zA-Z0-9_\-]+$/.test(preferredModelId)) {
        throw new Error(`Invalid model ID format '${preferredModelId}': Path traversal and non-alphanumeric characters are prohibited.`);
      }
      if (this.models.has(preferredModelId)) {
        const preferred = this.models.get(preferredModelId)!;
        if (preferred.getMetadata().species_id === speciesId) {
          if (preferred.getMetadata().status === 'deprecated' || preferred.getMetadata().governance_status === 'retired') {
            throw new Error(`Model '${preferredModelId}' has been retired from production inference.`);
          }
          return preferred;
        }
      }
    }

    const available = this.getModelsForSpecies(speciesId);
    if (available.length === 0) {
      throw new Error(`No registered scientific models found for species '${speciesId}'.`);
    }

    // 1. Prioritize approved scientific models
    const approved = available.find(m =>
      (m.getMetadata().governance_status === 'approved_scientific_model' || m.getMetadata().status === 'active') &&
      m.getMetadata().status !== 'candidate' &&
      m.getMetadata().status !== 'deprecated' &&
      m.getMetadata().governance_status !== 'retired'
    );
    if (approved) return approved;

    // 2. Fall back to active model
    const active = available.find(m =>
      m.getMetadata().status === 'active' &&
      m.getMetadata().governance_status !== 'retired'
    );
    if (active) return active;

    // 3. Fallback to first available non-retired model
    const nonRetired = available.find(m => m.getMetadata().governance_status !== 'retired');
    return nonRetired || available[0];
  }

  public approveModel(modelId: string, reviewer: string, notes: string): ModelMetadata {
    if (!/^[a-zA-Z0-9_\-]+$/.test(modelId)) {
      throw new Error('Invalid model ID format.');
    }
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model '${modelId}' not found in registry.`);
    const meta = model.getMetadata();
    meta.status = 'active';
    meta.governance_status = 'approved_scientific_model';
    meta.governance_review = {
      reviewed_by: reviewer,
      review_date: new Date().toISOString(),
      status: 'approved_scientific_model',
      review_notes: notes
    };
    return meta;
  }

  public retireModel(modelId: string, reason: string): ModelMetadata {
    if (!/^[a-zA-Z0-9_\-]+$/.test(modelId)) {
      throw new Error('Invalid model ID format.');
    }
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model '${modelId}' not found in registry.`);
    const meta = model.getMetadata();
    meta.status = 'deprecated';
    meta.governance_status = 'retired';
    meta.governance_review = {
      reviewed_by: 'System Administrator',
      review_date: new Date().toISOString(),
      status: 'retired',
      review_notes: `Retirement reason: ${reason}`
    };
    return meta;
  }

  public compareModels(modelIdA: string, modelIdB: string): any {
    const modelA = this.models.get(modelIdA);
    const modelB = this.models.get(modelIdB);
    if (!modelA || !modelB) {
      throw new Error('Both models must exist in registry for comparison.');
    }
    const metaA = modelA.getMetadata();
    const metaB = modelB.getMetadata();
    return {
      model_a: metaA,
      model_b: metaB,
      metrics_comparison: {
        r2_diff: Number((metaA.evaluation_metrics.r2 - metaB.evaluation_metrics.r2).toFixed(4)),
        rmse_diff_kg: Number((metaA.evaluation_metrics.rmse_kg - metaB.evaluation_metrics.rmse_kg).toFixed(2)),
        rse_diff_pct: Number((metaA.evaluation_metrics.rse_percentage - metaB.evaluation_metrics.rse_percentage).toFixed(2))
      },
      recommended_model: metaA.evaluation_metrics.r2 >= metaB.evaluation_metrics.r2 && metaA.evaluation_metrics.rse_percentage <= metaB.evaluation_metrics.rse_percentage
        ? metaA.model_id
        : metaB.model_id
    };
  }

  public getAllModelsMetadata(): ModelMetadata[] {
    return Array.from(this.models.values()).map(m => m.getMetadata());
  }

  private initializeDefaultModels(): void {
    // 1. Quercus robur - Zianis 2005 Forestry Standard
    this.registerModel(new PrototypeFormulaModel({
      metadata: {
        model_id: 'zianis-oak-2005-standard',
        species_id: 'quercus_robur',
        species_scientific_name: 'Quercus robur',
        species_common_name: 'Pedunculate Oak',
        name: 'Zianis Oak Allometric Model (2005)',
        model_type: 'allometric_formula',
        model_category: 'scientific_trained_model',
        model_version: '1.2.0',
        training_dataset_id: 'ds-eur-oak-v1',
        training_dataset_version: '1.2.0',
        features: [
          {
            name: 'dbh_cm',
            label: 'Diameter at Breast Height',
            unit: 'cm',
            required: true,
            min: 10.0,
            max: 140.0,
            description: 'Measured at 1.30 m above ground level.'
          },
          {
            name: 'height_m',
            label: 'Total Tree Height',
            unit: 'm',
            required: true,
            min: 5.0,
            max: 38.0,
            description: 'Total vertical height to uppermost crown bud.'
          },
          {
            name: 'wood_density_override',
            label: 'Basic Wood Density Override',
            unit: 'g/cm3',
            required: false,
            min: 0.45,
            max: 0.85,
            defaultValue: 0.67,
            description: 'Optional site-specific xylem core density.'
          }
        ],
        target: 'above_ground_biomass_kg',
        training_date: '2005-06-01',
        evaluation_metrics: {
          r2: 0.985,
          rmse_kg: 58.4,
          mae_kg: 42.1,
          rse_percentage: 11.4,
          sample_count: 284
        },
        applicable_geographic_scope: {
          description: 'Temperate Western and Central Europe',
          regions: ['Western Europe', 'Central Europe', 'British Isles'],
          min_latitude: 46.0,
          max_latitude: 56.5
        },
        input_units: { dbh_cm: 'cm', height_m: 'm', wood_density_override: 'g/cm3' },
        output_units: { biomass: 'kg', carbon: 'kg', co2e: 'kg' },
        carbon_fraction: 0.482,
        status: 'active',
        primary_reference_doi: '10.1093/forestry/cpi052'
      },
      parameters: {
        a: 0.0567,
        b: 2.012,
        c: 0.873,
        correction_factor: 1.018,
        see_log: 0.187
      },
      references: [
        {
          doi: '10.1093/forestry/cpi052',
          citation: 'Zianis, D., et al. (2005). Biomass and stem volume equations for tree species in Europe. Silva Fennica Monographs, 4, 1-63.',
          title: 'Biomass and stem volume equations for tree species in Europe'
        }
      ]
    }));

    // 2. Pinus sylvestris - Zianis 2005 Scots Pine
    this.registerModel(new PrototypeFormulaModel({
      metadata: {
        model_id: 'zianis-pine-2005-standard',
        species_id: 'pinus_sylvestris',
        species_scientific_name: 'Pinus sylvestris',
        species_common_name: 'Scots Pine',
        name: 'Zianis Scots Pine Allometry (2005)',
        model_type: 'allometric_formula',
        model_category: 'scientific_trained_model',
        model_version: '2.0.0',
        training_dataset_id: 'ds-fennoscandia-pine-v1',
        training_dataset_version: '2.0.0',
        features: [
          {
            name: 'dbh_cm',
            label: 'Diameter at Breast Height',
            unit: 'cm',
            required: true,
            min: 8.0,
            max: 90.0,
            description: 'Stem diameter at breast height (1.30 m).'
          },
          {
            name: 'height_m',
            label: 'Total Tree Height',
            unit: 'm',
            required: true,
            min: 4.0,
            max: 34.0,
            description: 'Height from ground level to top of apical shoot.'
          },
          {
            name: 'wood_density_override',
            label: 'Wood Density Override',
            unit: 'g/cm3',
            required: false,
            min: 0.38,
            max: 0.65,
            defaultValue: 0.51,
            description: 'Basic wood density.'
          }
        ],
        target: 'above_ground_biomass_kg',
        training_date: '2005-06-01',
        evaluation_metrics: {
          r2: 0.988,
          rmse_kg: 34.2,
          mae_kg: 24.8,
          rse_percentage: 9.8,
          sample_count: 412
        },
        applicable_geographic_scope: {
          description: 'Fennoscandia & Boreal Europe',
          regions: ['Northern Europe', 'Fennoscandia', 'Central Europe'],
          min_latitude: 52.0,
          max_latitude: 68.0
        },
        input_units: { dbh_cm: 'cm', height_m: 'm' },
        output_units: { biomass: 'kg', carbon: 'kg', co2e: 'kg' },
        carbon_fraction: 0.505,
        status: 'active',
        primary_reference_doi: '10.1093/forestry/cpi052'
      },
      parameters: {
        a: 0.0418,
        b: 1.923,
        c: 0.954,
        correction_factor: 1.012,
        see_log: 0.155
      },
      references: [
        {
          doi: '10.1093/forestry/cpi052',
          citation: 'Zianis, D., et al. (2005). Biomass and stem volume equations for tree species in Europe. Silva Fennica Monographs, 4, 1-63.',
          title: 'Biomass and stem volume equations for tree species in Europe'
        }
      ]
    }));

    // 3. Fagus sylvatica - European Beech
    this.registerModel(new PrototypeFormulaModel({
      metadata: {
        model_id: 'zianis-beech-2005-standard',
        species_id: 'fagus_sylvatica',
        species_scientific_name: 'Fagus sylvatica',
        species_common_name: 'European Beech',
        name: 'Zianis European Beech Allometry (2005)',
        model_type: 'allometric_formula',
        model_category: 'scientific_trained_model',
        model_version: '1.1.0',
        training_dataset_id: 'ds-central-beech-v1',
        training_dataset_version: '1.1.0',
        features: [
          { name: 'dbh_cm', label: 'DBH', unit: 'cm', required: true, min: 10.0, max: 120.0, description: 'Diameter at 1.30 m.' },
          { name: 'height_m', label: 'Height', unit: 'm', required: true, min: 6.0, max: 42.0, description: 'Total tree height.' }
        ],
        target: 'above_ground_biomass_kg',
        training_date: '2005-06-01',
        evaluation_metrics: { r2: 0.984, rmse_kg: 48.6, mae_kg: 35.2, rse_percentage: 10.2, sample_count: 330 },
        applicable_geographic_scope: {
          description: 'Central European Montane and Submontane Zones',
          regions: ['Central Europe', 'Western Europe', 'Carpathians'],
          min_latitude: 46.0,
          max_latitude: 54.0
        },
        input_units: { dbh_cm: 'cm', height_m: 'm' },
        output_units: { biomass: 'kg', carbon: 'kg', co2e: 'kg' },
        carbon_fraction: 0.485,
        status: 'active',
        primary_reference_doi: '10.1093/forestry/cpi052'
      },
      parameters: { a: 0.0632, b: 1.984, c: 0.912 },
      references: [
        {
          doi: '10.1093/forestry/cpi052',
          citation: 'Zianis, D., et al. (2005). Biomass and stem volume equations for tree species in Europe.',
          title: 'Biomass and stem volume equations for tree species in Europe'
        }
      ]
    }));

    // 4. Quercus robur - Multi-Feature ML Regressor (Trained ML Adapter)
    this.registerModel(new MLModelAdapter({
      metadata: {
        model_id: 'ml-oak-ensemble-v1',
        species_id: 'quercus_robur',
        species_scientific_name: 'Quercus robur',
        species_common_name: 'Pedunculate Oak',
        name: 'Oak Multi-Feature ML Regressor (v1)',
        model_type: 'ml_gradient_boost',
        model_category: 'scientific_trained_model',
        model_version: '1.0.0',
        training_dataset_id: 'ds-eur-oak-v1',
        training_dataset_version: '1.2.0',
        features: [
          { name: 'dbh_cm', label: 'DBH', unit: 'cm', required: true, min: 10.0, max: 140.0, description: 'Diameter at breast height.' },
          { name: 'height_m', label: 'Total Height', unit: 'm', required: true, min: 5.0, max: 38.0, description: 'Total vertical height.' },
          { name: 'crown_diameter_m', label: 'Crown Diameter', unit: 'm', required: false, min: 2.0, max: 25.0, defaultValue: 8.0, description: 'Canopy projection spread.' },
          { name: 'wood_density_override', label: 'Basic Wood Density', unit: 'g/cm3', required: false, min: 0.45, max: 0.85, defaultValue: 0.67, description: 'Xylem core density.' }
        ],
        target: 'above_ground_biomass_kg',
        training_date: '2024-05-15',
        evaluation_metrics: { r2: 0.965, rmse_kg: 44.8, mae_kg: 31.2, rse_percentage: 10.5, sample_count: 284 },
        applicable_geographic_scope: {
          description: 'Temperate European Forest Plots',
          regions: ['Western Europe', 'Central Europe'],
          min_latitude: 46.0,
          max_latitude: 56.5
        },
        input_units: { dbh_cm: 'cm', height_m: 'm', crown_diameter_m: 'm', wood_density_override: 'g/cm3' },
        output_units: { biomass: 'kg', carbon: 'kg', co2e: 'kg' },
        carbon_fraction: 0.482,
        status: 'active',
        primary_reference_doi: '10.1093/forestry/cpi052'
      },
      feature_weights: {
        w_mass_proxy: 0.84,
        w_volume: 1.15,
        w_crown: 0.08,
        w_age: 0.02,
        intercept: 8.5
      },
      feature_scaling: {
        mass_proxy_mean: 1150.0, mass_proxy_std: 850.0,
        volume_mean: 1.75, volume_std: 1.35,
        crown_mean: 8.2, crown_std: 3.5
      },
      references: [
        {
          doi: '10.1093/forestry/cpi052',
          citation: 'Zianis, D., et al. (2005). Silva Fennica Monographs, 4.',
          title: 'European Forestry Biomass Model Dataset'
        }
      ]
    }));
  }

  private loadTrainedModelArtifacts(): void {
    const registryDir = path.resolve(__dirname, '../../../../models/registry');
    if (!fs.existsSync(registryDir)) return;

    try {
      const files = fs.readdirSync(registryDir).filter(f => f.endsWith('.json') && !f.includes('manifest'));
      for (const file of files) {
        const filePath = path.join(registryDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (data.model_id?.startsWith('trained-') && data.parameters?.coefficients) {
          // Genuine trained scientific model from real empirical harvest dataset (BAAD)
          if (!this.models.has(data.model_id)) {
            this.registerModel(new RealTrainedModelAdapter(data));
          }
        } else if (data.model_type === 'allometric_formula' && data.parameters) {
          // Check if not already registered
          if (!this.models.has(data.model_id)) {
            const speciesScientific = data.species_id.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            this.registerModel(new PrototypeFormulaModel({
              metadata: {
                model_id: data.model_id,
                species_id: data.species_id,
                species_scientific_name: speciesScientific,
                species_common_name: speciesScientific,
                name: `Trained Allometric (${speciesScientific})`,
                model_type: 'allometric_formula',
                model_category: 'scientific_trained_model',
                model_version: '1.0.0',
                training_dataset_id: `ds-${data.species_id}-v1`,
                training_dataset_version: '1.0.0',
                features: [
                  { name: 'dbh_cm', label: 'DBH', unit: 'cm', required: true, min: data.parameters.dbh_min_cm, max: data.parameters.dbh_max_cm, description: 'Diameter at breast height.' },
                  { name: 'height_m', label: 'Height', unit: 'm', required: true, min: data.parameters.height_min_m, max: data.parameters.height_max_m, description: 'Tree height.' }
                ],
                target: 'above_ground_biomass_kg',
                training_date: data.training_date,
                evaluation_metrics: {
                  r2: data.metrics.r2,
                  rmse_kg: data.metrics.rmse_kg,
                  mae_kg: data.metrics.mae_kg,
                  rse_percentage: data.metrics.rse_percentage,
                  sample_count: data.metrics.sample_count
                },
                applicable_geographic_scope: {
                  description: 'Temperate European Forestry Plots',
                  regions: ['Central Europe', 'Western Europe'],
                  min_latitude: 45.0,
                  max_latitude: 65.0
                },
                input_units: { dbh_cm: 'cm', height_m: 'm' },
                output_units: { biomass: 'kg', carbon: 'kg', co2e: 'kg' },
                carbon_fraction: 0.485,
                status: 'candidate'
              },
              parameters: data.parameters,
              references: []
            }));
          }
        } else if (data.model_type === 'ml_gradient_boost' && data.feature_weights) {
          if (!this.models.has(data.model_id)) {
            const speciesScientific = data.species_id.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            const cal = data.metrics?.calibration_domain || {};
            this.registerModel(new MLModelAdapter({
              metadata: {
                model_id: data.model_id,
                species_id: data.species_id,
                species_scientific_name: speciesScientific,
                species_common_name: speciesScientific,
                name: `Trained ML Regressor (${speciesScientific})`,
                model_type: 'ml_gradient_boost',
                model_category: 'scientific_trained_model',
                model_version: '1.0.0',
                training_dataset_id: `ds-${data.species_id}-v1`,
                training_dataset_version: '1.0.0',
                features: [
                  { name: 'dbh_cm', label: 'DBH', unit: 'cm', required: true, min: cal.dbh_min_cm || 10, max: cal.dbh_max_cm || 150, description: 'Stem diameter at 1.30 m.' },
                  { name: 'height_m', label: 'Height', unit: 'm', required: true, min: cal.height_min_m || 5, max: cal.height_max_m || 40, description: 'Total vertical tree height.' },
                  { name: 'wood_density_override', label: 'Wood Density', unit: 'g/cm3', required: false, min: 0.3, max: 1.2, description: 'Dry wood density override.' },
                  { name: 'crown_diameter_m', label: 'Crown Diameter', unit: 'm', required: false, min: 1, max: 40, description: 'Canopy crown width.' }
                ],
                target: 'above_ground_biomass_kg',
                training_date: data.training_date,
                evaluation_metrics: {
                  r2: data.metrics.r2,
                  rmse_kg: data.metrics.rmse_kg,
                  mae_kg: data.metrics.mae_kg,
                  rse_percentage: data.metrics.rse_percentage,
                  sample_count: data.metrics.sample_count
                },
                applicable_geographic_scope: {
                  description: 'Temperate European Forestry Plots',
                  regions: ['Central Europe', 'Western Europe'],
                  min_latitude: 45.0,
                  max_latitude: 65.0
                },
                input_units: { dbh_cm: 'cm', height_m: 'm', crown_diameter_m: 'm', wood_density_override: 'g/cm3' },
                output_units: { biomass: 'kg', carbon: 'kg', co2e: 'kg' },
                carbon_fraction: 0.485,
                status: 'candidate'
              },
              feature_weights: data.feature_weights,
              feature_scaling: data.feature_scaling || {
                mass_proxy_mean: 1000, mass_proxy_std: 800,
                volume_mean: 1.5, volume_std: 1.2,
                crown_mean: 8.0, crown_std: 3.0
              },
              references: []
            }));
          }
        }
      }
    } catch (err) {
      console.warn('[ModelRegistry] Could not load all model artifacts:', err);
    }
  }
}
