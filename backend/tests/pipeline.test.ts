import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ValidationService, ScientificValidationError } from '../src/services/validationService';
import { ModelRegistry } from '../src/domain/models/modelRegistry';
import { PredictionService } from '../src/services/predictionService';
import { LLMService } from '../src/services/llm/llmService';
import { runSeed } from '../src/database/seeds/seed';
import { getDatabase } from '../src/database/connection';
import { SpeciesRepository } from '../src/repositories/speciesRepository';

describe('GoNax Scientific Intelligence Pipeline Tests', () => {
  let valService: ValidationService;
  let registry: ModelRegistry;
  let predService: PredictionService;
  let speciesRepo: SpeciesRepository;
  let llmService: LLMService;

  before(async () => {
    await runSeed();
    valService = new ValidationService();
    registry = ModelRegistry.getInstance();
    predService = new PredictionService();
    speciesRepo = new SpeciesRepository();
    llmService = new LLMService();
  });

  // 1. INPUT VALIDATION TESTS
  describe('Input Validation & Physical Plausibility', () => {
    it('rejects missing DBH with 400 status', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);
      assert.throws(
        () => valService.validate({ speciesId: oak.id, dbhCm: null as any, heightM: 20 }, oak),
        (err: any) => err instanceof ScientificValidationError && err.statusCode === 400
      );
    });

    it('rejects negative DBH (physically impossible)', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);
      assert.throws(
        () => valService.validate({ speciesId: oak.id, dbhCm: -15, heightM: 20 }, oak),
        (err: any) => err instanceof ScientificValidationError && err.statusCode === 422
      );
    });

    it('rejects biologically implausible DBH (> 400 cm)', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);
      assert.throws(
        () => valService.validate({ speciesId: oak.id, dbhCm: 550, heightM: 20 }, oak),
        (err: any) => err instanceof ScientificValidationError && err.statusCode === 422
      );
    });

    it('rejects negative or zero tree height', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);
      assert.throws(
        () => valService.validate({ speciesId: oak.id, dbhCm: 30, heightM: 0 }, oak),
        (err: any) => err instanceof ScientificValidationError && err.statusCode === 422
      );
    });

    it('rejects tree height exceeding global biological limits (> 135 m)', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);
      assert.throws(
        () => valService.validate({ speciesId: oak.id, dbhCm: 30, heightM: 150 }, oak),
        (err: any) => err instanceof ScientificValidationError && err.statusCode === 422
      );
    });

    it('rejects wood density override outside physical limits [0.15, 1.45]', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);
      assert.throws(
        () => valService.validate({ speciesId: oak.id, dbhCm: 30, heightM: 18, woodDensityOverride: 2.5 }, oak),
        (err: any) => err instanceof ScientificValidationError && err.statusCode === 422
      );
    });
  });

  // 2. SPECIES & MODEL ROUTING & DATA-DEFICIENT TAXON HANDLING
  describe('Species/Model Routing & Data-Deficient Species', () => {
    it('resolves correct calibrated model dynamically for Quercus robur', () => {
      const model = registry.resolveModel('quercus_robur');
      assert.ok(model);
      const meta = model.getMetadata();
      assert.strictEqual(meta.species_id, 'quercus_robur');
      assert.strictEqual(meta.status, 'active');
    });

    it('resolves correct calibrated model dynamically for Pinus sylvestris', () => {
      const model = registry.resolveModel('pinus_sylvestris');
      assert.ok(model);
      const meta = model.getMetadata();
      assert.strictEqual(meta.species_id, 'pinus_sylvestris');
    });

    it('refuses prediction for data-deficient species (Fraxinus excelsior)', async () => {
      const ash = await speciesRepo.findByScientificName('Fraxinus excelsior');
      assert.ok(ash);

      await assert.rejects(
        async () => {
          await predService.runPrediction({
            speciesId: ash.id,
            dbhCm: 35,
            heightM: 18
          });
        },
        (err: any) => {
          assert.ok(err.message.includes('Fraxinus excelsior') || err.message.includes('No registered scientific model') || err.message.includes('insufficient_data'));
          return true;
        }
      );
    });
  });

  // 3. DETERMINISTIC CALCULATION ACCURACY & REPRODUCIBILITY
  describe('Deterministic Scientific Calculation', () => {
    it('produces exact deterministic results given identical inputs', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);

      const run1 = await predService.runPrediction({
        speciesId: oak.id,
        dbhCm: 45.0,
        heightM: 22.0
      });

      const run2 = await predService.runPrediction({
        speciesId: oak.id,
        dbhCm: 45.0,
        heightM: 22.0
      });

      assert.strictEqual(run1.prediction.estimated_biomass_kg, run2.prediction.estimated_biomass_kg);
      assert.strictEqual(run1.prediction.estimated_carbon_kg, run2.prediction.estimated_carbon_kg);
      assert.strictEqual(run1.prediction.estimated_co2e_kg, run2.prediction.estimated_co2e_kg);
    });

    it('satisfies carbon stoichiometric conversion ratio (CO2e = C * 44.01/12.011)', async () => {
      const pine = await speciesRepo.findByScientificName('Pinus sylvestris');
      assert.ok(pine);

      const res = await predService.runPrediction({
        speciesId: pine.id,
        dbhCm: 30.0,
        heightM: 18.0
      });

      const c = res.prediction.estimated_carbon_kg;
      const co2e = res.prediction.estimated_co2e_kg;
      const expectedRatio = 44.01 / 12.011; // ~3.6641
      const actualRatio = co2e / c;

      assert.ok(Math.abs(actualRatio - expectedRatio) < 0.01, `Ratio was ${actualRatio}, expected ~${expectedRatio}`);
    });
  });

  // 4. UNCERTAINTY ASSESSMENT & EXTRAPOLATION
  describe('Uncertainty Layer & Bounds', () => {
    it('generates non-arbitrary 95% log-normal confidence bounds around biomass', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);

      const res = await predService.runPrediction({
        speciesId: oak.id,
        dbhCm: 35.0,
        heightM: 19.0
      });

      const b = res.prediction.estimated_biomass_kg;
      const lower = res.prediction.confidence_lower_bound_kg;
      const upper = res.prediction.confidence_upper_bound_kg;

      assert.ok(lower > 0);
      assert.ok(lower < b, 'Lower bound must be strictly less than biomass');
      assert.ok(upper > b, 'Upper bound must be strictly greater than biomass');

      // Check persisted uncertainty entity
      assert.ok(res.uncertainty);
      assert.strictEqual(res.uncertainty.prediction_id, res.prediction.id);
      assert.ok(res.uncertainty.model_uncertainty_rse > 0);
    });

    it('generates EXTRAPOLATION_WARNING when measurements exceed model calibration limits', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);

      // Oak model calibration range is [10, 140] cm DBH and [5, 38] m height
      const res = await predService.runPrediction({
        speciesId: oak.id,
        dbhCm: 165.0, // Exceeds 140 cm
        heightM: 25.0
      });

      assert.strictEqual(res.prediction.confidence_status, 'EXTRAPOLATION_WARNING');
      assert.ok(res.uncertainty);
      const warnings = JSON.parse(res.uncertainty.extrapolation_warnings);
      assert.ok(warnings.length > 0);
      assert.ok(warnings.some((w: any) => w.variable === 'dbh_cm'));
    });
  });

  // 5. PROVENANCE & DATABASE RELATIONSHIPS
  describe('Provenance & Relational Integrity', () => {
    it('persists and links Species, Observation, Prediction, Uncertainty, and Evidence', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);

      const res = await predService.runPrediction({
        speciesId: oak.id,
        dbhCm: 50.0,
        heightM: 24.0,
        crownDiameterM: 10.0,
        woodDensityOverride: 0.69,
        notes: 'Relational audit test observation'
      });

      // Verification of relational integrity
      assert.ok(res.prediction.id);
      assert.strictEqual(res.prediction.observation_id, res.observation.id);
      assert.strictEqual(res.observation.species_id, oak.id);
      assert.strictEqual(res.species.id, oak.id);
      assert.ok(res.evidences.length > 0);
      assert.strictEqual(res.evidences[0].reference?.doi, '10.1093/forestry/cpi052');

      // Check calculation steps in provenance
      const steps = res.evidences[0].provenance_details.calculation_steps;
      assert.ok(Array.isArray(steps));
      assert.ok(steps.length >= 3);
    });
  });

  // 6. LLM CONTEXT GROUNDING & ARCHITECTURAL SEPARATION
  describe('LLM Layer Context Grounding', () => {
    it('constructs structured context directly from deterministic prediction output', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);

      const prediction = await predService.runPrediction({
        speciesId: oak.id,
        dbhCm: 42.0,
        heightM: 21.0
      });

      const context = llmService.buildContextFromPrediction(prediction);

      // Verify exact numerical match
      assert.strictEqual(context.results.estimated_biomass_kg, prediction.prediction.estimated_biomass_kg);
      assert.strictEqual(context.results.estimated_carbon_kg, prediction.prediction.estimated_carbon_kg);
      assert.strictEqual(context.results.estimated_co2e_kg, prediction.prediction.estimated_co2e_kg);
      assert.strictEqual(context.species.scientific_name, 'Quercus robur');
      assert.strictEqual(context.observation.dbh_cm, 42.0);
      assert.ok(context.references.length > 0);
    });

    it('generates an explanation that respects scientific evidence and architectural constraints', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);

      const prediction = await predService.runPrediction({
        speciesId: oak.id,
        dbhCm: 40.0,
        heightM: 20.0
      });

      const explanation = await llmService.explain(prediction, 'How was dry biomass converted into carbon content?');

      assert.ok(explanation.answer);
      assert.ok(explanation.answer.length > 50);
      assert.ok(explanation.provider);
      assert.ok(explanation.citations.length > 0);
      assert.ok(explanation.rule_enforced.includes('LLM does not compute numbers'));
    });
  });
});
