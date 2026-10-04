export interface SpeciesEntity {
  id: string;
  scientific_name: string;
  common_name: string;
  family: string;
  wood_density_mean: number;
  wood_density_sd: number;
  applicable_variables: string[]; // ['dbh_cm', 'height_m', ...]
  geographic_applicability: string[];
  created_at?: string;
  updated_at?: string;
}

export interface SpeciesDatasetEntity {
  id: string;
  name: string;
  version: string;
  description: string;
  sample_size: number;
  geographic_coverage: string;
  reference_id: string;
  created_at?: string;
}

export interface SpeciesModelEntity {
  id: string;
  species_id: string;
  dataset_id: string;
  name: string;
  model_type: string;
  version: string;
  formula_expression: string;
  parameters: any;
  carbon_fraction: number;
  uncertainty_percentage: number;
  is_prototype: boolean;
  created_at?: string;
}
