# GoNax REST API Specification

Base URL: `/api/v1`

## 1. Species Endpoints
- `GET /species`: Retrieve list of all supported species records with their active models, parameters, wood densities, and variables.
- `GET /species/:id`: Retrieve detailed scientific record for a single species, including datasets, model specifications, calibrated variable ranges, and scientific literature references.

## 2. Species Data & References
- `GET /species/:id/datasets`: Retrieve datasets associated with the species.
- `GET /species/:id/models`: Retrieve models available for the species.
- `GET /references`: List scientific literature and DOI references in the system.
- `GET /references/:id`: Retrieve details and citation for a specific scientific paper.

## 3. Tree Observations
- `POST /observations`: Submit a raw field measurement for a tree.
  - Body: `{ speciesId, dbhCm, heightM, crownDiameterM?, woodDensityOverride?, latitude?, longitude?, notes? }`
- `GET /observations/:id`: Retrieve a specific tree observation.

## 4. Prediction Pipeline
- `POST /predictions`: Execute deterministic biomass/carbon prediction for an observation.
  - Body: `{ observationId, modelId? }` (or direct observation payload: `{ speciesId, dbhCm, heightM, ... }`)
  - Response: Full prediction payload including `estimatedBiomassKg`, `estimatedCarbonKg`, `estimatedCo2eKg`, `confidenceStatus`, `confidenceBounds`, `provenance`, and `evidences`.
- `GET /predictions/:id`: Retrieve a past prediction with full provenance breakdown.
- `GET /predictions/history`: Retrieve paginated history of past calculations with filtering.

## 5. Explanation Layer (AI / LLM Interface)
- `POST /predictions/:id/explain`: Natural-language scientific query and reasoning over a deterministic prediction result.
  - Body: `{ question: string }`
  - Response: `{ answer: string, scientificContext: object, ruleEnforced: "DETERMINISTIC_SEPARATION" }`
