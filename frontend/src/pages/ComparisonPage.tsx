import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { EnrichedPrediction } from '../types';
import { ScientificBadge } from '../components/ScientificBadge';

interface Props {
  selectedPredictionIds: string[];
  onRemoveFromComparison: (id: string) => void;
  onClearComparison: () => void;
  onViewPrediction: (id: string) => void;
  onNewMeasurement: () => void;
}

export const ComparisonPage: React.FC<Props> = ({
  selectedPredictionIds,
  onRemoveFromComparison,
  onClearComparison,
  onViewPrediction,
  onNewMeasurement
}) => {
  const [predictions, setPredictions] = useState<EnrichedPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [allHistory, setAllHistory] = useState<EnrichedPrediction[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const history = await api.getPredictionHistory(100);
        setAllHistory(history);

        if (selectedPredictionIds.length > 0) {
          const matched = history.filter(h => selectedPredictionIds.includes(h.prediction.id));
          setPredictions(matched);
        } else if (history.length >= 2) {
          // Default to the two most recent predictions if none explicitly selected
          setPredictions([history[0], history[1]]);
        } else if (history.length === 1) {
          setPredictions([history[0]]);
        }
      } catch (err) {
        console.error('Failed to load comparison predictions:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedPredictionIds]);

  const handleAddPredictionToCompare = (id: string) => {
    const found = allHistory.find(h => h.prediction.id === id);
    if (found && !predictions.some(p => p.prediction.id === id)) {
      setPredictions(prev => [...prev, found]);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>Loading scientific comparison matrix...</div>;
  }

  if (predictions.length === 0) {
    return (
      <div className="card" style={{ maxWidth: '640px', margin: '3rem auto', textAlign: 'center' }}>
        <span className="badge badge-neutral">COMPARATIVE ANALYSIS</span>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
          No Predictions Selected for Comparison
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Select two or more tree observations from your history or run new measurements to perform an empirical species-to-species comparison.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button className="btn-primary" onClick={onNewMeasurement}>
            + Measure a Tree
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span className="badge badge-neutral">SCIENTIFIC CROSS-TAXON COMPARISON</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
            Empirical Tree Prediction Comparison
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Side-by-side evaluation of species-specific allometries, basic wood densities, carbon fractions, and 95% prediction intervals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {allHistory.length > predictions.length && (
            <select
              className="form-select"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', maxWidth: '240px' }}
              onChange={e => {
                if (e.target.value) handleAddPredictionToCompare(e.target.value);
              }}
              value=""
            >
              <option value="">+ Add Another from History...</option>
              {allHistory
                .filter(h => !predictions.some(p => p.prediction.id === h.prediction.id))
                .map(h => (
                  <option key={h.prediction.id} value={h.prediction.id}>
                    {h.species.scientific_name} ({h.observation.dbh_cm}cm / {h.observation.height_m}m) — {new Date(h.prediction.created_at).toLocaleDateString()}
                  </option>
                ))}
            </select>
          )}

          <button
            className="btn-secondary btn-sm"
            onClick={onClearComparison}
          >
            Clear Matrix
          </button>
          <button className="btn-primary btn-sm" onClick={onNewMeasurement}>
            + New Measurement
          </button>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="table-wrap" style={{ marginBottom: '2rem' }}>
        <table className="data-table" style={{ minWidth: `${predictions.length * 280 + 200}px` }}>
          <thead>
            <tr>
              <th style={{ width: '220px', background: 'var(--surface-inset)' }}>Scientific Parameter</th>
              {predictions.map(p => (
                <th key={p.prediction.id} style={{ minWidth: '280px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{p.species.family}</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{p.species.scientific_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.species.common_name}</div>
                    </div>
                    {predictions.length > 1 && (
                      <button
                        onClick={() => onRemoveFromComparison(p.prediction.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem', lineHeight: 1 }}
                        title="Remove from comparison"
                        aria-label="Remove from comparison"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Section 1: Measurable Physical Inputs */}
            <tr>
              <td colSpan={predictions.length + 1} style={{ background: 'var(--surface-inset)', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                1. Measured Physical Dimensions
              </td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Diameter at Breast Height (DBH)</td>
              {predictions.map(p => (
                <td key={p.prediction.id} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {p.observation.dbh_cm} cm
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Total Tree Height (H)</td>
              {predictions.map(p => (
                <td key={p.prediction.id} style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {p.observation.height_m} m
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Crown Diameter</td>
              {predictions.map(p => (
                <td key={p.prediction.id} style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {p.observation.crown_diameter_m ? `${p.observation.crown_diameter_m} m` : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Applied Basic Wood Density (ρ)</td>
              {predictions.map(p => (
                <td key={p.prediction.id} style={{ fontFamily: 'var(--font-mono)' }}>
                  <strong style={{ color: 'var(--accent-primary)' }}>
                    {p.observation.wood_density_override || p.species.wood_density_mean} g/cm³
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                    (Ref: {p.species.wood_density_mean} ±{p.species.wood_density_sd})
                  </span>
                </td>
              ))}
            </tr>

            {/* Section 2: Carbon Intelligence Results */}
            <tr>
              <td colSpan={predictions.length + 1} style={{ background: 'var(--surface-inset)', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                2. Carbon Intelligence Estimates
              </td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Above-Ground Dry Biomass (AGB)</td>
              {predictions.map(p => (
                <td key={p.prediction.id}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {p.prediction.estimated_biomass_kg.toLocaleString()} kg
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ≈ {(p.prediction.estimated_biomass_kg / 1000).toFixed(3)} tonnes
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Elemental Carbon Stock (C)</td>
              {predictions.map(p => (
                <td key={p.prediction.id}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {p.prediction.estimated_carbon_kg.toLocaleString()} kg C
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    CF = {(p.model.carbon_fraction * 100).toFixed(1)}% of dry biomass
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Atmospheric Equivalent (CO₂e)</td>
              {predictions.map(p => (
                <td key={p.prediction.id}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {p.prediction.estimated_co2e_kg.toLocaleString()} kg CO₂e
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Ratio: 44.01 / 12.011
                  </div>
                </td>
              ))}
            </tr>

            {/* Section 3: Uncertainty & Calibration Envelope */}
            <tr>
              <td colSpan={predictions.length + 1} style={{ background: 'var(--surface-inset)', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                3. Uncertainty & Statistical Bounds
              </td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>95% Prediction Interval (PI)</td>
              {predictions.map(p => (
                <td key={p.prediction.id} style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  [{p.prediction.confidence_lower_bound_kg.toLocaleString()} – {p.prediction.confidence_upper_bound_kg.toLocaleString()}] kg
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Model Residual Error (RSE)</td>
              {predictions.map(p => (
                <td key={p.prediction.id} style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  ±{p.model.uncertainty_percentage}%
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Confidence Classification</td>
              {predictions.map(p => (
                <td key={p.prediction.id}>
                  <ScientificBadge status={p.prediction.confidence_status} isPrototype={p.prediction.is_prototype} />
                </td>
              ))}
            </tr>

            {/* Section 4: Model & Dataset Provenance */}
            <tr>
              <td colSpan={predictions.length + 1} style={{ background: 'var(--surface-inset)', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                4. Model & Dataset Provenance
              </td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Model Name & Version</td>
              {predictions.map(p => (
                <td key={p.prediction.id} style={{ fontSize: '0.85rem' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.model.name}</div>
                  <div style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    v{p.model.version} ({p.model.model_type})
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Calibrated Empirical Range</td>
              {predictions.map(p => (
                <td key={p.prediction.id} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div>DBH: [{p.model.parameters.dbhMinCm} – {p.model.parameters.dbhMaxCm}] cm</div>
                  <div>H: [{p.model.parameters.heightMinM} – {p.model.parameters.heightMaxM}] m</div>
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Geographic Scope</td>
              {predictions.map(p => (
                <td key={p.prediction.id} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {(p.species as any).geographic_applicability
                    ? (p.species as any).geographic_applicability.join(', ')
                    : 'Temperate European Forestry Plots'}
                </td>
              ))}
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Full Provenance Inspection</td>
              {predictions.map(p => (
                <td key={p.prediction.id}>
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => onViewPrediction(p.prediction.id)}
                  >
                    Open Full Result →
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Scientific Comparison Analysis Card */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Objective Allometric Analysis & Scientific Notes
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          Differences between compared specimens arise from fundamental taxonomic variations in <strong>xylem density</strong> (basic wood density $\rho$), <strong>branching geometry</strong>, and <strong>stem taper allometric exponents</strong> ($a, b, c$).
        </p>
        <div style={{
          background: 'var(--surface-inset)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius)',
          padding: '0.85rem 1rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5
        }}>
          <strong>Scientific Principle:</strong> GoNax strictly prevents generalized or unsupported ecological or conservation claims. Comparison metrics present direct empirical calculations from respective species-calibrated models without speculative extrapolation.
        </div>
      </div>
    </div>
  );
};
