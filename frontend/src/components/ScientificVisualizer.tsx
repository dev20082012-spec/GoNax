import React from 'react';
import { EnrichedPrediction } from '../types';

interface Props {
  predictionData: EnrichedPrediction;
}

export const ScientificVisualizer: React.FC<Props> = ({ predictionData }) => {
  const { prediction, observation, species, model, evidences } = predictionData;
  const primaryEvidence = evidences[0]?.provenance_details;

  const biomassKg = prediction.estimated_biomass_kg;
  const carbonKg = prediction.estimated_carbon_kg;
  const co2eKg = prediction.estimated_co2e_kg;
  const lowerBound = prediction.confidence_lower_bound_kg;
  const upperBound = prediction.confidence_upper_bound_kg;
  const carbonFraction = model.carbon_fraction || 0.485;

  // Calculate percentage range for visualization
  // Max scale includes upper bound + 15% margin
  const maxScale = Math.max(upperBound * 1.15, biomassKg * 1.3, 100);
  const lowerPct = Math.max(0, Math.min(100, (lowerBound / maxScale) * 100));
  const estPct = Math.max(0, Math.min(100, (biomassKg / maxScale) * 100));
  const upperPct = Math.max(0, Math.min(100, (upperBound / maxScale) * 100));
  const intervalWidthPct = Math.max(2, upperPct - lowerPct);

  // DBH vs Height scaling contribution approximation from model power parameters
  const dbh = observation.dbh_cm;
  const height = observation.height_m;
  const bParam = model.parameters?.b ?? 2.0;
  const cParam = model.parameters?.c ?? 0.9;

  // Log-proportional contribution: b*ln(DBH) vs c*ln(H)
  const logDbhContribution = bParam * Math.log(Math.max(1, dbh));
  const logHeightContribution = cParam * Math.log(Math.max(1, height));
  const totalLog = logDbhContribution + logHeightContribution;
  const dbhContributionPct = totalLog > 0 ? Math.round((logDbhContribution / totalLog) * 100) : 70;
  const heightContributionPct = 100 - dbhContributionPct;

  return (
    <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--surface-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Scientific Metrics & Empirical Distributions</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Empirical visualizations derived deterministically from observation inputs and allometric calibration parameters.
          </p>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          Model: {model.name} (v{model.version})
        </div>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Chart 1: 95% Log-Normal Prediction Interval */}
        <div style={{ background: 'var(--surface-inset)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              95% Prediction Interval Range
            </span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
              RSE: ±{model.uncertainty_percentage}%
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Log-normal residual variance around point estimate ({biomassKg.toLocaleString()} kg).
          </div>

          {/* SVG Range Chart */}
          <div style={{ position: 'relative', width: '100%', height: '54px', marginBottom: '0.75rem' }}>
            <svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
              {/* Baseline background track */}
              <line x1="0" y1="12" x2="100" y2="12" stroke="var(--border-default)" strokeWidth="3" strokeLinecap="round" />
              
              {/* 95% CI Interval Span */}
              <line
                x1={lowerPct}
                y1="12"
                x2={upperPct}
                y2="12"
                stroke="var(--accent-primary)"
                strokeWidth="6"
                strokeOpacity="0.25"
                strokeLinecap="round"
              />

              {/* Lower boundary tick */}
              <line x1={lowerPct} y1="6" x2={lowerPct} y2="18" stroke="var(--accent-primary)" strokeWidth="1.5" />

              {/* Upper boundary tick */}
              <line x1={upperPct} y1="6" x2={upperPct} y2="18" stroke="var(--accent-primary)" strokeWidth="1.5" />

              {/* Central estimate marker */}
              <circle cx={estPct} cy="12" r="3.5" fill="var(--accent-primary)" stroke="var(--surface-card)" strokeWidth="1" />
            </svg>
          </div>

          {/* Legend Values */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem' }}>95% Lower</span>
              <strong style={{ color: 'var(--text-primary)' }}>{lowerBound.toLocaleString()} kg</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: 'var(--accent-primary)', display: 'block', fontSize: '0.65rem', fontWeight: 700 }}>Point Estimate</span>
              <strong style={{ color: 'var(--accent-primary)', fontSize: '0.85rem' }}>{biomassKg.toLocaleString()} kg</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem' }}>95% Upper</span>
              <strong style={{ color: 'var(--text-primary)' }}>{upperBound.toLocaleString()} kg</strong>
            </div>
          </div>
        </div>

        {/* Chart 2: Biomass-to-Carbon Stoichiometric Partitioning */}
        <div style={{ background: 'var(--surface-inset)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              Biomass → Carbon Partitioning
            </span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              Fraction: {(carbonFraction * 100).toFixed(1)}% C
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Allocation of total dry matter to elemental carbon and equivalent atmospheric flux.
          </div>

          {/* Stacked Proportional Bar */}
          <div style={{
            height: '24px',
            width: '100%',
            background: 'var(--surface-card)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-default)',
            overflow: 'hidden',
            display: 'flex',
            marginBottom: '0.85rem'
          }}>
            <div
              style={{
                width: `${(carbonFraction * 100).toFixed(1)}%`,
                background: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700
              }}
              title={`Elemental Carbon: ${carbonKg.toLocaleString()} kg (${(carbonFraction * 100).toFixed(1)}%)`}
            >
              Carbon {(carbonFraction * 100).toFixed(0)}%
            </div>
            <div
              style={{
                width: `${((1 - carbonFraction) * 100).toFixed(1)}%`,
                background: 'var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)'
              }}
              title={`Non-Carbon Dry Mass (Oxygen, Hydrogen, Nitrogen, Ash): ${(biomassKg - carbonKg).toLocaleString()} kg`}
            >
              Other {((1 - carbonFraction) * 100).toFixed(0)}%
            </div>
          </div>

          {/* Multiplier Note */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Atmospheric Equivalent:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>
              {co2eKg.toLocaleString()} kg CO₂e <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(×3.664)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Relative Variable Sensitivity Row */}
      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
            Allometric Variable Elasticity (Non-Linear Scaling Influence)
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Power-law scaling: DBH ({bParam.toFixed(2)}) vs Height ({cParam.toFixed(2)})
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Stem Diameter (DBH = {dbh} cm)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>~{dbhContributionPct}% elasticity</span>
            </div>
            <div style={{ height: '8px', background: 'var(--surface-inset)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${dbhContributionPct}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '4px' }} />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Tree Height (H = {height} m)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>~{heightContributionPct}% elasticity</span>
            </div>
            <div style={{ height: '8px', background: 'var(--surface-inset)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${heightContributionPct}%`, height: '100%', background: 'var(--accent-secondary)', borderRadius: '4px' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
