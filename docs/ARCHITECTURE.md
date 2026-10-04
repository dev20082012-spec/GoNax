# GoNax — Species-Specific Carbon Intelligence
## Architecture & Engineering Specification (Prototype v1.0)

### 1. Vision & Core Principles
**GoNax** is a scientific AI system for estimating individual tree biomass, carbon stock, and $CO_2$ equivalent characteristics using species-specific scientific models and datasets.

#### Non-Negotiable Architectural Rule
> **Deterministic Scientific Calculation Core**: The numerical carbon, biomass, and uncertainty calculations are strictly executed by deterministic scientific algorithms (allometric equations, verified forestry datasets, or trained ML estimators).
> **LLM as Explanation & Reasoning Interface**: The Large Language Model (LLM) is strictly an explanation and reasoning interface wrapped around the structured scientific results. It does *not* invent or perform arithmetic calculations on biomass or carbon.

---

### 2. System Architecture & Component Separation

```mermaid
graph TD
    User[User / Field Researcher] -->|Select Species & Enter Metrics| UI[React + TS Scientific UI]
    UI -->|REST API Requests| API[Express + TypeScript REST API]
    
    subgraph Backend Layer
        API --> Val[Input Validation & Sanitization]
        Val --> Router[API Router / Controllers]
        Router --> SrvSpecies[Species Service]
        Router --> SrvPred[Prediction Service]
        Router --> SrvHist[History Service]
        Router --> SrvExpl[Explanation Service]
        
        SrvPred --> EngineMgr[Prediction Engine Manager]
        EngineMgr --> FormulaEngine[FormulaPredictionEngine<br/>(Allometric Forestry Models)]
        EngineMgr --> MLEngine[MLModelPredictionEngine<br/>(Trained Estimators / Stubs)]
        
        SrvExpl --> LLM[LLM Explanation Layer<br/>(Gemini / Contextual Reasoning)]
        
        SrvSpecies --> Repo[Relational Repositories]
        SrvPred --> Repo
        SrvHist --> Repo
    end
    
    subgraph Data & Persistence
        Repo --> DB[(PostgreSQL Database<br/>with SQLite Fallback)]
        FormulaEngine --> ScientificData[Scientific Formulas & Datasets<br/>/data & /models]
    end
```

---

### 3. Folder Structure

```
GoNax/
├── backend/
│   ├── src/
│   │   ├── config/            # Env configuration & runtime flags
│   │   ├── database/          # Database client, migrations, seeders
│   │   │   ├── migrations/    # DDL SQL migration scripts
│   │   │   └── seeds/         # Scientific species seed data
│   │   ├── domain/            # Core business models and types
│   │   │   ├── entities/      # Species, Observation, Prediction, Reference
│   │   │   └── engine/        # PredictionEngine interfaces & implementations
│   │   ├── repositories/      # Relational persistence access layer
│   │   ├── services/          # Business logic & prediction pipeline orchestration
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── routes/            # Express route definitions
│   │   ├── middlewares/       # Validation, Error Handling, Request Logging
│   │   └── server.ts          # Express application entrypoint
│   ├── tests/                 # Unit & integration tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/               # Typed REST API client
│   │   ├── components/        # Reusable scientific UI components
│   │   ├── pages/             # Landing, Dashboard, Species, Measurement, Result, History, Models, About
│   │   ├── types/             # Shared TypeScript types
│   │   ├── App.tsx            # Navigation & router state
│   │   ├── main.tsx           # React bootstrap
│   │   └── index.css          # Clean scientific styling (CSS tokens)
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── data/
│   ├── raw/                   # Raw scientific data sources
│   └── curated/               # Curated species parameters, wood densities, citations
├── models/
│   ├── formulas/              # Standard allometric equation metadata
│   └── ml_stubs/              # Machine learning model interfaces
└── docs/
    ├── ARCHITECTURE.md        # Architecture documentation
    ├── API_SPECIFICATION.md   # Complete REST endpoints documentation
    ├── SCIENTIFIC_METHODOLOGY.md # Allometric equations & scientific methodology
    └── DATABASE_SCHEMA.md     # Relational schema reference
```
