import { LLMProvider, LLMContext, LLMResponse } from './llmProvider.interface';
import { GeminiProvider } from './geminiProvider';
import { OpenAIProvider } from './openAIProvider';
import { MockProvider } from './mockProvider';
import { EnrichedPredictionRecord } from '../../repositories/predictionRepository';
import { config } from '../../config';

export class LLMService {
  private activeProvider: LLMProvider;
  private fallbackProvider: MockProvider;

  constructor() {
    this.fallbackProvider = new MockProvider();

    // Select provider based on configuration
    const requested = (process.env.LLM_PROVIDER || '').toLowerCase();
    if (requested === 'openai' && process.env.OPENAI_API_KEY) {
      this.activeProvider = new OpenAIProvider();
    } else if (config.ai.geminiApiKey) {
      this.activeProvider = new GeminiProvider();
    } else {
      this.activeProvider = this.fallbackProvider;
    }
  }

  buildContextFromPrediction(record: EnrichedPredictionRecord): LLMContext {
    const primaryEvidence = record.evidences[0]?.provenance_details;

    return {
      prediction_id: record.prediction.id,
      species: {
        scientific_name: record.species.scientific_name,
        common_name: record.species.common_name,
        family: record.species.family,
        wood_density_mean: record.species.wood_density_mean,
        wood_density_sd: record.species.wood_density_sd
      },
      observation: {
        dbh_cm: record.observation.dbh_cm,
        height_m: record.observation.height_m,
        crown_diameter_m: record.observation.crown_diameter_m,
        wood_density_override: record.observation.wood_density_override,
        latitude: record.observation.latitude,
        longitude: record.observation.longitude,
        notes: record.observation.observation_notes
      },
      model: {
        model_id: record.model.id,
        name: record.model.name,
        model_type: record.model.model_type,
        version: record.model.version,
        formula_expression: record.model.formula_expression,
        carbon_fraction: record.model.carbon_fraction,
        uncertainty_percentage: record.model.uncertainty_percentage
      },
      results: {
        estimated_biomass_kg: record.prediction.estimated_biomass_kg,
        estimated_carbon_kg: record.prediction.estimated_carbon_kg,
        estimated_co2e_kg: record.prediction.estimated_co2e_kg
      },
      uncertainty: {
        confidence_tier: record.prediction.confidence_status,
        model_uncertainty_rse: record.model.uncertainty_percentage,
        prediction_interval_95: [
          record.prediction.confidence_lower_bound_kg,
          record.prediction.confidence_upper_bound_kg
        ],
        extrapolation_warnings: primaryEvidence?.warnings || [],
        missing_variables: []
      },
      references: record.evidences
        .map(e => e.reference ? {
          doi: e.reference.doi,
          citation: e.reference.citation_text,
          title: e.reference.title
        } : null)
        .filter((r): r is { doi: string; citation: string; title: string } => r !== null),
      provenance_steps: primaryEvidence?.steps || []
    };
  }

  async explain(record: EnrichedPredictionRecord, question: string): Promise<LLMResponse> {
    const context = this.buildContextFromPrediction(record);
    const startEpoch = Date.now();
    console.log(`[Audit:LLMRequest] PredictionId="${record.prediction.id}" Provider="${this.activeProvider.providerId}" Question="${question.slice(0, 70)}"`);

    try {
      const response = await this.activeProvider.generateExplanation(context, question);
      console.log(`[Audit:LLMSuccess] PredictionId="${record.prediction.id}" Provider="${response.provider}" Latency=${Date.now() - startEpoch}ms`);
      return response;
    } catch (err: any) {
      console.warn(`[Audit:LLMFailure] Provider '${this.activeProvider.providerId}' failed: ${err.message}. Invoking deterministic mock reasoning synthesizer.`);
      const fallbackResponse = await this.fallbackProvider.generateExplanation(context, question);
      console.log(`[Audit:LLMFallbackSuccess] Fallback provider completed in ${Date.now() - startEpoch}ms.`);
      return fallbackResponse;
    }
  }
}
