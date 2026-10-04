import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Species, SpeciesModel, EnrichedPrediction, ModelMetadata } from '../types';

interface Props {
  initialSpeciesId?: string | null;
  onPredictionComplete: (prediction: EnrichedPrediction) => void;
}

export const MeasurementFormPage: React.FC<Props> = ({ initialSpeciesId, onPredictionComplete }) => {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('');
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [availableModels, setAvailableModels] = useState<SpeciesModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [scientificModel, setScientificModel] = useState<ModelMetadata | null>(null);
  const [engineType, setEngineType] = useState<'formula' | 'ml_model'>('formula');

  // Measurement input fields
  const [dbhCm, setDbhCm] = useState<string>('35.0');
  const [heightM, setHeightM] = useState<string>('18.5');
  const [crownDiameterM, setCrownDiameterM] = useState<string>('');
  const [woodDensityOverride, setWoodDensityOverride] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load species on mount
  useEffect(() => {
    async function load() {
      try {
        const list = await api.getSpeciesList();
        setSpeciesList(list);
        if (list.length > 0) {
          const targetId = initialSpeciesId && list.some(s => s.id === initialSpeciesId)
            ? initialSpeciesId
            : list[0].id;
          setSelectedSpeciesId(targetId);
        }
      } catch (err: any) {
        setError(err.message);
      }
    }
    load();
  }, [initialSpeciesId]);

  // Load models when selected species changes
  useEffect(() => {
    if (!selectedSpeciesId) return;
    const sp = speciesList.find(s => s.id === selectedSpeciesId) || null;
    setSelectedSpecies(sp);

    async function loadSpeciesDetails() {
      try {
        const details = await api.getSpeciesDetails(selectedSpeciesId);
        setAvailableModels(details.models);
        if (details.models.length > 0) {
          setSelectedModelId(details.models[0].id);
        }
      } catch (err: any) {
        console.error('Error loading species models:', err);
      }

      try {
        const sciModel = await api.getModelForSpecies(selectedSpeciesId);
        setScientificModel(sciModel);
      } catch (err: any) {
        console.warn('Could not load registered scientific model metadata:', err);
        setScientificModel(null);
      }
    }
    loadSpeciesDetails();
  }, [selectedSpeciesId, speciesList]);

  const activeModel = availableModels.find(m => m.id === selectedModelId) || availableModels[0];

  // Pre-flight calibration check
  const numDbh = parseFloat(dbhCm);
  const numHeight = parseFloat(heightM);
  let preflightWarning: string | null = null;

  const dbhMin = scientificModel?.features?.find(f => f.name === 'dbh_cm')?.min ?? activeModel?.parameters?.dbhMinCm ?? 5;
  const dbhMax = scientificModel?.features?.find(f => f.name === 'dbh_cm')?.max ?? activeModel?.parameters?.dbhMaxCm ?? 150;
  const heightMin = scientificModel?.features?.find(f => f.name === 'height_m')?.min ?? activeModel?.parameters?.heightMinM ?? 2;
  const heightMax = scientificModel?.features?.find(f => f.name === 'height_m')?.max ?? activeModel?.parameters?.heightMaxM ?? 45;

  if (!isNaN(numDbh)) {
    if (numDbh < dbhMin || numDbh > dbhMax) {
      preflightWarning = `Notice: DBH (${numDbh} cm) is outside the active model's calibrated empirical range [${dbhMin}, ${dbhMax}] cm. Extrapolation warning will be attached to calculation output.`;
    }
  }

  if (!isNaN(numHeight) && !preflightWarning) {
    if (numHeight < heightMin || numHeight > heightMax) {
      preflightWarning = `Notice: Height (${numHeight} m) is outside the active model's calibrated empirical range [${heightMin}, ${heightMax}] m.`;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSpeciesId) {
      setError('Please select a tree species.');
      return;
    }

    if (isNaN(numDbh) || numDbh <= 0) {
      setError('Please enter a valid positive DBH value (e.g. 35 cm).');
      return;
    }

    if (isNaN(numHeight) || numHeight <= 0) {
      setError('Please enter a valid positive tree height (e.g. 18 m).');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        speciesId: selectedSpeciesId,
        dbhCm: numDbh,
        heightM: numHeight,
        preferredModelId: selectedModelId || undefined,
        engineType
      };

      if (crownDiameterM && !isNaN(parseFloat(crownDiameterM))) {
        payload.crownDiameterM = parseFloat(crownDiameterM);
      }
      if (woodDensityOverride && !isNaN(parseFloat(woodDensityOverride))) {
        payload.woodDensityOverride = parseFloat(woodDensityOverride);
      }
      if (latitude && !isNaN(parseFloat(latitude))) {
        payload.latitude = parseFloat(latitude);
      }
      if (longitude && !isNaN(parseFloat(longitude))) {
        payload.longitude = parseFloat(longitude);
      }
      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      const result = await api.runPrediction(payload);
      onPredictionComplete(result);
    } catch (err: any) {
      setError(err.message || 'Failed to execute prediction pipeline.');
    } finally {
      setLoading(false);
    }
  };

  const applyScenario = (type: 'oak_calibrated' | 'pine_ml' | 'extrapolation_stress' | 'ash_deficient') => {
    setError(null);
    if (type === 'oak_calibrated') {
      const oak = speciesList.find(s => s.scientific_name === 'Quercus robur');
      if (oak) setSelectedSpeciesId(oak.id);
      setDbhCm('45.0');
      setHeightM('22.0');
      setCrownDiameterM('8.5');
      setWoodDensityOverride('');
      setLatitude('48.85');
      setLongitude('2.35');
      setNotes('Scenario A: Verified mature Pedunculate Oak in temperate Western Europe.');
    } else if (type === 'pine_ml') {
      const pine = speciesList.find(s => s.scientific_name === 'Pinus sylvestris');
      if (pine) setSelectedSpeciesId(pine.id);
      setDbhCm('32.0');
      setHeightM('19.0');
      setCrownDiameterM('5.2');
      setWoodDensityOverride('0.51');
      setLatitude('60.17');
      setLongitude('24.94');
      setNotes('Scenario B: Fennoscandian Scots Pine stand with site core density.');
    } else if (type === 'extrapolation_stress') {
      const oak = speciesList.find(s => s.scientific_name === 'Quercus robur');
      if (oak) setSelectedSpeciesId(oak.id);
      setDbhCm('165.0');
      setHeightM('25.0');
      setCrownDiameterM('14.0');
      setWoodDensityOverride('');
      setLatitude('48.85');
      setLongitude('2.35');
      setNotes('Scenario C: Boundary stress test (DBH 165 cm exceeds calibration domain [10, 140] cm).');
    } else if (type === 'ash_deficient') {
      const ash = speciesList.find(s => s.scientific_name === 'Fraxinus excelsior');
      if (ash) setSelectedSpeciesId(ash.id);
      setDbhCm('35.0');
      setHeightM('18.0');
      setCrownDiameterM('');
      setWoodDensityOverride('');
      setLatitude('52.52');
      setLongitude('13.40');
      setNotes('Scenario D: Scientific data deficiency test for Fraxinus excelsior.');
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <span className="badge badge-neutral">FIELD OBSERVATION PIPELINE</span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing: '-0.02em' }}>
          Record Tree Measurement & Calculate Carbon
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Submit biological metrics to trigger the deterministic species-specific allometric prediction engine.
        </p>
      </div>

      {/* Judge & Demonstration Scenarios */}
      <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--surface-inset)', border: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-secondary)' }}>
              Judge & Demonstration Scenarios
            </span>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              One-click empirical presets to evaluate core pipeline mechanisms, boundary safety, and refusal criteria.
            </div>
          </div>
          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
            RAPID EVALUATION
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', textAlign: 'left', padding: '0.5rem 0.65rem' }}
            onClick={() => applyScenario('oak_calibrated')}
          >
            <strong style={{ display: 'block', color: 'var(--text-primary)' }}>A. Calibrated Oak</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Quercus robur (DBH 45cm)</span>
          </button>

          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', textAlign: 'left', padding: '0.5rem 0.65rem' }}
            onClick={() => applyScenario('pine_ml')}
          >
            <strong style={{ display: 'block', color: 'var(--text-primary)' }}>B. Boreal Scots Pine</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Pinus sylvestris (DBH 32cm)</span>
          </button>

          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', textAlign: 'left', padding: '0.5rem 0.65rem' }}
            onClick={() => applyScenario('extrapolation_stress')}
          >
            <strong style={{ display: 'block', color: 'var(--status-warning)' }}>C. Extrapolation Test</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>DBH 165cm &gt; 140cm max</span>
          </button>

          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', textAlign: 'left', padding: '0.5rem 0.65rem' }}
            onClick={() => applyScenario('ash_deficient')}
          >
            <strong style={{ display: 'block', color: 'var(--status-error)' }}>D. Data Deficiency</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Fraxinus excelsior refusal</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--status-error-bg)',
          border: '1px solid var(--status-error)',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          color: 'var(--status-error)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          <strong>Execution Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
            1. Species Selection
          </h2>

          <div className="form-group">
            <label className="form-label">Select Tree Species (Taxon) *</label>
            <select
              value={selectedSpeciesId}
              onChange={e => setSelectedSpeciesId(e.target.value)}
              className="form-select"
              required
            >
              {speciesList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.scientific_name} — {s.common_name} ({s.family}) [ρ = {s.wood_density_mean} g/cm³]
                </option>
              ))}
            </select>
            <div className="form-hint">
              Loads calibrated wood density and allometric equations for this botanical taxon.
            </div>
          </div>

          {selectedSpecies && (
            <div style={{
              background: 'var(--surface-inset)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: '1rem',
              fontSize: '0.85rem'
            }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Reference Wood Density:</span>{' '}
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{selectedSpecies.wood_density_mean} ± {selectedSpecies.wood_density_sd} g/cm³</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Family:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{selectedSpecies.family}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Calibrated Equations:</span>{' '}
                <strong style={{ color: 'var(--accent-primary)' }}>{availableModels.length} equation(s)</strong>
              </div>
            </div>
          )}

          {scientificModel && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: 'var(--radius)',
              background: 'var(--surface-inset)',
              border: '1px solid var(--border-default)',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${scientificModel.model_category === 'scientific_trained_model' ? 'badge-high' : 'badge-prototype'}`}>
                    {scientificModel.model_category === 'scientific_trained_model' ? 'SCIENTIFICALLY TRAINED' : 'PROTOTYPE FORMULA'}
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{scientificModel.name}</strong>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    v{scientificModel.model_version}
                  </span>
                </div>
                <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 }}>
                  R² = {scientificModel.evaluation_metrics?.r2 ?? 'N/A'} | RMSE = {scientificModel.evaluation_metrics?.rmse_kg ? `${scientificModel.evaluation_metrics.rmse_kg} kg` : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                <div>
                  <span>Dataset:</span>{' '}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{scientificModel.training_dataset_id} (v{scientificModel.training_dataset_version})</span>
                </div>
                <div>
                  <span>Calibrated DBH:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{dbhMin} – {dbhMax} cm</strong>
                </div>
                <div>
                  <span>Calibrated Height:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{heightMin} – {heightMax} m</strong>
                </div>
                <div>
                  <span>Scope:</span>{' '}
                  <span>{scientificModel.applicable_geographic_scope.description}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tree Measurements Workspace */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              2. Measurable Physical Dimensions (Scientific Workspace)
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Schema calibrated for {selectedSpecies?.scientific_name || 'selected taxon'}
            </span>
          </div>

          {selectedSpecies?.scientific_name === 'Fraxinus excelsior' ? (
            <div style={{
              background: 'var(--status-warning-bg)',
              border: '1px solid rgba(166, 130, 14, 0.35)',
              borderRadius: 'var(--radius)',
              padding: '1.25rem',
              color: 'var(--status-warning)',
              lineHeight: 1.5
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Measurement Workspace Disabled for Fraxinus excelsior
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>
                This taxon is classified as <strong>Insufficient Scientific Data</strong>. GoNax enforces strict scientific bounds and does not compute estimates using generic or uncalibrated equations. Please select a species with an active scientific ML or demonstration model (e.g. <em>Quercus robur</em>, <em>Pinus sylvestris</em>, or <em>Fagus sylvatica</em>).
              </p>
            </div>
          ) : (
            <>
              <div className="grid-2">
                {/* DBH Input Card */}
                <div className="form-group" style={{ background: 'var(--surface-inset)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Diameter at Breast Height (DBH) *
                    </label>
                    <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                      REQUIRED [cm]
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="400"
                    value={dbhCm}
                    onChange={e => setDbhCm(e.target.value)}
                    className="form-input"
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Calibrated Range:</span>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>[{dbhMin} – {dbhMax}] cm</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.4 }}>
                    Trunk diameter measured at 1.30 m height above ground level. Primary allometric proxy for basal stem cross-section and sapwood area.
                  </div>

                  {/* Inline Validation Indicator */}
                  {!isNaN(numDbh) && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      {numDbh <= 0 || numDbh > 400 ? (
                        <span style={{ color: 'var(--status-error)' }}>[INVALID] Value exceeds physiological bounds (1 – 400 cm)</span>
                      ) : numDbh < dbhMin || numDbh > dbhMax ? (
                        <span style={{ color: 'var(--status-warning)' }}>[EXTRAPOLATION] Outside model calibration range [{dbhMin} – {dbhMax} cm]</span>
                      ) : (
                        <span style={{ color: 'var(--status-success)' }}>[VALID] Within empirical calibration range [{dbhMin} – {dbhMax} cm]</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Tree Height Input Card */}
                <div className="form-group" style={{ background: 'var(--surface-inset)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Total Tree Height (H) *
                    </label>
                    <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                      REQUIRED [m]
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="140"
                    value={heightM}
                    onChange={e => setHeightM(e.target.value)}
                    className="form-input"
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Calibrated Range:</span>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>[{heightMin} – {heightMax}] m</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.4 }}>
                    Vertical distance from trunk base to highest crown tip. Scaled with DBH to compute stem volume.
                  </div>

                  {/* Inline Validation Indicator */}
                  {!isNaN(numHeight) && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      {numHeight <= 0 || numHeight > 140 ? (
                        <span style={{ color: 'var(--status-error)' }}>[INVALID] Value exceeds physiological bounds (1 – 140 m)</span>
                      ) : numHeight < heightMin || numHeight > heightMax ? (
                        <span style={{ color: 'var(--status-warning)' }}>[EXTRAPOLATION] Outside model calibration range [{heightMin} – {heightMax} m]</span>
                      ) : (
                        <span style={{ color: 'var(--status-success)' }}>[VALID] Within empirical calibration range [{heightMin} – {heightMax} m]</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {preflightWarning && (
                <div style={{
                  background: 'var(--status-warning-bg)',
                  border: '1px solid rgba(166, 130, 14, 0.4)',
                  borderRadius: 'var(--radius)',
                  padding: '0.85rem 1rem',
                  color: 'var(--status-warning)',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem'
                }}>
                  {preflightWarning}
                </div>
              )}

              <div className="grid-2">
                {/* Crown Diameter Input Card */}
                <div className="form-group" style={{ background: 'var(--surface-inset)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Crown Diameter (Cd)
                    </label>
                    <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                      OPTIONAL [m]
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="60"
                    placeholder="e.g. 7.5"
                    value={crownDiameterM}
                    onChange={e => setCrownDiameterM(e.target.value)}
                    className="form-input"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.4 }}>
                    Average horizontal canopy spread. Informs multi-feature ML models regarding branch biomass.
                  </div>
                </div>

                {/* Wood Density Override Input Card */}
                <div className="form-group" style={{ background: 'var(--surface-inset)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Wood Density Override (ρ)
                    </label>
                    <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                      OPTIONAL [g/cm³]
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="1.5"
                    placeholder={`Default: ${selectedSpecies?.wood_density_mean || '0.65'}`}
                    value={woodDensityOverride}
                    onChange={e => setWoodDensityOverride(e.target.value)}
                    className="form-input"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.4 }}>
                    Site-specific xylem core density. If left blank, species mean ρ = {selectedSpecies?.wood_density_mean || '0.65'} ± {selectedSpecies?.wood_density_sd || '0.04'} g/cm³ is used.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Model & Engine Configuration */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
            3. Prediction Engine & Model Selection
          </h2>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Calibrated Equation / Model</label>
              <select
                value={selectedModelId}
                onChange={e => setSelectedModelId(e.target.value)}
                className="form-select"
              >
                {availableModels.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.model_type})
                  </option>
                ))}
              </select>
              {activeModel && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {activeModel.formula_expression}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Prediction Engine Architecture</label>
              <select
                value={engineType}
                onChange={e => setEngineType(e.target.value as any)}
                className="form-select"
              >
                <option value="formula">FormulaPredictionEngine (Deterministic Forestry Standard)</option>
                <option value="ml_model">MLModelPredictionEngine (Trained Regressor Model)</option>
              </select>
              <div className="form-hint">
                Isolated scientific execution engine.
              </div>
            </div>
          </div>
        </div>

        {/* Optional Metadata */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
            4. Geographic Coordinates & Observation Notes (Optional)
          </h2>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Latitude</label>
              <input
                type="number"
                step="0.000001"
                placeholder="e.g. 51.5074"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Longitude</label>
              <input
                type="number"
                step="0.000001"
                placeholder="e.g. -0.1278"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Field Notes / Plot Metadata</label>
            <textarea
              rows={2}
              placeholder="e.g. Dominant canopy layer, mature stand, sandy loam soil."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="form-textarea"
            />
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            type="submit"
            disabled={loading || selectedSpecies?.scientific_name === 'Fraxinus excelsior'}
            className="btn-primary"
            style={{
              padding: '0.75rem 1.8rem',
              fontSize: '0.95rem',
              opacity: (loading || selectedSpecies?.scientific_name === 'Fraxinus excelsior') ? 0.6 : 1,
              cursor: (loading || selectedSpecies?.scientific_name === 'Fraxinus excelsior') ? 'not-allowed' : 'pointer'
            }}
          >
            {loading
              ? 'Executing Deterministic Pipeline...'
              : selectedSpecies?.scientific_name === 'Fraxinus excelsior'
              ? 'Estimation Disabled (Data Deficient)'
              : 'Calculate Biomass & Carbon →'}
          </button>
        </div>
      </form>
    </div>
  );
};
