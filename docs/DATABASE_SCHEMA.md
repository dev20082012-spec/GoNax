# GoNax Database Schema Specification

This document details the relational PostgreSQL schema for GoNax.

## Entity-Relationship Diagram

```mermaid
erDiagram
    Species ||--o{ SpeciesModel : "calibrated with"
    SpeciesDataset ||--o{ SpeciesModel : "trained/fit on"
    ScientificReference ||--o{ SpeciesDataset : "cites"
    ScientificReference ||--o{ PredictionEvidence : "referenced in"
    Species ||--o{ TreeObservation : "observed as"
    TreeObservation ||--|| Prediction : "predicts"
    SpeciesModel ||--o{ Prediction : "computes"
    Prediction ||--o{ PredictionEvidence : "has evidence"

    Species {
        uuid id PK
        varchar scientific_name UK
        varchar common_name
        varchar family
        numeric wood_density_mean
        numeric wood_density_sd
        jsonb applicable_variables
        text[] geographic_applicability
        timestamp created_at
        timestamp updated_at
    }

    ScientificReference {
        uuid id PK
        varchar doi UK
        text citation_text
        text title
        text authors
        integer year
        varchar journal
        text url
        timestamp created_at
    }

    SpeciesDataset {
        uuid id PK
        varchar name
        varchar version
        text description
        integer sample_size
        text geographic_coverage
        uuid reference_id FK
        timestamp created_at
    }

    SpeciesModel {
        uuid id PK
        uuid species_id FK
        uuid dataset_id FK
        varchar name
        varchar model_type
        varchar version
        text formula_expression
        jsonb parameters
        numeric carbon_fraction
        numeric uncertainty_percentage
        boolean is_prototype
        timestamp created_at
    }

    TreeObservation {
        uuid id PK
        uuid species_id FK
        numeric dbh_cm
        numeric height_m
        numeric crown_diameter_m
        numeric wood_density_override
        numeric latitude
        numeric longitude
        text observation_notes
        timestamp created_at
    }

    Prediction {
        uuid id PK
        uuid observation_id FK
        uuid species_model_id FK
        numeric estimated_biomass_kg
        numeric estimated_carbon_kg
        numeric estimated_co2e_kg
        varchar confidence_status
        numeric confidence_lower_bound_kg
        numeric confidence_upper_bound_kg
        boolean is_prototype
        timestamp created_at
    }

    PredictionEvidence {
        uuid id PK
        uuid prediction_id FK
        uuid reference_id FK
        varchar evidence_type
        jsonb provenance_details
        timestamp created_at
    }
```

## Indexes
- `idx_species_scientific_name` on `species(scientific_name)`
- `idx_species_common_name` on `species(common_name)`
- `idx_species_models_species_id` on `species_models(species_id)`
- `idx_tree_observations_species_id` on `tree_observations(species_id)`
- `idx_predictions_observation_id` on `predictions(observation_id)`
- `idx_predictions_created_at` on `predictions(created_at DESC)`
- `idx_prediction_evidences_prediction_id` on `prediction_evidences(prediction_id)`
