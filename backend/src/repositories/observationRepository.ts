import { getDatabase } from '../database/connection';
import { TreeObservationEntity } from '../domain/entities/observation';

export class ObservationRepository {
  private parseObservation(row: any): TreeObservationEntity {
    return {
      ...row,
      dbh_cm: Number(row.dbh_cm),
      height_m: Number(row.height_m),
      crown_diameter_m: row.crown_diameter_m != null ? Number(row.crown_diameter_m) : null,
      wood_density_override: row.wood_density_override != null ? Number(row.wood_density_override) : null,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null
    };
  }

  async findById(id: string): Promise<TreeObservationEntity | null> {
    const db = await getDatabase();
    const rows = await db.query(
      'SELECT id, species_id, dbh_cm, height_m, crown_diameter_m, wood_density_override, latitude, longitude, observation_notes, created_at FROM tree_observations WHERE id = $1',
      [id]
    );
    return rows.length > 0 ? this.parseObservation(rows[0]) : null;
  }

  async findBySpeciesId(speciesId: string): Promise<TreeObservationEntity[]> {
    const db = await getDatabase();
    const rows = await db.query(
      'SELECT id, species_id, dbh_cm, height_m, crown_diameter_m, wood_density_override, latitude, longitude, observation_notes, created_at FROM tree_observations WHERE species_id = $1 ORDER BY created_at DESC',
      [speciesId]
    );
    return rows.map(r => this.parseObservation(r));
  }

  async create(obs: TreeObservationEntity): Promise<TreeObservationEntity> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO tree_observations (id, species_id, dbh_cm, height_m, crown_diameter_m, wood_density_override, latitude, longitude, observation_notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        obs.id,
        obs.species_id,
        obs.dbh_cm,
        obs.height_m,
        obs.crown_diameter_m || null,
        obs.wood_density_override || null,
        obs.latitude || null,
        obs.longitude || null,
        obs.observation_notes || null,
        obs.created_at || new Date().toISOString()
      ]
    );
    return obs;
  }
}
