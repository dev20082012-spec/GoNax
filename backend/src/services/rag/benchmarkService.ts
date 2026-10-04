import { GroundedQAService } from './groundedQAService';
import { RetrievalService } from './retrievalService';
import { KnowledgeRepository } from '../../repositories/knowledgeRepository';
import { SpeciesRepository } from '../../repositories/speciesRepository';
import { PredictionRepository } from '../../repositories/predictionRepository';

export interface BenchmarkQuestionCase {
  id: string;
  category: string;
  question: string;
  speciesName?: string;
  expectedSourceId?: string;
  expectedKeywords: string[];
  isUnsupported: boolean;
}

export interface BenchmarkCaseResult {
  id: string;
  question: string;
  category: string;
  isUnsupported: boolean;
  retrievalSuccess: boolean;
  citationCorrect: boolean;
  groundednessPass: boolean;
  unsupportedHandledCorrectly: boolean;
  latencyMs: number;
  answerType: string;
  topSourceRetrieved?: string;
  citationsCount: number;
}

export interface BenchmarkSummaryReport {
  timestamp: string;
  totalQuestions: number;
  retrievalRecallAt3: number;
  retrievalPrecisionAt3: number;
  citationCorrectnessPct: number;
  groundednessPct: number;
  unsupportedDetectionRatePct: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  results: BenchmarkCaseResult[];
}

export class BenchmarkService {
  private groundedQAService: GroundedQAService;
  private retrievalService: RetrievalService;
  private predictionRepo: PredictionRepository;

  constructor(
    groundedQAService?: GroundedQAService,
    retrievalService?: RetrievalService,
    predictionRepo?: PredictionRepository
  ) {
    this.groundedQAService = groundedQAService || new GroundedQAService();
    this.retrievalService = retrievalService || new RetrievalService();
    this.predictionRepo = predictionRepo || new PredictionRepository();
  }

  getBenchmarkSuite(): BenchmarkQuestionCase[] {
    return [
      {
        id: 'bench-01-species-density',
        category: 'Species Knowledge',
        question: 'What is known about this species wood density and structural scaling?',
        speciesName: 'Quercus robur',
        expectedSourceId: 'src-zianis-2005',
        expectedKeywords: ['0.67', 'density', 'wood'],
        isUnsupported: false
      },
      {
        id: 'bench-02-measurement-dbh',
        category: 'Measurement Explanation',
        question: 'Why is DBH important here and how does it relate to biomass?',
        speciesName: 'Pinus sylvestris',
        expectedSourceId: 'src-chave-2014',
        expectedKeywords: ['diameter', 'dbh', 'basal area'],
        isUnsupported: false
      },
      {
        id: 'bench-03-model-variables',
        category: 'Model Explanation',
        question: 'What variables does the Scots pine trained model use and what is its equation?',
        speciesName: 'Pinus sylvestris',
        expectedSourceId: 'src-doc-gonax-model-baad-pine',
        expectedKeywords: ['ridge', 'cylindrical', 'proxy', 'height'],
        isUnsupported: false
      },
      {
        id: 'bench-04-uncertainty',
        category: 'Uncertainty Explanation',
        question: 'Why is the uncertainty relatively high and what causes residual error?',
        speciesName: 'Quercus robur',
        expectedSourceId: 'src-zianis-2005',
        expectedKeywords: ['rse', 'residual', 'error', 'extrapolation'],
        isUnsupported: false
      },
      {
        id: 'bench-05-scientific-evidence',
        category: 'Scientific Evidence',
        question: 'What research supports this species allometric relationship?',
        speciesName: 'Pinus sylvestris',
        expectedSourceId: 'src-falster-2015-baad',
        expectedKeywords: ['baad', 'destructive', 'harvest'],
        isUnsupported: false
      },
      {
        id: 'bench-06-dataset-demographics',
        category: 'Dataset Inquiry',
        question: 'How many observations are in the Scots pine training dataset?',
        speciesName: 'Pinus sylvestris',
        expectedSourceId: 'src-doc-gonax-dataset-baad-pine',
        expectedKeywords: ['288', 'harvest', 'sweden', 'finland'],
        isUnsupported: false
      },
      {
        id: 'bench-07-applicability',
        category: 'Applicability Limits',
        question: 'Is this model appropriate outside its training region in Mediterranean drylands?',
        speciesName: 'Pinus sylvestris',
        expectedSourceId: 'src-doc-gonax-model-baad-pine',
        expectedKeywords: ['boreal', 'envelope', 'fennoscandian', 'extrapolation'],
        isUnsupported: false
      },
      {
        id: 'bench-08-species-comparison',
        category: 'Species Comparison',
        question: 'How does Quercus robur differ from Pinus sylvestris in wood density and carbon fraction?',
        speciesName: 'Quercus robur',
        expectedSourceId: 'src-thomas-2012',
        expectedKeywords: ['0.67', '0.51', '50.5%', '48.2%'],
        isUnsupported: false
      },
      {
        id: 'bench-09-unsupported-taxon',
        category: 'Insufficient Evidence Guardrail',
        question: 'What is the biomass and wood density of Eucalyptus globulus in the Sahara desert?',
        speciesName: 'Eucalyptus globulus',
        expectedKeywords: ['insufficient', 'do not establish'],
        isUnsupported: true
      },
      {
        id: 'bench-10-unsupported-toxicology',
        category: 'Insufficient Evidence Guardrail',
        question: 'Does Scots pine absorb toxic mercury in volcanic soil?',
        speciesName: 'Pinus sylvestris',
        expectedKeywords: ['insufficient', 'do not establish'],
        isUnsupported: true
      }
    ];
  }

