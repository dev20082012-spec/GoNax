import React from 'react';
import { PageView } from '../components/Navbar';

interface Props {
  setCurrentPage: (page: PageView) => void;
  onSelectSpeciesToMeasure?: (speciesId: string) => void;
  onOpenWalkthrough?: () => void;
  onOpenGlossary?: () => void;
}

export const LandingPage: React.FC<Props> = ({
  setCurrentPage,
  onOpenWalkthrough,
  onOpenGlossary
}) => {
  return (
    <div>
      {/* First-Use Onboarding Hero Banner */}
      <section
        style={{
          padding: '2.5rem 0 3rem 0',
          borderBottom: '1px solid var(--border-default)',
          marginBottom: '2.5rem'
        }}
      >
        <div style={{ maxWidth: '880px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span className="badge badge-high">SCIENTIFIC ALLOMETRY ENGINE</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              DETERMINISTIC CARBON INTELLIGENCE
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
              WCAG 2.2 AA ACCESSIBLE
            </span>
          </div>

          <h1
            style={{
              fontSize: '2.65rem',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              marginBottom: '1.25rem'
            }}
          >
            Species-Specific Carbon Intelligence for Individual Trees.
          </h1>

          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '2rem'
            }}
          >
            GoNax replaces crude universal approximations with deterministic, peer-reviewed species-specific allometric models. Backed by mathematical provenance, empirical wood density metrics, 95% log-normal prediction intervals, and an isolated scientific reasoning layer.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ padding: '0.65rem 1.4rem', fontSize: '0.95rem' }}
              onClick={() => setCurrentPage('measure')}
            >
              + Record Tree Observation
            </button>

            {onOpenWalkthrough && (
              <button
                className="btn-secondary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.95rem' }}
                onClick={onOpenWalkthrough}
              >
                Guided First-Use Walkthrough
              </button>
            )}

            <button
              className="btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.95rem' }}
              onClick={() => setCurrentPage('species')}
            >
              Browse Species Catalog
            </button>

            {onOpenGlossary && (
              <button
                className="btn-secondary"
                style={{ padding: '0.65rem 1.25rem', fontSize: '0.95rem' }}
                onClick={onOpenGlossary}
              >
                Scientific Glossary
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Structured First-Use Journey Step Progression */}
      <section
        style={{
          backgroundColor: 'var(--surface-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius)',
          padding: '1.75rem',
          marginBottom: '2.5rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-secondary)' }}>
              10-Stage Scientific Progression
            </span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.2rem 0 0 0' }}>
              The GoNax Calculation Journey
            </h2>
          </div>
          {onOpenWalkthrough && (
            <button
              className="btn-primary btn-sm"
              onClick={onOpenWalkthrough}
              style={{ fontSize: '0.8rem' }}
            >
              Launch Interactive Walkthrough →
            </button>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.825rem'
          }}
        >
          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>01 · PURPOSE</span>
            <strong style={{ display: 'block', color: 'var(--text-primary)', margin: '0.2rem 0' }}>Understand Goal</strong>
            <span style={{ color: 'var(--text-secondary)' }}>Species-specific wood density vs universal equations</span>
          </div>

          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>02 · TAXONOMY</span>
            <strong style={{ display: 'block', color: 'var(--text-primary)', margin: '0.2rem 0' }}>Choose Species</strong>
            <span style={{ color: 'var(--text-secondary)' }}>Select verified taxon from botanical catalog</span>
          </div>

          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>03 · GUIDANCE</span>
            <strong style={{ display: 'block', color: 'var(--text-primary)', margin: '0.2rem 0' }}>Field Metrics</strong>
            <span style={{ color: 'var(--text-secondary)' }}>Learn what DBH and Height mean & how to measure</span>
          </div>

          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>04 · VALIDATION</span>
            <strong style={{ display: 'block', color: 'var(--text-primary)', margin: '0.2rem 0' }}>Review Bounds</strong>
            <span style={{ color: 'var(--text-secondary)' }}>Inline plausibility and calibration limits check</span>
          </div>

          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>05 · EXECUTION</span>
            <strong style={{ display: 'block', color: 'var(--text-primary)', margin: '0.2rem 0' }}>Calculate Carbon</strong>
            <span style={{ color: 'var(--text-secondary)' }}>Deterministic allometry with duplicate protection</span>
          </div>

          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>06 · TARGETS</span>
            <strong style={{ display: 'block', color: 'var(--text-primary)', margin: '0.2rem 0' }}>Understand Result</strong>
            <span style={{ color: 'var(--text-secondary)' }}>Biomass (AGB), Carbon (C), and Atmospheric CO₂e</span>
          </div>

          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>07 · UNCERTAINTY</span>
            <strong style={{ display: 'block', color: 'var(--text-primary)', margin: '0.2rem 0' }}>Inspect Intervals</strong>
            <span style={{ color: 'var(--text-secondary)' }}>95% log-normal confidence bounds & RSE</span>
          </div>

          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>08 · AUDIT</span>
            <strong style={{ display: 'block', color: 'var(--text-primary)', margin: '0.2rem 0' }}>Check Provenance</strong>
            <span style={{ color: 'var(--text-secondary)' }}>Step-by-step arithmetic and DOI literature links</span>
          </div>

          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>09 · ASSISTANT</span>
            <strong style={{ display: 'block', color: 'var(--text-primary)', margin: '0.2rem 0' }}>Ask Scientific Q&A</strong>
            <span style={{ color: 'var(--text-secondary)' }}>Grounded explanation layer without hallucination</span>
          </div>

          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>10 · EXPORT</span>
            <strong style={{ display: 'block', color: 'var(--text-primary)', margin: '0.2rem 0' }}>Persist & Share</strong>
            <span style={{ color: 'var(--text-secondary)' }}>Immutable local store, JSON audit download, print</span>
          </div>
        </div>
      </section>

      {/* Target User Audiences */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Built for Multi-Disciplinary Forestry & Climate Audiences
        </h2>

        <div className="grid-3" style={{ gap: '1rem' }}>
          <div className="card">
            <span className="badge badge-neutral" style={{ fontSize: '0.68rem', marginBottom: '0.5rem' }}>AUDIENCE 01</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
              Forestry Researchers & Scientists
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              Inspect calibration envelopes, allometric power law coefficients, Baskerville bias corrections, log-normal RSE variances, and destructive harvest metadata.
            </p>
          </div>

          <div className="card">
            <span className="badge badge-neutral" style={{ fontSize: '0.68rem', marginBottom: '0.5rem' }}>AUDIENCE 02</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
              Forest & Land Managers
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              Practical field inventory workflows using diameter tapes, hypsometer heights, stand core overrides, and GPS coordinates for plot-level monitoring.
            </p>
          </div>

          <div className="card">
            <span className="badge badge-neutral" style={{ fontSize: '0.68rem', marginBottom: '0.5rem' }}>AUDIENCE 03</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
              Students & Educators
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              Learn how trees store carbon through accessible glossary guides, transparent step-by-step arithmetic substitution, and grounded conversational Q&A.
            </p>
          </div>

          <div className="card">
            <span className="badge badge-neutral" style={{ fontSize: '0.68rem', marginBottom: '0.5rem' }}>AUDIENCE 04</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
              Carbon Project Developers
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              Rigorous, auditable provenance with 95% confidence bounds required by compliance registries, avoiding over-crediting from crude universal formulas.
            </p>
          </div>

          <div className="card">
            <span className="badge badge-neutral" style={{ fontSize: '0.68rem', marginBottom: '0.5rem' }}>AUDIENCE 05</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
              Environmental Organizations
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              Quantify urban and rural conservation impacts with defensible peer-reviewed references that stand up to regulatory and public scrutiny.
            </p>
          </div>

          <div className="card">
            <span className="badge badge-neutral" style={{ fontSize: '0.68rem', marginBottom: '0.5rem' }}>AUDIENCE 06</span>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.4rem 0' }}>
              General Users & Citizen Scientists
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
              Discover how much carbon a local backyard or park tree holds without getting overwhelmed by dense statistical terminology or obscure notation.
            </p>
          </div>
        </div>
      </section>

      {/* Non-Negotiable Architecture Axiom Callout */}
      <section
        style={{
          backgroundColor: 'var(--surface-panel)',
          border: '1px solid var(--border-default)',
          borderLeft: '4px solid var(--accent-primary)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
          marginBottom: '2.5rem'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>CORE ARCHITECTURAL AXIOM</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Deterministic Scientific Calculation vs. Isolated Explanation
            </h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            <strong>GoNax never permits an AI model to calculate, round, or alter carbon numbers.</strong> All dry biomass, elemental carbon stock, and stoichiometric atmospheric CO₂e metrics are computed exclusively by verified physical algorithms or calibrated empirical regressors. The LLM serves solely as an interactive reading companion explaining scientific context without mathematical authority.
          </p>
        </div>
      </section>
    </div>
  );
};
