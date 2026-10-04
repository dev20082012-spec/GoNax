import { getDatabase, IDatabase } from '../database/connection';
import {
  ScientificSource,
  ScientificDocument,
  DocumentChunk,
  ScientificClaim,
  KnowledgeTopic,
  ModelDocumentation,
  DatasetDocumentation,
  KnowledgeIngestionAudit
} from '../domain/entities/knowledge';

export class KnowledgeRepository {
  private async getDb(): Promise<IDatabase> {
    return await getDatabase();
  }

  async getAllSources(activeOnly = true): Promise<ScientificSource[]> {
    const db = await this.getDb();
    let rows: any[];
    if (activeOnly) {
      rows = await db.query(
        'SELECT * FROM scientific_sources WHERE is_active = $1 ORDER BY year DESC',
        [true]
      );
    } else {
      rows = await db.query('SELECT * FROM scientific_sources ORDER BY year DESC');
    }
    return rows.map(this.mapSourceRow);
  }

  async getSourceById(id: string): Promise<ScientificSource | null> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM scientific_sources WHERE id = $1', [id]);
    if (rows.length === 0) return null;
    return this.mapSourceRow(rows[0]);
  }

  async createSource(source: ScientificSource): Promise<ScientificSource> {
    const db = await this.getDb();
    await db.execute(
      `INSERT INTO scientific_sources (id, title, authors, year, journal, volume, pages, doi, url, publisher, source_type, quality_tier, species_tags, topic_tags, geographic_scope, version, is_active, ingestion_date, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        source.id,
        source.title,
        source.authors,
        source.year,
        source.journal,
        source.volume || '',
        source.pages || '',
        source.doi || '',
        source.url,
        source.publisher,
        source.source_type,
        source.quality_tier,
        JSON.stringify(source.species_tags),
        JSON.stringify(source.topic_tags),
        source.geographic_scope,
        source.version,
        source.is_active,
        source.ingestion_date || new Date().toISOString(),
        source.updated_at || new Date().toISOString()
      ]
    );
    return source;
  }

  private mapSourceRow(row: any): ScientificSource {
    return {
      ...row,
      year: parseInt(row.year, 10),
      is_active: Boolean(row.is_active),
      species_tags: typeof row.species_tags === 'string' ? JSON.parse(row.species_tags) : row.species_tags,
      topic_tags: typeof row.topic_tags === 'string' ? JSON.parse(row.topic_tags) : row.topic_tags
    };
  }

  async getDocumentBySourceId(sourceId: string): Promise<ScientificDocument | null> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM scientific_documents WHERE source_id = $1', [sourceId]);
    if (rows.length === 0) return null;
    return rows[0] as ScientificDocument;
  }

  async createDocument(doc: ScientificDocument): Promise<ScientificDocument> {
    const db = await this.getDb();
    await db.execute(
      `INSERT INTO scientific_documents (id, source_id, file_name, sha256_hash, raw_content, clean_content, section_count, word_count, version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        doc.id,
        doc.source_id,
        doc.file_name,
        doc.sha256_hash,
        doc.raw_content,
        doc.clean_content,
        doc.section_count,
        doc.word_count,
        doc.version,
        doc.created_at || new Date().toISOString()
      ]
    );
    return doc;
  }

  async getAllChunks(): Promise<DocumentChunk[]> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM document_chunks ORDER BY chunk_index ASC');
    return rows.map(this.mapChunkRow);
  }

  async getChunksBySourceId(sourceId: string): Promise<DocumentChunk[]> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM document_chunks WHERE source_id = $1 ORDER BY chunk_index ASC', [sourceId]);
    return rows.map(this.mapChunkRow);
  }

  async createChunk(chunk: DocumentChunk): Promise<DocumentChunk> {
    const db = await this.getDb();
    await db.execute(
      `INSERT INTO document_chunks (id, document_id, source_id, section_title, chunk_index, start_char, end_char, token_count, chunk_text, species_tags, topic_tags, geographic_tags, evidence_type, embedding_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        chunk.id,
        chunk.document_id,
        chunk.source_id,
        chunk.section_title,
        chunk.chunk_index,
        chunk.start_char,
        chunk.end_char,
        chunk.token_count,
        chunk.chunk_text,
        JSON.stringify(chunk.species_tags),
        JSON.stringify(chunk.topic_tags),
        JSON.stringify(chunk.geographic_tags),
        chunk.evidence_type,
        chunk.embedding_json || '[]',
        chunk.created_at || new Date().toISOString()
      ]
    );
    return chunk;
  }

  async deleteChunksBySourceId(sourceId: string): Promise<void> {
    const db = await this.getDb();
    await db.execute('DELETE FROM document_chunks WHERE source_id = $1', [sourceId]);
  }

  private mapChunkRow(row: any): DocumentChunk {
    return {
      ...row,
      chunk_index: parseInt(row.chunk_index, 10),
      start_char: parseInt(row.start_char, 10),
      end_char: parseInt(row.end_char, 10),
      token_count: parseInt(row.token_count, 10),
      species_tags: typeof row.species_tags === 'string' ? JSON.parse(row.species_tags) : row.species_tags,
      topic_tags: typeof row.topic_tags === 'string' ? JSON.parse(row.topic_tags) : row.topic_tags,
      geographic_tags: typeof row.geographic_tags === 'string' ? JSON.parse(row.geographic_tags) : row.geographic_tags
    };
  }

  async getAllClaims(): Promise<ScientificClaim[]> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM scientific_claims');
    return rows as ScientificClaim[];
  }

  async getClaimsBySourceId(sourceId: string): Promise<ScientificClaim[]> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM scientific_claims WHERE source_id = $1', [sourceId]);
    return rows as ScientificClaim[];
  }

  async getClaimsBySpecies(speciesId: string): Promise<ScientificClaim[]> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM scientific_claims WHERE species_id = $1', [speciesId]);
    return rows as ScientificClaim[];
  }

  async createClaim(claim: ScientificClaim): Promise<ScientificClaim> {
    const db = await this.getDb();
    await db.execute(
      `INSERT INTO scientific_claims (id, source_id, chunk_id, species_id, topic_id, claim_text, claim_type, evidence_level, uncertainty_note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        claim.id,
        claim.source_id,
        claim.chunk_id || null,
        claim.species_id || null,
        claim.topic_id,
        claim.claim_text,
        claim.claim_type,
        claim.evidence_level,
        claim.uncertainty_note || null,
        claim.created_at || new Date().toISOString()
      ]
    );
    return claim;
  }

  async getAllTopics(): Promise<KnowledgeTopic[]> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM knowledge_topics');
    return rows as KnowledgeTopic[];
  }

  async createTopic(topic: KnowledgeTopic): Promise<KnowledgeTopic> {
    const db = await this.getDb();
    await db.execute(
      `INSERT INTO knowledge_topics (id, name, description, category, parent_topic_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [topic.id, topic.name, topic.description, topic.category, topic.parent_topic_id || null]
    );
    return topic;
  }

  async getAllModelDocs(): Promise<ModelDocumentation[]> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM model_documentations');
    return rows as ModelDocumentation[];
  }

  async getModelDocByModelId(modelId: string): Promise<ModelDocumentation | null> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM model_documentations WHERE model_id = $1', [modelId]);
    if (rows.length === 0) return null;
    return rows[0] as ModelDocumentation;
  }

  async createModelDoc(doc: ModelDocumentation): Promise<ModelDocumentation> {
    const db = await this.getDb();
    await db.execute(
      `INSERT INTO model_documentations (id, model_id, source_id, species_id, name, algorithm, formula_expression, features_json, calibration_domain_json, evaluation_metrics_json, limitations, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        doc.id,
        doc.model_id,
        doc.source_id,
        doc.species_id,
        doc.name,
        doc.algorithm,
        doc.formula_expression || null,
        doc.features_json,
        doc.calibration_domain_json,
        doc.evaluation_metrics_json,
        doc.limitations,
        doc.created_at || new Date().toISOString()
      ]
    );
    return doc;
  }

  async getAllDatasetDocs(): Promise<DatasetDocumentation[]> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM dataset_documentations');
    return rows as DatasetDocumentation[];
  }

  async getDatasetDocByDatasetId(datasetId: string): Promise<DatasetDocumentation | null> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM dataset_documentations WHERE dataset_id = $1', [datasetId]);
    if (rows.length === 0) return null;
    return rows[0] as DatasetDocumentation;
  }

  async createDatasetDoc(doc: DatasetDocumentation): Promise<DatasetDocumentation> {
    const db = await this.getDb();
    await db.execute(
      `INSERT INTO dataset_documentations (id, dataset_id, source_id, species_id, name, sample_size, harvest_protocol, measurement_envelopes_json, geographic_coverage, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        doc.id,
        doc.dataset_id,
        doc.source_id,
        doc.species_id,
        doc.name,
        doc.sample_size,
        doc.harvest_protocol,
        doc.measurement_envelopes_json,
        doc.geographic_coverage,
        doc.created_at || new Date().toISOString()
      ]
    );
    return doc;
  }

  async createAuditLog(audit: KnowledgeIngestionAudit): Promise<KnowledgeIngestionAudit> {
    const db = await this.getDb();
    await db.execute(
      `INSERT INTO knowledge_ingestion_audit (id, source_id, action, version, document_hash, chunks_created, claims_extracted, status, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        audit.id,
        audit.source_id,
        audit.action,
        audit.version,
        audit.document_hash,
        audit.chunks_created,
        audit.claims_extracted,
        audit.status,
        audit.details || null,
        audit.created_at || new Date().toISOString()
      ]
    );
    return audit;
  }

  async getAllAuditLogs(): Promise<KnowledgeIngestionAudit[]> {
    const db = await this.getDb();
    const rows = await db.query('SELECT * FROM knowledge_ingestion_audit ORDER BY created_at DESC');
    return rows as KnowledgeIngestionAudit[];
  }
}
