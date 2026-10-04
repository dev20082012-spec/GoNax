-- Migration 001: Initial GoNax Relational Schema
-- Supports PostgreSQL standard DDL

CREATE TABLE IF NOT EXISTS species (
    id VARCHAR(36) PRIMARY KEY,
    scientific_name VARCHAR(255) NOT NULL UNIQUE,
    common_name VARCHAR(255) NOT NULL,
    family VARCHAR(255) NOT NULL,
    wood_density_mean NUMERIC(6, 4) NOT NULL,
    wood_density_sd NUMERIC(6, 4) NOT NULL,
    applicable_variables TEXT NOT NULL, -- JSON array of valid variables
    geographic_applicability TEXT NOT NULL, -- JSON array or comma separated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_species_scientific_name ON species(scientific_name);
CREATE INDEX IF NOT EXISTS idx_species_common_name ON species(common_name);

CREATE TABLE IF NOT EXISTS scientific_references (
    id VARCHAR(36) PRIMARY KEY,
    doi VARCHAR(255) NOT NULL UNIQUE,
    citation_text TEXT NOT NULL,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    year INTEGER NOT NULL,
    journal VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scientific_references_doi ON scientific_references(doi);

CREATE TABLE IF NOT EXISTS species_datasets (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    sample_size INTEGER NOT NULL,
    geographic_coverage TEXT NOT NULL,
    reference_id VARCHAR(36) REFERENCES scientific_references(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dataset_versions (
    id VARCHAR(36) PRIMARY KEY,
    dataset_id VARCHAR(36) NOT NULL REFERENCES species_datasets(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    sample_count INTEGER NOT NULL,
    geographic_scope TEXT NOT NULL,
    features_json TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    metadata_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dataset_versions_dataset_id ON dataset_versions(dataset_id);

CREATE TABLE IF NOT EXISTS species_models (
    id VARCHAR(36) PRIMARY KEY,
    species_id VARCHAR(36) NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    dataset_id VARCHAR(36) NOT NULL REFERENCES species_datasets(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    model_type VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    formula_expression TEXT NOT NULL,
    parameters TEXT NOT NULL, -- JSON formatted parameters and bounds
    carbon_fraction NUMERIC(6, 4) NOT NULL,
    uncertainty_percentage NUMERIC(5, 2) NOT NULL,
    is_prototype BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_species_models_species_id ON species_models(species_id);

CREATE TABLE IF NOT EXISTS model_versions (
    id VARCHAR(36) PRIMARY KEY,
    model_id VARCHAR(36) NOT NULL REFERENCES species_models(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    formula_expression TEXT NOT NULL,
    parameters_json TEXT NOT NULL,
    evaluation_metrics_json TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_prototype BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_versions_model_id ON model_versions(model_id);

CREATE TABLE IF NOT EXISTS tree_observations (
    id VARCHAR(36) PRIMARY KEY,
    species_id VARCHAR(36) NOT NULL REFERENCES species(id) ON DELETE RESTRICT,
    dbh_cm NUMERIC(8, 2) NOT NULL,
    height_m NUMERIC(8, 2) NOT NULL,
    crown_diameter_m NUMERIC(8, 2),
    wood_density_override NUMERIC(6, 4),
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    observation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tree_observations_species_id ON tree_observations(species_id);

CREATE TABLE IF NOT EXISTS predictions (
    id VARCHAR(36) PRIMARY KEY,
    observation_id VARCHAR(36) NOT NULL REFERENCES tree_observations(id) ON DELETE CASCADE,
    species_model_id VARCHAR(36) NOT NULL REFERENCES species_models(id) ON DELETE RESTRICT,
    estimated_biomass_kg NUMERIC(12, 3) NOT NULL,
    estimated_carbon_kg NUMERIC(12, 3) NOT NULL,
    estimated_co2e_kg NUMERIC(12, 3) NOT NULL,
    confidence_status VARCHAR(50) NOT NULL,
    confidence_lower_bound_kg NUMERIC(12, 3) NOT NULL,
    confidence_upper_bound_kg NUMERIC(12, 3) NOT NULL,
    is_prototype BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_predictions_observation_id ON predictions(observation_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);

CREATE TABLE IF NOT EXISTS prediction_uncertainties (
    id VARCHAR(36) PRIMARY KEY,
    prediction_id VARCHAR(36) NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    confidence_tier VARCHAR(50) NOT NULL,
    model_uncertainty_rse NUMERIC(6, 2) NOT NULL,
    prediction_interval_95_lower NUMERIC(12, 3) NOT NULL,
    prediction_interval_95_upper NUMERIC(12, 3) NOT NULL,
    prediction_interval_90_lower NUMERIC(12, 3) NOT NULL,
    prediction_interval_90_upper NUMERIC(12, 3) NOT NULL,
    extrapolation_warnings TEXT, -- JSON array
    geographic_mismatch TEXT, -- JSON object
    missing_variable_warnings TEXT, -- JSON array
    dataset_limitations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prediction_uncertainties_prediction_id ON prediction_uncertainties(prediction_id);

CREATE TABLE IF NOT EXISTS prediction_evidences (
    id VARCHAR(36) PRIMARY KEY,
    prediction_id VARCHAR(36) NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    reference_id VARCHAR(36) NOT NULL REFERENCES scientific_references(id) ON DELETE RESTRICT,
    evidence_type VARCHAR(100) NOT NULL,
    provenance_details TEXT NOT NULL, -- JSON detailed provenance and calculation steps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prediction_evidences_prediction_id ON prediction_evidences(prediction_id);

CREATE TABLE IF NOT EXISTS prediction_explanations (
    id VARCHAR(36) PRIMARY KEY,
    prediction_id VARCHAR(36) NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prediction_explanations_prediction_id ON prediction_explanations(prediction_id);

