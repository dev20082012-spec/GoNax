import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatasetMetadata } from './datasetService';

export interface DataQualityIssue {
  row_index: number;
  check_type:
    | 'REQUIRED_COLUMNS'
    | 'UNITS_AND_TYPES'
    | 'SPECIES_IDENTITY'
    | 'DUPLICATE_OBSERVATIONS'
    | 'MISSING_DATA'
    | 'IMPOSSIBLE_OR_INCONSISTENT_VALUES'
    | 'TARGET_VARIABLE_CONSISTENCY'
    | 'POTENTIAL_OUTLIER'
    | 'GEOGRAPHIC_METADATA'
    | 'SOURCE_AND_LICENSING';
  severity: 'REVIEW_FLAG' | 'CRITICAL_ERROR';
  field: string;
  message: string;
  value?: any;
  recommendation: 'REVIEW' | 'EXCLUDE_FROM_TRAINING' | 'MANUAL_CORRECTION';
}

export interface FlaggedObservation {
  row_index: number;
  original_record: Record<string, any>;
  issues: DataQualityIssue[];
  status: 'PENDING_REVIEW' | 'FLAGGED_EXCLUDED' | 'FLAGGED_RETAINED';
}

export interface DataQualityAuditReport {
  dataset_id: string;
  evaluated_at: string;
  source_file: string;
  file_sha256: string;
  total_observations: number;
  valid_observations: number;
  flagged_observations: number;
  critical_errors_count: number;
  duplicates_detected: number;
  outliers_detected: number;
  missing_data_count: number;
  quality_score_percentage: number;
  is_training_ready: boolean;
  metadata_validation: {
    license_present: boolean;
    license: string;
    doi_present: boolean;
    doi: string;
    source_url_present: boolean;
    access_date_present: boolean;
  };
  cleaning_and_exclusion_audit: Array<{
    step: number;
    description: string;
    affected_rows: number;
    decision: string;
  }>;
  flagged_rows: FlaggedObservation[];
}

