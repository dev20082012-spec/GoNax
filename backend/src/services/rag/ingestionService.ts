import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { KnowledgeRepository } from '../../repositories/knowledgeRepository';
import { EmbeddingService } from './embeddingService';
import {
  ScientificSource,
  ScientificDocument,
  DocumentChunk,
  ScientificClaim,
  KnowledgeTopic,
  ModelDocumentation,
  DatasetDocumentation,
  KnowledgeIngestionAudit
} from '../../domain/entities/knowledge';

export interface IngestionResult {
  sourceId: string;
  sourceTitle: string;
  documentHash: string;
  chunksCreated: number;
  claimsExtracted: number;
  status: 'active' | 'updated' | 'failed';
  message: string;
}

export class IngestionService {
  private knowledgeRepo: KnowledgeRepository;
  private embeddingService: EmbeddingService;

  constructor(
    knowledgeRepo?: KnowledgeRepository,
    embeddingService?: EmbeddingService
  ) {
    this.knowledgeRepo = knowledgeRepo || new KnowledgeRepository();
    this.embeddingService = embeddingService || new EmbeddingService();
  }

  async seedKnowledgeTopics(): Promise<void> {
    const existing = await this.knowledgeRepo.getAllTopics();
    if (existing.length > 0) return;

    const topics: KnowledgeTopic[] = [
      { id: 'allometry', name: 'Allometric Equations & Scaling', description: 'Mathematical relationships between dendrometric dimensions (DBH, H) and biomass.', category: 'modeling' },
      { id: 'wood_density', name: 'Wood Specific Gravity & Density', description: 'Dry mass per unit green volume and its influence on volumetric-to-mass scaling.', category: 'wood_anatomy' },
      { id: 'carbon_fraction', name: 'Carbon Fraction & Stoichiometry', description: 'Elemental carbon proportion of dry biomass and conversion to CO2 equivalent.', category: 'biochemistry' },
      { id: 'model_variables', name: 'Predictor Variables & Features', description: 'Input variables (DBH, height, crown dimensions, cylindrical proxy) utilized by models.', category: 'modeling' },
      { id: 'uncertainty', name: 'Uncertainty, RSE & Confidence', description: 'Residual standard error, 95% confidence intervals, and error propagation.', category: 'statistics' },
      { id: 'dataset_demographics', name: 'Calibration Demographics & Sample Size', description: 'Sample sizes, diameter ranges, and harvest distributions in empirical training data.', category: 'data' },
      { id: 'destructive_sampling', name: 'Destructive Harvest Protocol', description: 'Felling, tissue partition, and 105°C oven-drying scientific procedures.', category: 'methodology' },
      { id: 'applicability_limits', name: 'Applicability Envelopes & Extrapolation', description: 'Geographic, ecological, and dendrometric boundaries for valid model execution.', category: 'governance' },
      { id: 'biomass_partitioning', name: 'Biomass Partitioning', description: 'Allocation across stem wood, stem bark, branches, and foliage.', category: 'morphology' },
      { id: 'root_to_shoot', name: 'Belowground Biomass & Root-to-Shoot', description: 'Root system biomass ratios and IPCC reporting standards.', category: 'ecology' }
    ];

    for (const t of topics) {
      await this.knowledgeRepo.createTopic(t);
    }
  }

