import React, { useState } from 'react';
import { ProvenanceDetails } from '../types';

interface Props {
  provenance: ProvenanceDetails;
  modelName: string;
  modelVersion: string;
}

export const ProvenanceCard: React.FC<Props> = ({ provenance, modelName, modelVersion }) => {
  const [expanded, setExpanded] = useState(true);

  const steps = provenance.calculation_steps || provenance.steps || [];
  const engineId = provenance.engineId || provenance.traceability_chain?.model_id || 'deterministic-forestry-engine';
  const engineType = provenance.engineType || provenance.traceability_chain?.model_type || 'allometric_formula';
  const formulaExpr = provenance.formulaExpression || (provenance as any).formula_expression || 'AGB = a * (DBH^b) * (H^c)';
  const woodDensity = provenance.applied_wood_density_g_cm3 || provenance.woodDensityUsed || 0.65;
  const cf = provenance.applied_carbon_fraction || provenance.carbonFractionUsed || 0.485;
  const dateStr = provenance.calculatedAt || provenance.traceability_chain?.executed_at || new Date().toISOString();

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>Calculation Provenance & Mathematical Traceability</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Deterministic execution path: {engineId} ({engineType})
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn-secondary btn-sm"
        >
          {expanded ? 'Collapse Steps' : 'Expand Steps'}
        </button>
      </div>

      {provenance.warnings && provenance.warnings.length > 0 && (
        <div style={{
          background: 'var(--status-warning-bg)',
          border: '1px solid rgba(166, 130, 14, 0.3)',
          borderRadius: 'var(--radius)',
          padding: '0.85rem 1rem',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          color: 'var(--status-warning)'
        }}>
          {provenance.warnings.map((w, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>WARNING</span>
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            background: 'var(--surface-inset)',
            padding: '0.85rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-default)',
            fontSize: '0.85rem'
          }}>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Base Mathematical Formulation
            </div>
            <code style={{ color: 'var(--accent-primary)', fontSize: '0.95rem', fontWeight: 600 }}>
              {formulaExpr}
            </code>
          </div>

          <div className="table-wrap">
            <table className="data-table" style={{ fontSize: '0.825rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Pipeline Step</th>
                  <th style={{ width: '38%' }}>Mathematical Substitution</th>
                  <th style={{ width: '22%' }}>Evaluated Value</th>
                  <th style={{ width: '18%' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{step.step}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {step.substituted}
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        color: 'var(--accent-primary)',
                        background: 'var(--accent-primary-light)',
                        padding: '0.15rem 0.4rem',
                        borderRadius: 'var(--radius)'
                      }}>
                        {step.result} {step.unit !== 'metadata' && step.unit}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {step.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border-default)',
            paddingTop: '0.75rem',
            marginTop: '0.5rem',
            gap: '0.5rem'
          }}>
            <span>Model: {modelName} (v{modelVersion})</span>
            <span>Applied Wood Density: {woodDensity} g/cm³</span>
            <span>Carbon Fraction: {(cf * 100).toFixed(1)}%</span>
            <span>Calculated: {new Date(dateStr).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};
