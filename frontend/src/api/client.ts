import {
  Species,
  SpeciesDataset,
  SpeciesModel,
  ScientificReference,
  EnrichedPrediction,
  ExplanationResult,
  ModelMetadata,
  DatasetMetadata,
  GroundedScientificAnswer,
  ScientificSourceSummary,
  ScientificSourceDetails,
  BenchmarkSummaryReport
} from '../types';

const API_BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data as T;
}

export const api = {
  async getSpeciesList(): Promise<Species[]> {
    const res = await fetch(`${API_BASE}/species`);
    return handleResponse<Species[]>(res);
  },

  async getSpeciesDetails(id: string): Promise<{
    species: Species;
    datasets: SpeciesDataset[];
    models: SpeciesModel[];
    references: ScientificReference[];
  }> {
    const res = await fetch(`${API_BASE}/species/${id}`);
    return handleResponse(res);
  },

  async getModels(): Promise<ModelMetadata[]> {
    const res = await fetch(`${API_BASE}/models`);
    return handleResponse<ModelMetadata[]>(res);
  },

  async getModel(id: string): Promise<ModelMetadata> {
    const res = await fetch(`${API_BASE}/models/${id}`);
    return handleResponse<ModelMetadata>(res);
  },

  async getModelForSpecies(speciesId: string): Promise<ModelMetadata> {
    const res = await fetch(`${API_BASE}/species/${speciesId}/model`);
    return handleResponse<ModelMetadata>(res);
  },

  async getDatasets(): Promise<DatasetMetadata[]> {
    const res = await fetch(`${API_BASE}/datasets`);
    return handleResponse<DatasetMetadata[]>(res);
  },

  async getDataset(id: string): Promise<DatasetMetadata> {
    const res = await fetch(`${API_BASE}/datasets/${id}`);
    return handleResponse<DatasetMetadata>(res);
  },

  async runPrediction(payload: {
    speciesId: string;
    dbhCm: number;
    heightM: number;
    crownDiameterM?: number;
    woodDensityOverride?: number;
    latitude?: number;
    longitude?: number;
    notes?: string;
    preferredModelId?: string;
  }): Promise<EnrichedPrediction> {
    const res = await fetch(`${API_BASE}/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<EnrichedPrediction>(res);
  },

  async getPrediction(id: string): Promise<EnrichedPrediction> {
    const res = await fetch(`${API_BASE}/predictions/${id}`);
    return handleResponse<EnrichedPrediction>(res);
  },

  async getPredictionProvenance(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/predictions/${id}/provenance`);
    return handleResponse<any>(res);
  },

  async getPredictionHistory(limit: number = 50): Promise<EnrichedPrediction[]> {
    const res = await fetch(`${API_BASE}/predictions/history?limit=${limit}`);
    return handleResponse<EnrichedPrediction[]>(res);
  },

  async getReferences(): Promise<ScientificReference[]> {
    const res = await fetch(`${API_BASE}/references`);
    return handleResponse<ScientificReference[]>(res);
  },

  async askExplanation(predictionId: string, question: string): Promise<ExplanationResult> {
    const res = await fetch(`${API_BASE}/predictions/${predictionId}/explanation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    return handleResponse<ExplanationResult>(res);
  },

  async getExplanationsHistory(predictionId: string): Promise<Array<{
    id: string;
    prediction_id: string;
    question: string;
    answer: string;
    provider: string;
    model_name: string;
    created_at?: string;
  }>> {
    const res = await fetch(`${API_BASE}/predictions/${predictionId}/explanations`);
    return handleResponse(res);
  },

  async askScientificQuestion(payload: {
    question: string;
    speciesId?: string;
    speciesName?: string;
    predictionId?: string;
    overrideModelId?: string;
    userContext?: string;
  }): Promise<GroundedScientificAnswer> {
    const res = await fetch(`${API_BASE}/knowledge/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<GroundedScientificAnswer>(res);
  },

  async getScientificSources(): Promise<ScientificSourceSummary[]> {
    const res = await fetch(`${API_BASE}/knowledge/sources`);
    return handleResponse<ScientificSourceSummary[]>(res);
  },

  async getScientificSource(id: string): Promise<ScientificSourceDetails> {
    const res = await fetch(`${API_BASE}/knowledge/sources/${id}`);
    return handleResponse<ScientificSourceDetails>(res);
  },

  async runScientificBenchmark(): Promise<BenchmarkSummaryReport> {
    const res = await fetch(`${API_BASE}/knowledge/benchmark`);
    return handleResponse<BenchmarkSummaryReport>(res);
  }
};
