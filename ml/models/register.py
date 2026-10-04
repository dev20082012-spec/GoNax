"""
GoNax Model Artifact Generation & Registry Exporter
Exports serialized model metadata, parameters, and benchmark metrics to models/registry/.
"""

import os
import json
from datetime import datetime

def export_model_artifact(
    best_model_name: str,
    trained_obj: dict,
    eval_metrics: dict,
    df_clean: dict,
    output_path: str
):
    model = trained_obj['model']
    
    # Extract Ridge parameters
    coefs = {
        'dbh_cm': float(model.coef_[0]),
        'height_m': float(model.coef_[1]),
        'cylindrical_volume_proxy_m3': float(model.coef_[2])
    }
    intercept = float(model.intercept_)
    
    sel_metrics = eval_metrics[best_model_name]
    
    artifact = {
        'model_id': 'trained-pinus-sylvestris-baad-v1',
        'species_id': 'pinus_sylvestris',
        'species_scientific_name': 'Pinus sylvestris',
        'species_common_name': 'Scots Pine',
        'name': 'Scots Pine Empirical Multi-Feature Regressor (BAAD)',
        'model_type': 'ml_gradient_boost',
        'model_category': 'scientific_trained_model',
        'model_version': '1.0.0',
        'training_dataset_id': 'ds-pinus-sylvestris-baad-v1',
        'training_dataset_version': '1.0.1',
        'algorithm': 'Ridge Linear Regressor (L2 regularized)',
        'feature_list': [
            'dbh_cm',
            'height_m',
            'cylindrical_volume_proxy_m3'
        ],
        'target_variable': 'above_ground_biomass_kg',
        'units': {
            'inputs': {
                'dbh_cm': 'cm',
                'height_m': 'm',
                'cylindrical_volume_proxy_m3': 'm3'
            },
            'output': 'kg'
        },
        'calibration_domain': {
            'dbh_min_cm': float(df_clean['dbh_cm'].min()),
            'dbh_max_cm': float(df_clean['dbh_cm'].max()),
            'height_min_m': float(df_clean['height_m'].min()),
            'height_max_m': float(df_clean['height_m'].max()),
            'biomass_min_kg': float(df_clean['above_ground_biomass_kg'].min()),
            'biomass_max_kg': float(df_clean['above_ground_biomass_kg'].max())
        },
        'parameters': {
            'coefficients': coefs,
            'intercept': intercept
        },
        'evaluation_metrics': {
            'r2': sel_metrics['test_r2'],
            'rmse_kg': sel_metrics['test_rmse'],
            'mae_kg': sel_metrics['test_mae'],
            'rse_percentage': sel_metrics['rse_percentage'],
            'sample_count': int(len(df_clean)),
            'train_samples': 200,
            'val_samples': 44,
            'test_samples': 44
        },
        'all_evaluated_models': eval_metrics,
        'applicable_geographic_scope': {
            'description': 'Fennoscandian and European Scots Pine Stands (Sweden, Finland, Spain)',
            'regions': [
                'Sweden (Central)',
                'Finland (Southern)',
                'Spain (Sierra de la Demanda)'
            ],
            'latitude_range': [40.3, 61.8],
            'longitude_range': [-4.5, 24.2]
        },
        'provenance': {
            'primary_database': 'Biomass And Allometry Database (BAAD v1.0.1)',
            'primary_publication': 'Falster, D.S., et al. (2015). BAAD: a Biomass And Allometry Database for woody plants. Ecology, 96(5): 1445. DOI: 10.1890/14-1889.1',
            'primary_doi': '10.1890/14-1889.1',
            'constituent_studies': [
                {
                    'study': 'Albrektson1984',
                    'citation': 'Albrektson, A. (1984). Sapwood basal area and needle mass of Scots pine (Pinus sylvestris L.) trees in central Sweden. Forestry, 57(1): 35-43.',
                    'doi': '10.1093/forestry/57.1.35',
                    'sample_count': 164
                },
                {
                    'study': 'Vanninen2005',
                    'citation': 'Vanninen, P. & Makela, A. (2005). Carbon budget for Scots pine trees: effects of size, competition and site fertility on growth allocation and production. Tree Physiology, 25(1): 17-30.',
                    'doi': '10.1093/treephys/25.1.17',
                    'sample_count': 117
                },
                {
                    'study': 'SantaRegina1999',
                    'citation': 'Santa Regina, I. & Tarazona, T. (1999). Organic matter dynamics in beech and pine stands of mountainous Mediterranean climate area. Annals of Forest Science, 56(8): 667-677.',
                    'doi': '10.1051/forest:19990804',
                    'sample_count': 7
                }
            ]
        },
        'software_environment': {
            'python_version': '3.13.6',
            'sklearn_version': '1.8.0',
            'numpy_version': '2.4.4',
            'pandas_version': '3.0.2'
        },
        'training_date': datetime.now().strftime('%Y-%m-%d'),
        'status': 'active'
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(artifact, f, indent=2)

    print(f"[ModelRegistry] Exported model artifact -> {output_path}")
    return artifact