  async ingestAllSourcesFromManifest(): Promise<IngestionResult[]> {
    await this.seedKnowledgeTopics();

    const manifestPath = path.resolve(__dirname, '../../../../data/scientific_sources/sources_manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found at ${manifestPath}`);
    }

    const sourcesData: any[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const results: IngestionResult[] = [];

    for (const s of sourcesData) {
      const docFile = path.resolve(__dirname, '../../../../data/scientific_sources', s.document_file);
      if (!fs.existsSync(docFile)) {
        console.warn(`[Ingestion] File not found: ${docFile}`);
        continue;
      }
      const rawText = fs.readFileSync(docFile, 'utf-8');
      const res = await this.ingestSingleSource(s, rawText, s.document_file);
      results.push(res);
    }

    await this.seedRegisteredModelAndDatasetDocs();

    return results;
  }

  async ingestSingleSource(
    sourceMeta: any,
    rawContent: string,
    fileName: string
  ): Promise<IngestionResult> {
    const docHash = crypto.createHash('sha256').update(rawContent).digest('hex');

    let existingSource = await this.knowledgeRepo.getSourceById(sourceMeta.id);
    let isUpdate = !!existingSource;

    const source: ScientificSource = {
      id: sourceMeta.id,
      title: sourceMeta.title,
      authors: sourceMeta.authors,
      year: sourceMeta.year,
      journal: sourceMeta.journal,
      volume: sourceMeta.volume || '',
      pages: sourceMeta.pages || '',
      doi: sourceMeta.doi || '',
      url: sourceMeta.url,
      publisher: sourceMeta.publisher,
      source_type: sourceMeta.source_type,
      quality_tier: sourceMeta.quality_tier,
      species_tags: sourceMeta.species || ['all'],
      topic_tags: sourceMeta.topics || [],
      geographic_scope: sourceMeta.geographic_scope || 'Global',
      version: sourceMeta.version || '1.0.0',
      is_active: true,
      ingestion_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (!existingSource) {
      await this.knowledgeRepo.createSource(source);
    }

    const cleanContent = this.cleanText(rawContent);
    const docId = `doc-${sourceMeta.id}`;
    const sections = this.detectSections(cleanContent);

    const docRecord: ScientificDocument = {
      id: docId,
      source_id: source.id,
      file_name: fileName,
      sha256_hash: docHash,
      raw_content: rawContent,
      clean_content: cleanContent,
      section_count: sections.length,
      word_count: cleanContent.split(/\s+/).length,
      version: source.version,
      created_at: new Date().toISOString()
    };

    await this.knowledgeRepo.createDocument(docRecord);

    await this.knowledgeRepo.deleteChunksBySourceId(source.id);

    const chunks: DocumentChunk[] = [];
    let chunkIdx = 0;

    for (const sec of sections) {
      const secChunks = this.splitSectionIntoChunks(sec.title, sec.body, 400);
      for (const sc of secChunks) {
        const chunkId = `chk-${source.id}-${chunkIdx}`;
        const embedding = await this.embeddingService.generateEmbedding(
          `${sec.title} ${sc.text} ${source.species_tags.join(' ')} ${source.topic_tags.join(' ')}`
        );

        let evidenceType = 'empirical_harvest';
        if (source.source_type === 'model_documentation') evidenceType = 'mathematical_model';
        else if (source.source_type === 'dataset_documentation') evidenceType = 'empirical_harvest';
        else if (source.source_type === 'institutional_report') evidenceType = 'institutional_guidance';
        else if (sec.title.toLowerCase().includes('allometric') || sec.title.toLowerCase().includes('equation')) evidenceType = 'mathematical_model';
        else if (sec.title.toLowerCase().includes('carbon') || sec.title.toLowerCase().includes('density')) evidenceType = 'physiological_synthesis';

        const chunk: DocumentChunk = {
          id: chunkId,
          document_id: docId,
          source_id: source.id,
          section_title: sec.title,
          chunk_index: chunkIdx,
          start_char: sc.startChar,
          end_char: sc.endChar,
          token_count: sc.text.split(/\s+/).length,
          chunk_text: sc.text,
          species_tags: source.species_tags,
          topic_tags: source.topic_tags,
          geographic_tags: [source.geographic_scope],
          evidence_type: evidenceType,
          embedding_json: JSON.stringify(embedding),
          created_at: new Date().toISOString()
        };

        await this.knowledgeRepo.createChunk(chunk);
        chunks.push(chunk);
        chunkIdx++;
      }
    }

    const claims = this.extractClaimsFromChunks(source, chunks);
    for (const c of claims) {
      await this.knowledgeRepo.createClaim(c);
    }

    const audit: KnowledgeIngestionAudit = {
      id: uuidv4(),
      source_id: source.id,
      action: isUpdate ? 'updated' : 'ingested',
      version: source.version,
      document_hash: docHash,
      chunks_created: chunks.length,
      claims_extracted: claims.length,
      status: 'active',
      details: `Processed ${sections.length} sections into ${chunks.length} chunks. Hash: ${docHash.slice(0, 12)}...`,
      created_at: new Date().toISOString()
    };
    await this.knowledgeRepo.createAuditLog(audit);

    return {
      sourceId: source.id,
      sourceTitle: source.title,
      documentHash: docHash,
      chunksCreated: chunks.length,
      claimsExtracted: claims.length,
      status: isUpdate ? 'updated' : 'active',
      message: `Successfully ingested ${chunks.length} chunks and ${claims.length} claims.`
    };
  }

  private async seedRegisteredModelAndDatasetDocs(): Promise<void> {
    const pineModel = await this.knowledgeRepo.getModelDocByModelId('trained-pinus-sylvestris-baad-v1');
    if (!pineModel) {
      await this.knowledgeRepo.createModelDoc({
        id: 'mdoc-pinus-baad',
        model_id: 'trained-pinus-sylvestris-baad-v1',
        source_id: 'src-doc-gonax-model-baad-pine',
        species_id: 'pinus_sylvestris',
        name: 'Scots Pine Empirical Multi-Feature Regressor (BAAD)',
        algorithm: 'Ridge Linear Regressor (L2 regularized)',
        formula_expression: 'AGB = (1.857214 * dbh_cm) + (0.008603 * height_m) + (155.459116 * cylindrical_volume_proxy_m3) - 14.482796',
        features_json: JSON.stringify(['dbh_cm', 'height_m', 'cylindrical_volume_proxy_m3']),
        calibration_domain_json: JSON.stringify({
          dbh_min_cm: 1.1,
          dbh_max_cm: 41.95,
          height_min_m: 2.1,
          height_max_m: 32.4,
          biomass_min_kg: 0.291,
          biomass_max_kg: 1106.58
        }),
        evaluation_metrics_json: JSON.stringify({
          r2: 0.9675,
          rmse_kg: 31.78,
          mae_kg: 11.59,
          rse_percentage: 38.76,
          sample_count: 288
        }),
        limitations: 'Calibrated on Fennoscandian boreal stands; requires validation if applied to Mediterranean arid or subtropical conditions.'
      });
    }

    const oakModel = await this.knowledgeRepo.getModelDocByModelId('zianis-oak-2005-standard');
    if (!oakModel) {
      await this.knowledgeRepo.createModelDoc({
        id: 'mdoc-oak-zianis',
        model_id: 'zianis-oak-2005-standard',
        source_id: 'src-doc-gonax-model-zianis-oak',
        species_id: 'quercus_robur',
        name: 'European Oak Calibrated Allometric Estimator (Zianis-Oak-2005)',
        algorithm: 'Calibrated Bivariate Power Law',
        formula_expression: 'AGB = 0.0567 * (DBH ^ 2.012) * (H ^ 0.873)',
        features_json: JSON.stringify(['dbh_cm', 'height_m']),
        calibration_domain_json: JSON.stringify({
          dbh_min_cm: 10.0,
          dbh_max_cm: 140.0,
          height_min_m: 5.0,
          height_max_m: 38.0
        }),
        evaluation_metrics_json: JSON.stringify({
          r2: 0.985,
          rse_percentage: 11.4,
          sample_count: 284
        }),
        limitations: 'DBH above 140 cm incurs extrapolation risk due to massive lower limb variability and heartwood rot.'
      });
    }

    const pineDataset = await this.knowledgeRepo.getDatasetDocByDatasetId('ds-pinus-sylvestris-baad-v1');
    if (!pineDataset) {
      await this.knowledgeRepo.createDatasetDoc({
        id: 'ddoc-pinus-baad',
        dataset_id: 'ds-pinus-sylvestris-baad-v1',
        source_id: 'src-doc-gonax-dataset-baad-pine',
        species_id: 'pinus_sylvestris',
        name: 'BAAD Scots Pine Destructive Harvest Cohort',
        sample_size: 288,
        harvest_protocol: 'Whole-tree felling, compartment dissection (stem, bark, branches, needles), and oven-drying at 105 deg C to constant mass.',
        measurement_envelopes_json: JSON.stringify({
          dbh_range: [1.1, 41.95],
          height_range: [2.1, 32.4],
          biomass_range: [0.291, 1106.58]
        }),
        geographic_coverage: 'Central Sweden, Southern Finland, Northern Spain'
      });
    }

    const oakDataset = await this.knowledgeRepo.getDatasetDocByDatasetId('ds-quercus-robur-v1');
    if (!oakDataset) {
      await this.knowledgeRepo.createDatasetDoc({
        id: 'ddoc-oak-broadleaf',
        dataset_id: 'ds-quercus-robur-v1',
        source_id: 'src-doc-gonax-dataset-broadleaf-oak',
        species_id: 'quercus_robur',
        name: 'European Broadleaf Biomass Calibration Database',
        sample_size: 284,
        harvest_protocol: 'Felled tree sectioning, disc subsampling, 105 deg C oven-drying for moisture ratio calculation.',
        measurement_envelopes_json: JSON.stringify({
          dbh_range: [10.0, 140.0],
          height_range: [5.0, 38.0]
        }),
        geographic_coverage: 'France, Germany, UK, Poland'
      });
    }
  }


  private cleanText(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ ]{2,}/g, ' ')
      .trim();
  }

