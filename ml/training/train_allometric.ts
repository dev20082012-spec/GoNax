import { EngineeredTreeFeatures } from '../data_pipeline/feature_engineer';
import { evaluatePredictions, EvaluationMetrics } from './evaluator';

export interface AllometricModelArtifact {
  model_id: string;
  species_id: string;
  model_type: 'allometric_formula';
  model_category: 'scientific_trained_model';
  formula_expression: string;
  parameters: {
    a: number;
    b: number;
    c: number;
    correction_factor: number;
    see_log: number;
    dbh_min_cm: number;
    dbh_max_cm: number;
    height_min_m: number;
    height_max_m: number;
  };
  metrics: EvaluationMetrics;
  training_date: string;
}

export function trainAllometricModel(
  speciesId: string,
  trainData: EngineeredTreeFeatures[],
  testData: EngineeredTreeFeatures[]
): AllometricModelArtifact {
  const n = trainData.length;
  if (n < 10) throw new Error(`Insufficient training samples for species ${speciesId}: ${n}`);

  // Linear regression on log-transformed values:
  // y = beta0 + beta1 * x1 + beta2 * x2
  let sY = 0, sX1 = 0, sX2 = 0;
  let sX1X1 = 0, sX2X2 = 0, sX1X2 = 0;
  let sX1Y = 0, sX2Y = 0;

  let minDbh = Infinity, maxDbh = -Infinity;
  let minH = Infinity, maxH = -Infinity;

  trainData.forEach(d => {
    const y = Math.log(d.above_ground_biomass_kg);
    const x1 = Math.log(d.dbh_cm);
    const x2 = Math.log(d.height_m);

    sY += y;
    sX1 += x1;
    sX2 += x2;
    sX1X1 += x1 * x1;
    sX2X2 += x2 * x2;
    sX1X2 += x1 * x2;
    sX1Y += x1 * y;
    sX2Y += x2 * y;

    if (d.dbh_cm < minDbh) minDbh = d.dbh_cm;
    if (d.dbh_cm > maxDbh) maxDbh = d.dbh_cm;
    if (d.height_m < minH) minH = d.height_m;
    if (d.height_m > maxH) maxH = d.height_m;
  });

  // Solve 3x3 normal equations using Gaussian elimination / Cramer's rule
  const meanY = sY / n;
  const meanX1 = sX1 / n;
  const meanX2 = sX2 / n;

  // Center covariances
  const S11 = sX1X1 - n * meanX1 * meanX1;
  const S22 = sX2X2 - n * meanX2 * meanX2;
  const S12 = sX1X2 - n * meanX1 * meanX2;
  const S1y = sX1Y - n * meanX1 * meanY;
  const S2y = sX2Y - n * meanX2 * meanY;

  const det = S11 * S22 - S12 * S12;
  const beta1 = (S22 * S1y - S12 * S2y) / (det || 1);
  const beta2 = (S11 * S2y - S12 * S1y) / (det || 1);
  const beta0 = meanY - beta1 * meanX1 - beta2 * meanX2;

  // Compute Standard Error of the Estimate (SEE) on log scale
  let residualSumSq = 0;
  trainData.forEach(d => {
    const predLog = beta0 + beta1 * Math.log(d.dbh_cm) + beta2 * Math.log(d.height_m);
    residualSumSq += Math.pow(Math.log(d.above_ground_biomass_kg) - predLog, 2);
  });
  const seeLog = Math.sqrt(residualSumSq / Math.max(1, n - 3));
  // Baskerville correction factor CF = exp(SEE^2 / 2)
  const cf = Math.exp(Math.pow(seeLog, 2) / 2.0);

  const aRaw = Math.exp(beta0) * cf;
  const a = Math.round(aRaw * 10000) / 10000;
  const b = Math.round(beta1 * 1000) / 1000;
  const c = Math.round(beta2 * 1000) / 1000;

  const predictor = (item: EngineeredTreeFeatures) => {
    return a * Math.pow(item.dbh_cm, b) * Math.pow(item.height_m, c);
  };

  const metrics = evaluatePredictions(testData, predictor);

  return {
    model_id: `allometric-${speciesId}-trained-v1`,
    species_id: speciesId,
    model_type: 'allometric_formula',
    model_category: 'scientific_trained_model',
    formula_expression: `AGB = ${a} * (DBH ^ ${b}) * (H ^ ${c})`,
    parameters: {
      a,
      b,
      c,
      correction_factor: Math.round(cf * 1000) / 1000,
      see_log: Math.round(seeLog * 1000) / 1000,
      dbh_min_cm: minDbh,
      dbh_max_cm: maxDbh,
      height_min_m: minH,
      height_max_m: maxH
    },
    metrics,
    training_date: new Date().toISOString()
  };
}
