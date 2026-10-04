import { EngineeredTreeFeatures } from '../data_pipeline/feature_engineer';

export interface EvaluationMetrics {
  sample_count: number;
  r2: number;
  rmse_kg: number;
  mae_kg: number;
  rse_percentage: number;
  mean_observed_kg: number;
  mean_predicted_kg: number;
  calibration_domain: {
    dbh_min_cm: number;
    dbh_max_cm: number;
    height_min_m: number;
    height_max_m: number;
    age_min_years?: number;
    age_max_years?: number;
  };
}

export function evaluatePredictions(
  testData: EngineeredTreeFeatures[],
  predictor: (item: EngineeredTreeFeatures) => number
): EvaluationMetrics {
  const n = testData.length;
  if (n === 0) throw new Error('Test dataset cannot be empty for evaluation.');

  let sumObs = 0;
  let sumPred = 0;
  testData.forEach(d => {
    sumObs += d.above_ground_biomass_kg;
  });
  const meanObs = sumObs / n;

  let ssTot = 0;
  let ssRes = 0;
  let sumAbsErr = 0;

  let minDbh = Infinity, maxDbh = -Infinity;
  let minH = Infinity, maxH = -Infinity;
  let minAge = Infinity, maxAge = -Infinity;

  testData.forEach(d => {
    const pred = predictor(d);
    sumPred += pred;

    const err = d.above_ground_biomass_kg - pred;
    ssRes += Math.pow(err, 2);
    ssTot += Math.pow(d.above_ground_biomass_kg - meanObs, 2);
    sumAbsErr += Math.abs(err);

    if (d.dbh_cm < minDbh) minDbh = d.dbh_cm;
    if (d.dbh_cm > maxDbh) maxDbh = d.dbh_cm;
    if (d.height_m < minH) minH = d.height_m;
    if (d.height_m > maxH) maxH = d.height_m;
    if (d.age_years) {
      if (d.age_years < minAge) minAge = d.age_years;
      if (d.age_years > maxAge) maxAge = d.age_years;
    }
  });

  const r2 = Math.max(0, Math.min(0.999, 1 - (ssRes / (ssTot || 1))));
  const rmse = Math.sqrt(ssRes / n);
  const mae = sumAbsErr / n;
  const rsePct = (rmse / meanObs) * 100;

  return {
    sample_count: n,
    r2: Math.round(r2 * 1000) / 1000,
    rmse_kg: Math.round(rmse * 100) / 100,
    mae_kg: Math.round(mae * 100) / 100,
    rse_percentage: Math.round(rsePct * 10) / 10,
    mean_observed_kg: Math.round(meanObs * 100) / 100,
    mean_predicted_kg: Math.round((sumPred / n) * 100) / 100,
    calibration_domain: {
      dbh_min_cm: minDbh,
      dbh_max_cm: maxDbh,
      height_min_m: minH,
      height_max_m: maxH,
      age_min_years: minAge !== Infinity ? minAge : undefined,
      age_max_years: maxAge !== -Infinity ? maxAge : undefined
    }
  };
}
