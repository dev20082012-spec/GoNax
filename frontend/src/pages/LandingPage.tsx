import React from 'react';
import { PageView } from '../components/Navbar';

interface Props {
  setCurrentPage: (page: PageView) => void;
  onSelectSpeciesToMeasure?: (speciesId: string) => void;
}

export const LandingPage: React.FC<Props> = ({ setCurrentPage }) => {
  return (
    <div>
      {/* Hero Section */}
      <section style={{
        padding: '2.5rem 0 3rem 0',
        borderBottom: '1px solid var(--border-default)',
        marginBottom: '2.5rem'
      }}>
        <div style={{ maxWidth: '860px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span className="badge badge-high">SCIENTIFIC ALLOMETRY ENGINE</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              DETERMINISTIC CARBON INTELLIGENCE
            </span>
          </div>

          <h1 style={{
            fontSize: '2.75rem',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            marginBottom: '1.25rem'
          }}>
            Species-Specific Carbon Intelligence for Individual Trees.
          </h1>

          <p style={{
            fontSize: '1.15rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '2rem'
          }}>
            GoNax replaces crude generic biomass approximations with deterministic, peer-reviewed species-specific allometric models. Backed by mathematical provenance, empirical wood density metrics, uncertainty propagation, and a grounded scientific explanation layer.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.95rem' }}
              onClick={() => setCurrentPage('measure')}
            >
              <span>+ Record Tree Observation</span>
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.95rem' }}
              onClick={() => setCurrentPage('species')}
            >
              Browse Species Catalog
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.95rem' }}
              onClick={() => setCurrentPage('dashboard')}
            >
              Open Workspace
            </button>
          </div>
        </div>
      </section>

      {/* Non-Negotiable Architecture Principle Callout */}
      <section style={{
        backgroundColor: 'var(--surface-panel)',
        border: '1px solid var(--border-default)',
        borderLeft: '4px solid var(--accent-primary)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        marginBottom: '2.5rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>CORE ARCHITECTURAL AXIOM</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Deterministic Calculation vs. Generative Reasoning
            </h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>GoNax never lets an LLM invent or calculate carbon metrics.</strong> All biomass, elemental carbon, and CO₂e conversions are executed strictly by deterministic, peer-reviewed scientific allometric equations or trained empirical regressors. The LLM serves solely as an interactive reasoning and explanation layer wrapped around the verified mathematical calculation.
          </p>
        </div>
      </section>

      {/* 3 Pillars Grid */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          Scientific Pipeline Pillars
        </h2>

        <div className="grid-3">
          <div className="card card-hover">
            <span className="badge badge-neutral" style={{ marginBottom: '0.75rem' }}>PILLAR 01</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Species-Specific Allometry
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Different tree species have fundamentally distinct wood densities, branching morphologies, and stem taper ratios. GoNax models each species independently using empirical forestry datasets.
            </p>
          </div>

          <div className="card card-hover">
            <span className="badge badge-neutral" style={{ marginBottom: '0.75rem' }}>PILLAR 02</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Deterministic Provenance
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Every calculation logs the exact formula, applied scaling coefficients, wood density reference values, and step-by-step arithmetic substitutions with 95% confidence intervals.
            </p>
          </div>

          <div className="card card-hover">
            <span className="badge badge-neutral" style={{ marginBottom: '0.75rem' }}>PILLAR 03</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Scientific Explanation Layer
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Ask questions in natural language. The explanation layer contextualizes carbon fractions, ecological trade-offs, and empirical citations without altering calculated values.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Interactive Workflow Preview */}
      <section className="card" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Deterministic Calculation Lifecycle
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          backgroundColor: 'var(--surface-inset)',
          padding: '1.25rem',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-default)',
          fontSize: '0.85rem'
        }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>STEP 01</div>
            <strong style={{ color: 'var(--text-primary)', display: 'block', margin: '0.2rem 0' }}>Species Selection</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>e.g. Quercus robur</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>STEP 02</div>
            <strong style={{ color: 'var(--text-primary)', display: 'block', margin: '0.2rem 0' }}>Field Metrics</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>DBH (cm), Height (m)</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>STEP 03</div>
            <strong style={{ color: 'var(--text-primary)', display: 'block', margin: '0.2rem 0' }}>Deterministic Formula</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>AGB = a · DBHᵇ · Hᶜ</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>STEP 04</div>
            <strong style={{ color: 'var(--text-primary)', display: 'block', margin: '0.2rem 0' }}>Carbon & CO₂e Output</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>C Stock + Provenance</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>STEP 05</div>
            <strong style={{ color: 'var(--text-primary)', display: 'block', margin: '0.2rem 0' }}>Scientific Q&A</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Interpretive Reasoning</div>
          </div>
        </div>
      </section>
    </div>
  );
};