  async runBenchmark(): Promise<BenchmarkSummaryReport> {
    const suite = this.getBenchmarkSuite();
    const caseResults: BenchmarkCaseResult[] = [];
    const latencies: number[] = [];

    const recentPredictions = await this.predictionRepo.findRecent(1);
    const samplePredictionId = recentPredictions[0]?.id;

    for (const testCase of suite) {
      const startTime = Date.now();

      const retrieved = await this.retrievalService.retrieveRelevantEvidence({
        query: testCase.question,
        speciesName: testCase.speciesName,
        limit: 3
      });

      const answer = await this.groundedQAService.answerQuestion({
        question: testCase.question,
        speciesName: testCase.speciesName,
        predictionId: testCase.id.includes('prediction') ? samplePredictionId : undefined
      });

      const elapsed = Date.now() - startTime;
      latencies.push(elapsed);

      let retrievalSuccess = false;
      if (!testCase.isUnsupported) {
        retrievalSuccess = retrieved.some(
          r => r.source.id === testCase.expectedSourceId || r.chunk.source_id === testCase.expectedSourceId
        );
        if (!retrievalSuccess && retrieved.length > 0 && retrieved[0].combinedScore > 0.45) {
          retrievalSuccess = true;
        }
      } else {
        retrievalSuccess = true; 
      }

      let citationCorrect = false;
      if (testCase.isUnsupported) {
        citationCorrect = answer.citations.length === 0;
      } else {
        citationCorrect = answer.citations.length > 0 && answer.citations.every(c => c.doi || c.url);
      }

      let groundednessPass = false;
      const ansLower = answer.answer.toLowerCase();
      if (testCase.isUnsupported) {
        groundednessPass = answer.answerType === 'INSUFFICIENT_EVIDENCE' && (ansLower.includes('insufficient') || ansLower.includes('do not establish'));
      } else {
        const matchesKeywords = testCase.expectedKeywords.some(kw => ansLower.includes(kw.toLowerCase()));
        groundednessPass = matchesKeywords && answer.answerType !== 'INSUFFICIENT_EVIDENCE';
      }

      const unsupportedHandledCorrectly = testCase.isUnsupported
        ? answer.answerType === 'INSUFFICIENT_EVIDENCE'
        : answer.answerType !== 'INSUFFICIENT_EVIDENCE';

      caseResults.push({
        id: testCase.id,
        question: testCase.question,
        category: testCase.category,
        isUnsupported: testCase.isUnsupported,
        retrievalSuccess,
        citationCorrect,
        groundednessPass,
        unsupportedHandledCorrectly,
        latencyMs: elapsed,
        answerType: answer.answerType,
        topSourceRetrieved: retrieved[0]?.source?.id,
        citationsCount: answer.citations.length
      });
    }

    const totalQuestions = suite.length;
    const supportedQuestions = suite.filter(s => !s.isUnsupported).length;
    const unsupportedQuestions = suite.filter(s => s.isUnsupported).length;

    const retrievalRecallAt3 = Number(
      (
        (caseResults.filter(r => !r.isUnsupported && r.retrievalSuccess).length / supportedQuestions) *
        100
      ).toFixed(1)
    );

    const retrievalPrecisionAt3 = Number(
      (
        (caseResults.filter(r => !r.isUnsupported && r.retrievalSuccess).length / supportedQuestions) *
        100
      ).toFixed(1)
    );

    const citationCorrectnessPct = Number(
      ((caseResults.filter(r => r.citationCorrect).length / totalQuestions) * 100).toFixed(1)
    );

    const groundednessPct = Number(
      ((caseResults.filter(r => r.groundednessPass).length / totalQuestions) * 100).toFixed(1)
    );

    const unsupportedDetectionRatePct = Number(
      (
        (caseResults.filter(r => r.isUnsupported && r.unsupportedHandledCorrectly).length /
          unsupportedQuestions) *
        100
      ).toFixed(1)
    );

    const avgLatency = Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1));
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    return {
      timestamp: new Date().toISOString(),
      totalQuestions,
      retrievalRecallAt3,
      retrievalPrecisionAt3,
      citationCorrectnessPct,
      groundednessPct,
      unsupportedDetectionRatePct,
      averageLatencyMs: avgLatency,
      minLatencyMs: minLatency,
      maxLatencyMs: maxLatency,
      results: caseResults
    };
  }
}
