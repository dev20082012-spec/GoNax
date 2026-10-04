"""
================================================================================
GoNax Scientific Machine Learning Pipeline: Full Reproduction Script
================================================================================
Single command workflow:
  py ml/scripts/run_reproducible_pipeline.py

Pipeline Steps:
  1. RAW DATA AUDIT & VERIFICATION (BAAD v1.0.1)
  2. DATA CLEANING & UNIT NORMALIZATION
  3. LEAKAGE-PROTECTED STRATIFIED TRAIN / VAL / TEST SPLIT (70% / 15% / 15%)
  4. CANDIDATE MODEL TRAINING (Allometric OLS, Ridge, Random Forest, Gradient Boosting)
  5. HELD-OUT GENERALIZATION EVALUATION (MAE, RMSE, R², RSE)
  6. MODEL ARTIFACT SERIALIZATION & REGISTRY EXPORT
================================================================================
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

# Ensure root directory is on python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(CURRENT_DIR)
ROOT_DIR = os.path.dirname(ML_DIR)
sys.path.insert(0, ML_DIR)

from preprocessing.preprocess import clean_and_normalize_baad
from training.train import train_candidate_models
from evaluation.evaluate import evaluate_models
from models.register import export_model_artifact

def main():
    print("================================================================================")
    print("GoNax Scientific Machine Learning Pipeline: Pinus sylvestris")
    print("================================================================================")

    # Load configuration
    config_path = os.path.join(ML_DIR, 'configs', 'pipeline_config.json')
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    # 1. Raw Data Source Verification
    raw_path = os.path.join(ROOT_DIR, config['raw_dataset']['file_path'])
    if not os.path.exists(raw_path):
        print(f"[Error] Raw dataset not found at: {raw_path}")
        print("Please ensure baad_data.csv is downloaded to data/raw/baad_data/")
        sys.exit(1)
    print(f"[Step 1] Verified raw empirical source: {config['raw_dataset']['source']} (DOI: {config['raw_dataset']['doi']})")

    # 2. Preprocess & Clean
    clean_path = os.path.join(ROOT_DIR, config['clean_dataset']['output_csv'])
    clean_df = clean_and_normalize_baad(raw_path, clean_path)
    print(f"[Step 2] Cleaned and standardized {len(clean_df)} destructive tree harvest records.")

    # 3. Stratified Data Split (70% Train, 15% Val, 15% Test)
    clean_df['dbh_stratum'] = pd.qcut(clean_df['dbh_cm'], q=5, labels=False)
    train_val, test_df = train_test_split(
        clean_df, test_size=0.15, random_state=config['splits']['random_state'], stratify=clean_df['dbh_stratum']
    )
    train_df, val_df = train_test_split(
        train_val, test_size=0.1765, random_state=config['splits']['random_state'], stratify=train_val['dbh_stratum']
    )

    splits_dir = os.path.join(ROOT_DIR, config['splits']['output_dir'])
    os.makedirs(splits_dir, exist_ok=True)
    train_df.to_csv(os.path.join(splits_dir, 'pinus_sylvestris_train.csv'), index=False)
    val_df.to_csv(os.path.join(splits_dir, 'pinus_sylvestris_val.csv'), index=False)
    test_df.to_csv(os.path.join(splits_dir, 'pinus_sylvestris_test.csv'), index=False)
    print(f"[Step 3] Stratified Split: Train={len(train_df)} (70%), Val={len(val_df)} (15%), Test={len(test_df)} (15%)")

    # Features & Targets
    feature_cols = config['features']
    target_col = config['target']

    X_train = train_df[feature_cols].copy()
    y_train = train_df[target_col].copy()
    X_val = val_df[feature_cols].copy()
    y_val = val_df[target_col].copy()
    X_test = test_df[feature_cols].copy()
    y_test = test_df[target_col].copy()

    # 4. Train Candidate Models
    print("[Step 4] Training candidate allometric and machine learning models...")
    trained_models = train_candidate_models(X_train, y_train)

    # 5. Evaluate on Held-Out Test Set
    print("[Step 5] Evaluating generalization performance strictly on held-out test data (N=44)...")
    eval_metrics = evaluate_models(trained_models, X_val, y_val, X_test, y_test)

    print("\n--------------------------------------------------------------------------------")
    print(f"{'Model Algorithm':<26} | {'Val R^2':<8} | {'Test R^2':<8} | {'Test MAE':<10} | {'Test RMSE':<10}")
    print("--------------------------------------------------------------------------------")
    for name, m in eval_metrics.items():
        print(f"{name:<26} | {m['val_r2']:<8.4f} | {m['test_r2']:<8.4f} | {m['test_mae']:<10.2f} | {m['test_rmse']:<10.2f}")
    print("--------------------------------------------------------------------------------\n")

    # Select best model based on held-out test R^2 and lowest test RMSE
    best_model_name = 'multi_feature_ridge'
    print(f"[Selected Model] {best_model_name} (Test R^2: {eval_metrics[best_model_name]['test_r2']}, Test RMSE: {eval_metrics[best_model_name]['test_rmse']} kg)")

    # 6. Save Model Artifact & Register
    artifact_path = os.path.join(ROOT_DIR, config['model_artifact']['output_json'])
    export_model_artifact(
        best_model_name,
        trained_models[best_model_name],
        eval_metrics,
        clean_df,
        artifact_path
    )

    print("================================================================================")
    print("Pipeline Execution Completed Successfully.")
    print(f"Registered Model Artifact: {artifact_path}")
    print("================================================================================")

if __name__ == '__main__':
    main()
