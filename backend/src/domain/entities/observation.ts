export interface TreeObservationEntity {
  id: string;
  species_id: string;
  dbh_cm: number;
  height_m: number;
  crown_diameter_m?: number | null;
  wood_density_override?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  observation_notes?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  created_at?: string;
}
