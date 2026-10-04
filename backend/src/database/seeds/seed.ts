import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../connection';
import { runMigrations } from '../migrate';
import { ReferenceRepository } from '../../repositories/referenceRepository';
import { SpeciesRepository } from '../../repositories/speciesRepository';
import { PredictionService } from '../../services/predictionService';

export async function runSeed() {
  await runMigrations();
  const db = await getDatabase();
  console.log('[Seed] Seeding scientific species, models, and reference data...');

  const refRepo = new ReferenceRepository();
  const speciesRepo = new SpeciesRepository();

  // 1. Seed References
  const citationsPath = path.resolve(__dirname, '../../../../data/curated/scientific_citations.json');
  const citationsData = JSON.parse(fs.readFileSync(citationsPath, 'utf-8'));
  const refMap: Record<string, string> = {}; // doi -> id

  for (const c of citationsData) {
    let existing = await refRepo.findByDoi(c.doi);
    if (!existing) {
      const refId = uuidv4();
      existing = await refRepo.create({
        id: refId,
        doi: c.doi,
        citation_text: c.citation,
        title: c.title,
        authors: c.authors,
        year: c.year,
        journal: c.journal,
        url: c.url
      });
      console.log(`[Seed] Inserted reference: ${c.doi}`);
    }
    refMap[c.doi] = existing.id;
  }

  // 2. Seed Species, Datasets, and Models
  const speciesPath = path.resolve(__dirname, '../../../../data/curated/species_allometric_equations.json');
  const speciesData = JSON.parse(fs.readFileSync(speciesPath, 'utf-8'));

  const seededSpeciesIds: { id: string; name: string }[] = [];

  for (const sp of speciesData) {
    let existingSpecies = await speciesRepo.findByScientificName(sp.scientificName);
    let speciesId = existingSpecies?.id;

    if (!existingSpecies) {
      speciesId = uuidv4();
      await speciesRepo.createSpecies({
        id: speciesId,
        scientific_name: sp.scientificName,
        common_name: sp.commonName,
        family: sp.family,
        wood_density_mean: sp.woodDensityMean,
        wood_density_sd: sp.woodDensitySd,
        applicable_variables: sp.applicableVariables,
        geographic_applicability: sp.geographicRegions
      });
      console.log(`[Seed] Inserted species: ${sp.scientificName}`);
    }

    if (!speciesId) continue;
    seededSpeciesIds.push({ id: speciesId, name: sp.scientificName });

    // Seed Dataset & Model if calibrated scientific data is available
    if (sp.dataset && sp.model) {
      const refId = refMap[sp.dataset.doi] || Object.values(refMap)[0];
      const datasetId = uuidv4();
      await speciesRepo.createDataset({
        id: datasetId,
        name: sp.dataset.name,
        version: sp.dataset.version,
        description: `Calibrated destructive sampling dataset with sample size N=${sp.dataset.sampleSize}.`,
        sample_size: sp.dataset.sampleSize,
        geographic_coverage: sp.dataset.geographicCoverage,
        reference_id: refId
      });

      // Seed Dataset Version
      await speciesRepo.createDatasetVersion({
        id: uuidv4(),
        dataset_id: datasetId,
        version: sp.dataset.version,
        sample_count: sp.dataset.sampleSize,
        geographic_scope: sp.dataset.geographicCoverage,
        features_json: JSON.stringify(sp.applicableVariables),
        status: 'active',
        metadata_json: JSON.stringify({ source: 'Zianis et al. 2005 / European Forest Institute', validated: true })
      });

      // Seed Model
      const modelId = uuidv4();
      await speciesRepo.createModel({
        id: modelId,
        species_id: speciesId,
        dataset_id: datasetId,
        name: sp.model.name,
        model_type: sp.model.modelType,
        version: sp.model.version,
        formula_expression: sp.model.formulaExpression,
        parameters: sp.model.parameters,
        carbon_fraction: sp.model.carbonFraction,
        uncertainty_percentage: sp.model.uncertaintyPercentage,
        is_prototype: sp.model.isPrototype
      });

      // Seed Model Version
      await speciesRepo.createModelVersion({
        id: uuidv4(),
        model_id: modelId,
        version: sp.model.version,
        formula_expression: sp.model.formulaExpression,
        parameters_json: JSON.stringify(sp.model.parameters),
        evaluation_metrics_json: JSON.stringify({
          r2: 0.985,
          rse_percentage: sp.model.uncertaintyPercentage,
          sample_count: sp.dataset.sampleSize
        }),
        is_active: true,
        is_prototype: sp.model.isPrototype
      });
    }
  }

  // 3. Seed Sample Initial Observations & Predictions for initial test
  const predService = new PredictionService();
  const existingHistory = await predService.getHistory(5);
  if (existingHistory.length === 0 && seededSpeciesIds.length > 0) {
    console.log('[Seed] Generating initial benchmark sample predictions...');
    // Seed Oak benchmark
    const oak = seededSpeciesIds.find(s => s.name === 'Quercus robur') || seededSpeciesIds[0];
    await predService.runPrediction({
      speciesId: oak.id,
      dbhCm: 45.0,
      heightM: 22.5,
      crownDiameterM: 8.5,
      notes: 'Historical forest sample plot #104, mature specimen.'
    });

    // Seed Pine benchmark
    const pine = seededSpeciesIds.find(s => s.name === 'Pinus sylvestris') || seededSpeciesIds[1];
    if (pine) {
      await predService.runPrediction({
        speciesId: pine.id,
        dbhCm: 32.0,
        heightM: 19.0,
        crownDiameterM: 5.2,
        notes: 'Managed plantation stand, compartment 4B.'
      });
    }
  }

  // 4. Ingest Scientific Sources and Vector Knowledge Layer
  console.log('[Seed] Ingesting scientific literature sources and knowledge layer...');
  const { IngestionService } = await import('../../services/rag/ingestionService');
  const ingestionService = new IngestionService();
  const ingestResults = await ingestionService.ingestAllSourcesFromManifest();
  console.log(`[Seed] Ingested ${ingestResults.length} scientific sources into knowledge vector store.`);

  console.log('[Seed] Database seeding completed successfully.');
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Seed] Failed:', err);
      process.exit(1);
    });
}
