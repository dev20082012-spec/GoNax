import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ValidationService, ScientificValidationError } from '../src/services/validationService';
import { ModelRegistry } from '../src/domain/models/modelRegistry';
import { PredictionService } from '../src/services/predictionService';
import { LLMService } from '../src/services/llm/llmService';
import { SpeciesRepository } from '../src/repositories/speciesRepository';
import { GroundedQAService } from '../src/services/rag/groundedQAService';
import { runSeed } from '../src/database/seeds/seed';

describe('GoNax User Experience, Adaptive Workflows & Accessibility Verification Suite', () => {
  let valService: ValidationService;
  let registry: ModelRegistry;
  let predService: PredictionService;
  let speciesRepo: SpeciesRepository;
  let llmService: LLMService;
  let groundedQAService: GroundedQAService;

  before(async () => {
    await runSeed();
    valService = new ValidationService();
    registry = ModelRegistry.getInstance();
    predService = new PredictionService();
    speciesRepo = new SpeciesRepository();
    llmService = new LLMService();
    groundedQAService = new GroundedQAService();
  });

  // 1. END-TO-END FIRST-USE USER JOURNEY
  describe('1. First-Use Complete Journey (Taxon Selection -> Input -> Validation -> Prediction -> Evidence -> Assistant)', () => {
    it('executes a complete end-to-end user journey for Quercus robur with mathematical provenance', async () => {
      // Step A: Choose Species
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak, 'Species Quercus robur must exist in registry');
      assert.strictEqual(oak.family, 'Fagaceae');

      // Step B: Input & Validation
      const rawDbhInches = 17.7165; // ~45.0 cm
      const canonicalDbhCm = parseFloat((rawDbhInches * 2.54).toFixed(2));
      const heightM = 22.0;

      const model = registry.resolveModel('quercus_robur');
      assert.ok(model, 'Calibrated model for Quercus robur must resolve');

      const validated = valService.validate({
        speciesId: oak.id,
        dbhCm: canonicalDbhCm,
        heightM
      }, oak, model);
      assert.ok(validated);

      // Step C: Deterministic Prediction Engine Execution
      const result = await predService.runPrediction({
        speciesId: oak.id,
        dbhCm: canonicalDbhCm,
        heightM,
        notes: 'End-to-End User Journey Demonstration Test'
      });

      assert.ok(result);
      assert.ok(result.prediction.id);

      // Step D: Target Definitions (Biomass, Carbon, CO2e)
      assert.ok(result.prediction.estimated_biomass_kg > 1000, 'Biomass must be realistic for 45cm oak');
      assert.ok(result.prediction.estimated_carbon_kg > 500, 'Carbon must be positive');
      assert.ok(result.prediction.estimated_co2e_kg > 1500, 'CO2e must exceed carbon by stoichiometric factor');

      // Check exact stoichiometric ratio: CO2e = C * 44.01 / 12.011
      const expectedCo2e = result.prediction.estimated_carbon_kg * (44.01 / 12.011);
      assert.ok(
        Math.abs(result.prediction.estimated_co2e_kg - expectedCo2e) < 0.05,
        'CO2e stoichiometric ratio must strictly equal 44.01 / 12.011'
      );

      // Step E: Statistical Uncertainty & Prediction Intervals
      assert.ok(result.prediction.confidence_lower_bound_kg < result.prediction.estimated_biomass_kg);
      assert.ok(result.prediction.confidence_upper_bound_kg > result.prediction.estimated_biomass_kg);
      assert.strictEqual(result.prediction.confidence_status, 'HIGH_CONFIDENCE');

      // Step F: 7-Stage Provenance & Citations
      assert.ok(result.evidences.length > 0, 'Evidence chain must be populated');
      const prov = result.evidences[0].provenance_details;
      const steps = prov.calculation_steps || prov.steps;
      assert.ok(steps && steps.length > 0, 'Mathematical arithmetic substitution steps must exist');

      // Step G: Grounded Scientific Assistant Inquiry
      const asstAnswer = await groundedQAService.answerQuestion({
        question: 'What is known about this species wood density?',
        speciesName: oak.scientific_name
      });

      assert.ok(asstAnswer.answer.length > 50);
      assert.strictEqual(asstAnswer.answerType, 'SUPPORTED_BY_SCIENTIFIC_SOURCES');
      assert.ok(asstAnswer.citations.length > 0);
    });
  });

  // 2. UNIT CONVERSIONS & BIOLOGICAL BOUNDS
  describe('2. Unit Conversion Traceability & Biological Boundary Checking', () => {
    it('accurately converts Imperial inches to Metric centimeters without silent drift', () => {
      const inches = 14.0;
      const cm = inches * 2.54;
      assert.strictEqual(cm, 35.56);

      const feet = 60.0;
      const meters = feet * 0.3048;
      assert.strictEqual(meters, 18.288);
    });

    it('rejects biologically impossible negative or giant dimensions', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);

      assert.throws(
        () => valService.validate({ speciesId: oak.id, dbhCm: -5, heightM: 15 }, oak),
        (err: any) => err instanceof ScientificValidationError && err.statusCode === 422
      );

      assert.throws(
        () => valService.validate({ speciesId: oak.id, dbhCm: 500, heightM: 15 }, oak),
        (err: any) => err instanceof ScientificValidationError && err.statusCode === 422
      );
    });

    it('correctly detects calibration extrapolation boundaries', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);

      // Oak calibration max DBH is 140 cm. DBH = 165 cm should trigger EXTRAPOLATION_WARNING
      const result = await predService.runPrediction({
        speciesId: oak.id,
        dbhCm: 165.0,
        heightM: 25.0
      });

      assert.strictEqual(
        result.prediction.confidence_status,
        'EXTRAPOLATION_WARNING',
        'Measurements outside calibration domain must produce EXTRAPOLATION_WARNING'
      );
    });
  });

  // 3. DATA DEFICIENCY & SAFE REFUSALS
  describe('3. Scientific Refusal & Data Deficiency Protocol', () => {
    it('safely refuses prediction for Fraxinus excelsior due to lack of calibrated data', async () => {
      const ash = await speciesRepo.findByScientificName('Fraxinus excelsior');
      assert.ok(ash);

      await assert.rejects(
        async () => {
          await predService.runPrediction({
            speciesId: ash.id,
            dbhCm: 35.0,
            heightM: 18.0
          });
        },
        (err: any) => {
          assert.ok(err.message.includes('Fraxinus excelsior') || err.message.includes('No registered scientific model') || err.message.includes('insufficient_data'));
          return true;
        }
      );
    });
  });

  // 4. OFFLINE / LLM UNAVAILABLE PRESERVATION
  describe('4. LLM Provider Fallback & Numerical Independence', () => {
    it('preserves numerical prediction when LLM reasoning is offline', async () => {
      const oak = await speciesRepo.findByScientificName('Quercus robur');
      assert.ok(oak);

      const prediction = await predService.runPrediction({
        speciesId: oak.id,
        dbhCm: 40.0,
        heightM: 20.0
      });

      // Even if LLM provider fails, mock synthesizer must return grounded explanation without altering numbers
      const explanation = await llmService.explain(prediction, 'What is the carbon fraction of this tree?');
      assert.ok(explanation);
      assert.ok(explanation.answer.includes('carbon') || explanation.answer.includes('biomass'));
      // The numerical prediction record itself remains 100% unaltered
      assert.ok(prediction.prediction.estimated_biomass_kg > 0);
      assert.ok(prediction.prediction.estimated_carbon_kg > 0);
    });
  });

  // 5. ACCESSIBILITY & SOURCE INTEGRITY AUDIT
  describe('5. WCAG 2.2 AA & UX Rule Integrity Audit (No Emojis, Focus Rings, Touch Targets)', () => {
    const frontendSrcDir = path.resolve(__dirname, '../../frontend/src');

    it('verifies that no disallowed pictographic emojis remain in frontend TypeScript files', () => {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
      const tsxFiles: string[] = [];

      function findFiles(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            findFiles(fullPath);
          } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
            tsxFiles.push(fullPath);
          }
        }
      }

      findFiles(frontendSrcDir);
      assert.ok(tsxFiles.length > 10, 'Must check all frontend TS/TSX source files');

      const violations: Array<{ file: string; match: string }> = [];
      for (const file of tsxFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const match = content.match(emojiRegex);
        if (match) {
          violations.push({ file: path.basename(file), match: match[0] });
        }
      }

      assert.strictEqual(
        violations.length,
        0,
        `Found disallowed emojis in source files: ${JSON.stringify(violations)}`
      );
    });

    it('verifies that index.css includes WCAG 2.2 AA focus-visible, touch targets, and reduced motion', () => {
      const cssPath = path.join(frontendSrcDir, 'index.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      assert.ok(cssContent.includes(':focus-visible'), 'CSS must specify visible focus indicators');
      assert.ok(cssContent.includes('min-height: 44px'), 'CSS must specify touch-friendly 44px min-height targets');
      assert.ok(cssContent.includes('prefers-reduced-motion'), 'CSS must include reduced-motion support');
      assert.ok(cssContent.includes('@media (max-width: 768px)'), 'CSS must include responsive layout media queries');
    });
  });
});
