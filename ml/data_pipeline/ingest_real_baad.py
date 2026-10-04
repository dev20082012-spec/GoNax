"""
GoNax Scientific Data Acquisition & Ingestion Pipeline
Source: Biomass And Allometry Database (BAAD v1.0.1)
Publication: Falster et al. (2015), Ecology, 96(5): 1445. DOI: 10.1890/14-1889.1
Studies:
  1. Albrektson (1984), Forestry, 57(1): 35-43. DOI: 10.1093/forestry/57.1.35 (Central Sweden)
  2. Vanninen & Makela (2005), Tree Physiology, 25(1): 17-30. DOI: 10.1093/treephys/25.1.17 (Finland)
  3. Santa Regina & Tarazona (1999), Annals of Forest Science, 56(8): 667-677. DOI: 10.1051/forest:19990804 (Spain)
"""

import os
import json
import pandas as pd
import numpy as np

def ingest_pinus_sylvestris():
    raw_csv = os.path.join("data", "raw", "baad_data", "baad_data.csv")
    if not os.path.exists(raw_csv):
        raise FileNotFoundError(f"Raw BAAD dataset not found at {raw_csv}")

    df = pd.read_csv(raw_csv, low_memory=False)
    
    # Filter for Pinus sylvestris with mandatory tree dimensions and biomass
    pine = df[df["speciesMatched"] == "Pinus sylvestris"].copy()
    valid = pine.dropna(subset=["d.bh", "h.t", "m.so"]).copy()
    
    print(f"[BAAD Ingestion] Extracted {len(valid)} real destructive harvest records for Pinus sylvestris.")
    
    # Unit normalization:
    # d.bh is recorded in meters in BAAD dictionary -> convert to cm
    # h.t is in meters
    # m.so is aboveground dry mass in kg
    valid["dbh_cm"] = np.round(valid["d.bh"] * 100.0, 2)
    valid["height_m"] = np.round(valid["h.t"], 2)
    valid["above_ground_biomass_kg"] = np.round(valid["m.so"], 3)
    valid["stem_mass_kg"] = np.round(valid["m.st"], 3) if "m.st" in valid else np.nan
    valid["foliage_mass_kg"] = np.round(valid["m.lf"], 3) if "m.lf" in valid else np.nan
    valid["branch_mass_kg"] = np.round(valid["m.br"], 3) if "m.br" in valid else np.nan
    valid["wood_density_g_cm3"] = 0.51 # Species baseline dry density for Scots Pine (IPCC / Chave 2009)
    
    # Biological validity checks
    # DBH > 0 and < 150 cm, Height > 1 and < 50 m, Biomass > 0
    mask = (valid["dbh_cm"] > 0) & (valid["dbh_cm"] < 150) & (valid["height_m"] > 1) & (valid["height_m"] < 50) & (valid["above_ground_biomass_kg"] > 0)
    cleaned = valid[mask].copy()
    print(f"[BAAD Ingestion] Passed biological validity filters: {len(cleaned)} / {len(valid)} records.")
    
    # Feature engineering:
    # Cylindrical volume proxy: V = (DBH_cm^2 * Height_m) / 10000 (m^3)
    cleaned["cylindrical_volume_proxy_m3"] = np.round((cleaned["dbh_cm"]**2) * cleaned["height_m"] / 10000.0, 5)
    # Mass proxy: rho * V (wood density * volume proxy) in kg
    cleaned["mass_proxy_kg"] = np.round(cleaned["wood_density_g_cm3"] * 1000.0 * cleaned["cylindrical_volume_proxy_m3"], 3)
    
    # Target definition: Elemental Carbon (C = AGB * 0.505) and CO2e (CO2e = C * 44.01/12.011)
    carbon_fraction = 0.505 # Scots pine carbon fraction
    cleaned["carbon_stock_kg"] = np.round(cleaned["above_ground_biomass_kg"] * carbon_fraction, 3)
    cleaned["co2e_kg"] = np.round(cleaned["carbon_stock_kg"] * (44.01 / 12.011), 3)

    # Save cleaned real dataset in data/clean/
    os.makedirs(os.path.join("data", "clean"), exist_ok=True)
    clean_csv = os.path.join("data", "clean", "pinus_sylvestris_baad_clean.csv")
    cleaned.to_csv(clean_csv, index=False)
    
    # Save as JSON records
    clean_json = os.path.join("data", "clean", "pinus_sylvestris_baad_clean.json")
    records = cleaned.to_dict(orient="records")
    with open(clean_json, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
        
    print(f"[BAAD Ingestion] Saved cleaned records to {clean_csv} and {clean_json}")
    return cleaned

if __name__ == "__main__":
    ingest_pinus_sylvestris()
