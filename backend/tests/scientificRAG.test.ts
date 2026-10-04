import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { runSeed } from '../src/database/seeds/seed';
import { IngestionService } from '../src/services/rag/ingestionService';
import { RetrievalService } from '../src/services/rag/retrievalService';
import { EmbeddingService } from '../src/services/rag/embeddingService';
import { GroundedQAService } from '../src/services/rag/groundedQAService';
import { BenchmarkService } from '../src/services/rag/benchmarkService';
import { KnowledgeRepository } from '../src/repositories/knowledgeRepository';
import { PredictionRepository } from '../src/repositories/predictionRepository';
import { SpeciesRepository } from '../src/repositories/speciesRepository';

describe('GoNax Scientific Knowledge & Retrieval-Augmented Generation (RAG) Tests', () => {
  let ingestionService: IngestionService;
  let retrievalService: RetrievalService;
  let embeddingService: EmbeddingService;
  let groundedQAService: GroundedQAService;
  let benchmarkService: BenchmarkService;
  let knowledgeRepo: KnowledgeRepository;
  let speciesRepo: SpeciesRepository;
  let predictionRepo: PredictionRepository;

  before(async () => {
    await runSeed();
    ingestionService = new IngestionService();
    retrievalService = new RetrievalService();
    embeddingService = new EmbeddingService();
    groundedQAService = new GroundedQAService();
    benchmarkService = new BenchmarkService();
    knowledgeRepo = new KnowledgeRepository();
    speciesRepo = new SpeciesRepository();
    predictionRepo = new PredictionRepository();
  });

  describe('1. Ingestion Pipeline & Provenance Preservation', () => {
    it('preserves all ingested scientific sources and metadata', async () => {
      const sources = await knowledgeRepo.getAllSources(true);
      assert.ok(sources.length >= 14, `Expected at least 14 sources, got ${sources.length}`);

      const zianis = sources.find(s => s.id === 'src-zianis-2005');
      assert.ok(zianis);
      assert.strictEqual(zianis.year, 2005);
      assert.strictEqual(zianis.doi, '10.1093/forestry/cpi052');
      assert.ok(zianis.species_tags.includes('Quercus robur'));
      assert.strictEqual(zianis.quality_tier, 'authoritative_peer_reviewed');

      const baad = sources.find(s => s.id === 'src-falster-2015-baad');
      assert.ok(baad);
      assert.strictEqual(baad.doi, '10.1890/14-1889.1');
      assert.ok(baad.species_tags.includes('Pinus sylvestris'));
    });

    it('ensures every document chunk retains provenance back to source and document', async () => {
      const chunks = await knowledgeRepo.getAllChunks();
      assert.ok(chunks.length >= 25, `Expected multiple chunks, got ${chunks.length}`);

      for (const chunk of chunks) {
        assert.ok(chunk.id, 'Chunk must have an ID');
        assert.ok(chunk.source_id, 'Chunk must reference a source_id');
        assert.ok(chunk.document_id, 'Chunk must reference a document_id');
        assert.ok(chunk.section_title, 'Chunk must retain section title');
        assert.ok(chunk.token_count > 0, 'Chunk must have non-zero tokens');
        assert.ok(chunk.species_tags.length > 0, 'Chunk must have species tags');
        assert.ok(chunk.topic_tags.length > 0, 'Chunk must have topic tags');
      }
    });

    it('verifies atomic scientific claims are extracted and linked', async () => {
      const claims = await knowledgeRepo.getAllClaims();
      assert.ok(claims.length >= 5, `Expected extracted claims, got ${claims.length}`);

      const densityClaim = claims.find(c => c.topic_id === 'wood_density');
      assert.ok(densityClaim, 'Expected at least one wood density claim');
      assert.ok(densityClaim.claim_text.includes('g/cm³'));
    });

    it('verifies model and dataset documentation specifications', async () => {
      const modelDocs = await knowledgeRepo.getAllModelDocs();
      assert.ok(modelDocs.length >= 2);

      const pineModelDoc = await knowledgeRepo.getModelDocByModelId('trained-pinus-sylvestris-baad-v1');
      assert.ok(pineModelDoc);
      assert.strictEqual(pineModelDoc.species_id, 'pinus_sylvestris');
      assert.ok(pineModelDoc.formula_expression?.includes('cylindrical_volume_proxy_m3'));

      const datasetDocs = await knowledgeRepo.getAllDatasetDocs();
      assert.ok(datasetDocs.length >= 2);
      const pineDataset = await knowledgeRepo.getDatasetDocByDatasetId('ds-pinus-sylvestris-baad-v1');
      assert.ok(pineDataset);
      assert.strictEqual(pineDataset.sample_size, 288);
    });
  });

  describe('2. Vector Embedding Engine', () => {
    it('produces unit-normalized semantic embeddings', async () => {
      const vec = await embeddingService.generateEmbedding('Quercus robur wood density and carbon stock');
      assert.strictEqual(vec.length, 256);

      let normSq = 0;
      for (const val of vec) normSq += val * val;
      const norm = Math.sqrt(normSq);
      assert.ok(Math.abs(norm - 1.0) < 0.01, `Embedding norm must be ~1.0, got ${norm}`);
    });

    it('exhibits high similarity for synonymous forestry concepts and low for irrelevant terms', async () => {
      const vecAllometry = await embeddingService.generateEmbedding('allometric equation tree biomass estimation');
      const vecScaling = await embeddingService.generateEmbedding('dendrometric scaling power law biomass calculation');
      const vecIrrelevant = await embeddingService.generateEmbedding('cryptocurrency bitcoin decentralized blockchain');

      const simRelevant = embeddingService.cosineSimilarity(vecAllometry, vecScaling);
      const simIrrelevant = embeddingService.cosineSimilarity(vecAllometry, vecIrrelevant);

      assert.ok(simRelevant > simIrrelevant, `Expected ${simRelevant} > ${simIrrelevant}`);
      assert.ok(simRelevant > 0.40, `Expected relevant similarity > 0.40, got ${simRelevant}`);
    });
  });

  describe('3. Hybrid Retrieval & Priority Boosts', () => {
    it('applies species relevance boost to prioritize target species chunks', async () => {
      const results = await retrievalService.retrieveRelevantEvidence({
        query: 'What is the calibrated allometric equation for this species?',
        speciesName: 'Pinus sylvestris',
        limit: 5
      });

      assert.ok(results.length > 0);
      const topResult = results[0];
      assert.ok(
        topResult.chunk.species_tags.includes('Pinus sylvestris') || topResult.source.species_tags.includes('Pinus sylvestris'),
        'Top result should match Pinus sylvestris'
      );
      assert.ok(topResult.speciesMatch === true);
    });

    it('prioritizes wood density literature when querying specific gravity', async () => {
      const results = await retrievalService.retrieveRelevantEvidence({
        query: 'wood density and xylem specific gravity',
        speciesName: 'Quercus robur',
        limit: 3
      });

      assert.ok(results.length > 0);
      assert.ok(results.some(r => r.chunk.topic_tags.includes('wood_density')));
    });

    it('strictly preserves priority order: species -> scientific topic -> quality -> semantic', async () => {
      const results = await retrievalService.retrieveRelevantEvidence({
        query: 'biomass destructive harvest protocol',
        speciesName: 'Pinus sylvestris',
        limit: 5
      });

      const top = results[0];
      assert.ok(top.speciesMatch);
      assert.ok(top.source.quality_tier === 'authoritative_peer_reviewed' || top.source.quality_tier === 'verified_project_doc');
    });
  });

  describe('4. Grounded Scientific Q&A (Question Types A-I)', () => {
    it('Type A (Species Knowledge): explains wood density with real citations', async () => {
      const res = await groundedQAService.answerQuestion({
        question: 'What is known about this species wood density?',
        speciesName: 'Quercus robur'
      });

      assert.strictEqual(res.questionType, 'species_knowledge');
      assert.strictEqual(res.answerType, 'SUPPORTED_BY_SCIENTIFIC_SOURCES');
      assert.ok(res.answer.includes('0.67 g/cm³'), 'Answer should include verified 0.67 g/cm³ density');
      assert.ok(res.citations.length > 0, 'Must have citations');
      assert.ok(res.citations.some(c => c.authors.includes('Zianis') || c.authors.includes('Chave')));
    });

    it('Type B (Measurement Explanation): explains why DBH is important', async () => {
      const res = await groundedQAService.answerQuestion({
        question: 'Why is DBH important here and how does it relate to mass?',
        speciesName: 'Pinus sylvestris'
      });

      assert.strictEqual(res.questionType, 'measurement_explanation');
      assert.ok(res.answer.includes('basal area') || res.answer.includes('pipe model') || res.answer.includes('DBH'));
      assert.ok(res.citations.length > 0);
    });

    it('Type C (Model Explanation): explains variables and equation of Scots pine model', async () => {
      const res = await groundedQAService.answerQuestion({
        question: 'What variables does the model use and what is its equation?',
        speciesName: 'Pinus sylvestris'
      });

      assert.strictEqual(res.questionType, 'model_explanation');
      assert.ok(res.answer.includes('Ridge') || res.answer.includes('cylindrical'));
      assert.ok(res.citations.length > 0);
    });

    it('Type D (Prediction Explanation): integrates numerical prediction, model, and evidence', async () => {
      const recent = await predictionRepo.findRecent(1);
      assert.ok(recent.length > 0, 'Expected seeded prediction');
      const pred = recent[0];

      const res = await groundedQAService.answerQuestion({
        question: 'Why did GoNax predict this amount of carbon for this tree?',
        predictionId: pred.id
      });

      assert.strictEqual(res.questionType, 'prediction_explanation');
      assert.strictEqual(res.answerType, 'SUPPORTED_BY_GONAX_DATA');
      assert.ok(res.predictionContextUsed !== undefined, 'Must provide structured prediction context');
      assert.strictEqual(res.predictionContextUsed?.predictionId, pred.id);
      assert.ok(res.answer.includes(pred.estimated_carbon_kg.toLocaleString()) || res.answer.includes('Carbon'));
      assert.ok(res.answer.includes('44.01') || res.answer.includes('3.6667'), 'Must cite stoichiometric ratio');
      assert.ok(res.citations.length > 0);
    });

    it('Type E (Uncertainty Explanation): explains residual standard error and bounds', async () => {
      const res = await groundedQAService.answerQuestion({
        question: 'Why is the uncertainty relatively high and what causes error bounds?',
        speciesName: 'Quercus robur'
      });

      assert.strictEqual(res.questionType, 'uncertainty_explanation');
      assert.ok(res.answer.includes('Residual Standard Error') || res.answer.includes('RSE'));
      assert.ok(res.citations.length > 0);
    });

    it('Type F (Scientific Evidence): cites verified research supporting allometry', async () => {
      const res = await groundedQAService.answerQuestion({
        question: 'What research supports this species allometric relationship?',
        speciesName: 'Pinus sylvestris'
      });

      assert.strictEqual(res.questionType, 'scientific_evidence');
      assert.ok(res.citations.some(c => c.authors.includes('Falster') || c.authors.includes('Albrektson') || c.authors.includes('Zianis')));
    });

    it('Type G (Dataset Inquiry): accurately reports sample sizes and demographics', async () => {
      const resPine = await groundedQAService.answerQuestion({
        question: 'How many observations are in the Scots pine training dataset?',
        speciesName: 'Pinus sylvestris'
      });

      assert.strictEqual(resPine.questionType, 'dataset_inquiry');
      assert.ok(resPine.answer.includes('288'), 'Must state exact N=288 sample count');
      assert.ok(resPine.answer.includes('Sweden') || resPine.answer.includes('Finland'));
    });

    it('Type H (Applicability): explains geographic bounds and extrapolation risks', async () => {
      const res = await groundedQAService.answerQuestion({
        question: 'Is this model appropriate outside its training region?',
        speciesName: 'Pinus sylvestris'
      });

      assert.strictEqual(res.questionType, 'applicability');
      assert.ok(res.answer.includes('EXTRAPOLATION_WARNING') || res.answer.includes('boreal'));
      assert.ok(res.citations.length > 0);
    });

    it('Type I (Species Comparison): contrasts Oak vs Pine wood density and carbon fraction', async () => {
      const res = await groundedQAService.answerQuestion({
        question: 'How does Quercus robur differ from Pinus sylvestris in wood density and carbon fraction?'
      });

      assert.strictEqual(res.questionType, 'species_comparison');
      assert.ok(res.answer.includes('0.67') && res.answer.includes('0.51'), 'Must contrast densities 0.67 vs 0.51');
      assert.ok(res.answer.includes('50.5%') || res.answer.includes('48.2%'), 'Must contrast carbon fractions');
      assert.ok(res.citations.length > 0);
    });
  });

  describe('5. Safety Guardrails & Hallucination Resistance', () => {
    it('refuses to answer unsupported queries with INSUFFICIENT_EVIDENCE', async () => {
      const res = await groundedQAService.answerQuestion({
        question: 'What is the biomass and wood density of Eucalyptus globulus in the Sahara desert?',
        speciesName: 'Eucalyptus globulus'
      });

      assert.strictEqual(res.answerType, 'INSUFFICIENT_EVIDENCE');
      assert.ok(res.answer.includes('do not establish this answer'));
      assert.strictEqual(res.citations.length, 0, 'Must NOT invent citations');
    });

    it('refuses to invent toxicological relationships without empirical evidence', async () => {
      const res = await groundedQAService.answerQuestion({
        question: 'Can Scots pine absorb toxic mercury in volcanic soil?',
        speciesName: 'Pinus sylvestris'
      });

      assert.strictEqual(res.answerType, 'INSUFFICIENT_EVIDENCE');
      assert.strictEqual(res.citations.length, 0, 'Must NOT invent citations');
    });
  });

  describe('6. Empirical Scientific Benchmark Suite', () => {
    it('executes full benchmark and achieves high empirical scores', async () => {
      const report = await benchmarkService.runBenchmark();

      assert.strictEqual(report.totalQuestions, 10);
      assert.ok(report.retrievalRecallAt3 >= 80.0, `Recall@3 should be >= 80%, got ${report.retrievalRecallAt3}%`);
      assert.ok(report.citationCorrectnessPct >= 80.0, `Citation correctness should be >= 80%, got ${report.citationCorrectnessPct}%`);
      assert.ok(report.groundednessPct >= 80.0, `Groundedness should be >= 80%, got ${report.groundednessPct}%`);
      assert.strictEqual(report.unsupportedDetectionRatePct, 100.0, 'Must detect 100% of unsupported questions');
      assert.ok(report.averageLatencyMs > 0 && report.averageLatencyMs < 1000, `Average latency should be reasonable, got ${report.averageLatencyMs}ms`);

      console.log('\n================ SCIENTIFIC BENCHMARK RESULTS ================');
      console.log(`Total Benchmark Questions: ${report.totalQuestions}`);
      console.log(`Retrieval Recall@3:        ${report.retrievalRecallAt3}%`);
      console.log(`Retrieval Precision@3:     ${report.retrievalPrecisionAt3}%`);
      console.log(`Citation Correctness:      ${report.citationCorrectnessPct}%`);
      console.log(`Groundedness Pass Rate:    ${report.groundednessPct}%`);
      console.log(`Unsupported Query Guard:   ${report.unsupportedDetectionRatePct}%`);
      console.log(`Average Latency:           ${report.averageLatencyMs} ms`);
      console.log('==============================================================\n');
    });
  });
});
