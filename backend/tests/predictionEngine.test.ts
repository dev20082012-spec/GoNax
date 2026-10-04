import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FormulaPredictionEngine } from '../src/domain/engine/formulaPredictionEngine';
import { MLModelPredictionEngine } from '../src/domain/engine/mlModelPredictionEngine';
import { PredictionEngineInput } from '../src/domain/engine/types';

describe('PredictionEngine Unit Tests', () => {
  const oakInput: PredictionEngineInput = {
    species: {
      id: 'species-oak-1',
      scientificName: 'Quercus robur',
      commonName: 'Pedunculate Oak',
      woodDensityMean: 0.67,
      woodDensitySd: 0.05
    },
    model: {
      id: 'model-oak-zianis',
      name: 'Zianis-Oak-Allometry-2005',
      version: '1.0-prototype',
      formulaExpression: 'AGB = 0.0567 * (DBH ^ 2.012) * (H ^ 0.873)',
      parameters: {
        a: 0.0567,
        b: 2.012,
        c: 0.873,
        dbhMinCm: 10.0,
        dbhMaxCm: 140.0,
        heightMinM: 5.0,
        heightMaxM: 38.0
      },
      carbonFraction: 0.482,
      uncertaintyPercentage: 11.4,
      isPrototype: true
    },
    measurements: {
      dbhCm: 40.0,
      heightM: 20.0
    }
  };

  it('FormulaPredictionEngine correctly computes deterministic biomass and carbon', async () => {
    const engine = new FormulaPredictionEngine();
    const result = await engine.predict(oakInput);

    // Manual calculation check:
    // a * (40 ^ 2.012) * (20 ^ 0.873)
    // 40 ^ 2.012 = 1630.8258
    // 20 ^ 0.873 = 13.6276
    // 0.0567 * 1630.8258 * 13.6276 = 1259.88 kg
    assert.ok(result.estimatedBiomassKg > 1200 && result.estimatedBiomassKg < 1300, `Expected biomass ~1259 kg, got ${result.estimatedBiomassKg}`);

    // Carbon check: 1259.88 * 0.482 = ~607.26 kg
    const expectedCarbon = Math.round(result.estimatedBiomassKg * 0.482 * 1000) / 1000;
    assert.strictEqual(result.estimatedCarbonKg, expectedCarbon);

    // CO2e check: Carbon * (44.01 / 12.011) ~ 607.26 * 3.664 = ~2225 kg
    assert.ok(result.estimatedCo2eKg > result.estimatedCarbonKg * 3.6);

    // Check bounds
    assert.ok(result.confidenceLowerBoundKg < result.estimatedBiomassKg);
    assert.ok(result.confidenceUpperBoundKg > result.estimatedBiomassKg);
    assert.strictEqual(result.isPrototype, true);
    assert.strictEqual(result.provenance.steps.length, 6);
  });

  it('FormulaPredictionEngine flags EXTRAPOLATION_WARNING when measurement exceeds calibration range', async () => {
    const engine = new FormulaPredictionEngine();
    const extrapolatedInput: PredictionEngineInput = {
      ...oakInput,
      measurements: {
        dbhCm: 180.0, // max is 140.0
        heightM: 20.0
      }
    };

    const result = await engine.predict(extrapolatedInput);
    assert.strictEqual(result.confidenceStatus, 'EXTRAPOLATION_WARNING');
    assert.ok(result.provenance.warnings.length > 0);
    assert.ok(result.provenance.warnings[0].includes('outside empirical calibration bounds'));
  });

  it('FormulaPredictionEngine respects wood density override', async () => {
    const engine = new FormulaPredictionEngine();
    const overrideInput: PredictionEngineInput = {
      ...oakInput,
      measurements: {
        dbhCm: 40.0,
        heightM: 20.0,
        woodDensityOverride: 0.72
      }
    };

    const result = await engine.predict(overrideInput);
    assert.strictEqual(result.provenance.woodDensityUsed, 0.72);
  });

  it('MLModelPredictionEngine executes inference and generates structured provenance', async () => {
    const mlEngine = new MLModelPredictionEngine();
    const result = await mlEngine.predict(oakInput);

    assert.ok(result.estimatedBiomassKg > 0);
    assert.ok(result.estimatedCarbonKg > 0);
    assert.ok(result.estimatedCo2eKg > 0);
    assert.strictEqual(result.isPrototype, true);
    assert.strictEqual(result.provenance.engineType, 'ml_model');
    assert.ok(result.provenance.warnings.length > 0);
  });
});
