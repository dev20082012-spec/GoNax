-- Migration 002: Scientific Knowledge & RAG Schema
-- Establishes the authoritative scientific knowledge layer for GoNax

CREATE TABLE IF NOT EXISTS knowledge_topics (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    parent_topic_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scientific_sources (
    id VARCHAR(100) PRIMARY KEY,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    year INTEGER NOT NULL,
    journal VARCHAR(255) NOT NULL,
    volume VARCHAR(50),
    pages VARCHAR(50),
    doi VARCHAR(255),
    url TEXT NOT NULL,
    publisher VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL, -- peer_reviewed_paper, dataset_documentation, model_documentation, institutional_report
    quality_tier VARCHAR(100) NOT NULL, -- authoritative_peer_reviewed, institutional_standard, verified_project_doc
    species_tags TEXT NOT NULL, -- JSON array
    topic_tags TEXT NOT NULL, -- JSON array
    geographic_scope TEXT NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ingestion_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scientific_sources_doi ON scientific_sources(doi);
CREATE INDEX IF NOT EXISTS idx_scientific_sources_source_type ON scientific_sources(source_type);

CREATE TABLE IF NOT EXISTS scientific_documents (
    id VARCHAR(100) PRIMARY KEY,
    source_id VARCHAR(100) NOT NULL REFERENCES scientific_sources(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    raw_content TEXT NOT NULL,
    clean_content TEXT NOT NULL,
    section_count INTEGER NOT NULL,
    word_count INTEGER NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scientific_documents_source_id ON scientific_documents(source_id);

CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(100) PRIMARY KEY,
    document_id VARCHAR(100) NOT NULL REFERENCES scientific_documents(id) ON DELETE CASCADE,
    source_id VARCHAR(100) NOT NULL REFERENCES scientific_sources(id) ON DELETE CASCADE,
    section_title VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL,
    start_char INTEGER NOT NULL,
    end_char INTEGER NOT NULL,
    token_count INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    species_tags TEXT NOT NULL, -- JSON array
    topic_tags TEXT NOT NULL, -- JSON array
    geographic_tags TEXT NOT NULL, -- JSON array
    evidence_type VARCHAR(100) NOT NULL, -- empirical_harvest, mathematical_model, physiological_synthesis, inventory_standard
    embedding_json TEXT, -- JSON array of floats representing semantic vector
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_source_id ON document_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);

CREATE TABLE IF NOT EXISTS scientific_claims (
    id VARCHAR(100) PRIMARY KEY,
    source_id VARCHAR(100) NOT NULL REFERENCES scientific_sources(id) ON DELETE CASCADE,
    chunk_id VARCHAR(100) REFERENCES document_chunks(id) ON DELETE SET NULL,
    species_id VARCHAR(100),
    topic_id VARCHAR(100) REFERENCES knowledge_topics(id) ON DELETE RESTRICT,
    claim_text TEXT NOT NULL,
    claim_type VARCHAR(100) NOT NULL, -- empirical_finding, mathematical_relation, parameter_value, boundary_condition
    evidence_level VARCHAR(50) NOT NULL, -- direct_harvest_measurement, meta_analysis, theoretical_derivation, institutional_guidance
    uncertainty_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scientific_claims_species_id ON scientific_claims(species_id);
CREATE INDEX IF NOT EXISTS idx_scientific_claims_topic_id ON scientific_claims(topic_id);

CREATE TABLE IF NOT EXISTS model_documentations (
    id VARCHAR(100) PRIMARY KEY,
    model_id VARCHAR(100) NOT NULL,
    source_id VARCHAR(100) NOT NULL REFERENCES scientific_sources(id) ON DELETE CASCADE,
    species_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    formula_expression TEXT,
    features_json TEXT NOT NULL,
    calibration_domain_json TEXT NOT NULL,
    evaluation_metrics_json TEXT NOT NULL,
    limitations TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dataset_documentations (
    id VARCHAR(100) PRIMARY KEY,
    dataset_id VARCHAR(100) NOT NULL,
    source_id VARCHAR(100) NOT NULL REFERENCES scientific_sources(id) ON DELETE CASCADE,
    species_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sample_size INTEGER NOT NULL,
    harvest_protocol TEXT NOT NULL,
    measurement_envelopes_json TEXT NOT NULL,
    geographic_coverage TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS knowledge_ingestion_audit (
    id VARCHAR(100) PRIMARY KEY,
    source_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- ingested, updated, deactivated, reindexed
    version VARCHAR(50) NOT NULL,
    document_hash VARCHAR(64) NOT NULL,
    chunks_created INTEGER NOT NULL,
    claims_extracted INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
