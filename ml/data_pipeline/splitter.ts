import fs from 'fs';
import path from 'path';
import { EngineeredTreeFeatures } from './feature_engineer';

export interface DataSplits {
  train: EngineeredTreeFeatures[];
  validation: EngineeredTreeFeatures[];
  test: EngineeredTreeFeatures[];
}

export function splitDataset(
  records: EngineeredTreeFeatures[],
  trainRatio: number = 0.70,
  valRatio: number = 0.15
): DataSplits {
  // Sort deterministically by DBH to enable stratified split
  const sorted = [...records].sort((a, b) => a.dbh_cm - b.dbh_cm);

  const train: EngineeredTreeFeatures[] = [];
  const validation: EngineeredTreeFeatures[] = [];
  const test: EngineeredTreeFeatures[] = [];

  sorted.forEach((item, index) => {
    const mod = index % 20; // 20 buckets: 14 train (70%), 3 val (15%), 3 test (15%)
    if (mod < 14) {
      train.push(item);
    } else if (mod < 17) {
      validation.push(item);
    } else {
      test.push(item);
    }
  });

  return { train, validation, test };
}

export function saveSplits(splits: DataSplits, baseDir: string, speciesId: string) {
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(path.join(baseDir, `${speciesId}_train.json`), JSON.stringify(splits.train, null, 2), 'utf-8');
  fs.writeFileSync(path.join(baseDir, `${speciesId}_val.json`), JSON.stringify(splits.validation, null, 2), 'utf-8');
  fs.writeFileSync(path.join(baseDir, `${speciesId}_test.json`), JSON.stringify(splits.test, null, 2), 'utf-8');
}
