import React, { useEffect, useState } from 'react';

export const AboutPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    fetch('/api/v1/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'offline' }));
  }, []);

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-neutral">SYSTEM SPECIFICATION & METHODOLOGY</span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
          About GoNax & Scientific Methodology
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Species-Specific Carbon Intelligence Architecture & Scientific Integrity Standards.
        </p>
      </div>

      {/* Backend Health & Connectivity */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Backend REST API & Database Status
        </h2>
        <div className="grid-3" style={{ fontSize: '0.85rem' }}>
          <div className="metric-box">
            <div className="metric-title">API Status</div>
            <div style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: health?.status === 'healthy' ? 'var(--status-success)' : 'var(--status-error)',
              margin: '0.25rem 0',
              fontFamily: 'var(--font-mono)'
            }}>
              {health?.status === 'healthy' ? 'ONLINE' : 'OFFLINE'}
            </div>
            <div className="metric-note">
              v{health?.version || '1.0.0'}
            </div>
          </div>

          <div className="metric-box">
            <div className="metric-title">Persistence Driver</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
              Relational Storage
            </div>
            <div className="metric-note">
              PostgreSQL / Local Relational Store
            </div>
          </div>

          <div className="metric-box">
            <div className="metric-title">Explanation Layer</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)', margin: '0.25rem 0' }}>
              Deterministic + LLM
            </div>
            <div className="metric-note">
              Scientific Context Grounding
            </div>
          </div>
        </div>
      </div>

      {/* Architectural Guarantee */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Architectural Separation Guarantee
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
          GoNax strictly enforces that the Large Language Model (LLM) is <strong>never</strong> responsible for numerical carbon or biomass predictions.
        </p>
        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li>
            <strong>Deterministic Scientific Engine</strong>: Executes verified allometric equations ($M = a \cdot DBH^b \cdot H^c$), basic wood density lookups ($\rho$), and stoichiometry ($CO_2e = C \times 3.6667$).
          </li>
          <li>
            <strong>Immutable Provenance</strong>: Intermediate variables, parameters, and 95% confidence intervals are permanently logged with the prediction.
          </li>
          <li>
            <strong>Reasoning & Natural Language Interface</strong>: The LLM digests the structured prediction record and answers researcher queries regarding botanical context, carbon fractions, and uncertainty without recalculating or altering numbers.
          </li>
        </ul>
      </div>

      {/* How GoNax Works: 8-Stage Scientific Pipeline */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-neutral">SYSTEM TRANSPARENCY</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            How GoNax Works: The 8-Stage Scientific Pipeline
          </h2>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          GoNax turns individual tree field observations into rigorous carbon intelligence through an immutable 8-stage scientific progression:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            {
              num: 1,
              title: 'Measurement',
              desc: 'Field observation captures physical metrics: DBH at 1.30 m, total height H, crown diameter, and core wood density override.'
            },
            {
              num: 2,
              title: 'Species Identification',
              desc: 'Taxon resolution associates botanical family, xylem anatomy, mean reference wood density (ρ), and physiological traits.'
            },
            {
              num: 3,
              title: 'Species Dataset',
              desc: 'Links to versioned destructive harvest calibration records (data/raw → data/clean → data/splits), tracking sample size N and geographic scope.'
            },
            {
              num: 4,
              title: 'Species-Specific Model',
              desc: 'ModelRegistry dynamically routes the observation to the active calibrated model (power-law allometry or ML regressor) and validates feature schemas.'
            },
            {
              num: 5,
              title: 'Prediction Engine',
              desc: 'Executes deterministic mathematical equations to compute dry biomass (AGB), elemental carbon stock (C = AGB × CF), and stoichiometric CO₂e.'
            },
            {
              num: 6,
              title: 'Uncertainty Assessment',
              desc: 'Calculates log-normal 95% Prediction Intervals (PI), Model RSE%, and checks for DBH/Height extrapolation and geographic eco-region mismatch.'
            },
            {
              num: 7,
              title: 'Scientific Evidence',
              desc: 'Generates step-by-step mathematical provenance and links the prediction directly to peer-reviewed literature DOIs.'
            },
            {
              num: 8,
              title: 'LLM Explanation Layer',
              desc: 'AI explanation service consumes the structured prediction payload as read-only context to answer natural-language questions without recalculating numbers.'
            }
          ].map((stage, idx, arr) => (
            <div key={stage.num}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                background: 'var(--surface-inset)',
                padding: '0.85rem 1.15rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-default)'
              }}>
                <div style={{
                  background: 'var(--accent-primary-light)',
                  color: 'var(--accent-primary)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  width: '28px',
                  height: '28px',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {stage.num}
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.2rem 0' }}>
                    {stage.title}
                  </h4>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {stage.desc}
                  </p>
                </div>
              </div>
              {idx < arr.length - 1 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.15rem 0' }}>
                  ↓
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Prototype Scientific Disclosure */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="badge badge-prototype">DISCLOSURE</span>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Scientific Integrity Notice
          </h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          In accordance with GoNax scientific integrity guidelines, prototype models and demonstration data are explicitly labeled. GoNax never claims real-world carbon-credit certification or validated accuracy unless verified destructive harvest evaluation evidence exists. Taxa lacking calibration data are flagged as <strong>Insufficient Scientific Data</strong>.
        </p>
      </div>

      {/* Directory Layout Reference */}
      <div className="card">
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Codebase Structure
        </h2>
        <pre style={{
          background: 'var(--surface-inset)',
          padding: '1rem',
          borderRadius: 'var(--radius)',
          fontSize: '0.8rem',
          color: 'var(--text-primary)',
          overflowX: 'auto',
          border: '1px solid var(--border-default)',
          fontFamily: 'var(--font-mono)'
        }}>
{`/frontend     -> React + TypeScript + Scientific Editorial UI
/backend      -> Express + TypeScript + PostgreSQL Relational Engine
/data         -> Curated species parameters, wood densities, citations
/models       -> Allometric equations & ML model interfaces
/docs         -> Architecture, Database schema, API specification`}
        </pre>
      </div>
    </div>
  );
};
