import React, { useEffect, useRef } from 'react';
import { Species, SpeciesModel, ModelMetadata } from '../types';

interface Props {
  isOpen: boolean;
  isSubmitting: boolean;
  species: Species | null;
  activeModel: SpeciesModel | null;
  scientificModel: ModelMetadata | null;
  dbhInput: string;
  dbhUnit: 'cm' | 'in';
  dbhMetricCm: number;
  heightInput: string;
  heightUnit: 'm' | 'ft';
  heightMetricM: number;
  crownDiameterM?: string;
  woodDensityOverride?: string;
  latitude?: string;
  longitude?: string;
  notes?: string;
  engineType: 'formula' | 'ml_model';
  isDemoRun?: boolean;
  preflightWarning?: string | null;
  onConfirmSubmit: () => void;
  onCancel: () => void;
}

export const ReviewSubmitModal: React.FC<Props> = ({
  isOpen,
  isSubmitting,
  species,
  activeModel,
  scientificModel,
  dbhInput,
  dbhUnit,
  dbhMetricCm,
  heightInput,
  heightUnit,
  heightMetricM,
  crownDiameterM,
  woodDensityOverride,
  latitude,
  longitude,
  notes,
  engineType,
  isDemoRun,
  preflightWarning,
  onConfirmSubmit,
  onCancel
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isSubmitting) onCancel();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel, isSubmitting]);

  if (!isOpen) return null;

  const appliedWoodDensity = woodDensityOverride && !isNaN(parseFloat(woodDensityOverride))
    ? `${woodDensityOverride} g/cm³ (Site-Specific Field Override)`
    : `${species?.wood_density_mean ?? 0.65} ± ${species?.wood_density_sd ?? 0.04} g/cm³ (Species Baseline)`;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(26, 26, 26, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1rem'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-submit-dialog-title"
        style={{
          backgroundColor: 'var(--surface-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius)',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-inset)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                REVIEW BEFORE SUBMIT
              </span>
              {isDemoRun && (
                <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                  DEMONSTRATION RUN
                </span>
              )}
            </div>
            <h2
              id="review-submit-dialog-title"
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0
              }}
            >
              Verify Tree Observation Data
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn-secondary btn-sm"
            aria-label="Cancel and return to edit"
          >
            [Edit]
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            fontSize: '0.875rem'
          }}
          tabIndex={0}
        >
          {/* Species Summary */}
          <div style={{ background: 'var(--surface-inset)', padding: '0.85rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
              Target Species
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              <em>{species?.scientific_name}</em> — {species?.common_name}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Family: {species?.family} · Reference Density: {species?.wood_density_mean} g/cm³
            </div>
          </div>

          {/* Measurements Table */}
          <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)', width: '40%' }}>
                    Diameter at Breast Height (DBH)
                  </td>
                  <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {dbhInput} {dbhUnit}
                    {dbhUnit === 'in' && (
                      <span style={{ color: 'var(--accent-primary)', marginLeft: '0.5rem', fontWeight: 600 }}>
                        (Canonical: {dbhMetricCm.toFixed(2)} cm)
                      </span>
                    )}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>
                    Total Tree Height (H)
                  </td>
                  <td style={{ padding: '0.6rem 0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {heightInput} {heightUnit}
                    {heightUnit === 'ft' && (
                      <span style={{ color: 'var(--accent-primary)', marginLeft: '0.5rem', fontWeight: 600 }}>
                        (Canonical: {heightMetricM.toFixed(2)} m)
                      </span>
                    )}
                  </td>
                </tr>

                {crownDiameterM && (
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>
                      Crown Diameter (Cd)
                    </td>
                    <td style={{ padding: '0.6rem 0.85rem', fontFamily: 'var(--font-mono)' }}>
                      {crownDiameterM} m
                    </td>
                  </tr>
                )}

                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>
                    Applied Wood Density (ρ)
                  </td>
                  <td style={{ padding: '0.6rem 0.85rem', fontFamily: 'var(--font-mono)' }}>
                    {appliedWoodDensity}
                  </td>
                </tr>

                {(latitude || longitude) && (
                  <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>
                      Geographic Location
                    </td>
                    <td style={{ padding: '0.6rem 0.85rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {latitude || 'N/A'}, {longitude || 'N/A'}
                    </td>
                  </tr>
                )}

                {notes && (
                  <tr>
                    <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-secondary)' }}>
                      Plot / Stand Notes
                    </td>
                    <td style={{ padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                      &ldquo;{notes}&rdquo;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Model Specification */}
          <div style={{ background: 'var(--surface-inset)', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                EXECUTION ENGINE: {engineType === 'formula' ? 'Deterministic Allometric Formula' : 'Empirical ML Regressor'}
              </span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                {activeModel?.name || scientificModel?.name} (v{activeModel?.version || scientificModel?.model_version || '1.0.0'})
              </span>
            </div>
            {activeModel?.formula_expression && (
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                Formula: {activeModel.formula_expression}
              </div>
            )}
          </div>

          {/* Preflight Warning if any */}
          {preflightWarning && (
            <div
              style={{
                backgroundColor: 'var(--status-warning-bg)',
                border: '1px solid var(--status-warning)',
                borderRadius: 'var(--radius)',
                padding: '0.75rem 1rem',
                fontSize: '0.825rem',
                color: 'var(--status-warning)'
              }}
            >
              <strong>Pre-Flight Calibration Alert:</strong> {preflightWarning}
            </div>
          )}

          {/* Scientific Disclaimer */}
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong>Deterministic Scientific Guarantee:</strong> Calculations are performed purely through physical equations and statistical regression models. Numerical figures are never altered or hallucinated by artificial intelligence.
          </div>
        </div>

        {/* Footer with Duplicate Submission Guard */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-inset)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            ← Back to Edit
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            className="btn-primary"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            style={{
              padding: '0.65rem 1.4rem',
              fontSize: '0.9rem',
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Calculating Deterministic Pipeline...' : 'Confirm & Calculate Carbon →'}
          </button>
        </div>
      </div>
    </div>
  );
};
