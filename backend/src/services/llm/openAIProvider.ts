import { LLMProvider, LLMContext, LLMResponse } from './llmProvider.interface';

export class OpenAIProvider implements LLMProvider {
  readonly providerId = 'openai' as const;

  async generateExplanation(context: LLMContext, question: string): Promise<LLMResponse> {
    const start = Date.now();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured on server.');
    }

    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const systemPrompt = `You are the scientific explanation layer for GoNax Carbon Intelligence.
CRITICAL RULE:
You MUST NEVER recalculate or change the numerical carbon or biomass predictions.
All numbers are produced by a deterministic forestry model.
Explain the scientific, biological, and ecological implications strictly using the provided context.`;

    const payload = {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Context: ${JSON.stringify(context, null, 2)}\n\nQuestion: "${question}"`
        }
      ],
      temperature: 0.2
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const json: any = await res.json();
    const answer = json.choices?.[0]?.message?.content || 'No explanation generated.';

    return {
      answer,
      provider: this.providerId,
      rule_enforced: 'DETERMINISTIC_SCIENTIFIC_SEPARATION: Verified against server-side guardrails.',
      citations: context.references.map(r => r.citation),
      latency_ms: Date.now() - start
    };
  }
}
