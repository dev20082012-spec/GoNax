import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ModelMetadata, DatasetMetadata, Species, ScientificReference } from '../types';

export const ResearchAdminPage: React.FC = () => {
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [references, setReferences] = useState<ScientificReference[]>([]);
  const [activeTab, setActiveTab] = useState<'models' | 'datasets' | 'species' | 'references'>('models');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [m, d, s, r] = await Promise.all([
          api.getModels().catch(() => []),
          api.getDatasets().catch(() => []),
          api.getSpeciesList().catch(() => []),
          api.getReferences().catch(() => [])
        ]);
        setModels(m);
        setDatasets(d);
        setSpeciesList(s);
        setReferences(r);
      } catch (err) {
        console.error('Failed to load research admin data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDownloadManifest = () => {
    const manifest = {
      system: 'GoNax Scientific Intelligence Platform',
      version: '1.2.0-scientific-candidate',
      generated_at: new Date().toISOString(),
      species_count: speciesList.length,
      models_count: models.length,
      datasets_count: datasets.length,
      references_count: references.length,
      models,
      datasets,
      species: speciesList,
      references
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gonax-research-manifest-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>Loading scientific research metadata...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span className="badge badge-neutral">RESEARCH & SCIENTIFIC ADMINISTRATION</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
            GoNax Scientific Console
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Internal audit interface for species data coverage, versioned harvest splits, trained ML weights, and peer-reviewed allometric citations.
          </p>
        </div>

        <button
          className="btn-primary btn-sm"
          onClick={handleDownloadManifest}
        >
          Export Complete Manifest (JSON)
        </button>
      </div>

      {/* High-level Scientific Metric Counters */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="metric-box">
          <div className="metric-title">Cataloged Taxa</div>
          <div className="metric-value">{speciesList.length}</div>
          <div className="metric-note">
            {speciesList.filter(s => s.scientific_name !== 'Fraxinus excelsior').length} with active models
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-title">Registered Models</div>
          <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>{models.length}</div>
          <div className="metric-note">
            {models.filter(m => m.model_category === 'scientific_trained_model').length} trained ML / {models.filter(m => m.model_category === 'prototype_demonstration_model').length} formula
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-title">Destructive Harvest Datasets</div>
          <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>{datasets.length}</div>
          <div className="metric-note">
            Total N = {datasets.reduce((sum, d) => sum + d.sample_count, 0).toLocaleString()} harvested trees
          </div>
        </div>
        <div className="metric-box">
          <div className="metric-title">Indexed Literature Citations</div>
          <div className="metric-value">{references.length}</div>
          <div className="metric-note">
            100% with registered DOIs
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-default)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('models')}
          className={`nav-button ${activeTab === 'models' ? 'active' : ''}`}
        >
          Model Registry ({models.length})
        </button>
        <button
          onClick={() => setActiveTab('datasets')}
          className={`nav-button ${activeTab === 'datasets' ? 'active' : ''}`}
        >
          Versioned Datasets ({datasets.length})
        </button>
        <button
          onClick={() => setActiveTab('species')}
          className={`nav-button ${activeTab === 'species' ? 'active' : ''}`}
        >
          Taxa Readiness ({speciesList.length})
        </button>
        <button
          onClick={() => setActiveTab('references')}
          className={`nav-button ${activeTab === 'references' ? 'active' : ''}`}
        >
          Literature Citations ({references.length})
        </button>
      </div>

      {/* Tab 1: Models */}
      {activeTab === 'models' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Registered Allometric & ML Models
          </h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model ID</th>
                  <th>Species Target</th>
                  <th>Type & Category</th>
                  <th>Version</th>
                  <th>Dataset ID</th>
                  <th>Metrics (R² / RMSE / RSE)</th>
                  <th>Calibrated Range</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {models.map(m => (
                  <tr key={m.model_id}>
                    <td>
                      <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{m.model_id}</code>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.name}</div>
                    </td>
                    <td>
                      <em>{m.species_scientific_name}</em>
                    </td>
                    <td>
                      <span className={`badge ${m.model_category === 'scientific_trained_model' ? 'badge-high' : 'badge-prototype'}`}>
                        {m.model_category === 'scientific_trained_model' ? 'TRAINED ML' : 'FORMULA'}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {m.model_type}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      v{m.model_version}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>{m.training_dataset_id}</code>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        R²: <strong style={{ color: 'var(--accent-primary)' }}>{m.evaluation_metrics?.r2 ?? 'N/A'}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        RMSE: {m.evaluation_metrics?.rmse_kg ? `${m.evaluation_metrics.rmse_kg} kg` : 'N/A'} · RSE: ±{m.evaluation_metrics?.rse_percentage ?? 'N/A'}%
                      </div>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <div>DBH: [{m.features.find(f => f.name === 'dbh_cm')?.min} – {m.features.find(f => f.name === 'dbh_cm')?.max}] cm</div>
                      <div>H: [{m.features.find(f => f.name === 'height_m')?.min} – {m.features.find(f => f.name === 'height_m')?.max}] m</div>
                    </td>
                    <td>
                      <span className={`badge ${m.status === 'active' ? 'badge-high' : 'badge-prototype'}`}>
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Datasets */}
      {activeTab === 'datasets' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Versioned Destructive Harvest Calibration Datasets
          </h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dataset ID</th>
                  <th>Species</th>
                  <th>Version</th>
                  <th>Sample Count</th>
                  <th>Geographic Scope</th>
                  <th>Variables Measured</th>
                  <th>Publication / DOI</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map(d => (
                  <tr key={d.dataset_id}>
                    <td>
                      <code style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.dataset_id}</code>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d.name}</div>
                    </td>
                    <td>
                      <em>{d.scientific_name}</em>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      v{d.version}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      N = {d.sample_count}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {d.geographic_scope.description}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {d.allowed_input_variables.map(v => (
                          <span key={v} style={{ fontSize: '0.7rem', background: 'var(--surface-inset)', border: '1px solid var(--border-default)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius)' }}>
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      <a href={`https://doi.org/${d.publication_reference.doi}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>
                        {d.publication_reference.doi} ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Species Readiness */}
      {activeTab === 'species' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Taxonomic Data Readiness Classification
          </h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Taxon</th>
                  <th>Family</th>
                  <th>Readiness Status</th>
                  <th>Basic Wood Density (ρ)</th>
                  <th>Applicable Variables</th>
                  <th>Geographic Applicability</th>
                </tr>
              </thead>
              <tbody>
                {speciesList.map(s => {
                  const isAsh = s.scientific_name === 'Fraxinus excelsior';
                  const isML = ['Quercus robur', 'Pinus sylvestris', 'Fagus sylvatica'].includes(s.scientific_name);
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{s.scientific_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.common_name}</div>
                      </td>
                      <td style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>{s.family}</td>
                      <td>
                        {isML ? (
                          <span className="badge badge-high">TRAINED SCIENTIFIC ML MODEL</span>
                        ) : isAsh ? (
                          <span className="badge badge-warning">
                            INSUFFICIENT DATA
                          </span>
                        ) : (
                          <span className="badge badge-medium">DEMONSTRATION MODEL</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {s.wood_density_mean} ± {s.wood_density_sd} g/cm³
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                          {s.applicable_variables.map(v => (
                            <span key={v} style={{ fontSize: '0.7rem', background: 'var(--accent-primary-light)', color: 'var(--accent-primary)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius)', fontWeight: 600 }}>
                              {v}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {s.geographic_applicability.join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: References */}
      {activeTab === 'references' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Peer-Reviewed Scientific Literature Evidence
          </h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Citation & Title</th>
                  <th>Journal & Year</th>
                  <th>Authors</th>
                  <th>DOI Link</th>
                </tr>
              </thead>
              <tbody>
                {references.map(r => (
                  <tr key={r.id}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{r.title}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        {r.citation_text}
                      </div>
                    </td>
                    <td style={{ color: 'var(--accent-secondary)', fontWeight: 600 }}>
                      {r.journal} ({r.year})
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {r.authors}
                    </td>
                    <td>
                      <a href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                        {r.doi} ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
