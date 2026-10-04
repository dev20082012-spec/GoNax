import fs from 'fs';
import path from 'path';

export interface RawTreeRecord {
  tree_id: string;
  species_id: string;
  scientific_name: string;
  dbh_cm: number;
  height_m: number;
  crown_diameter_m: number;
  age_years?: number;
  wood_density_g_cm3: number;
  elevation_m: number;
  latitude: number;
  longitude: number;
  above_ground_biomass_kg: number;
}

export function generateRawSpeciesData(speciesId: string, count: number): RawTreeRecord[] {
  const records: RawTreeRecord[] = [];

  // Seeded deterministic pseudo-random generator
  let seed = 42;
  function pseudoRandom(): number {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  // Species profiles
  const profiles: Record<string, {
    scientific: string;
    dbhMin: number; dbhMax: number;
    heightMin: number; heightMax: number;
    densityMean: number; densitySd: number;
    a: number; b: number; c: number;
    latBase: number; lonBase: number;
    elevBase: number;
  }> = {
    quercus_robur: {
      scientific: 'Quercus robur',
      dbhMin: 12.0, dbhMax: 135.0,
      heightMin: 6.0, heightMax: 36.0,
      densityMean: 0.67, densitySd: 0.05,
      a: 0.0567, b: 2.012, c: 0.873,
      latBase: 49.5, lonBase: 11.2,
      elevBase: 420
    },
    pinus_sylvestris: {
      scientific: 'Pinus sylvestris',
      dbhMin: 9.0, dbhMax: 88.0,
      heightMin: 5.0, heightMax: 32.0,
      densityMean: 0.51, densitySd: 0.04,
      a: 0.0418, b: 1.923, c: 0.954,
      latBase: 60.2, lonBase: 16.5,
      elevBase: 280
    },
    fagus_sylvatica: {
      scientific: 'Fagus sylvatica',
      dbhMin: 11.0, dbhMax: 118.0,
      heightMin: 7.0, heightMax: 40.0,
      densityMean: 0.68, densitySd: 0.04,
      a: 0.0632, b: 1.984, c: 0.912,
      latBase: 48.8, lonBase: 9.8,
      elevBase: 550
    }
  };

  const p = profiles[speciesId] || profiles.quercus_robur;

  for (let i = 1; i <= count; i++) {
    // Generate DBH with log-normal tendency
    const t = pseudoRandom();
    const dbh = Math.round((p.dbhMin + (p.dbhMax - p.dbhMin) * Math.pow(t, 1.4)) * 10) / 10;
    
    // Height correlates allometrically with DBH: H ~ k * DBH^0.55 + noise
    const baseH = 2.4 * Math.pow(dbh, 0.58);
    const hNoise = (pseudoRandom() - 0.5) * 4.0;
    const height = Math.max(p.heightMin, Math.min(p.heightMax, Math.round((baseH + hNoise) * 10) / 10));

    // Crown diameter
    const crown = Math.round((1.5 + 0.16 * dbh + (pseudoRandom() - 0.5) * 1.5) * 10) / 10;

    // Wood density with normal distribution approx
    const densityNoise = (pseudoRandom() + pseudoRandom() - 1.0) * p.densitySd * 1.8;
    const woodDensity = Math.round((p.densityMean + densityNoise) * 1000) / 1000;

    // Age
    const age = Math.round(dbh * 1.5 + (pseudoRandom() - 0.5) * 15);

    // Geographic coordinates & elevation
    const lat = Math.round((p.latBase + (pseudoRandom() - 0.5) * 4.0) * 10000) / 10000;
    const lon = Math.round((p.lonBase + (pseudoRandom() - 0.5) * 5.0) * 10000) / 10000;
    const elev = Math.round(p.elevBase + (pseudoRandom() - 0.5) * 300);

    // True destructive dry biomass with realistic biological measurement residual error (approx 8-10%)
    const biologicalResidual = 1.0 + (pseudoRandom() + pseudoRandom() - 1.0) * 0.10;
    const trueBiomass = p.a * Math.pow(dbh, p.b) * Math.pow(height, p.c) * (woodDensity / p.densityMean) * biologicalResidual;
    const biomassRounded = Math.round(trueBiomass * 10) / 10;

    records.push({
      tree_id: `${speciesId}-raw-${String(i).padStart(4, '0')}`,
      species_id: speciesId,
      scientific_name: p.scientific,
      dbh_cm: dbh,
      height_m: height,
      crown_diameter_m: crown,
      age_years: age,
      wood_density_g_cm3: woodDensity,
      elevation_m: elev,
      latitude: lat,
      longitude: lon,
      above_ground_biomass_kg: biomassRounded
    });
  }

  return records;
}

export function saveRawData(records: RawTreeRecord[], outPath: string) {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(records, null, 2), 'utf-8');
}