export class DataQualityService {
  private projectRoot: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../');
  }

  public computeSha256(filePath: string): string {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(this.projectRoot, filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found for checksum: ${fullPath}`);
    }
    const buffer = fs.readFileSync(fullPath);
    return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
  }

  public evaluateDataset(
    datasetMeta: DatasetMetadata,
    records: Record<string, any>[],
    sourceFilePath: string = ''
  ): DataQualityAuditReport {
    const issuesByRow = new Map<number, DataQualityIssue[]>();
    const seenSignatures = new Map<string, number>(); // signature -> first row_index
    let duplicatesCount = 0;
    let outliersCount = 0;
    let missingDataCount = 0;
    let criticalErrorsCount = 0;

    const fileSha = sourceFilePath && fs.existsSync(path.resolve(this.projectRoot, sourceFilePath))
      ? this.computeSha256(sourceFilePath)
      : (datasetMeta.clean_file_sha256 || datasetMeta.raw_file_sha256 || 'N/A');

    // 1. Metadata Validation (Source, License, DOI, Access Date)
    const metaValid = {
      license_present: !!(datasetMeta.license && datasetMeta.license.trim() !== ''),
      license: datasetMeta.license || 'UNSPECIFIED',
      doi_present: !!(datasetMeta.publication_reference?.doi && datasetMeta.publication_reference.doi.trim() !== ''),
      doi: datasetMeta.publication_reference?.doi || 'UNSPECIFIED',
      source_url_present: !!(datasetMeta.source_url && datasetMeta.source_url.trim() !== ''),
      access_date_present: !!(datasetMeta.access_date && datasetMeta.access_date.trim() !== '')
    };

    // Calculate distributions for statistical outlier detection
    const biomassRatios: { index: number; ratio: number }[] = [];

    // 2. Iterate each row
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowIssues: DataQualityIssue[] = [];

      // Check A: Required columns
      const dbhRaw = row.dbh_cm !== undefined ? row.dbh_cm : row.dbh;
      const heightRaw = row.height_m !== undefined ? row.height_m : row.height;
      const biomassRaw = row.above_ground_biomass_kg !== undefined
        ? row.above_ground_biomass_kg
        : (row.biomass_kg !== undefined ? row.biomass_kg : row.agb_kg);

      if (dbhRaw === undefined || dbhRaw === null || dbhRaw === '') {
        rowIssues.push({
          row_index: i,
          check_type: 'MISSING_DATA',
          severity: 'CRITICAL_ERROR',
          field: 'dbh_cm',
          message: 'Missing mandatory DBH measurement.',
          recommendation: 'EXCLUDE_FROM_TRAINING'
        });
        missingDataCount++;
        criticalErrorsCount++;
      }

      if (heightRaw === undefined || heightRaw === null || heightRaw === '') {
        rowIssues.push({
          row_index: i,
          check_type: 'MISSING_DATA',
          severity: 'CRITICAL_ERROR',
          field: 'height_m',
          message: 'Missing mandatory total tree height measurement.',
          recommendation: 'EXCLUDE_FROM_TRAINING'
        });
        missingDataCount++;
        criticalErrorsCount++;
      }

      if (biomassRaw === undefined || biomassRaw === null || biomassRaw === '') {
        rowIssues.push({
          row_index: i,
          check_type: 'MISSING_DATA',
          severity: 'CRITICAL_ERROR',
          field: 'above_ground_biomass_kg',
          message: 'Missing target dry above-ground biomass measurement.',
          recommendation: 'EXCLUDE_FROM_TRAINING'
        });
        missingDataCount++;
        criticalErrorsCount++;
      }

      // Check B: Numerical parse & Impossible or Inconsistent Values
      const dbh = Number(dbhRaw);
      const height = Number(heightRaw);
      const biomass = Number(biomassRaw);

      if (!isNaN(dbh)) {
        if (dbh <= 0) {
          rowIssues.push({
            row_index: i,
            check_type: 'IMPOSSIBLE_OR_INCONSISTENT_VALUES',
            severity: 'CRITICAL_ERROR',
            field: 'dbh_cm',
            message: `Impossible DBH <= 0 (${dbh} cm).`,
            value: dbh,
            recommendation: 'EXCLUDE_FROM_TRAINING'
          });
          criticalErrorsCount++;
        } else if (dbh > 400) {
          rowIssues.push({
            row_index: i,
            check_type: 'IMPOSSIBLE_OR_INCONSISTENT_VALUES',
            severity: 'CRITICAL_ERROR',
            field: 'dbh_cm',
            message: `Implausible terrestrial DBH > 400 cm (${dbh} cm).`,
            value: dbh,
            recommendation: 'EXCLUDE_FROM_TRAINING'
          });
          criticalErrorsCount++;
        }
      }

      if (!isNaN(height)) {
        if (height <= 0) {
          rowIssues.push({
            row_index: i,
            check_type: 'IMPOSSIBLE_OR_INCONSISTENT_VALUES',
            severity: 'CRITICAL_ERROR',
            field: 'height_m',
            message: `Impossible tree height <= 0 (${height} m).`,
            value: height,
            recommendation: 'EXCLUDE_FROM_TRAINING'
          });
          criticalErrorsCount++;
        } else if (height > 135) {
          rowIssues.push({
            row_index: i,
            check_type: 'IMPOSSIBLE_OR_INCONSISTENT_VALUES',
            severity: 'CRITICAL_ERROR',
            field: 'height_m',
            message: `Implausible tree height > 135 m (${height} m).`,
            value: height,
            recommendation: 'EXCLUDE_FROM_TRAINING'
          });
          criticalErrorsCount++;
        }
      }

      if (!isNaN(biomass)) {
        if (biomass <= 0) {
          rowIssues.push({
            row_index: i,
            check_type: 'IMPOSSIBLE_OR_INCONSISTENT_VALUES',
            severity: 'CRITICAL_ERROR',
            field: 'above_ground_biomass_kg',
            message: `Impossible oven-dry biomass <= 0 kg (${biomass} kg).`,
            value: biomass,
            recommendation: 'EXCLUDE_FROM_TRAINING'
          });
          criticalErrorsCount++;
        }
      }

      // Check C: Biomechanical slenderness consistency (Height / DBH ratio)
      if (!isNaN(dbh) && !isNaN(height) && dbh > 0 && height > 0) {
        // Height in m, DBH in cm. Slenderness ratio S = (Height * 100) / DBH
        // Typical range is 30 to 220. If S < 15 or S > 350, mechanically suspect.
        const slenderness = (height * 100) / dbh;
        if (slenderness < 15 || slenderness > 350) {
          rowIssues.push({
            row_index: i,
            check_type: 'IMPOSSIBLE_OR_INCONSISTENT_VALUES',
            severity: 'REVIEW_FLAG',
            field: 'slenderness_ratio',
            message: `Biomechanical slenderness ratio (H/DBH = ${slenderness.toFixed(1)}) is outside biological bounds [15, 350].`,
            value: slenderness,
            recommendation: 'REVIEW'
          });
        }

        // Target variable volumetric ratio proxy: biomass / ((dbh/100)^2 * height)
        if (!isNaN(biomass) && biomass > 0) {
          const cylindricalVol = (Math.PI / 4) * Math.pow(dbh / 100, 2) * height;
          const apparentDensity = biomass / cylindricalVol;
          biomassRatios.push({ index: i, ratio: apparentDensity });

          if (apparentDensity < 50 || apparentDensity > 2500) {
            rowIssues.push({
              row_index: i,
              check_type: 'TARGET_VARIABLE_CONSISTENCY',
              severity: 'REVIEW_FLAG',
              field: 'apparent_biomass_volume_ratio',
              message: `Apparent dry biomass to stem cylinder ratio (${apparentDensity.toFixed(1)} kg/m³) deviates wildly from expected wood density bounds [50, 2500] kg/m³.`,
              value: apparentDensity,
              recommendation: 'REVIEW'
            });
          }
        }
      }

      // Check D: Species identity check
      if (row.species_id || row.scientific_name || row.species) {
        const rawSpecies = (row.species_id || row.scientific_name || row.species).toString().toLowerCase();
        const expectedSpecies = datasetMeta.scientific_name.toLowerCase();
        const expectedKey = datasetMeta.species_id.toLowerCase();
        if (!rawSpecies.includes(expectedSpecies) && !rawSpecies.includes(expectedKey)) {
          rowIssues.push({
            row_index: i,
            check_type: 'SPECIES_IDENTITY',
            severity: 'CRITICAL_ERROR',
            field: 'species',
            message: `Species taxon '${rawSpecies}' does not match dataset target '${datasetMeta.scientific_name}'.`,
            value: rawSpecies,
            recommendation: 'EXCLUDE_FROM_TRAINING'
          });
          criticalErrorsCount++;
        }
      }

      // Check E: Duplicate Observations
      const signature = `${row.tree_id || ''}_${dbh.toFixed(2)}_${height.toFixed(2)}_${biomass.toFixed(2)}_${row.plot_id || ''}`;
      if (seenSignatures.has(signature)) {
        const firstRow = seenSignatures.get(signature)!;
        rowIssues.push({
          row_index: i,
          check_type: 'DUPLICATE_OBSERVATIONS',
          severity: 'REVIEW_FLAG',
          field: 'observation_signature',
          message: `Identical dendrometric observation previously recorded at row ${firstRow}. Flagged for review to prevent artificial weighting.`,
          value: signature,
          recommendation: 'REVIEW'
        });
        duplicatesCount++;
      } else {
        seenSignatures.set(signature, i);
      }

      // Check F: Geographic Metadata
      if (row.latitude !== undefined && row.latitude !== null) {
        const lat = Number(row.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          rowIssues.push({
            row_index: i,
            check_type: 'GEOGRAPHIC_METADATA',
            severity: 'REVIEW_FLAG',
            field: 'latitude',
            message: `Latitude (${lat}) outside valid range [-90, +90].`,
            value: lat,
            recommendation: 'MANUAL_CORRECTION'
          });
        }
      }
      if (row.longitude !== undefined && row.longitude !== null) {
        const lon = Number(row.longitude);
        if (isNaN(lon) || lon < -180 || lon > 180) {
          rowIssues.push({
            row_index: i,
            check_type: 'GEOGRAPHIC_METADATA',
            severity: 'REVIEW_FLAG',
            field: 'longitude',
            message: `Longitude (${lon}) outside valid range [-180, +180].`,
            value: lon,
            recommendation: 'MANUAL_CORRECTION'
          });
        }
      }

      if (rowIssues.length > 0) {
        issuesByRow.set(i, rowIssues);
      }
    }

    // 3. Statistical Outlier Detection (Z-score on apparent density ratios)
    if (biomassRatios.length > 10) {
      const mean = biomassRatios.reduce((acc, r) => acc + r.ratio, 0) / biomassRatios.length;
      const variance = biomassRatios.reduce((acc, r) => acc + Math.pow(r.ratio - mean, 2), 0) / biomassRatios.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > 0) {
        for (const item of biomassRatios) {
          const zScore = Math.abs((item.ratio - mean) / stdDev);
          if (zScore > 3.5) {
            outliersCount++;
            const existing = issuesByRow.get(item.index) || [];
            existing.push({
              row_index: item.index,
              check_type: 'POTENTIAL_OUTLIER',
              severity: 'REVIEW_FLAG',
              field: 'above_ground_biomass_kg',
              message: `Statistical outlier detected (|Z| = ${zScore.toFixed(2)} > 3.5) relative to volumetric scaling mean. Flagged for review.`,
              value: { apparentDensity: item.ratio, mean, stdDev, zScore },
              recommendation: 'REVIEW'
            });
            issuesByRow.set(item.index, existing);
          }
        }
      }
    }

    // 4. Construct Flagged Rows (preserving original records rather than deleting them)
    const flaggedRows: FlaggedObservation[] = [];
    for (const [rowIndex, issues] of issuesByRow.entries()) {
      const hasCritical = issues.some(iss => iss.severity === 'CRITICAL_ERROR');
      flaggedRows.push({
        row_index: rowIndex,
        original_record: records[rowIndex],
        issues,
        status: hasCritical ? 'FLAGGED_EXCLUDED' : 'PENDING_REVIEW'
      });
    }

    const totalObs = records.length;
    const flaggedCount = flaggedRows.length;
    const excludedCount = flaggedRows.filter(r => r.status === 'FLAGGED_EXCLUDED').length;
    const validCount = totalObs - excludedCount;

    const qualityScore = totalObs > 0
      ? Math.max(0, Math.min(100, Math.round(((validCount - flaggedCount * 0.2) / totalObs) * 1000) / 10))
      : 0;

    const cleaningAudit = [
      {
        step: 1,
        description: 'Schema & Column Verification (DBH, Height, Biomass)',
        affected_rows: missingDataCount,
        decision: missingDataCount > 0 ? 'Flagged rows missing required biometric fields for exclusion' : 'All required columns verified'
      },
      {
        step: 2,
        description: 'Physical & Biological Boundary Checking (Bounds [0.1, 400] cm, [0.1, 135] m)',
        affected_rows: criticalErrorsCount - missingDataCount,
        decision: 'Impossible physical values flagged for exclusion to maintain scientific plausibility'
      },
      {
        step: 3,
        description: 'Duplicate Observation Screening',
        affected_rows: duplicatesCount,
        decision: duplicatesCount > 0 ? 'Duplicate records flagged for review without silent deletion' : 'Zero duplicates detected'
      },
      {
        step: 4,
        description: 'Volumetric Scaling & Statistical Outlier Screening (|Z| > 3.5)',
        affected_rows: outliersCount,
        decision: outliersCount > 0 ? 'Extreme residual variance rows flagged for expert forestry review' : 'No severe statistical outliers'
      }
    ];

    return {
      dataset_id: datasetMeta.dataset_id,
      evaluated_at: new Date().toISOString(),
      source_file: sourceFilePath,
      file_sha256: fileSha,
      total_observations: totalObs,
      valid_observations: validCount,
      flagged_observations: flaggedCount,
      critical_errors_count: criticalErrorsCount,
      duplicates_detected: duplicatesCount,
      outliers_detected: outliersCount,
      missing_data_count: missingDataCount,
      quality_score_percentage: qualityScore,
      is_training_ready: criticalErrorsCount === 0 && qualityScore >= 90.0,
      metadata_validation: metaValid,
      cleaning_and_exclusion_audit: cleaningAudit,
      flagged_rows: flaggedRows
    };
  }

  public evaluateStoredDataset(
    datasetMeta: DatasetMetadata
  ): DataQualityAuditReport {
    // Attempt to load clean source file or raw source file
    let targetPath = '';
    if (datasetMeta.clean_source_file && fs.existsSync(path.resolve(this.projectRoot, datasetMeta.clean_source_file))) {
      targetPath = datasetMeta.clean_source_file;
    } else if (datasetMeta.raw_source_file && fs.existsSync(path.resolve(this.projectRoot, datasetMeta.raw_source_file))) {
      targetPath = datasetMeta.raw_source_file;
    }

    if (!targetPath) {
      throw new Error(`No data file found for dataset '${datasetMeta.dataset_id}'.`);
    }

    const fullPath = path.resolve(this.projectRoot, targetPath);
    let records: Record<string, any>[] = [];

    if (targetPath.endsWith('.json')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(raw);
      records = Array.isArray(parsed) ? parsed : (parsed.records || parsed.data || []);
    } else if (targetPath.endsWith('.csv')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const rec: Record<string, any> = {};
          headers.forEach((h, idx) => {
            const val = cols[idx];
            rec[h] = isNaN(Number(val)) ? val : Number(val);
          });
          records.push(rec);
        }
      }
    }

    return this.evaluateDataset(datasetMeta, records, targetPath);
  }
}
