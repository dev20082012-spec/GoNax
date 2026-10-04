import { getDatabase } from './database/connection';
import { runSeed } from './database/seeds/seed';
import { PredictionService } from './services/predictionService';
import { GroundedQAService } from './services/rag/groundedQAService';
import { RetrievalService } from './services/rag/retrievalService';
import { SpeciesRepository } from './repositories/speciesRepository';

async function runEndToEndVerification() {
  console.log('================================================================');
  console.log('       GONAX SCIENTIFIC RAG SYSTEM - END-TO-END VERIFICATION     ');
  console.log('================================================================\n');

  await runSeed();
  const db = await getDatabase();
  const speciesRepo = new SpeciesRepository();
  const predictionService = new PredictionService();
  const groundedQAService = new GroundedQAService();
  const retrievalService = new RetrievalService();

  // grabing scots pine for test run
  console.log('--- STEP 1: SELECT SPECIES ---');
  const allSpecies = await speciesRepo.findAll();
  const pine = allSpecies.find(s => s.scientific_name === 'Pinus sylvestris');
  if (!pine) throw new Error('Pinus sylvestris not found');
  console.log(`Selected Species: ${pine.scientific_name} (${pine.common_name}), ID: ${pine.id}\n`);

  // runing prediction throught the real trained baad model
  console.log('--- STEP 2: GENERATE NUMERICAL PREDICTION ---');
  const predictionResult = await predictionService.runPrediction({
    speciesId: pine.id,
    dbhCm: 32.0,
    heightM: 19.5,
    geographicRegion: 'Boreal/Temperate Europe'
  });
  console.log(`Model Used:        ${predictionResult.model.name} (${predictionResult.model.id})`);
  console.log(`Model Formula:     ${predictionResult.model.formula_expression}`);
  console.log(`Predicted Biomass: ${predictionResult.prediction.estimated_biomass_kg.toFixed(3)} kg`);
  console.log(`Predicted Carbon:  ${predictionResult.prediction.estimated_carbon_kg.toFixed(3)} kg C`);
  console.log(`95% CI Range:      [${predictionResult.prediction.confidence_lower_bound_kg.toFixed(3)} kg - ${predictionResult.prediction.confidence_upper_bound_kg.toFixed(3)} kg]`);
  console.log(`Confidence Status: ${predictionResult.prediction.confidence_status}`);
  console.log(`Prediction ID:     ${predictionResult.prediction.id}\n`);

  // testng normal species qestion
  console.log('--- STEP 3: ASK SPECIES-SPECIFIC QUESTION ---');
  const question1 = "What is known about this species' wood density and how does it compare to angiosperms?";
  console.log(`User Question: "${question1}"\n`);

  console.log('--- STEP 4: RETRIEVE REAL SCIENTIFIC EVIDENCE ---');
  const retrieved1 = await retrievalService.retrieveRelevantEvidence({
    query: question1,
    speciesName: pine.scientific_name,
    limit: 3
  });
  console.log(`Retrieved ${retrieved1.length} prioritized passages:`);
  retrieved1.forEach((p, i) => {
    console.log(`  [Passage ${i + 1}] Source: "${p.source.title}" (${p.source.authors}, ${p.source.year})`);
    console.log(`               Combined Score: ${p.combinedScore.toFixed(3)} | Topics: ${p.chunk.topic_tags.join(', ')}`);
    console.log(`               Snippet: ${p.chunk.chunk_text.substring(0, 120)}...\n`);
  });

  console.log('--- STEP 5 & 6: GROUNDED ANSWER & SOURCE CITATIONS ---');
  const answer1 = await groundedQAService.answerQuestion({
    question: question1,
    speciesName: pine.scientific_name,
    speciesId: pine.id
  });
  console.log(`Answer Classification: [${answer1.answerType}]`);
  console.log(`Question Type:         [${answer1.questionType}]`);
  console.log(`Grounded Answer:\n${answer1.answer}\n`);
  console.log(`Supporting Citations (${answer1.citations.length}):`);
  answer1.citations.forEach((c, i) => {
    console.log(`  [${i + 1}] ${c.authors} (${c.year}). "${c.title}". Section: ${c.section}`);
    console.log(`      DOI: ${c.doi || 'N/A'}`);
    console.log(`      Relationship: ${c.relationshipToAnswer || (c as any).relationship}\n`);
  });

  console.log('--- STEP 7 & 8: ASK PREDICTION-SPECIFIC QUESTION & EXPLAIN ---');
  const question2 = `Why did GoNax predict ${predictionResult.prediction.estimated_carbon_kg.toFixed(3)} kg of carbon for this tree?`;
  console.log(`User Question: "${question2}"`);
  console.log(`Anchored Prediction Context: DBH=${predictionResult.observation.dbh_cm}cm, Height=${predictionResult.observation.height_m}m, Biomass=${predictionResult.prediction.estimated_biomass_kg.toFixed(3)}kg, Model=${predictionResult.model.id}\n`);

  const answer2 = await groundedQAService.answerQuestion({
    question: question2,
    speciesName: pine.scientific_name,
    speciesId: pine.id,
    predictionId: predictionResult.prediction.id
  });
  console.log(`Answer Classification: [${answer2.answerType}]`);
  console.log(`Question Type:         [${answer2.questionType}]`);
  console.log(`Grounded Numerical & Scientific Explanation:\n${answer2.answer}\n`);
  console.log(`Prediction Citations:`);
  answer2.citations.forEach((c, i) => {
    console.log(`  - ${c.authors} (${c.year}): ${c.title} (${c.relationshipToAnswer || (c as any).relationship})`);
  });
  console.log('');

  console.log('--- STEP 9 & 10: INSUFFICIENT EVIDENCE & HALLUCINATION RESISTANCE ---');
  const question3 = "How do lunar gravitational tides and astrological cycles alter wood density and resin production in Pinus sylvestris?";
  console.log(`User Question: "${question3}"\n`);

  const answer3 = await groundedQAService.answerQuestion({
    question: question3,
    speciesName: pine.scientific_name,
    speciesId: pine.id
  });
  console.log(`Answer Classification: [${answer3.answerType}]`);
  console.log(`Question Type:         [${answer3.questionType}]`);
  console.log(`Response Output:\n${answer3.answer}\n`);
  console.log(`Did the system invent an answer? ${answer3.answerType === 'INSUFFICIENT_EVIDENCE' ? 'NO (CORRECTLY REFUSED - 100% GROUNDED)' : 'YES (ERROR)'}`);
  console.log(`Number of Citations Fabricated: ${answer3.citations.length} (Expected 0)`);

  console.log('\n================================================================');
  console.log('                   VERIFICATION COMPLETED                        ');
  console.log('================================================================');
}

runEndToEndVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
