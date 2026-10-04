import { getDatabase } from '../database/connection';
import { ScientificReferenceEntity } from '../domain/entities/reference';

export class ReferenceRepository {
  async findAll(): Promise<ScientificReferenceEntity[]> {
    const db = await getDatabase();
    return db.query<ScientificReferenceEntity>(
      'SELECT id, doi, citation_text, title, authors, year, journal, url, created_at FROM scientific_references ORDER BY year DESC'
    );
  }

  async findById(id: string): Promise<ScientificReferenceEntity | null> {
    const db = await getDatabase();
    const rows = await db.query<ScientificReferenceEntity>(
      'SELECT id, doi, citation_text, title, authors, year, journal, url, created_at FROM scientific_references WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  async findByDoi(doi: string): Promise<ScientificReferenceEntity | null> {
    const db = await getDatabase();
    const rows = await db.query<ScientificReferenceEntity>(
      'SELECT id, doi, citation_text, title, authors, year, journal, url, created_at FROM scientific_references WHERE doi = $1',
      [doi]
    );
    return rows[0] || null;
  }

  async create(ref: ScientificReferenceEntity): Promise<ScientificReferenceEntity> {
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO scientific_references (id, doi, citation_text, title, authors, year, journal, url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        ref.id,
        ref.doi,
        ref.citation_text,
        ref.title,
        ref.authors,
        ref.year,
        ref.journal,
        ref.url,
        ref.created_at || new Date().toISOString()
      ]
    );
    return ref;
  }
}
