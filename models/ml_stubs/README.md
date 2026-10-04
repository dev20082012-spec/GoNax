# Machine Learning Models in GoNax

GoNax features an isolated `PredictionEngine` interface:

```typescript
export interface PredictionEngine {
  engineId: string;
  engineName: string;
  engineType: 'formula' | 'ml_model';
  predict(input: PredictionEngineInput): Promise<PredictionEngineOutput>;
}
```

## Engines Implemented in Prototype:
1. `FormulaPredictionEngine`:
   - Evaluates validated allometric equations derived from peer-reviewed forestry literature (e.g. Zianis 2005, Chave 2014, Jenkins 2003).
   - Generates step-by-step mathematical provenance.
   - Calculates scientific uncertainty intervals based on empirical residual standard error.

2. `MLModelPredictionEngine`:
   - Provides the architecture for tree-level biomass regressions (e.g. XGBoost, Random Forest, or Neural Estimators trained on terrestrial LiDAR or destructive harvesting datasets).
   - Implements model validation boundaries, feature normalization, and out-of-distribution flags.
   - Strictly isolated from LLM reasoning.
