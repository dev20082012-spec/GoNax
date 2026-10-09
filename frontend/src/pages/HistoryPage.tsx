import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { EnrichedPrediction } from '../types';
import { ScientificBadge } from '../components/ScientificBadge';
import { formatLocaleNumber, formatLocaleDateTime } from '../utils/i18n';

interface Props {
  onViewPrediction: (id: string) => void;
  onNewMeasurement: () => void;
  onComparePredictions?: (ids: string[]) => void;
}

export const HistoryPage: React.FC<Props> = ({
  onViewPrediction,
  onNewMeasurement,
  onComparePredictions
}) => {
  const [history, setHistory] = useState<EnrichedPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSpecies, setFilterSpecies] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPredictionHistory(100);
        setHistory(data);
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve calculation history.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const speciesOptions = ['ALL', ...Array.from(new Set(history.map(h => h.species.scientific_name)))];

  const filteredHistory = history.filter(item => {
    const matchSpecies = filterSpecies === 'ALL' || item.species.scientific_name === filterSpecies;
    const matchSearch =
      item.species.scientific_name.toLowerCase().includes(search.toLowerCase()) ||
      item.species.common_name.toLowerCase().includes(search.toLowerCase()) ||
      (item.observation.observation_notes && item.observation.observation_notes.toLowerCase().includes(search.toLowerCase()));
    return matchSpecies && matchSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedIds.length === filteredHistory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHistory.map(h => h.prediction.id));
    }
  };

  const handleExportJSON = () => {
    if (history.length === 0) {
      setExportNotice('No records available to export.');
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    try {
      const recordsToExport = selectedIds.length > 0
        ? history.filter(h => selectedIds.includes(h.prediction.id))
        : history;

      const blob = new Blob([JSON.stringify(recordsToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gonax-prediction-history-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportNotice(`Successfully exported ${recordsToExport.length} record(s) as JSON.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err: any) {
      // Clipboard fallback
      try {
        const fallbackStr = JSON.stringify(history, null, 2);
        navigator.clipboard?.writeText(fallbackStr);
        setExportNotice('File download was blocked; audit records were copied to clipboard instead.');
      } catch (clipErr) {
        setExportNotice('Export failed: unable to access file system or clipboard.');
      }
      setTimeout(() => setExportNotice(null), 5000);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }} role="status">
        Loading observation audit history from local relational store...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-neutral">PERSISTENT OBSERVATION AUDIT TRAIL</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing: '-0.02em', margin: 0 }}>
            Observation & Prediction History
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Immutable audit record of field observations, deterministic allometric predictions, and mathematical provenance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-secondary btn-sm"
            onClick={handleExportJSON}
            disabled={history.length === 0}
            title="Download full JSON audit export"
          >
            Export JSON ({selectedIds.length > 0 ? selectedIds.length : history.length})
          </button>
          <button className="btn-primary btn-sm" onClick={onNewMeasurement}>
            + New Measurement
          </button>
        </div>
      </div>

      {exportNotice && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--accent-primary-bg)',
            border: '1px solid var(--accent-primary)',
            color: 'var(--accent-primary)',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius)',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}
        >
          ✓ {exportNotice}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--status-error-bg)',
            border: '1px solid var(--status-error)',
            color: 'var(--status-error)',
            padding: '1rem',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Filter and Selection Bar */}
      {history.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Filter by species or notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input"
              style={{ maxWidth: '300px' }}
              aria-label="Filter history records by species or plot notes"
            />
            <select
              value={filterSpecies}
              onChange={e => setFilterSpecies(e.target.value)}
              className="form-select"
              style={{ maxWidth: '220px' }}
              aria-label="Filter by species"
            >
              {speciesOptions.map(sp => (
                <option key={sp} value={sp}>
                  Species: {sp}
                </option>
              ))}
            </select>
          </div>

          {selectedIds.length > 0 && onComparePredictions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                {selectedIds.length} observation(s) selected
              </span>
              <button
                className="btn-primary btn-sm"
                onClick={() => onComparePredictions(selectedIds)}
              >
                Compare Selected ({selectedIds.length}) →
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Table or Rich Empty State */}
      <div className="card">
        {history.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', maxWidth: '580px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No Field Observations Recorded Yet
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Your calculation history is currently empty. Whenever you record tree dimensions in the Field Measurement workspace, GoNax logs an immutable audit entry with complete mathematical provenance, 95% log-normal confidence intervals, and reference citations.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={onNewMeasurement}>
                + Record Your First Tree
              </button>
            </div>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No calculations match &ldquo;{search}&rdquo;. Try clearing filters.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table" aria-label="Field observation calculation history">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredHistory.length && filteredHistory.length > 0}
                      onChange={selectAllFiltered}
                      aria-label="Select all displayed calculations"
                    />
                  </th>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Species (Taxon)</th>
                  <th scope="col">Dimensions (DBH / H)</th>
                  <th scope="col">Dry Biomass</th>
                  <th scope="col">Carbon Stock</th>
                  <th scope="col">CO₂ Equivalent</th>
                  <th scope="col">Confidence Status</th>
                  <th scope="col">Model Used</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(item => {
                  const isChecked = selectedIds.includes(item.prediction.id);
                  return (
                    <tr
                      key={item.prediction.id}
                      style={{ background: isChecked ? 'var(--surface-selected)' : undefined }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(item.prediction.id)}
                          aria-label={`Select calculation for ${item.species.scientific_name}`}
                        />
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatLocaleDateTime(item.prediction.created_at)}
                      </td>
                      <td>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{item.species.scientific_name}</strong>
                          {item.prediction.is_demo_run && (
                            <span className="badge badge-warning" style={{ fontSize: '0.62rem', marginLeft: '0.35rem' }}>
                              DEMO
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.species.common_name}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        {item.observation.dbh_cm} cm / {item.observation.height_m} m
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {formatLocaleNumber(item.prediction.estimated_biomass_kg, 1)} kg
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {formatLocaleNumber(item.prediction.estimated_carbon_kg, 1)} kg C
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                        {formatLocaleNumber(item.prediction.estimated_co2e_kg, 1)} kg CO₂e
                      </td>
                      <td>
                        <ScientificBadge
                          status={item.prediction.confidence_status}
                          isPrototype={item.prediction.is_prototype}
                        />
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.model.name} (v{item.model.version})
                      </td>
                      <td>
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => onViewPrediction(item.prediction.id)}
                          title="Reopen full scientific result and reasoning chat"
                          aria-label={`Inspect results for ${item.species.scientific_name}`}
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
