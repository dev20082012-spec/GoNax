import { EnrichedPredictionRecord } from '../repositories/predictionRepository';
import { config } from '../config';

export interface ExplanationResponse {
  answer: string;
  scientificContext: {
    species: string;
    model: string;
    provenanceStepsCount: number;
    citation: string;
    ruleEnforced: string;
  };
  provider: 'gemini' | 'scientific-rule-synthesizer';
}

export class ExplanationService {
  async explainPrediction(
    record: EnrichedPredictionRecord,
    question: string
  ): Promise<ExplanationResponse> {
    const qLower = question.toLowerCase().trim();
    const primaryRef = record.evidences[0]?.reference?.citation_text || 'Peer-reviewed forestry literature';
    const primaryEvidence = record.evidences[0]?.provenance_details;

    // Strict system guardrail notice
    const ruleEnforced = 'DETERMINISTIC_SCIENTIFIC_SEPARATION: LLM is strictly an interpretive layer and never alters numerical outputs.';

    // Check if Gemini API key is provided
    if (config.ai.geminiApiKey && config.ai.geminiApiKey.trim() !== '') {
      try {
        const geminiAnswer = await this.callGemini(record, question);
        return {
          answer: geminiAnswer,
          scientificContext: {
            species: `${record.species.scientific_name} (${record.species.common_name})`,
            model: record.model.name,
            provenanceStepsCount: primaryEvidence?.steps?.length || 0,
            citation: primaryRef,
            ruleEnforced
          },
          provider: 'gemini'
        };
      } catch (err: any) {
        console.warn('[ExplanationService] Gemini API call failed or timed out. Falling back to deterministic synthesizer:', err.message);
      }
    }

    // Deterministic scientific explanation synthesizer
    const answer = this.synthesizeScientificExplanation(record, qLower, primaryEvidence, primaryRef);

    return {
      answer,
      scientificContext: {
        species: `${record.species.scientific_name} (${record.species.common_name})`,
        model: record.model.name,
        provenanceStepsCount: primaryEvidence?.steps?.length || 0,
        citation: primaryRef,
        ruleEnforced
      },
      provider: 'scientific-rule-synthesizer'
    };
  }

