import { ConfidenceStatus } from '../engine/types';

export interface PredictionEntity {
  id: string;
  observation_id: string;
  species_model_id: string;
  estimated_biomass_kg: number;
  estimated_carbon_kg: number;
  estimated_co2e_kg: number;
  confidence_status: ConfidenceStatus;
  confidence_lower_bound_kg: number;
  confidence_upper_bound_kg: number;
  is_prototype: boolean;
  user_id?: string | null;
  session_id?: string | null;
  is_demo?: boolean;
  created_at?: string;
}

export interface PredictionEvidenceEntity {
  id: string;
  prediction_id: string;
  reference_id: string;
  evidence_type: string;
  provenance_details: any;
  created_at?: string;
}
