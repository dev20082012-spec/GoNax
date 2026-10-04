import fs from 'fs';
import path from 'path';

export interface DatasetMetadata {
  dataset_id: string;
  name: string;
  species_id: string;
  scientific_name: string;
  common_name: string;
  family: string;
  version: string;
  source: string;
  publication_reference: {
    doi: string;
    citation: string;
    institution: string;
  };
  geographic_scope: {
    description: string;
    regions: string[];
    latitude_bounds: [number, number];
    longitude_bounds: [number, number];
    climate_zones: string[];
  };
  sample_count: number;
  collection_methodology: string;
  measurement_definitions: Record<string, any>;
  allowed_input_variables: string[];
  target_variables: string[];
  preprocessing_information: Record<string, any>;
  release_date: string;
  status: string;
}

export class DatasetService {
  private metadataDir: string;
  private cache: Map<string, DatasetMetadata> = new Map();

  constructor() {
    this.metadataDir = path.resolve(__dirname, '../../../data/metadata');
    this.loadDatasets();
  }

  private loadDatasets() {
    if (!fs.existsSync(this.metadataDir)) return;
    try {
      const files = fs.readdirSync(this.metadataDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const raw = fs.readFileSync(path.join(this.metadataDir, file), 'utf-8');
        const ds = JSON.parse(raw) as DatasetMetadata;
        this.cache.set(ds.dataset_id, ds);
      }
    } catch (err) {
      console.warn('[DatasetService] Failed to load dataset metadata:', err);
    }
  }

  getAllDatasets(): DatasetMetadata[] {
    return Array.from(this.cache.values());
  }

  getDatasetById(id: string): DatasetMetadata | undefined {
    return this.cache.get(id);
  }

  getDatasetsForSpecies(speciesId: string): DatasetMetadata[] {
    return Array.from(this.cache.values()).filter(d => d.species_id === speciesId);
  }
}
