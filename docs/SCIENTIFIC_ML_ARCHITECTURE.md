# GoNax Scientific & Machine Learning Architecture

## 1. Core Paradigm: The Species-Centric Pipeline

```mermaid
graph TD
    Taxon[Tree Species Taxon] --> Data[Versioned Scientific Dataset]
    Data --> Train[Training & Evaluation Pipeline]
    Train --> Reg[Model Registry]
    
    FieldObs[Field Measurements] --> Router[Species-Model Router]
    Reg --> Router
    Router --> Val[Scientific Feature & Range Validation]
    Val --> Model[Model Interface (Formula / ML Adapter)]
    Model --> Pred[Deterministic Prediction]
    Model --> Uncert[Multi-Factor Uncertainty Engine]
    
    Pred --> Prov[Provenance Assembly]
    Uncert --> Prov
    Data --> Prov
    Reg --> Prov
    
    Prov --> LLM[LLM Scientific Explanation Layer]
    LLM --> Out[Auditable Scientific Result]
```

## 2. Component Structure

- **/data**:
  - `metadata/`: Versioned dataset manifests (units, methodology, geographic bounds, allowed variables).
  - `raw/`: Unaltered destructive harvest and forestry observations.
  - `clean/`: Validated, range-filtered, and cleaned observation records.
  - `features/`: Engineered features (stem volume proxies, log transforms, wood density interactions).
  - `splits/`: Immutable train (70%), validation (15%), test (15%) partitions.
  - `curated/`: Reference wood densities, published allometric parameters, and literature citations.

- **/models**:
  - `registry/`: Typed model registry holding model specifications, feature schemas, evaluation metrics (R², RMSE, MAE, RSE), and calibration boundaries.
  - `interfaces/`: Unified `ScientificModel` interface with `predict()`, `validateInput()`, `getMetadata()`, `getUncertainty()`, and `getProvenance()`.
  - `implementations/`: `PrototypeFormulaModel` and `MLModelAdapter`.

- **/ml**:
  - Reproducible data ingest, cleaning, feature engineering, training, and evaluation scripts producing serialized model artifacts and registration metadata.

- **Uncertainty Abstraction**:
  - 95% & 90% prediction intervals.
  - Model residual standard error (RSE).
  - Extrapolation warnings when DBH, height, or age fall outside the calibrated training envelope.
  - Geographic & climate domain mismatch detection.
  - Missing-variable penalty notifications.

- **LLM Explanation Provider Abstraction**:
  - `LLMProvider` interface with `GeminiProvider`, `OpenAIProvider`, and `MockProvider`.
  - Strictly forbidden from arithmetic calculation; receives full structured prediction and provenance as context.
