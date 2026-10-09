import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Species, SpeciesDataset, SpeciesModel, ScientificReference, ModelMetadata } from '../types';

interface Props {
  onSelectForMeasurement: (speciesId: string) => void;
  onAskAssistant?: (speciesId: string) => void;
}

export type SpeciesModelStatus = 'trained_model' | 'research_dataset' | 'prototype_model' | 'insufficient_data';

export const SpeciesPage: React.FC<Props> = ({ onSelectForMeasurement, onAskAssistant }) => {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [allModels, setAllModels] = useState<ModelMetadata[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<{
    species: Species;
    datasets: SpeciesDataset[];
    models: SpeciesModel[];
    references: ScientificReference[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | SpeciesModelStatus>('ALL');

  useEffect(() => {
    async function load() {
      try {
        const [list, models] = await Promise.all([
          api.getSpeciesList(),
          api.getModels().catch(() => [] as ModelMetadata[])
        ]);
        setSpeciesList(list);
        setAllModels(models);
        if (list.length > 0) {
          const firstDetails = await api.getSpeciesDetails(list[0].id);
          setSelectedDetails(firstDetails);
        }
      } catch (err) {
        console.error('Failed to load species:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getSpeciesStatus = (sp: Species, models: SpeciesModel[] = [], datasets: SpeciesDataset[] = []): SpeciesModelStatus => {
    const slug = sp.scientific_name.toLowerCase().replace(/\s+/g, '_');
    const registered = allModels.filter(m => m.species_id === slug || m.species_scientific_name.toLowerCase() === sp.scientific_name.toLowerCase());
    if (sp.scientific_name === 'Fraxinus excelsior' || (models.length === 0 && registered.length === 0)) {
      return 'insufficient_data';
    }
    const hasTrained = registered.some(m => m.model_category === 'scientific_trained_model' && !m.model_version.includes('proto')) ||
                       models.some(m => !m.is_prototype);
    if (hasTrained) return 'trained_model';
    if (datasets.length > 0 || models.some(m => m.dataset_id)) return 'research_dataset';
    return 'prototype_model';
  };

  const handleSelectSpecies = async (sp: Species) => {
    try {
      const details = await api.getSpeciesDetails(sp.id);
      setSelectedDetails(details);
    } catch (err) {
      console.error('Failed to load species details:', err);
    }
  };

  const families = ['ALL', ...Array.from(new Set(speciesList.map(s => s.family)))];

  const filteredSpecies = speciesList.filter(s => {
    const matchSearch =
      s.scientific_name.toLowerCase().includes(search.toLowerCase()) ||
      s.common_name.toLowerCase().includes(search.toLowerCase());
    const matchFamily = familyFilter === 'ALL' || s.family === familyFilter;

    const st = getSpeciesStatus(s);
    const matchStatus = statusFilter === 'ALL' || st === statusFilter;
    return matchSearch && matchFamily && matchStatus;
  });

  const activeStatus = selectedDetails ? getSpeciesStatus(selectedDetails.species, selectedDetails.models, selectedDetails.datasets) : 'prototype_model';
  const selectedSlug = selectedDetails?.species.scientific_name.toLowerCase().replace(/\s+/g, '_');
  const activeRegisteredModels = allModels.filter(m => m.species_id === selectedSlug || m.species_scientific_name.toLowerCase() === selectedDetails?.species.scientific_name.toLowerCase());

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>Loading scientific species records...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-neutral">TAXONOMIC REGISTRY</span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
          Species Scientific Intelligence
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          In GoNax, every tree species is an empirical entity backed by peer-reviewed destructive harvest datasets, calibrated allometric models, and validated biological ranges.
        </p>
      </div>

      {}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by scientific or common name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input"
          style={{ maxWidth: '320px' }}
        />
        <select
          value={familyFilter}
          onChange={e => setFamilyFilter(e.target.value)}
          className="form-select"
          style={{ maxWidth: '180px' }}
        >
          {families.map(f => (
            <option key={f} value={f}>
              Family: {f}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="form-select"
          style={{ maxWidth: '240px' }}
        >
          <option value="ALL">All Readiness Statuses</option>
          <option value="trained_model">Trained model available</option>
          <option value="research_dataset">Research dataset available</option>
          <option value="prototype_model">Prototype model</option>
          <option value="insufficient_data">Insufficient data</option>
        </select>
      </div>

      {}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredSpecies.map(sp => {
            const isSelected = selectedDetails?.species.id === sp.id;
            const st = getSpeciesStatus(sp);

            return (
              <div
                key={sp.id}
                onClick={() => handleSelectSpecies(sp)}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-default)',
                  backgroundColor: isSelected ? 'var(--surface-selected)' : 'var(--surface-panel)',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {sp.family}
                      </span>
                      {st === 'trained_model' && (
                        <span className="badge badge-high" style={{ fontSize: '0.65rem' }}>
                          TRAINED MODEL AVAILABLE
                        </span>
                      )}
                      {st === 'research_dataset' && (
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                          RESEARCH DATASET AVAILABLE
                        </span>
                      )}
                      {st === 'prototype_model' && (
                        <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>
                          PROTOTYPE MODEL
                        </span>
                      )}
                      {st === 'insufficient_data' && (
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                          INSUFFICIENT DATA
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {sp.scientific_name}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {sp.common_name}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-primary)',
                    background: 'var(--accent-primary-light)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius)',
                    fontWeight: 600
                  }}>
                    ρ = {sp.wood_density_mean}
                  </span>
                </div>

                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {sp.applicable_variables.map(v => (
                    <span key={v} style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius)' }}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {}
        {selectedDetails ? (
          <div className="card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-default)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  {activeStatus === 'trained_model' && (
                    <span className="badge badge-high">TRAINED MODEL AVAILABLE</span>
                  )}
                  {activeStatus === 'research_dataset' && (
                    <span className="badge badge-info">RESEARCH DATASET AVAILABLE</span>
                  )}
                  {activeStatus === 'prototype_model' && (
                    <span className="badge badge-medium">PROTOTYPE MODEL</span>
                  )}
                  {activeStatus === 'insufficient_data' && (
                    <span className="badge badge-warning">
                      INSUFFICIENT DATA
                    </span>
                  )}
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedDetails.species.scientific_name}
                </h2>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  {selectedDetails.species.common_name} · Family {selectedDetails.species.family}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {onAskAssistant && (
                  <button
                    className="btn-secondary"
                    onClick={() => onAskAssistant(selectedDetails.species.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    Ask Scientific Assistant
                  </button>
                )}

                {activeStatus !== 'insufficient_data' ? (
                  <button
                    className="btn-primary"
                    onClick={() => onSelectForMeasurement(selectedDetails.species.id)}
                  >
                    + Measure This Species
                  </button>
                ) : (
                  <button
                    disabled
                    className="btn-secondary"
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    title="Prediction disabled: insufficient destructive harvest calibration data"
                  >
                    Estimation Disabled
                  </button>
                )}
              </div>
            </div>

            {}
            {activeStatus === 'insufficient_data' && (
              <div style={{
                background: 'var(--status-warning-bg)',
                border: '1px solid rgba(166, 130, 14, 0.3)',
                borderRadius: 'var(--radius)',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
                color: 'var(--status-warning)',
                lineHeight: 1.5
              }}>
                <strong>Scientific Integrity Policy Notice:</strong>
                <p style={{ marginTop: '0.35rem', color: 'var(--text-primary)' }}>
                  No destructive harvest calibration dataset or validated allometric model is currently registered for <em>{selectedDetails.species.scientific_name}</em>.
                  GoNax enforces strict scientific bounds and refuses to fabricate estimates without empirical calibration.
                </p>
              </div>
            )}

            {}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                Wood Physical Metrics & Constants
              </h4>
              <div className="grid-2">
                <div className="metric-box">
                  <div className="metric-title">Mean Basic Wood Density (ρ)</div>
                  <div className="metric-value">{selectedDetails.species.wood_density_mean} <span className="metric-unit">g/cm³</span></div>
                  <div className="metric-note">Standard deviation: ±{selectedDetails.species.wood_density_sd} g/cm³ (Dry mass / green volume)</div>
                </div>
                <div className="metric-box">
                  <div className="metric-title">Available Measurable Variables</div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {selectedDetails.species.applicable_variables.map(v => (
                      <span key={v} style={{ background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius)', fontSize: '0.8rem', fontWeight: 600 }}>
                        {v}
                      </span>
                    ))}
                  </div>
                  <div className="metric-note" style={{ marginTop: '0.5rem' }}>
                    Required for species-calibrated equation
                  </div>
                </div>
              </div>
            </div>

            {}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                Geographic Calibration Zones
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedDetails.species.geographic_applicability.map(region => (
                  <span key={region} style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                    {region}
                  </span>
                ))}
              </div>
            </div>

            {}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Model Availability & Versions ({selectedDetails.models.length + activeRegisteredModels.length})
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                  Active: {activeStatus === 'trained_model' ? 'Trained Model' : activeStatus === 'research_dataset' ? 'Research Dataset' : activeStatus === 'prototype_model' ? 'Prototype Formula' : 'Data Deficient'}
                </span>
              </div>

              {selectedDetails.models.length === 0 && activeRegisteredModels.length === 0 ? (
                <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No models currently registered for this taxon.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {activeRegisteredModels.map(rm => (
                    <div key={rm.model_id} style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`badge ${rm.model_category === 'scientific_trained_model' ? 'badge-high' : 'badge-prototype'}`}>
                            {rm.model_category === 'scientific_trained_model' ? 'TRAINED ML' : 'PROTOTYPE'}
                          </span>
                          <strong style={{ color: 'var(--text-primary)' }}>{rm.name}</strong>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                          v{rm.model_version} ({rm.model_type})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                        <span>Training Dataset: <code style={{ color: 'var(--accent-primary)' }}>{rm.training_dataset_id} (v{rm.training_dataset_version})</code></span>
                        <span>R²: <strong style={{ color: 'var(--accent-primary)' }}>{rm.evaluation_metrics?.r2 ?? 'N/A'}</strong></span>
                        <span>RMSE: {rm.evaluation_metrics?.rmse_kg ? `${rm.evaluation_metrics.rmse_kg} kg` : 'N/A'}</span>
                        <span>RSE: ±{rm.evaluation_metrics?.rse_percentage ?? 'N/A'}%</span>
                      </div>
                    </div>
                  ))}

                  {selectedDetails.models.map(m => (
                    <div key={m.id} style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{m.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>v{m.version} ({m.model_type})</span>
                      </div>
                      <code style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', display: 'block', margin: '0.4rem 0', fontWeight: 600 }}>
                        {m.formula_expression}
                      </code>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span>Carbon Fraction: {(m.carbon_fraction * 100).toFixed(1)}%</span>
                        <span>Residual Error: ±{m.uncertainty_percentage}%</span>
                        <span>Calibrated DBH: [{m.parameters.dbhMinCm} - {m.parameters.dbhMaxCm}] cm</span>
                        <span>Calibrated Height: [{m.parameters.heightMinM} - {m.parameters.heightMaxM}] m</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                Underlying Datasets ({selectedDetails.datasets.length})
              </h4>
              {selectedDetails.datasets.length === 0 ? (
                <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No calibration datasets registered.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedDetails.datasets.map(d => (
                    <div key={d.id} style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{d.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>Version: {d.version}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Sample Size N = {d.sample_size} trees · Coverage: {d.geographic_coverage}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {}
            <div>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                Scientific Citations & Literature
              </h4>
              {selectedDetails.references.length === 0 ? (
                <div style={{ background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No citations linked.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedDetails.references.map(r => (
                    <div key={r.id} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--surface-inset)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.title} ({r.year})</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.authors} — {r.journal}</div>
                      <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', display: 'inline-block', marginTop: '0.25rem', color: 'var(--accent-primary)' }}>
                        DOI: {r.doi} ↗
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