  private synthesizeScientificExplanation(
    record: EnrichedPredictionRecord,
    q: string,
    evidence: any,
    citation: string
  ): string {
    const s = record.species;
    const m = record.model;
    const o = record.observation;
    const p = record.prediction;

    if (q.includes('carbon') || q.includes('co2') || q.includes('fraction')) {
      return (
        `### Carbon and CO₂ Equivalent Allocation\n\n` +
        `For **${s.scientific_name}** (*${s.common_name}*), the total above-ground dry biomass is estimated at **${p.estimated_biomass_kg.toLocaleString()} kg**.\n\n` +
        `- **Carbon Fraction Applied**: ${(m.carbon_fraction * 100).toFixed(1)}% of total dry biomass (${m.carbon_fraction} kg C / kg biomass), yielding **${p.estimated_carbon_kg.toLocaleString()} kg of elemental Carbon**.\n` +
        `- **CO₂ Equivalent Conversion**: Elemental carbon is converted to atmospheric CO₂ equivalent using the molecular weight ratio ($44.01 \\text{ g/mol } CO_2 / 12.011 \\text{ g/mol } C \\approx 3.6667$). This translates to **${p.estimated_co2e_kg.toLocaleString()} kg CO₂e** sequestered in this tree.\n\n` +
        `*Scientific Basis*: Carbon fraction calibrated according to Thomas & Martin (2012) and IPCC Good Practice Guidance.`
      );
    }

    if (q.includes('density') || q.includes('wood')) {
      const densityUsed = evidence?.woodDensityUsed || s.wood_density_mean;
      return (
        `### Wood Density Characteristics\n\n` +
        `Basic wood density ($\rho$) is a fundamental parameter governing volumetric-to-mass scaling:\n\n` +
        `- **Species Baseline**: ${s.scientific_name} has a mean basic wood density of **${s.wood_density_mean} g/cm³** (standard deviation: ±${s.wood_density_sd} g/cm³).\n` +
        `- **Applied in Calculation**: **${densityUsed} g/cm³** ${o.wood_density_override ? '(field-specific override)' : '(species reference mean)'}.\n` +
        `- **Significance**: Higher wood density means more structural lignocellulose per unit volume of xylem, directly elevating both dry biomass and carbon storage capacity compared to lower-density softwoods.`
      );
    }

    if (q.includes('confidence') || q.includes('uncertainty') || q.includes('error') || q.includes('bound')) {
      return (
        `### Confidence and Uncertainty Assessment\n\n` +
        `This calculation holds a **${p.confidence_status}** status:\n\n` +
        `- **Model Uncertainty (RSE)**: ±${m.uncertainty_percentage}% residual error.\n` +
        `- **Empirical 95% Confidence Interval**: Biomass is bounded between **${p.confidence_lower_bound_kg.toLocaleString()} kg** and **${p.confidence_upper_bound_kg.toLocaleString()} kg**.\n` +
        `- **Calibration Range**: The model "${m.name}" is calibrated for trees with DBH between ${m.parameters.dbhMinCm} cm and ${m.parameters.dbhMaxCm} cm, and height between ${m.parameters.heightMinM} m and ${m.parameters.heightMaxM} m.\n` +
        `- **Observation Context**: The observed DBH (${o.dbh_cm} cm) and height (${o.height_m} m) fall ${p.confidence_status === 'EXTRAPOLATION_WARNING' ? '**outside** the empirical calibration range, incurring an extrapolation warning' : '**within** the validated empirical bounds'}.\n\n` +
        `*Reference*: Calibration dataset described in ${citation}.`
      );
    }

    if (q.includes('formula') || q.includes('equation') || q.includes('calculate') || q.includes('how')) {
      return (
        `### Mathematical Allometric Formulation\n\n` +
        `The biomass prediction was derived using the deterministic allometric model:\n\n` +
        `$$\\text{AGB} = a \\cdot (\\text{DBH})^b \\cdot (\\text{Height})^c$$\n\n` +
        `**Parameter Values for ${s.scientific_name}**:\n` +
        `- Scaling coefficient $a = ${m.parameters.a}$\n` +
        `- Diameter exponent $b = ${m.parameters.b}$\n` +
        `- Height exponent $c = ${m.parameters.c || 1.0}$\n\n` +
        `**Substitution**:\n` +
        `$$\\text{AGB} = ${m.parameters.a} \\times (${o.dbh_cm})^{${m.parameters.b}} \\times (${o.height_m})^{${m.parameters.c || 1.0}} = \\mathbf{${p.estimated_biomass_kg.toLocaleString()}\\text{ kg}}$$\n\n` +
        `Notice that because the exponent $b > 1$, biomass scales allometrically (super-linearly) with trunk diameter.`
      );
    }

    // Default comprehensive overview
    return (
      `### Scientific Explanation for ${s.scientific_name} Observation\n\n` +
      `This tree measurement (DBH: **${o.dbh_cm} cm**, Height: **${o.height_m} m**) has been processed through the species-calibrated **${m.name}** (${m.version}) model.\n\n` +
      `- **Estimated Dry Biomass**: **${p.estimated_biomass_kg.toLocaleString()} kg** (approx. ${(p.estimated_biomass_kg / 1000).toFixed(2)} metric tonnes)\n` +
      `- **Elemental Carbon Stock**: **${p.estimated_carbon_kg.toLocaleString()} kg C** (${(m.carbon_fraction * 100).toFixed(1)}% carbon fraction)\n` +
      `- **Carbon Dioxide Equivalent**: **${p.estimated_co2e_kg.toLocaleString()} kg CO₂e**\n` +
      `- **Confidence Interval**: [${p.confidence_lower_bound_kg.toLocaleString()} kg – ${p.confidence_upper_bound_kg.toLocaleString()} kg] (±${m.uncertainty_percentage}%)\n` +
      `- **Literature Citation**: ${citation}\n\n` +
      `*Scientific Architectural Rule*: All numerical carbon and biomass metrics are calculated by deterministic forestry equations and never generated by the language model.`
    );
  }

  private async callGemini(record: EnrichedPredictionRecord, question: string): Promise<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.model}:generateContent?key=${config.ai.geminiApiKey}`;

    const systemPrompt = `You are the scientific explanation layer for GoNax, a species-specific carbon intelligence system.
CRITICAL ARCHITECTURAL RULE:
You MUST NEVER perform arithmetic calculations, invent alternative carbon/biomass numbers, or alter the prediction figures.
The numerical carbon calculation was executed deterministically by the validated forestry engine.
Your purpose is to answer the user's scientific, ecological, and allometric questions based STRICTLY on the provided structured observation, model parameters, and evidence.
Cite the reference literature when explaining the basis.`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              text: `Structured Prediction Context:
Species: ${record.species.scientific_name} (${record.species.common_name}, Family: ${record.species.family})
Mean Wood Density: ${record.species.wood_density_mean} g/cm3
Observed DBH: ${record.observation.dbh_cm} cm
Observed Height: ${record.observation.height_m} m
Estimated Above-Ground Biomass: ${record.prediction.estimated_biomass_kg} kg
Estimated Carbon: ${record.prediction.estimated_carbon_kg} kg
Estimated CO2e: ${record.prediction.estimated_co2e_kg} kg
Confidence Status: ${record.prediction.confidence_status} (Range: [${record.prediction.confidence_lower_bound_kg} - ${record.prediction.confidence_upper_bound_kg}] kg)
Model: ${record.model.name} (${record.model.formula_expression})
Parameters: ${JSON.stringify(record.model.parameters)}
Carbon Fraction: ${record.model.carbon_fraction}
Citations: ${record.evidences.map(e => e.reference?.citation_text).join('; ')}

User Question: "${question}"`
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

    const data: any = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error('Empty response received from Gemini.');
    }
    return candidate;
  }
}
