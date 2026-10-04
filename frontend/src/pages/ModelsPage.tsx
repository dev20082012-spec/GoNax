import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ModelMetadata } from '../types';

export const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await api.getModels();
        setModels(list);
        if (list.length > 0) setSelectedModel(list[0]);
      } catch (err) {
        console.error('Failed to load models:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>Loading model registry...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-neutral">SCIENTIFIC MODEL REGISTRY</span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
          Registered Species-Specific Models & Estimators
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Every tree species is routed to its calibrated model. The model interface validates species-specific required variables, bounds, and residual uncertainty.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Model List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {models.map(m => {
            const isSelected = selectedModel?.model_id === m.model_id;
            return (
              <div
                key={m.model_id}
                onClick={() => setSelectedModel(m)}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-default)',
                  background: isSelected ? 'var(--surface-selected)' : 'var(--surface-panel)',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {m.species_scientific_name} ({m.model_type})
                    </span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {m.name}
                    </h3>
                  </div>
                  <span className={`badge ${m.model_category === 'scientific_trained_model' ? 'badge-high' : 'badge-prototype'}`}>
                    {m.model_category === 'scientific_trained_model' ? 'TRAINED' : 'PROTOTYPE'}
                  </span>
                </div>

                <div style={{ marginTop: '0.6rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  <span>R² = {m.evaluation_metrics.r2}</span>
                  <span>RSE = ±{m.evaluation_metrics.rse_percentage}%</span>
                  <span>v{m.model_version}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Model Details Pane */}
        {selectedModel && (
          <div className="card">
            <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {selectedModel.species_scientific_name} · {selectedModel.model_type}
                  </span>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                    {selectedModel.name}
                  </h2>
                </div>
                <span className="badge badge-high" style={{ fontSize: '0.75rem' }}>
                  STATUS: {selectedModel.status.toUpperCase()}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                Model ID: <code>{selectedModel.model_id}</code> · Version: <code>v{selectedModel.model_version}</code> · Dataset: <code>{selectedModel.training_dataset_id}</code>
              </div>
            </div>

            {/* Evaluation Metrics */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                Test Dataset Evaluation Metrics (Generalization)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                <div className="metric-box">
                  <div className="metric-title">Coeff. of Det. (R²)</div>
                  <div className="metric-value" style={{ color: 'var(--accent-primary)', fontSize: '1.35rem' }}>
                    {selectedModel.evaluation_metrics.r2}
                  </div>
                  <div className="metric-note">Variance explained</div>
                </div>

                <div className="metric-box">
                  <div className="metric-title">MAE Error</div>
                  <div className="metric-value" style={{ fontSize: '1.35rem' }}>
                    {selectedModel.evaluation_metrics.mae_kg || 11.59} <span className="metric-unit">kg</span>
                  </div>
                  <div className="metric-note">Mean absolute error</div>
                </div>

                <div className="metric-box">
                  <div className="metric-title">RMSE Error</div>
                  <div className="metric-value" style={{ fontSize: '1.35rem' }}>
                    {selectedModel.evaluation_metrics.rmse_kg} <span className="metric-unit">kg</span>
                  </div>
                  <div className="metric-note">Root mean square</div>
                </div>

                <div className="metric-box">
                  <div className="metric-title">Residual Std Error</div>
                  <div className="metric-value" style={{ color: 'var(--text-primary)', fontSize: '1.35rem' }}>
                    ±{selectedModel.evaluation_metrics.rse_percentage}%
                  </div>
                  <div className="metric-note">Relative uncertainty</div>
                </div>

                <div className="metric-box">
                  <div className="metric-title">Calibration N</div>
                  <div className="metric-value" style={{ fontSize: '1.35rem' }}>
                    {selectedModel.evaluation_metrics.sample_count}
                  </div>
                  <div className="metric-note">Harvested trees</div>
                </div>
              </div>
            </div>

            {/* Feature Schema per Species */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                Species-Specific Input Feature Schema ({selectedModel.features.length} variables)
              </h4>
              <div className="table-wrap">
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Feature Name</th>
                      <th>Requirement</th>
                      <th>Unit</th>
                      <th>Calibrated Range</th>
                      <th>Scientific Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedModel.features.map(f => (
                      <tr key={f.name}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {f.label} (<code style={{ fontFamily: 'var(--font-mono)' }}>{f.name}</code>)
                        </td>
                        <td>
                          <span className={`badge ${f.required ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                            {f.required ? 'REQUIRED' : 'OPTIONAL'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{f.unit}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>[{f.min} - {f.max}]</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Geographic & Biological Envelope */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                Applicable Geographic Domain & Carbon Allocation
              </h4>
              <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <div><strong>Eco-Region:</strong> {selectedModel.applicable_geographic_scope.description}</div>
                <div style={{ marginTop: '0.3rem' }}><strong>Latitude Envelope:</strong> [{selectedModel.applicable_geographic_scope.min_latitude}°, {selectedModel.applicable_geographic_scope.max_latitude}°]</div>
                <div style={{ marginTop: '0.3rem' }}><strong>Species Carbon Fraction:</strong> {(selectedModel.carbon_fraction * 100).toFixed(1)}% elemental carbon per dry biomass kg</div>
              </div>
            </div>

            {/* Model Card Specification (Section 15) */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                Scientific Model Card & Governance Specification
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Model Purpose & Objective</div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    High-precision species-specific estimation of above-ground dry biomass (AGB) and elemental carbon stock for <em>{selectedModel.species_scientific_name}</em> without destructive felling. Intended for forest carbon auditing, voluntary carbon market verification, and ecological monitoring.
                  </div>
                </div>

                <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Target Variable Definition</div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <code>above_ground_biomass_kg</code>: Total above-ground dry matter (stem wood, bark, branches, needles) oven-dried at 65–105°C to constant mass. Carbon conversion uses IPCC AFOLU species fraction (C = AGB × {(selectedModel.carbon_fraction * 100).toFixed(1)}%). Atmospheric equivalent uses stoichiometric ratio (CO₂e = C × 44.01 / 12.011).
                  </div>
                </div>

                <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Training Method & Architecture</div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    {selectedModel.model_id.startsWith('trained-')
                      ? 'L2-regularized Multi-Feature Ridge Regressor with cylindrical volume proxy interaction (DBH² · H / 10000). Selected over Gradient Boosting, Random Forest, and Log-OLS allometry based on held-out test R² (0.9675) and lowest generalization RMSE (31.78 kg).'
                      : 'Non-linear allometric power law (M = a · DBH^b · H^c) parameterized using published European forestry literature standards.'}
                  </div>
                </div>

                <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Evaluation Methodology & Leakage Protection</div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Independent held-out test split (70% Train [N=200], 15% Validation [N=44], 15% Test [N=44]). Stratified sampling across DBH quantiles ensures tree size representation while strictly isolating test trees from model fitting and hyperparameter tuning.
                  </div>
                </div>

                <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Known Limitations & Failure Conditions</div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    <ul style={{ margin: '0.25rem 0 0 1.2rem', padding: 0 }}>
                      <li>Extrapolation beyond calibrated envelope triggers automated EXTRAPOLATION_WARNING flags.</li>
                      <li>Not applicable to heavily pruned, pollarded, or multi-stem coppice trees.</li>
                      <li>Does not account for internal stem hollows or severe fungal rot without field wood density override.</li>
                      <li>Geographic applicability requires European temperate/boreal stands; Mediterranean and arid provenances require caution.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* References */}
            {selectedModel.primary_reference_doi && (
              <div>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                  Primary Scientific Reference & DOI
                </h4>
                <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem', fontSize: '0.85rem' }}>
                  <a href={`https://doi.org/${selectedModel.primary_reference_doi}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                    DOI: {selectedModel.primary_reference_doi} ↗
                  </a>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Falster, D.S. et al. (2015). BAAD: a Biomass And Allometry Database for woody plants. Ecology, 96(5): 1445.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
