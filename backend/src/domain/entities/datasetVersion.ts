export interface DatasetVersionEntity {
  id: string;
  dataset_id: string;
  version: string;
  sample_count: number;
  geographic_scope: string;
  features_json: string;
  status: 'active' | 'deprecated' | 'candidate';
  metadata_json?: string | null;
  created_at?: string;
}
