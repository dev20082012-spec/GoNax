import { Request, Response } from 'express';
import { GroundedQAService } from '../services/rag/groundedQAService';
import { RetrievalService } from '../services/rag/retrievalService';
import { IngestionService } from '../services/rag/ingestionService';
import { BenchmarkService } from '../services/rag/benchmarkService';
import { KnowledgeRepository } from '../repositories/knowledgeRepository';

export class KnowledgeController {
  private groundedQAService = new GroundedQAService();
  private retrievalService = new RetrievalService();
  private ingestionService = new IngestionService();
  private benchmarkService = new BenchmarkService();
  private knowledgeRepo = new KnowledgeRepository();

  async askQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { question, speciesId, speciesName, predictionId, overrideModelId, userContext } = req.body;
      if (!question || typeof question !== 'string' || question.trim() === '') {
        res.status(400).json({ error: 'Question string is required' });
        return;
      }

      const answer = await this.groundedQAService.answerQuestion({
        question: question.trim(),
        speciesId,
        speciesName,
        predictionId,
        overrideModelId,
        userContext
      });

      res.json({ success: true, data: answer });
    } catch (err: any) {
      console.error('[KnowledgeController:askQuestion] Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Internal server error processing scientific question' });
    }
  }

  async queryEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { query, speciesName, topicId, geographicRegion, sourceType, limit, minSimilarity } = req.body;
      if (!query || typeof query !== 'string') {
        res.status(400).json({ success: false, error: 'Query string is required' });
        return;
      }

      const results = await this.retrievalService.retrieveRelevantEvidence({
        query: query.trim(),
        speciesName,
        topicId,
        geographicRegion,
        sourceType,
        limit: limit ? parseInt(limit, 10) : 5,
        minSimilarity: minSimilarity ? parseFloat(minSimilarity) : 0.05
      });

      res.json({ success: true, data: results });
    } catch (err: any) {
      console.error('[KnowledgeController:queryEvidence] Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Error querying scientific evidence' });
    }
  }

  async getSources(req: Request, res: Response): Promise<void> {
    try {
      const sources = await this.knowledgeRepo.getAllSources(true);
      res.json({ success: true, data: sources });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getSourceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const source = await this.knowledgeRepo.getSourceById(id);
      if (!source) {
        res.status(404).json({ success: false, error: `Scientific source not found: ${id}` });
        return;
      }

      const doc = await this.knowledgeRepo.getDocumentBySourceId(id);
      const chunks = await this.knowledgeRepo.getChunksBySourceId(id);
      const claims = await this.knowledgeRepo.getClaimsBySourceId(id);

      res.json({
        success: true,
        data: {
          source,
          document: doc ? {
            fileName: doc.file_name,
            sha256: doc.sha256_hash,
            sectionCount: doc.section_count,
            wordCount: doc.word_count,
            version: doc.version
          } : null,
          chunksCount: chunks.length,
          chunks: chunks.map(c => ({
            id: c.id,
            sectionTitle: c.section_title,
            chunkIndex: c.chunk_index,
            tokenCount: c.token_count,
            chunkText: c.chunk_text,
            speciesTags: c.species_tags,
            topicTags: c.topic_tags,
            evidenceType: c.evidence_type
          })),
          claims
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getTopics(req: Request, res: Response): Promise<void> {
    try {
      const topics = await this.knowledgeRepo.getAllTopics();
      res.json({ success: true, data: topics });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getClaims(req: Request, res: Response): Promise<void> {
    try {
      const { speciesId, sourceId } = req.query;
      if (sourceId) {
        const claims = await this.knowledgeRepo.getClaimsBySourceId(String(sourceId));
        res.json({ success: true, data: claims });
        return;
      }
      if (speciesId) {
        const claims = await this.knowledgeRepo.getClaimsBySpecies(String(speciesId));
        res.json({ success: true, data: claims });
        return;
      }
      const claims = await this.knowledgeRepo.getAllClaims();
      res.json({ success: true, data: claims });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getModelDocs(req: Request, res: Response): Promise<void> {
    try {
      const docs = await this.knowledgeRepo.getAllModelDocs();
      res.json({ success: true, data: docs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getDatasetDocs(req: Request, res: Response): Promise<void> {
    try {
      const docs = await this.knowledgeRepo.getAllDatasetDocs();
      res.json({ success: true, data: docs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async ingestSource(req: Request, res: Response): Promise<void> {
    try {
      const { sourceMeta, rawContent, fileName } = req.body;
      if (!sourceMeta || !sourceMeta.id || !sourceMeta.title || !rawContent) {
        res.status(400).json({ success: false, error: 'sourceMeta (with id, title) and rawContent are required' });
        return;
      }

      const result = await this.ingestionService.ingestSingleSource(
        sourceMeta,
        rawContent,
        fileName || `${sourceMeta.id}.txt`
      );

      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      console.error('[KnowledgeController:ingestSource] Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to ingest scientific source' });
    }
  }

  async getAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const logs = await this.knowledgeRepo.getAllAuditLogs();
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async runBenchmark(req: Request, res: Response): Promise<void> {
    try {
      const report = await this.benchmarkService.runBenchmark();
      res.json({ success: true, data: report });
    } catch (err: any) {
      console.error('[KnowledgeController:runBenchmark] Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Benchmark execution failed' });
    }
  }
}
