import path from 'path';
import fs from 'fs';
import { generateRawSpeciesData, saveRawData } from './data_pipeline/raw_generator';
import { cleanTreeData, saveCleanData } from './data_pipeline/cleaner';
import { engineerFeatures, saveFeatureData } from './data_pipeline/feature_engineer';
import { splitDataset, saveSplits } from './data_pipeline/splitter';
import { trainAllometricModel } from './training/train_allometric';
import { trainMLModel } from './training/train_ml_regressor';

export async function runFullMLPipeline() {
  console.log('=================================================================');
  console.log('🌲 GoNax Scientific Data & Model Training Pipeline');
  console.log('=================================================================');

  const baseDataDir = path.resolve(__dirname, '../data');
  const baseModelsDir = path.resolve(__dirname, '../models/registry');

  if (!fs.existsSync(baseModelsDir)) {
    fs.mkdirSync(baseModelsDir, { recursive: true });
  }

  const speciesList = [
    { id: 'quercus_robur', name: 'Quercus robur', count: 284 },
    { id: 'pinus_sylvestris', name: 'Pinus sylvestris', count: 412 },
    { id: 'fagus_sylvatica', name: 'Fagus sylvatica', count: 330 }
  ];

  const registrySummary: any[] = [];

  for (const sp of speciesList) {
    console.log(`\n▶ Processing Species: ${sp.name} (${sp.id}) [N=${sp.count}]`);

    // 1. RAW DATA
    const rawPath = path.join(baseDataDir, 'raw', `${sp.id}_raw.json`);
    const rawRecords = generateRawSpeciesData(sp.id, sp.count);
    saveRawData(rawRecords, rawPath);
    console.log(`  ✓ Raw data generated: ${rawRecords.length} records -> data/raw/${sp.id}_raw.json`);

    // 2. CLEAN DATA
    const cleanPath = path.join(baseDataDir, 'clean', `${sp.id}_clean.json`);
    const { clean, report } = cleanTreeData(rawRecords);
    saveCleanData(clean, cleanPath);
    console.log(`  ✓ Data cleaned & validated: ${clean.length} accepted (${report.rejected} rejected) -> data/clean/${sp.id}_clean.json`);

    // 3. FEATURE DATA
    const featPath = path.join(baseDataDir, 'features', `${sp.id}_features.json`);
    const features = engineerFeatures(clean);
    saveFeatureData(features, featPath);
    console.log(`  ✓ Feature engineering complete: volume proxies & interaction features -> data/features/${sp.id}_features.json`);

    // 4. DATA SPLITS
    const splitsDir = path.join(baseDataDir, 'splits');
    const splits = splitDataset(features);
    saveSplits(splits, splitsDir, sp.id);
    console.log(`  ✓ Stratified split: Train=${splits.train.length} (70%), Val=${splits.validation.length} (15%), Test=${splits.test.length} (15%)`);

    // 5. TRAIN ALLOMETRIC MODEL
    const allometricModel = trainAllometricModel(sp.id, splits.train, splits.test);
    const allometricArtifactPath = path.join(baseModelsDir, `${allometricModel.model_id}.json`);
    fs.writeFileSync(allometricArtifactPath, JSON.stringify(allometricModel, null, 2), 'utf-8');
    console.log(`  ✓ Trained Allometric Formula Model:`);
    console.log(`    Expression: ${allometricModel.formula_expression}`);
    console.log(`    Test R² = ${allometricModel.metrics.r2}, RMSE = ${allometricModel.metrics.rmse_kg} kg, RSE = ${allometricModel.metrics.rse_percentage}%`);

    // 6. TRAIN ML REGRESSOR
    const mlModel = trainMLModel(sp.id, splits.train, splits.test);
    const mlArtifactPath = path.join(baseModelsDir, `${mlModel.model_id}.json`);
    fs.writeFileSync(mlArtifactPath, JSON.stringify(mlModel, null, 2), 'utf-8');
    console.log(`  ✓ Trained Multi-Feature ML Regressor:`);
    console.log(`    Test R² = ${mlModel.metrics.r2}, RMSE = ${mlModel.metrics.rmse_kg} kg, RSE = ${mlModel.metrics.rse_percentage}%`);

    registrySummary.push({
      species_id: sp.id,
      scientific_name: sp.name,
      models: [
        {
          model_id: allometricModel.model_id,
          type: allometricModel.model_type,
          r2: allometricModel.metrics.r2,
          rmse: allometricModel.metrics.rmse_kg,
          rse_pct: allometricModel.metrics.rse_percentage
        },
        {
          model_id: mlModel.model_id,
          type: mlModel.model_type,
          r2: mlModel.metrics.r2,
          rmse: mlModel.metrics.rmse_kg,
          rse_pct: mlModel.metrics.rse_percentage
        }
      ]
    });
  }

  // Save pipeline summary manifest
  const summaryPath = path.join(baseModelsDir, 'training_manifest.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    pipeline_version: '1.0.0',
    executed_at: new Date().toISOString(),
    summary: registrySummary
  }, null, 2), 'utf-8');

  console.log('\n=================================================================');
  console.log('✅ Machine Learning & Data Pipeline Finished Successfully');
  console.log(`📦 Model Artifacts Registered in: ${baseModelsDir}`);
  console.log('=================================================================\n');
}

if (require.main === module) {
  runFullMLPipeline().catch(err => {
    console.error('Pipeline failed:', err);
    process.exit(1);
  });
}
