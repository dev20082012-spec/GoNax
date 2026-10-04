import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ModelRegistry } from '../src/domain/models/modelRegistry';
import { LLMService } from '../src/services/llm/llmService';
import { MockProvider } from '../src/services/llm/mockProvider';
import { LLMContext } from '../src/services/llm/llmProvider.interface';

describe('GoNax Scientific Architecture & ML Pipeline Tests', () => {
  const registry = ModelRegistry.getInstance();

  describe('1. Species / Model Routing', () => {
    it('correctly resolves the active model for Quercus robur', () => {
      const model = registry.resolveModel('quercus_robur');
      const meta = model.getMetadata();
      assert.strictEqual(meta.species_id, 'quercus_robur');
      assert.strictEqual(meta.status, 'active');
      assert.ok(meta.features.some(f => f.name === 'dbh_cm' && f.required));
    });

    it('correctly resolves the active model for Pinus sylvestris', () => {
      const model = registry.resolveModel('pinus_sylvestris');
      const meta = model.getMetadata();
      assert.strictEqual(meta.species_id, 'pinus_sylvestris');
      assert.strictEqual(meta.carbon_fraction, 0.505);
    });

    it('allows resolving an alternative model via preferredModelId', () => {
      const mlModel = registry.resolveModel('quercus_robur', 'ml-oak-ensemble-v1');
      assert.strictEqual(mlModel.getMetadata().model_id, 'ml-oak-ensemble-v1');
      assert.strictEqual(mlModel.getMetadata().model_type, 'ml_gradient_boost');
    });

    it('throws error for unsupported species', () => {
      assert.throws(() => {
        registry.resolveModel('eucalyptus_grandis_unsupported');
      }, /No registered scientific models found/);
    });
  });

  describe('2. Feature & Unit Validation', () => {
    const oakModel = registry.resolveModel('quercus_robur');

    it('rejects missing required feature (height_m missing)', () => {
      const result = oakModel.validateInput({ dbh_cm: 40.0 });
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.some(e => e.field === 'height_m' && e.message.includes('Missing required')));
    });

    it('rejects negative or impossible DBH values', () => {
      const negResult = oakModel.validateInput({ dbh_cm: -5.0, height_m: 15.0 });
      assert.strictEqual(negResult.valid, false);
      assert.ok(negResult.errors.some(e => e.field === 'dbh_cm' && e.message.includes('impossible')));

      const hugeResult = oakModel.validateInput({ dbh_cm: 650.0, height_m: 15.0 });
      assert.strictEqual(hugeResult.valid, false);
    });

    it('rejects unphysical tree height values', () => {
      const zeroH = oakModel.validateInput({ dbh_cm: 30.0, height_m: 0.0 });
      assert.strictEqual(zeroH.valid, false);

      const hugeH = oakModel.validateInput({ dbh_cm: 30.0, height_m: 160.0 });
      assert.strictEqual(hugeH.valid, false);
    });

    it('accepts valid inputs and populates default optional values', () => {
      const valid = oakModel.validateInput({ dbh_cm: 45.0, height_m: 22.0 });
      assert.strictEqual(valid.valid, true);
      assert.strictEqual(valid.sanitizedInput.dbh_cm, 45.0);
      assert.strictEqual(valid.sanitizedInput.height_m, 22.0);
      assert.strictEqual(valid.sanitizedInput.wood_density_override, 0.67);
    });
  });

  describe('3. Prediction Interface & Deterministic Math', () => {
    it('PrototypeFormulaModel predicts exact biomass, carbon, and co2e', async () => {
      const oakModel = registry.resolveModel('quercus_robur');
      const res = await oakModel.predict({ dbh_cm: 40.0, height_m: 20.0 });

      assert.ok(res.estimated_biomass_kg > 1200 && res.estimated_biomass_kg < 1300);
      // Carbon = Biomass * 0.482
      const expectedCarbon = Math.round(res.estimated_biomass_kg * 0.482 * 1000) / 1000;
      assert.strictEqual(res.estimated_carbon_kg, expectedCarbon);

      // CO2e = Carbon * (44.01 / 12.011)
      const expectedCo2e = Math.round(expectedCarbon * (44.01 / 12.011) * 1000) / 1000;
      assert.strictEqual(res.estimated_co2e_kg, expectedCo2e);
    });

    it('MLModelAdapter evaluates multi-feature inference', async () => {
      const mlModel = registry.resolveModel('quercus_robur', 'ml-oak-ensemble-v1');
      const res = await mlModel.predict({
        dbh_cm: 40.0,
        height_m: 20.0,
        crown_diameter_m: 8.0,
        wood_density_override: 0.67
      });

      assert.ok(res.estimated_biomass_kg > 0);
      assert.strictEqual(res.metadata.model_type, 'ml_gradient_boost');
      assert.ok(res.provenance.calculation_steps.length >= 3);
    });
  });

  describe('4. Uncertainty Handling & Applicability Envelopes', () => {
    const oakModel = registry.resolveModel('quercus_robur');

    it('flags HIGH_CONFIDENCE for in-bounds observations', async () => {
      const res = await oakModel.predict({ dbh_cm: 45.0, height_m: 22.0, latitude: 50.0 });
      assert.strictEqual(res.uncertainty.confidence_tier, 'HIGH_CONFIDENCE');
      assert.strictEqual(res.uncertainty.extrapolation_warnings.length, 0);
      assert.ok(res.uncertainty.prediction_interval_95[0] < res.estimated_biomass_kg);
      assert.ok(res.uncertainty.prediction_interval_95[1] > res.estimated_biomass_kg);
    });

    it('detects extrapolation warnings when DBH exceeds calibration range', async () => {
      const res = await oakModel.predict({ dbh_cm: 180.0, height_m: 25.0 }); // max calibrated is 140 cm
      assert.strictEqual(res.uncertainty.confidence_tier, 'EXTRAPOLATION_WARNING');
      assert.ok(res.uncertainty.extrapolation_warnings.some(w => w.variable === 'dbh_cm'));
    });

    it('detects geographic mismatch when coordinates are outside eco-region', async () => {
      // Oak model calibrated for 46.0 - 56.5 lat (Temperate Europe). Provide subtropical lat = 24.5
      const res = await oakModel.predict({ dbh_cm: 40.0, height_m: 20.0, latitude: 24.5 });
      assert.strictEqual(res.uncertainty.confidence_tier, 'GEOGRAPHIC_MISMATCH');
      assert.strictEqual(res.uncertainty.geographic_mismatch.mismatch_detected, true);
    });
  });

  describe('5. Provenance Traceability', () => {
    it('produces an end-to-end audit trail', async () => {
      const oakModel = registry.resolveModel('quercus_robur');
      const res = await oakModel.predict({ dbh_cm: 42.0, height_m: 21.0 });

      const chain = res.provenance.traceability_chain;
      assert.strictEqual(chain.species_id, 'quercus_robur');
      assert.strictEqual(chain.dataset_id, 'ds-eur-oak-v1');
      assert.strictEqual(chain.model_id, 'zianis-oak-2005-standard');
      assert.ok(res.provenance.scientific_references.length > 0);
      assert.ok(res.provenance.calculation_steps.some(s => s.formula.includes('AGB = a * (DBH ^ b)')));
    });
  });

  describe('6. LLM Explanation Context & Provider Separation', () => {
    it('MockProvider synthesizes explanation grounded in structured context without recalculation', async () => {
      const mock = new MockProvider();
      const testContext: LLMContext = {
        prediction_id: 'test-uuid-1',
        species: {
          scientific_name: 'Quercus robur',
          common_name: 'Pedunculate Oak',
          family: 'Fagaceae',
          wood_density_mean: 0.67,
          wood_density_sd: 0.05
        },
        observation: { dbh_cm: 40.0, height_m: 20.0 },
        model: {
          model_id: 'zianis-oak-2005-standard',
          name: 'Zianis Oak Allometric Model',
          model_type: 'allometric_formula',
          version: '1.2.0',
          formula_expression: 'AGB = 0.0567 * (DBH ^ 2.012) * (Height ^ 0.873)',
          carbon_fraction: 0.482,
          uncertainty_percentage: 11.4
        },
        results: {
          estimated_biomass_kg: 1259.88,
          estimated_carbon_kg: 607.26,
          estimated_co2e_kg: 2226.54
        },
        uncertainty: {
          confidence_tier: 'HIGH_CONFIDENCE',
          model_uncertainty_rse: 11.4,
          prediction_interval_95: [978.2, 1541.5],
          extrapolation_warnings: [],
          missing_variables: []
        },
        references: [{
          doi: '10.1093/forestry/cpi052',
          citation: 'Zianis et al. (2005). Silva Fennica Monographs, 4.',
          title: 'Biomass equations'
        }],
        provenance_steps: []
      };

      const res = await mock.generateExplanation(testContext, 'How is the carbon fraction applied?');
      assert.ok(res.answer.includes('48.2%'));
      assert.ok(res.answer.includes('607.26 kg'));
      assert.ok(res.answer.includes('2,226.54 kg CO₂e'));
      assert.ok(res.rule_enforced.includes('DETERMINISTIC_SCIENTIFIC_SEPARATION'));
    });
  });
});
