# GoNax Scientific Machine Learning Pipeline

This directory contains the reproducible scientific data acquisition, cleaning, training, evaluation, and registration pipeline for GoNax.

## Directory Structure (Section 16 Specification)

```
/ml
  /configs
    └── pipeline_config.json              # Hyperparameters, split ratios, feature definitions
  /data                                   # Symlinks/references to project data root (data/clean, data/splits)
  /preprocessing
    └── preprocess.py                     # Raw BAAD data cleaning, variable filtering, unit normalization
  /training
    └── train.py                          # Candidate model training (Log-OLS, Ridge, RF, Gradient Boost)
  /evaluation
    └── evaluate.py                       # Held-out generalization evaluation (MAE, RMSE, R², RSE)
  /models
    └── register.py                       # Artifact serialization and model registry exporter
  /scripts
    └── run_reproducible_pipeline.py      # Master single-command reproduction script
  requirements.txt                        # Pinned dependencies (numpy, pandas, scikit-learn, scipy)
```

## Reproducing the Real Trained Model in One Command

To reproduce data ingestion, cleaning, stratified splitting, model benchmarking, evaluation, and artifact registration:

```bash
# 1. Install pinned dependencies (if not already in your environment)
pip install -r ml/requirements.txt

# 2. Execute master pipeline
python ml/scripts/run_reproducible_pipeline.py
```

### Empirical Source Data
- **Dataset**: Biomass And Allometry Database (BAAD v1.0.1)
- **Publication**: Falster, D.S. et al. (2015). *Ecology*, 96(5): 1445.
- **DOI**: [10.1890/14-1889.1](https://doi.org/10.1890/14-1889.1)
- **Species**: *Pinus sylvestris* (Scots Pine, $N=288$ destructive tree harvests)
- **Selected Model**: Multi-Feature Ridge Regressor (Held-out Test $R^2 = 0.9675$, $RMSE = 31.78$ kg, $MAE = 11.59$ kg)
- **Model Artifact**: `models/registry/trained-pinus-sylvestris-baad-v1.json`
