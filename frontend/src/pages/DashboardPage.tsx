import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Species, EnrichedPrediction } from '../types';
import { ScientificBadge } from '../components/ScientificBadge';
import { PageView } from '../components/Navbar';

interface Props {
  setCurrentPage: (page: PageView) => void;
  onViewPrediction: (id: string) => void;
  onSelectSpecies: (speciesId: string) => void;
}

export const DashboardPage: React.FC<Props> = ({ setCurrentPage, onViewPrediction, onSelectSpecies }) => {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [history, setHistory] = useState<EnrichedPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sp, hist] = await Promise.all([
          api.getSpeciesList(),
          api.getPredictionHistory(10)
        ]);
        setSpeciesList(sp);
        setHistory(hist);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalBiomassKg = history.reduce((acc, h) => acc + h.prediction.estimated_biomass_kg, 0);
  const totalCarbonKg = history.reduce((acc, h) => acc + h.prediction.estimated_carbon_kg, 0);
  const totalCo2eKg = history.reduce((acc, h) => acc + h.prediction.estimated_co2e_kg, 0);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        Loading scientific carbon dashboard...
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Forestry Carbon Workspace
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Overview of species catalog, active allometric equations, and field observation records.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-primary" onClick={() => setCurrentPage('measure')}>
            + New Measurement
          </button>
          <button className="btn-secondary" onClick={() => setCurrentPage('species')}>
            Species Catalog
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="metric-box">
          <div className="metric-title">Catalog Species</div>
          <div className="metric-value">{speciesList.length}</div>
          <div className="metric-note">
            Curated temperate & conifer taxa
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-title">Recorded Trees</div>
          <div className="metric-value">{history.length}</div>
          <div className="metric-note">
            Field observations logged
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-title">Elemental Carbon</div>
          <div className="metric-value">
            {totalCarbonKg > 1000 ? `${(totalCarbonKg / 1000).toFixed(2)}` : totalCarbonKg.toLocaleString()}
            <span className="metric-unit">{totalCarbonKg > 1000 ? 't C' : 'kg C'}</span>
          </div>
          <div className="metric-note">
            From {totalBiomassKg.toFixed(0)} kg dry biomass
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-title">CO₂ Equivalent</div>
          <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>
            {totalCo2eKg > 1000 ? `${(totalCo2eKg / 1000).toFixed(2)}` : totalCo2eKg.toLocaleString()}
            <span className="metric-unit">{totalCo2eKg > 1000 ? 't CO₂e' : 'kg CO₂e'}</span>
          </div>
          <div className="metric-note">
            Stoichiometric molecular ratio (3.6667)
          </div>
        </div>
      </div>

      {/* Recent Predictions Feed */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Recent Predictions & Historical Observations
          </h2>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setCurrentPage('history')}
          >
            View Full History →
          </button>
        </div>

        {history.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No tree observations recorded yet. Click "+ New Measurement" to submit your first tree observation.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Species (Taxon)</th>
                  <th>DBH / Height</th>
                  <th>Estimated Biomass</th>
                  <th>Elemental Carbon</th>
                  <th>CO₂ Equivalent</th>
                  <th>Confidence Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.prediction.id}>
                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-primary)' }}>{item.species.scientific_name}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {item.species.common_name}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
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
                    <td>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => onViewPrediction(item.prediction.id)}
                      >
                        Inspect Result
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available Scientific Species Catalog Preview */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Calibrated Species Catalog
          </h2>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setCurrentPage('species')}
          >
            Explore all {speciesList.length} species →
          </button>
        </div>

        <div className="grid-3">
          {speciesList.map(sp => (
            <div key={sp.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {sp.family}
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                  {sp.scientific_name}
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                  {sp.common_name}
                </div>

                <div style={{
                  background: 'var(--surface-inset)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '1rem'
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Basic Wood Density:</span>
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{sp.wood_density_mean} ± {sp.wood_density_sd} g/cm³</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  className="btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => onSelectSpecies(sp.id)}
                >
                  Measure Tree
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
