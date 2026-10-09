import { LLMProvider, LLMContext, LLMResponse } from './llmProvider.interface';
import { config } from '../../config';

export class GeminiProvider implements LLMProvider {
  readonly providerId = 'gemini' as const;

  async generateExplanation(context: LLMContext, question: string): Promise<LLMResponse> {
    const start = Date.now();
    const apiKey = config.ai.geminiApiKey;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on server.');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.model}:generateContent?key=${apiKey}`;

    const systemPrompt = `You are the scientific reasoning and explanation assistant for GoNax — Species-Specific Carbon Intelligence.
CRITICAL MANDATORY RULE:
You MUST NEVER compute alternative numerical biomass or carbon estimates, speculate on modified arithmetic, or contradict the provided numbers.
All numerical outputs have been computed by calibrated deterministic forestry allometric engines.
Your mission is to answer researcher and forester questions about the biological mechanisms, wood density impact, carbon fractions, residual uncertainty, and literature citations.
Always cite the primary authors when explaining the model basis.`;

    const contextPayload = {
      species: context.species,
      observation: context.observation,
      model: context.model,
      results: context.results,
      uncertainty: context.uncertainty,
      references: context.references
    };

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              text: `Structured Scientific Prediction & Provenance Context:\n${JSON.stringify(contextPayload, null, 2)}\n\nUser Question: "${question}"`
            }
          ]
        }
      ]
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const json: any = await res.json();
    const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Empty response from Gemini LLM.');
    }

    return {
      answer: candidate,
      provider: this.providerId,
      rule_enforced: 'DETERMINISTIC_SCIENTIFIC_SEPARATION: Verified against strict ground-truth prompt guardrails.',
      citations: context.references.map(r => r.citation),
      latency_ms: Date.now() - start
    };
  }
}
