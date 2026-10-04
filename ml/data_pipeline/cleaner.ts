import fs from 'fs';
import path from 'path';
import { RawTreeRecord } from './raw_generator';

export interface CleanTreeRecord extends RawTreeRecord {
  data_cleaning_status: 'VALIDATED';
  validation_timestamp: string;
}

export interface CleaningReport {
  total_raw: number;
  accepted: number;
  rejected: number;
  reasons: string[];
}

export function cleanTreeData(rawRecords: RawTreeRecord[]): { clean: CleanTreeRecord[]; report: CleaningReport } {
  const clean: CleanTreeRecord[] = [];
  let rejected = 0;
  const reasons: string[] = [];

  for (const r of rawRecords) {
    // 1. Biological limits
    if (r.dbh_cm <= 0 || r.dbh_cm > 400) {
      rejected++;
      reasons.push(`Tree ${r.tree_id}: Invalid DBH (${r.dbh_cm} cm).`);
      continue;
    }
    if (r.height_m <= 0 || r.height_m > 120) {
      rejected++;
      reasons.push(`Tree ${r.tree_id}: Invalid Height (${r.height_m} m).`);
      continue;
    }
    if (r.wood_density_g_cm3 < 0.1 || r.wood_density_g_cm3 > 1.4) {
      rejected++;
      reasons.push(`Tree ${r.tree_id}: Unphysical wood density (${r.wood_density_g_cm3} g/cm3).`);
      continue;
    }
    if (r.above_ground_biomass_kg <= 0) {
      rejected++;
      reasons.push(`Tree ${r.tree_id}: Non-positive biomass (${r.above_ground_biomass_kg} kg).`);
      continue;
    }

    // 2. Allometric consistency check (slenderness ratio Height / (DBH/100))
    const slenderness = r.height_m / (r.dbh_cm / 100);
    if (slenderness < 15 || slenderness > 200) {
      rejected++;
      reasons.push(`Tree ${r.tree_id}: Unrealistic slenderness ratio (${slenderness.toFixed(1)}).`);
      continue;
    }

    clean.push({
      ...r,
      data_cleaning_status: 'VALIDATED',
      validation_timestamp: new Date().toISOString()
    });
  }

  return {
    clean,
    report: {
      total_raw: rawRecords.length,
      accepted: clean.length,
      rejected,
      reasons: reasons.slice(0, 10)
    }
  };
}

export function saveCleanData(records: CleanTreeRecord[], outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(records, null, 2), 'utf-8');
}