  private detectSections(content: string): { title: string; body: string }[] {
    const lines = content.split('\n');
    const sections: { title: string; body: string }[] = [];
    let currentTitle = 'Overview';
    let currentBodyLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ') || (trimmed.startsWith('# ') && sections.length === 0)) {
        if (currentBodyLines.length > 0) {
          sections.push({
            title: currentTitle,
            body: currentBodyLines.join('\n').trim()
          });
          currentBodyLines = [];
        }
        currentTitle = trimmed.replace(/^#+\s*/, '').trim();
      } else {
        currentBodyLines.push(line);
      }
    }

    if (currentBodyLines.length > 0) {
      sections.push({
        title: currentTitle,
        body: currentBodyLines.join('\n').trim()
      });
    }

    return sections.filter(s => s.body.length > 0);
  }

  private splitSectionIntoChunks(
    sectionTitle: string,
    body: string,
    targetWordCount = 350
  ): { text: string; startChar: number; endChar: number }[] {
    const paragraphs = body.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const chunks: { text: string; startChar: number; endChar: number }[] = [];

    let currentChunkWords: string[] = [];
    let startChar = 0;
    let accumulatedText = '';

    for (const p of paragraphs) {
      const pWords = p.trim().split(/\s+/);
      if (currentChunkWords.length + pWords.length > targetWordCount && currentChunkWords.length > 0) {
        const text = currentChunkWords.join(' ');
        chunks.push({
          text: `[Section: ${sectionTitle}]\n${text}`,
          startChar: startChar,
          endChar: startChar + text.length
        });
        startChar += text.length + 1;
        currentChunkWords = [];
      }
      currentChunkWords.push(...pWords);
    }

    if (currentChunkWords.length > 0) {
      const text = currentChunkWords.join(' ');
      chunks.push({
        text: `[Section: ${sectionTitle}]\n${text}`,
        startChar: startChar,
        endChar: startChar + text.length
      });
    }

    return chunks;
  }

  private extractClaimsFromChunks(
    source: ScientificSource,
    chunks: DocumentChunk[]
  ): ScientificClaim[] {
    const claims: ScientificClaim[] = [];

    for (const c of chunks) {
      const text = c.chunk_text;

      if (text.includes('wood density') || text.includes('wood specific gravity')) {
        const oakMatch = text.match(/Quercus robur.*?(\d+\.\d+)\s*g\/cm³/i);
        if (oakMatch) {
          claims.push({
            id: `clm-${source.id}-oak-wd`,
            source_id: source.id,
            chunk_id: c.id,
            species_id: 'quercus_robur',
            topic_id: 'wood_density',
            claim_text: `Mean basic wood density for Quercus robur is ${oakMatch[1]} g/cm³ based on European empirical measurements.`,
            claim_type: 'parameter_value',
            evidence_level: 'direct_harvest_measurement',
            uncertainty_note: 'Standard deviation ±0.05 g/cm³ across Western and Central European stands.'
          });
        }

        const pineMatch = text.match(/Pinus sylvestris.*?(\d+\.\d+)\s*g\/cm³/i);
        if (pineMatch) {
          claims.push({
            id: `clm-${source.id}-pine-wd`,
            source_id: source.id,
            chunk_id: c.id,
            species_id: 'pinus_sylvestris',
            topic_id: 'wood_density',
            claim_text: `Mean basic wood density for Pinus sylvestris is ${pineMatch[1]} g/cm³ in European boreal stands.`,
            claim_type: 'parameter_value',
            evidence_level: 'direct_harvest_measurement',
            uncertainty_note: 'Standard deviation ±0.04 g/cm³ in Scandinavian and Baltic stations.'
          });
        }
      }

      if (text.includes('carbon fraction') || text.includes('carbon content') || text.includes('50.5%') || text.includes('48.2%')) {
        if (text.includes('50.5%') || text.includes('0.505')) {
          claims.push({
            id: `clm-${source.id}-pine-c`,
            source_id: source.id,
            chunk_id: c.id,
            species_id: 'pinus_sylvestris',
            topic_id: 'carbon_fraction',
            claim_text: 'Conifer wood carbon fraction averages 50.5% (0.505 kg C / kg dry biomass), significantly exceeding the generic 50% default due to elevated guaiacyl lignin content.',
            claim_type: 'parameter_value',
            evidence_level: 'meta_analysis',
            uncertainty_note: 'Synthesized across 253 woody plant species by Thomas & Martin (2012).'
          });
        }
        if (text.includes('48.2%') || text.includes('0.482')) {
          claims.push({
            id: `clm-${source.id}-oak-c`,
            source_id: source.id,
            chunk_id: c.id,
            species_id: 'quercus_robur',
            topic_id: 'carbon_fraction',
            claim_text: 'Temperate deciduous angiosperm wood carbon fraction averages 48.2% (0.482 kg C / kg dry biomass), departing from the generic 50% convention.',
            claim_type: 'parameter_value',
            evidence_level: 'meta_analysis',
            uncertainty_note: 'Applying 50% systematically overestimates broadleaf carbon by 3.5% to 5.0%.'
          });
        }
      }

      if (text.includes('44.01') || text.includes('3.6667') || text.includes('CO2 equivalent')) {
        claims.push({
          id: `clm-${source.id}-co2-stoich`,
          source_id: source.id,
          chunk_id: c.id,
          topic_id: 'carbon_fraction',
          claim_text: 'Elemental carbon mass is converted to atmospheric CO2 equivalent by multiplying by the molecular weight ratio 44.01 / 12.011 ≈ 3.6667.',
          claim_type: 'mathematical_relation',
          evidence_level: 'theoretical_derivation',
          uncertainty_note: 'Exact chemical stoichiometry based on molecular masses of carbon (12.011 g/mol) and CO2 (44.01 g/mol).'
        });
      }

      if (text.includes('288 destructively harvested') || text.includes('sample size') || text.includes('N = 288')) {
        claims.push({
          id: `clm-${source.id}-baad-sample`,
          source_id: source.id,
          chunk_id: c.id,
          species_id: 'pinus_sylvestris',
          topic_id: 'dataset_demographics',
          claim_text: 'The Scots Pine BAAD cohort comprises N = 288 destructively harvested trees spanning DBH 1.10 cm to 41.95 cm across Sweden, Finland, and Spain.',
          claim_type: 'empirical_finding',
          evidence_level: 'direct_harvest_measurement',
          uncertainty_note: 'Oven-dried at 105 deg C to constant weight.'
        });
      }

      if (text.includes('284 destructively harvested') || text.includes('N = 284')) {
        claims.push({
          id: `clm-${source.id}-oak-sample`,
          source_id: source.id,
          chunk_id: c.id,
          species_id: 'quercus_robur',
          topic_id: 'dataset_demographics',
          claim_text: 'The European Oak calibration dataset comprises N = 284 destructively harvested trees across France, Germany, UK, and Poland spanning DBH 10 cm to 140 cm.',
          claim_type: 'empirical_finding',
          evidence_level: 'direct_harvest_measurement',
          uncertainty_note: 'Zianis et al. (2005) European Forest Institute compilation.'
        });
      }
    }

    return claims;
  }
}
