# ML Data Directory

Project data is managed in the root `data/` directory for immutability:
- `data/raw/baad_data/`: Immutable raw source data from Falster et al. (2015) BAAD v1.0.1
- `data/clean/`: Standardized, unit-normalized datasets (`pinus_sylvestris_baad_clean.csv`)
- `data/splits/`: Stratified train (70%), validation (15%), and held-out test (15%) splits
- `data/metadata/`: Dataset provenance manifests (`ds-pinus-sylvestris-baad-v1.json`)
