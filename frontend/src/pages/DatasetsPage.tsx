import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DatasetMetadata } from '../types';

export const DatasetsPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetMetadata[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DatasetMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await api.getDatasets();
        setDatasets(list);
        if (list.length > 0) setSelectedDataset(list[0]);
      } catch (err) {
        console.error('Failed to load datasets:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>Loading versioned datasets...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-neutral">SCIENTIFIC DATA LAYER</span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
          Versioned Destructive Harvest & Inventory Datasets
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Species-specific empirical observation datasets partitioned cleanly across raw, clean, feature-engineered, and stratified train/validation/test splits.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Dataset List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {datasets.map(ds => {
            const isSelected = selectedDataset?.dataset_id === ds.dataset_id;
            return (
              <div
                key={ds.dataset_id}
                onClick={() => setSelectedDataset(ds)}
                className="card card-hover"
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-default)',
                  background: isSelected ? 'var(--surface-selected)' : 'var(--surface-panel)',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                      v{ds.version} · {ds.scientific_name}
                    </span>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {ds.name}
                    </h3>
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-primary)',
                    background: 'var(--accent-primary-light)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius)',
                    fontWeight: 600
                  }}>
                    N = {ds.sample_count}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  {ds.geographic_scope.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dataset Details Pane */}
        {selectedDataset && (
          <div className="card">
            <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="badge badge-high">{selectedDataset.status}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>ID: {selectedDataset.dataset_id}</span>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                {selectedDataset.name}
              </h2>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Target Taxon: <em>{selectedDataset.scientific_name}</em> ({selectedDataset.common_name}) · Family {selectedDataset.family}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
              <div className="metric-box">
                <div className="metric-title">Sample Trees (N)</div>
                <div className="metric-value">{selectedDataset.sample_count}</div>
                <div className="metric-note">Destructive measurements</div>
              </div>

              <div className="metric-box">
                <div className="metric-title">Dataset Version</div>
                <div className="metric-value" style={{ fontSize: '1.35rem', color: 'var(--accent-primary)' }}>v{selectedDataset.version}</div>
                <div className="metric-note">Released {selectedDataset.release_date}</div>
              </div>

              <div className="metric-box">
                <div className="metric-title">Source Institution</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '0.4rem' }}>
                  {selectedDataset.source}
                </div>
              </div>
            </div>

            {/* Collection Methodology */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                Collection Methodology & Physical Fractionation
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.6, background: 'var(--surface-inset)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
                {selectedDataset.collection_methodology}
              </p>
            </div>

            {/* Measurement Definitions Table */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                Measurement Definitions & Biological Ranges
              </h4>
              <div className="table-wrap">
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Variable</th>
                      <th>Unit</th>
                      <th>Precision</th>
                      <th>Calibration Bounds</th>
                      <th>Protocol Definition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedDataset.measurement_definitions).map(([key, def]: [string, any]) => (
                      <tr key={key}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{def.name} (<code style={{ fontFamily: 'var(--font-mono)' }}>{key}</code>)</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{def.unit}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>±{def.precision || 0.1}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {def.calibration_range ? `[${def.calibration_range[0]} - ${def.calibration_range[1]}]` : def.species_mean ? `${def.species_mean} ± ${def.species_sd}` : 'N/A'}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{def.definition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Geographic & Eco-region Scope */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                Geographic Scope & Climate Envelope
              </h4>
              <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                <div><strong>Eco-Region:</strong> {selectedDataset.geographic_scope.description}</div>
                <div style={{ marginTop: '0.3rem' }}><strong>Latitude Bounds:</strong> [{selectedDataset.geographic_scope.latitude_bounds[0]}°, {selectedDataset.geographic_scope.latitude_bounds[1]}°]</div>
                <div style={{ marginTop: '0.3rem' }}><strong>Longitude Bounds:</strong> [{selectedDataset.geographic_scope.longitude_bounds[0]}°, {selectedDataset.geographic_scope.longitude_bounds[1]}°]</div>
                <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {selectedDataset.geographic_scope.climate_zones.map(cz => (
                    <span key={cz} style={{ background: 'var(--surface-panel)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius)', fontSize: '0.75rem', border: '1px solid var(--border-default)' }}>
                      Zone: {cz}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Preprocessing & Stratified Splits */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                Data Preprocessing & Reproducible Pipeline
              </h4>
              <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div><strong>Outlier Handling:</strong> {selectedDataset.preprocessing_information.outlier_handling}</div>
                <div style={{ marginTop: '0.3rem' }}><strong>Transformations:</strong> {selectedDataset.preprocessing_information.transformations}</div>
                <div style={{ marginTop: '0.3rem' }}><strong>Splits:</strong> {selectedDataset.preprocessing_information.validation_split}</div>
              </div>
            </div>

            {/* Publication Reference */}
            <div>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
                Primary Literature Citation
              </h4>
              <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius)', padding: '0.85rem', fontSize: '0.85rem' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedDataset.publication_reference.citation}</div>
                <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Published in Silva Fennica · DOI: <a href={`https://doi.org/${selectedDataset.publication_reference.doi}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>{selectedDataset.publication_reference.doi} ↗</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
