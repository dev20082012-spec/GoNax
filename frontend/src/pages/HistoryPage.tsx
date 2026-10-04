import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { EnrichedPrediction } from '../types';
import { ScientificBadge } from '../components/ScientificBadge';

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
  const [filterSpecies, setFilterSpecies] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getPredictionHistory(100);
        setHistory(data);
      } catch (err) {
        console.error('Failed to load history:', err);
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
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gonax-prediction-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>Loading observation audit history...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-neutral">PERSISTENT OBSERVATION AUDIT TRAIL</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
            Observation & Prediction History
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Immutable audit record of field observations, deterministic allometric predictions, and model provenance.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-secondary btn-sm"
            onClick={handleExportJSON}
            title="Download full JSON audit export"
          >
            Export JSON
          </button>
          <button className="btn-primary btn-sm" onClick={onNewMeasurement}>
            + New Measurement
          </button>
        </div>
      </div>

      {/* Filter and Selection Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Filter by species or notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input"
            style={{ maxWidth: '300px' }}
          />
          <select
            value={filterSpecies}
            onChange={e => setFilterSpecies(e.target.value)}
            className="form-select"
            style={{ maxWidth: '220px' }}
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

      {/* History Table */}
      <div className="card">
        {filteredHistory.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No calculations match your search criteria.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredHistory.length && filteredHistory.length > 0}
                      onChange={selectAllFiltered}
                      title="Select all"
                    />
                  </th>
                  <th>Timestamp</th>
                  <th>Species (Taxon)</th>
                  <th>Dimensions (DBH / H)</th>
                  <th>Dry Biomass</th>
                  <th>Carbon Stock</th>
                  <th>CO₂ Equivalent</th>
                  <th>Confidence Status</th>
                  <th>Model Used</th>
                  <th>Action</th>
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
                        />
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(item.prediction.created_at).toLocaleDateString()}{' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(item.prediction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{item.species.scientific_name}</strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {item.species.common_name}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        {item.observation.dbh_cm} cm / {item.observation.height_m} m
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {item.prediction.estimated_biomass_kg.toLocaleString()} kg
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {item.prediction.estimated_carbon_kg.toLocaleString()} kg C
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                        {item.prediction.estimated_co2e_kg.toLocaleString()} kg CO₂e
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
