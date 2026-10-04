import { LLMProvider, LLMContext, LLMResponse } from './llmProvider.interface';

export class MockProvider implements LLMProvider {
  readonly providerId = 'mock-scientific-synthesizer' as const;

  async generateExplanation(context: LLMContext, question: string): Promise<LLMResponse> {
    const start = Date.now();
    const q = question.toLowerCase().trim();

    const s = context.species;
    const m = context.model;
    const o = context.observation;
    const r = context.results;
    const u = context.uncertainty;
    const primaryCitation = context.references[0]?.citation || 'Peer-reviewed European Forestry Allometry';

    let answer = '';

    if (q.includes('carbon') || q.includes('co2') || q.includes('convert') || q.includes('fraction')) {
      answer =
        `### Carbon Allocation and Atmospheric CO₂ Equivalent\n\n` +
        `For this **${s.scientific_name}** (*${s.common_name}*), total above-ground dry biomass is deterministically calculated at **${r.estimated_biomass_kg.toLocaleString()} kg**.\n\n` +
        `- **Carbon Fraction**: The species-specific allometric carbon fraction is **${(m.carbon_fraction * 100).toFixed(1)}%** (${m.carbon_fraction} kg C / kg dry matter), resulting in **${r.estimated_carbon_kg.toLocaleString()} kg of elemental Carbon**.\n` +
        `- **Atmospheric CO₂ Equivalent**: Using the molecular weight ratio ($44.01 \\text{ g/mol } CO_2 / 12.011 \\text{ g/mol } C \\approx 3.6667$), this sequestered carbon corresponds to **${r.estimated_co2e_kg.toLocaleString()} kg CO₂e**.\n\n` +
        `*Scientific Basis*: Methodological guidance from Thomas & Martin (2012) and IPCC Good Practice Guidance for Land Use, Land-Use Change and Forestry.`;
    } else if (q.includes('uncertainty') || q.includes('confidence') || q.includes('interval') || q.includes('bound') || q.includes('error')) {
      const extrapText = u.extrapolation_warnings.length > 0
        ? `[Extrapolation Notice]: ${u.extrapolation_warnings.join(' ')}`
        : `[Calibration Compliance]: Tree measurements fall within the verified empirical calibration domain.`;

      const geoText = u.geographic_mismatch
        ? `[Geographic Domain Note]: ${u.geographic_mismatch}`
        : `[Geographic Applicability]: Aligns with model's calibrated eco-region.`;

      answer =
        `### Scientific Uncertainty and Prediction Intervals\n\n` +
        `This prediction has been classified under the **${u.confidence_tier}** tier:\n\n` +
        `- **Residual Standard Error (RSE)**: ±${u.model_uncertainty_rse}% residual error from destructive harvest calibration.\n` +
        `- **95% Prediction Interval**: [**${u.prediction_interval_95[0].toLocaleString()} kg** – **${u.prediction_interval_95[1].toLocaleString()} kg** dry biomass].\n` +
        `- **Applicability Assessment**:\n  - ${extrapText}\n  - ${geoText}\n\n` +
        `*Citation*: Evaluated against calibration dataset ${primaryCitation}.`;
    } else if (q.includes('density') || q.includes('wood')) {
      const appliedDensity = o.wood_density_override || s.wood_density_mean;
      answer =
        `### Wood Density Impact on Biomass Calculation\n\n` +
        `Basic wood density ($\\rho$) represents oven-dry mass per fresh green volume:\n\n` +
        `- **Species Baseline**: *${s.scientific_name}* has a species mean basic wood density of **${s.wood_density_mean} ± ${s.wood_density_sd} g/cm³**.\n` +
        `- **Value Applied**: **${appliedDensity} g/cm³** ${o.wood_density_override ? '(user field-measured core sample override)' : '(species reference mean)'}.\n` +
        `- **Allometric Role**: Higher wood density signifies greater structural lignocellulose content per unit of cylindrical xylem volume, increasing both mechanical strength and carbon sequestration density.`;
    } else if (q.includes('formula') || q.includes('equation') || q.includes('math') || q.includes('how')) {
      answer =
        `### Mathematical Allometric Formulation\n\n` +
        `The prediction was calculated using model **${m.name}** (v${m.version}):\n\n` +
        `$$\\text{AGB} = ${m.formula_expression || 'f(DBH, Height, WoodDensity)'}$$\n\n` +
        `**Substitution for DBH = ${o.dbh_cm} cm, Height = ${o.height_m} m**:\n` +
        `- Evaluated dry biomass: **${r.estimated_biomass_kg.toLocaleString()} kg**\n` +
        `- Non-linear scaling ($DBH^{>1.9}$) reflects super-linear volumetric scaling of biological tree stems.`;
    } else {
      answer =
        `### Scientific Summary for ${s.scientific_name} Observation\n\n` +
        `Field measurement (DBH: **${o.dbh_cm} cm**, Height: **${o.height_m} m**) processed via calibrated model **${m.name}**:\n\n` +
        `- **Estimated Dry Biomass**: **${r.estimated_biomass_kg.toLocaleString()} kg** (${(r.estimated_biomass_kg / 1000).toFixed(2)} tonnes)\n` +
        `- **Elemental Carbon**: **${r.estimated_carbon_kg.toLocaleString()} kg C** (${(m.carbon_fraction * 100).toFixed(1)}% carbon fraction)\n` +
        `- **Atmospheric CO₂ Equivalent**: **${r.estimated_co2e_kg.toLocaleString()} kg CO₂e**\n` +
        `- **Confidence Status**: ${u.confidence_tier} (95% CI: [${u.prediction_interval_95[0]} - ${u.prediction_interval_95[1]}] kg)\n` +
        `- **Literature Reference**: ${primaryCitation}\n\n` +
        `*Strict Rule Notice*: Numerical figures are derived from verified deterministic forestry allometry. The language layer provides qualitative scientific context only.`;
    }

    return {
      answer,
      provider: this.providerId,
      rule_enforced: 'DETERMINISTIC_SCIENTIFIC_SEPARATION: LLM does not compute numbers; numerical carbon calculation is immutable and strictly non-generative.',
      citations: context.references.map(ref => ref.citation),
      latency_ms: Date.now() - start
    };
  }
}
