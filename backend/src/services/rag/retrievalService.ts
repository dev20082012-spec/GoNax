import { KnowledgeRepository } from '../../repositories/knowledgeRepository';
import { EmbeddingService } from './embeddingService';
import { DocumentChunk, ScientificSource, RetrievedChunk } from '../../domain/entities/knowledge';

export interface RetrievalQueryOptions {
  query: string;
  speciesName?: string;
  topicId?: string;
  geographicRegion?: string;
  sourceType?: string;
  limit?: number;
  minSimilarity?: number;
}

export class RetrievalService {
  private knowledgeRepo: KnowledgeRepository;
  private embeddingService: EmbeddingService;

  constructor(
    knowledgeRepo?: KnowledgeRepository,
    embeddingService?: EmbeddingService
  ) {
    this.knowledgeRepo = knowledgeRepo || new KnowledgeRepository();
    this.embeddingService = embeddingService || new EmbeddingService();
  }

  async retrieveRelevantEvidence(options: RetrievalQueryOptions): Promise<RetrievedChunk[]> {
    const {
      query,
      speciesName,
      topicId,
      geographicRegion,
      sourceType,
      limit = 5,
      minSimilarity = 0.05
    } = options;

    const queryLower = query.toLowerCase().trim();
    const queryTokens = queryLower.split(/\s+/).filter(t => t.length > 2);

    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    const allChunks = await this.knowledgeRepo.getAllChunks();
    const allSources = await this.knowledgeRepo.getAllSources(true);
    const sourceMap = new Map<string, ScientificSource>();
    for (const s of allSources) {
      sourceMap.set(s.id, s);
    }

    const scoredResults: RetrievedChunk[] = [];

    for (const chunk of allChunks) {
      const source = sourceMap.get(chunk.source_id);
      if (!source) continue;

      if (sourceType && source.source_type !== sourceType) {
        continue;
      }

      if (geographicRegion && !chunk.geographic_tags.includes('Global')) {
        const matchesGeo = chunk.geographic_tags.some(g =>
          g.toLowerCase().includes(geographicRegion.toLowerCase()) ||
          geographicRegion.toLowerCase().includes(g.toLowerCase())
        );
        if (!matchesGeo) continue;
      }

      let chunkVector: number[] = [];
      if (chunk.embedding_json) {
        try {
          chunkVector = JSON.parse(chunk.embedding_json);
        } catch {
          chunkVector = [];
        }
      }
      // calculting cosin vector simlarity here
      const similarityScore = this.embeddingService.cosineSimilarity(queryEmbedding, chunkVector);

      // quick keywrd bm25 score check
      const bm25Score = this.computeLexicalScore(queryTokens, chunk.chunk_text, chunk.section_title);

      if (similarityScore < minSimilarity && bm25Score < 0.1) {
        continue;
      }

      // boost if speceis match or genus match
      let speciesMultiplier = 1.0;
      let isSpeciesMatch = false;

      if (speciesName) {
        const targetSpecies = speciesName.toLowerCase();
        const targetGenus = targetSpecies.split(' ')[0];

        const hasExactSpecies = chunk.species_tags.some(st =>
          st.toLowerCase() === targetSpecies || targetSpecies.includes(st.toLowerCase())
        );
        const hasGenus = chunk.species_tags.some(st =>
          st.toLowerCase().startsWith(targetGenus)
        );
        const isUniversal = chunk.species_tags.some(st => st.toLowerCase() === 'all');

        if (hasExactSpecies) {
          speciesMultiplier = 1.60; 
          isSpeciesMatch = true;
        } else if (hasGenus) {
          speciesMultiplier = 1.25; 
          isSpeciesMatch = true;
        } else if (isUniversal) {
          speciesMultiplier = 1.05; 
          isSpeciesMatch = false;
        } else {
          // penelize other speceis so we dont retrive oak for pine
          speciesMultiplier = 0.55;
          isSpeciesMatch = false;
        }
      }

      let topicMultiplier = 1.0;
      let isTopicMatch = false;

      const detectedTopic = this.detectTopicFromQuery(queryLower);
      const effectiveTopic = topicId || detectedTopic;

      if (effectiveTopic && chunk.topic_tags.includes(effectiveTopic)) {
        topicMultiplier = 1.35;
        isTopicMatch = true;
      }

      let qualityMultiplier = 1.0;
      if (source.quality_tier === 'authoritative_peer_reviewed') {
        qualityMultiplier = 1.0;
      } else if (source.quality_tier === 'institutional_standard') {
        qualityMultiplier = 0.95;
      } else {
        qualityMultiplier = 0.90;
      }

      const baseScore = (0.50 * similarityScore) + (0.50 * Math.min(bm25Score, 1.0));
      const combinedScore = baseScore * speciesMultiplier * topicMultiplier * qualityMultiplier;

      scoredResults.push({
        chunk,
        source,
        similarityScore: Number(similarityScore.toFixed(4)),
        bm25Score: Number(bm25Score.toFixed(4)),
        combinedScore: Number(combinedScore.toFixed(4)),
        speciesMatch: isSpeciesMatch,
        topicMatch: isTopicMatch
      });
    }

    scoredResults.sort((a, b) => b.combinedScore - a.combinedScore);

    return scoredResults.slice(0, limit);
  }

  private computeLexicalScore(queryTokens: string[], text: string, title: string): number {
    if (queryTokens.length === 0) return 0;
    const textLower = text.toLowerCase();
    const titleLower = title.toLowerCase();

    let matches = 0;
    let titleMatches = 0;

    for (const token of queryTokens) {
      if (textLower.includes(token)) {
        matches++;
      }
      if (titleLower.includes(token)) {
        titleMatches++;
      }
    }

    const termOverlap = matches / queryTokens.length;
    const titleBonus = (titleMatches / queryTokens.length) * 0.4;
    return Math.min(1.0, termOverlap + titleBonus);
  }

  private detectTopicFromQuery(query: string): string | null {
    if (query.includes('density') || query.includes('wood') || query.includes('specific gravity')) {
      return 'wood_density';
    }
    if (query.includes('carbon') || query.includes('co2') || query.includes('stoichiometr') || query.includes('fraction')) {
      return 'carbon_fraction';
    }
    if (query.includes('variable') || query.includes('feature') || query.includes('input') || query.includes('dbh') || query.includes('height')) {
      return 'model_variables';
    }
    if (query.includes('uncertainty') || query.includes('confidence') || query.includes('error') || query.includes('rse') || query.includes('bound')) {
      return 'uncertainty';
    }
    if (query.includes('dataset') || query.includes('observation') || query.includes('sample size') || query.includes('harvest') || query.includes('baad')) {
      return 'dataset_demographics';
    }
    if (query.includes('region') || query.includes('geograph') || query.includes('outside') || query.includes('applicable') || query.includes('envelope')) {
      return 'applicability_limits';
    }
    if (query.includes('root') || query.includes('belowground') || query.includes('shoot')) {
      return 'root_to_shoot';
    }
    if (query.includes('allometr') || query.includes('equation') || query.includes('formula') || query.includes('power law')) {
      return 'allometry';
    }
    return null;
  }
}
