"""
GoNax Scientific Data Preprocessing Module
Extracts, cleans, standardizes, and normalizes raw BAAD harvest observations for Pinus sylvestris.
"""

import os
import pandas as pd
import numpy as np

def clean_and_normalize_baad(raw_csv_path: str, clean_csv_out: str) -> pd.DataFrame:
    if not os.path.exists(raw_csv_path):
        raise FileNotFoundError(f"Raw BAAD dataset not found at {raw_csv_path}")

    # Load raw BAAD data
    df_raw = pd.read_csv(raw_csv_path, low_memory=False)
    
    # Filter for Pinus sylvestris
    ps = df_raw[df_raw['species'] == 'Pinus sylvestris'].copy()
    
    # Require mandatory measurements: stem diameter (d.bh), total tree height (h.t), above-ground biomass (m.so or m.to)
    # BAAD variable definitions:
    # d.bh: diameter at breast height (m) -> convert to cm
    # h.t: total height (m)
    # m.so: above-ground woody biomass (kg dry matter)
    # m.to: total plant biomass (kg)
    valid_mask = ps['d.bh'].notna() & ps['h.t'].notna() & (ps['m.so'].notna() | ps['m.to'].notna())
    ps_clean = ps[valid_mask].copy()

    records = []
    for idx, row in ps_clean.iterrows():
        dbh_cm = float(row['d.bh']) * 100.0 # convert m to cm
        h_m = float(row['h.t'])
        agb_kg = float(row['m.so']) if pd.notna(row['m.so']) else float(row['m.to'])
        
        # Physical plausibility validation
        if dbh_cm < 0.5 or dbh_cm > 150.0 or h_m < 0.5 or h_m > 60.0 or agb_kg <= 0:
            continue
            
        study_name = str(row.get('studyName', 'Unknown'))
        lat = float(row['latitude']) if pd.notna(row.get('latitude')) else None
        lon = float(row['longitude']) if pd.notna(row.get('longitude')) else None
        
        # Volume proxy interaction term: DBH^2 * H / 10000 (m^3 proxy)
        vol_proxy = (dbh_cm ** 2) * h_m / 10000.0

        records.append({
            'tree_id': f"baad_ps_{idx}",
            'species_scientific': 'Pinus sylvestris',
            'species_common': 'Scots Pine',
            'study_name': study_name,
            'dbh_cm': round(dbh_cm, 2),
            'height_m': round(h_m, 2),
            'cylindrical_volume_proxy_m3': round(vol_proxy, 5),
            'above_ground_biomass_kg': round(agb_kg, 3),
            'latitude': lat,
            'longitude': lon
        })

    clean_df = pd.DataFrame(records)
    
    os.makedirs(os.path.dirname(clean_csv_out), exist_ok=True)
    clean_df.to_csv(clean_csv_out, index=False)
    print(f"[Preprocessing] Extracted & standardized {len(clean_df)} valid destructive harvest records -> {clean_csv_out}")
    return clean_df

if __name__ == '__main__':
    raw = os.path.join('data', 'raw', 'baad_data', 'baad_data.csv')
    out = os.path.join('data', 'clean', 'pinus_sylvestris_baad_clean.csv')
    clean_and_normalize_baad(raw, out)
