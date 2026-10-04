import fs from 'fs';
import path from 'path';
import { CleanTreeRecord } from './cleaner';

export interface EngineeredTreeFeatures extends CleanTreeRecord {
  log_dbh: number;
  log_height: number;
  stem_volume_cyl_m3: number;
  wood_density_mass_proxy_kg: number;
  crown_volume_proxy_m3: number;
  slenderness_ratio: number;
}

export function engineerFeatures(records: CleanTreeRecord[]): EngineeredTreeFeatures[] {
  return records.map(r => {
    const dbh_m = r.dbh_cm / 100.0;
    const stem_volume = Math.PI * Math.pow(dbh_m / 2.0, 2) * r.height_m;
    const mass_proxy = stem_volume * (r.wood_density_g_cm3 * 1000.0);
    const crown_proxy = (Math.PI / 4.0) * Math.pow(r.crown_diameter_m, 2) * (r.height_m / 3.0);
    const slenderness = r.height_m / dbh_m;

    return {
      ...r,
      log_dbh: Math.round(Math.log(r.dbh_cm) * 10000) / 10000,
      log_height: Math.round(Math.log(r.height_m) * 10000) / 10000,
      stem_volume_cyl_m3: Math.round(stem_volume * 10000) / 10000,
      wood_density_mass_proxy_kg: Math.round(mass_proxy * 100) / 100,
      crown_volume_proxy_m3: Math.round(crown_proxy * 100) / 100,
      slenderness_ratio: Math.round(slenderness * 100) / 100
    };
  });
}

export function saveFeatureData(records: EngineeredTreeFeatures[], outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(records, null, 2), 'utf-8');
}
