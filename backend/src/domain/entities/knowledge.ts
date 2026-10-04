export type SourceType =
  | 'peer_reviewed_paper'
  | 'scientific_report'
  | 'authoritative_forestry_publication'
  | 'dataset_documentation'
  | 'model_documentation'
  | 'institutional_report';

export type QualityTier =
  | 'authoritative_peer_reviewed'
  | 'institutional_standard'
  | 'verified_project_doc';

export type AnswerType =
  | 'SUPPORTED_BY_GONAX_DATA'
  | 'SUPPORTED_BY_SCIENTIFIC_SOURCES'
  | 'INFERENCE_FROM_PROVIDED_EVIDENCE'
  | 'INSUFFICIENT_EVIDENCE';

export type QuestionType =
  | 'species_knowledge'
  | 'measurement_explanation'
  | 'model_explanation'
  | 'prediction_explanation'
  | 'uncertainty_explanation'
  | 'scientific_evidence'
  | 'dataset_inquiry'
  | 'applicability'
  | 'species_comparison'
  | 'general_scientific';

export interface ScientificSource {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  volume?: string;
  pages?: string;
  doi?: string;
  url: string;
  publisher: string;
  source_type: SourceType;
  quality_tier: QualityTier;
  species_tags: string[]; 
  topic_tags: string[]; 
  geographic_scope: string;
  version: string;
  is_active: boolean;
  ingestion_date: string;
  updated_at: string;
}

export interface ScientificDocument {
  id: string;
  source_id: string;
  file_name: string;
  sha256_hash: string;
  raw_content: string;
  clean_content: string;
  section_count: number;
  word_count: number;
  version: string;
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  source_id: string;
  section_title: string;
  chunk_index: number;
  start_char: number;
  end_char: number;
  token_count: number;
  chunk_text: string;
  species_tags: string[]; 
  topic_tags: string[]; 
  geographic_tags: string[]; 
  evidence_type: string;
  embedding_json?: string; 
  created_at?: string;
}

export interface ScientificClaim {
  id: string;
  source_id: string;
  chunk_id?: string;
  species_id?: string;
  topic_id: string;
  claim_text: string;
  claim_type: 'empirical_finding' | 'mathematical_relation' | 'parameter_value' | 'boundary_condition';
  evidence_level: 'direct_harvest_measurement' | 'meta_analysis' | 'theoretical_derivation' | 'institutional_guidance';
  uncertainty_note?: string;
  created_at?: string;
}

export interface KnowledgeTopic {
  id: string;
  name: string;
  description: string;
  category: string;
  parent_topic_id?: string;
}

export interface ModelDocumentation {
  id: string;
  model_id: string;
  source_id: string;
  species_id: string;
  name: string;
  algorithm: string;
  formula_expression?: string;
  features_json: string;
  calibration_domain_json: string;
  evaluation_metrics_json: string;
  limitations: string;
  created_at?: string;
}

export interface DatasetDocumentation {
  id: string;
  dataset_id: string;
  source_id: string;
  species_id: string;
  name: string;
  sample_size: number;
  harvest_protocol: string;
  measurement_envelopes_json: string;
  geographic_coverage: string;
  created_at?: string;
}

export interface KnowledgeIngestionAudit {
  id: string;
  source_id: string;
  action: 'ingested' | 'updated' | 'deactivated' | 'reindexed';
  version: string;
  document_hash: string;
  chunks_created: number;
  claims_extracted: number;
  status: 'active' | 'archived' | 'failed';
  details?: string;
  created_at: string;
}

export interface RetrievedChunk {
  chunk: DocumentChunk;
  source: ScientificSource;
  similarityScore: number;
  bm25Score: number;
  combinedScore: number;
  speciesMatch: boolean;
  topicMatch: boolean;
}

export interface ScientificCitation {
  sourceId: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  url: string;
  section: string;
  chunkId: string;
  relationshipToAnswer: string;
  qualityTier: QualityTier;
}

export interface GroundedScientificAnswer {
  question: string;
  questionType: QuestionType;
  answerType: AnswerType;
  answer: string;
  citations: ScientificCitation[];
  groundedClaims: string[];
  predictionContextUsed?: {
    speciesName: string;
    predictionId?: string;
    dbhCm?: number;
    heightM?: number;
    biomassKg?: number;
    carbonKg?: number;
    co2eKg?: number;
    confidenceTier?: string;
    modelName?: string;
    modelType?: string;
    formulaOrAlgorithm?: string;
    carbonFractionApplied?: number;
    stoichiometricFactor?: number;
    uncertaintyPercentage?: number;
  };
  retrievalMetadata: {
    totalChunksEvaluated: number;
    retrievedCount: number;
    topSimilarity: number;
    topCombinedScore: number;
    speciesFilterApplied?: string;
    topicFilterApplied?: string[];
  };
  provider: 'gemini' | 'scientific-grounded-engine';
}
