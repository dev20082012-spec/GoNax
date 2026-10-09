import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DatasetTransformationStep {
  step: number;
  action: string;
  records_in: number;
  records_out: number;
}

export interface DatasetLimitations {
  missingness?: string;
  geographic_limitation?: string;
  allometric_envelope?: string;
}

export interface DatasetMetadata {
  dataset_id: string;
  name: string;
  species_id: string;
  scientific_name: string;
  common_name: string;
  family: string;
  version: string;
  source: string;
  source_url?: string;
  access_date?: string;
  license?: string;
  permitted_uses?: string;
  publication_reference: {
    doi: string;
    citation: string;
    institution: string;
  };
  constituent_publications?: Array<{
    citation: string;
    doi: string;
    sample_count: number;
  }>;
  geographic_scope: {
    description: string;
    regions: string[];
    latitude_bounds: [number, number];
    longitude_bounds: [number, number];
    climate_zones?: string[];
  };
  sample_count: number;
  collection_methodology: string;
  measurement_definitions: Record<string, any>;
  allowed_input_variables: string[];
  target_variables: string[];
  target_variable_definition?: string;
  known_missingness_and_limitations?: DatasetLimitations;
  processing_and_transformation_history?: DatasetTransformationStep[];
  raw_source_file?: string;
  raw_file_sha256?: string;
  clean_source_file?: string;
  clean_file_sha256?: string;
  preprocessing_information: Record<string, any>;
  release_date: string;
  status: string;
}

export class DatasetService {
  private metadataDir: string;
  private projectRoot: string;
  private cache: Map<string, DatasetMetadata> = new Map();

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../');
    this.metadataDir = path.resolve(this.projectRoot, 'data/metadata');
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

  registerDataset(metadata: DatasetMetadata): void {
    if (!metadata.dataset_id || !metadata.version) {
      throw new Error('Dataset must have dataset_id and version.');
    }
    this.cache.set(metadata.dataset_id, metadata);

    // Save to disk
    const targetPath = path.join(this.metadataDir, `${metadata.dataset_id}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  calculateFileSha256(relativePath: string): string | null {
    const fullPath = path.resolve(this.projectRoot, relativePath);
    if (!fs.existsSync(fullPath)) return null;
    const fileBuffer = fs.readFileSync(fullPath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex').toUpperCase();
  }

  verifyChecksum(datasetId: string): {
    dataset_id: string;
    raw_valid: boolean;
    clean_valid: boolean;
    raw_expected?: string;
    raw_actual?: string;
    clean_expected?: string;
    clean_actual?: string;
  } {
    const ds = this.getDatasetById(datasetId);
    if (!ds) {
      throw new Error(`Dataset '${datasetId}' not found in registry.`);
    }

    let rawActual: string | undefined;
    let cleanActual: string | undefined;

    if (ds.raw_source_file) {
      rawActual = this.calculateFileSha256(ds.raw_source_file) || undefined;
    }
    if (ds.clean_source_file) {
      cleanActual = this.calculateFileSha256(ds.clean_source_file) || undefined;
    }

    const rawValid = !!ds.raw_file_sha256 && !!rawActual && ds.raw_file_sha256.toUpperCase() === rawActual.toUpperCase();
    const cleanValid = !!ds.clean_file_sha256 && !!cleanActual && ds.clean_file_sha256.toUpperCase() === cleanActual.toUpperCase();

    return {
      dataset_id: datasetId,
      raw_valid: rawValid,
      clean_valid: cleanValid,
      raw_expected: ds.raw_file_sha256,
      raw_actual: rawActual,
      clean_expected: ds.clean_file_sha256,
      clean_actual: cleanActual
    };
  }
}
