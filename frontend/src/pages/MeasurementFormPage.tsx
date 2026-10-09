import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Species, SpeciesModel, EnrichedPrediction, ModelMetadata } from '../types';
import { ScientificGlossaryModal } from '../components/ScientificGlossaryModal';
import { FirstUseWalkthrough } from '../components/FirstUseWalkthrough';
import { ReviewSubmitModal } from '../components/ReviewSubmitModal';
import {
  convertInchesToCm,
  convertFeetToMeters,
  SCIENTIFIC_GLOSSARY,
  formatLocaleNumber
} from '../utils/i18n';

export type AdaptiveWorkflowRole = 'beginner' | 'forestry' | 'researcher' | 'advanced';

interface Props {
  initialSpeciesId?: string | null;
  onPredictionComplete: (prediction: EnrichedPrediction) => void;
  onNavigate?: (page: any) => void;
}

export const MeasurementFormPage: React.FC<Props> = ({
  initialSpeciesId,
  onPredictionComplete,
  onNavigate
}) => {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>('');
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);
  const [availableModels, setAvailableModels] = useState<SpeciesModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [scientificModel, setScientificModel] = useState<ModelMetadata | null>(null);
  const [engineType, setEngineType] = useState<'formula' | 'ml_model'>('formula');

  // Adaptive Workflow State
  const [workflowRole, setWorkflowRole] = useState<AdaptiveWorkflowRole>('beginner');

  // Unit Systems State
  const [dbhUnit, setDbhUnit] = useState<'cm' | 'in'>('cm');
  const [heightUnit, setHeightUnit] = useState<'m' | 'ft'>('m');

  // Measurement input fields
  const [dbhInput, setDbhInput] = useState<string>('35.0');
  const [heightInput, setHeightInput] = useState<string>('18.5');
  const [crownDiameterM, setCrownDiameterM] = useState<string>('');
  const [woodDensityOverride, setWoodDensityOverride] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Modals & Guided Walkthrough State
  const [showGlossaryModal, setShowGlossaryModal] = useState<boolean>(false);
  const [glossaryInitialTerm, setGlossaryInitialTerm] = useState<string | undefined>(undefined);
  const [showWalkthroughModal, setShowWalkthroughModal] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [isDemoRun, setIsDemoRun] = useState<boolean>(false);

  // Expanded Guidance Panels
  const [expandedGuidance, setExpandedGuidance] = useState<Record<string, boolean>>({
    dbh: true,
    height: false,
    woodDensity: false
  });

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Load species on mount
  useEffect(() => {
    async function load() {
      try {
        const list = await api.getSpeciesList();
        setSpeciesList(list);
        if (list.length > 0) {
          const targetId =
            initialSpeciesId && list.some(s => s.id === initialSpeciesId)
              ? initialSpeciesId
              : list[0].id;
          setSelectedSpeciesId(targetId);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to connect to species registry.');
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

  // Canonical Metric Calculations
  const rawNumDbh = parseFloat(dbhInput);
  const rawNumHeight = parseFloat(heightInput);

  const canonicalDbhCm: number = !isNaN(rawNumDbh)
    ? dbhUnit === 'in'
      ? convertInchesToCm(rawNumDbh).metricValue
      : rawNumDbh
    : NaN;

  const canonicalHeightM: number = !isNaN(rawNumHeight)
    ? heightUnit === 'ft'
      ? convertFeetToMeters(rawNumHeight).metricValue
      : rawNumHeight
    : NaN;

  // Pre-flight calibration limits check
  const dbhMin =
    scientificModel?.features?.find(f => f.name === 'dbh_cm')?.min ??
    activeModel?.parameters?.dbhMinCm ??
    5;
  const dbhMax =
    scientificModel?.features?.find(f => f.name === 'dbh_cm')?.max ??
    activeModel?.parameters?.dbhMaxCm ??
    150;
  const heightMin =
    scientificModel?.features?.find(f => f.name === 'height_m')?.min ??
    activeModel?.parameters?.heightMinM ??
    2;
  const heightMax =
    scientificModel?.features?.find(f => f.name === 'height_m')?.max ??
    activeModel?.parameters?.heightMaxM ??
    45;

  let preflightWarning: string | null = null;

  if (!isNaN(canonicalDbhCm)) {
    if (canonicalDbhCm < dbhMin || canonicalDbhCm > dbhMax) {
      preflightWarning = `Notice: DBH (${canonicalDbhCm} cm) is outside the active model's calibrated empirical range [${dbhMin}, ${dbhMax}] cm. An extrapolation warning will be permanently attached to calculation output.`;
    }
  }

  if (!isNaN(canonicalHeightM) && !preflightWarning) {
    if (canonicalHeightM < heightMin || canonicalHeightM > heightMax) {
      preflightWarning = `Notice: Height (${canonicalHeightM} m) is outside the active model's calibrated empirical range [${heightMin}, ${heightMax}] m.`;
    }
  }

  const toggleGuidance = (field: string) => {
    setExpandedGuidance(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const openGlossaryForTerm = (termKey: string) => {
    setGlossaryInitialTerm(termKey);
    setShowGlossaryModal(true);
  };

  // Validate form inputs
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedSpeciesId) {
      errors.species = 'Please select a tree species from the catalog.';
    }

    if (isNaN(rawNumDbh) || rawNumDbh <= 0) {
      errors.dbh = `Please enter a valid positive stem diameter (${dbhUnit}).`;
    } else if (canonicalDbhCm > 400) {
      errors.dbh = `DBH (${canonicalDbhCm} cm) exceeds global biological maximum (400 cm).`;
    } else if (canonicalDbhCm < 1) {
      errors.dbh = `DBH (${canonicalDbhCm} cm) is below minimum biological sapling threshold (1 cm).`;
    }

    if (isNaN(rawNumHeight) || rawNumHeight <= 0) {
      errors.height = `Please enter a valid positive tree height (${heightUnit}).`;
    } else if (canonicalHeightM > 140) {
      errors.height = `Height (${canonicalHeightM} m) exceeds global biological maximum (140 m).`;
    } else if (canonicalHeightM < 0.5) {
      errors.height = `Height (${canonicalHeightM} m) is below minimum measurable sapling threshold (0.5 m).`;
    }

    if (crownDiameterM) {
      const cd = parseFloat(crownDiameterM);
      if (isNaN(cd) || cd <= 0 || cd > 70) {
        errors.crown = 'Crown diameter must be between 0.5 and 70 meters.';
      }
    }

    if (woodDensityOverride) {
      const wd = parseFloat(woodDensityOverride);
      if (isNaN(wd) || wd < 0.15 || wd > 1.45) {
        errors.woodDensity = 'Wood density override must fall within physical envelope [0.15, 1.45] g/cm³.';
      }
    }

    if (latitude) {
      const lat = parseFloat(latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.latitude = 'Latitude must be between -90 and 90 degrees.';
      }
    }

    if (longitude) {
      const lon = parseFloat(longitude);
      if (isNaN(lon) || lon < -180 || lon > 180) {
        errors.longitude = 'Longitude must be between -180 and 180 degrees.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedSpecies?.scientific_name === 'Fraxinus excelsior') {
      setError('Calculations are refused for Fraxinus excelsior due to scientific data deficiency.');
      return;
    }

    if (validateForm()) {
      setShowReviewModal(true);
    }
  };

  // Execution with duplicate submission protection
  const executePrediction = async () => {
    if (isSubmitting) return; // Prevent duplicate execution
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        speciesId: selectedSpeciesId,
        dbhCm: canonicalDbhCm,
        heightM: canonicalHeightM,
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

      // Attach demonstration flag to result object if run with demo preset
      if (isDemoRun && result && result.prediction) {
        result.prediction.is_demo_run = true;
      }

      setShowReviewModal(false);
      onPredictionComplete(result);
    } catch (err: any) {
      setError(err.message || 'Failed to execute deterministic prediction pipeline.');
      setShowReviewModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPresetScenario = (
    type: 'oak_calibrated' | 'pine_ml' | 'extrapolation_stress' | 'ash_deficient'
  ) => {
    setError(null);
    setFieldErrors({});
    setIsDemoRun(true); // Explicitly flag as demonstration data!
    setDbhUnit('cm');
    setHeightUnit('m');

    if (type === 'oak_calibrated') {
      const oak = speciesList.find(s => s.scientific_name === 'Quercus robur');
      if (oak) setSelectedSpeciesId(oak.id);
      setDbhInput('45.0');
      setHeightInput('22.0');
      setCrownDiameterM('8.5');
      setWoodDensityOverride('');
      setLatitude('48.85');
      setLongitude('2.35');
      setNotes('[DEMONSTRATION RUN]: Verified mature Pedunculate Oak in temperate Western Europe.');
    } else if (type === 'pine_ml') {
      const pine = speciesList.find(s => s.scientific_name === 'Pinus sylvestris');
      if (pine) setSelectedSpeciesId(pine.id);
      setDbhInput('32.0');
      setHeightInput('19.0');
      setCrownDiameterM('5.2');
      setWoodDensityOverride('0.51');
      setLatitude('60.17');
      setLongitude('24.94');
      setNotes('[DEMONSTRATION RUN]: Fennoscandian Scots Pine stand with site core density.');
    } else if (type === 'extrapolation_stress') {
      const oak = speciesList.find(s => s.scientific_name === 'Quercus robur');
      if (oak) setSelectedSpeciesId(oak.id);
      setDbhInput('165.0');
      setHeightInput('25.0');
      setCrownDiameterM('14.0');
      setWoodDensityOverride('');
      setLatitude('48.85');
      setLongitude('2.35');
      setNotes('[DEMONSTRATION RUN]: Boundary stress test (DBH 165 cm exceeds calibration domain [10, 140] cm).');
    } else if (type === 'ash_deficient') {
      const ash = speciesList.find(s => s.scientific_name === 'Fraxinus excelsior');
      if (ash) setSelectedSpeciesId(ash.id);
      setDbhInput('35.0');
      setHeightInput('18.0');
      setCrownDiameterM('');
      setWoodDensityOverride('');
      setLatitude('52.52');
      setLongitude('13.40');
      setNotes('[DEMONSTRATION RUN]: Scientific data deficiency test for Fraxinus excelsior.');
    }
  };

  const handleUnitToggle = (type: 'dbh' | 'height', newUnit: any) => {
    if (type === 'dbh') {
      if (newUnit === dbhUnit) return;
      if (newUnit === 'in' && !isNaN(rawNumDbh)) {
        setDbhInput((rawNumDbh / 2.54).toFixed(1));
      } else if (newUnit === 'cm' && !isNaN(rawNumDbh)) {
        setDbhInput((rawNumDbh * 2.54).toFixed(1));
      }
      setDbhUnit(newUnit);
    } else {
      if (newUnit === heightUnit) return;
      if (newUnit === 'ft' && !isNaN(rawNumHeight)) {
        setHeightInput((rawNumHeight / 0.3048).toFixed(1));
      } else if (newUnit === 'm' && !isNaN(rawNumHeight)) {
        setHeightInput((rawNumHeight * 0.3048).toFixed(1));
      }
      setHeightUnit(newUnit);
    }
  };

  const clearForm = () => {
    setIsDemoRun(false);
    setError(null);
    setFieldErrors({});
    setDbhInput('35.0');
    setHeightInput('18.5');
    setCrownDiameterM('');
    setWoodDensityOverride('');
    setLatitude('');
    setLongitude('');
    setNotes('');
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      {/* Page Title & Top Actions */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
              FIELD MEASUREMENT PIPELINE
            </span>
            {isDemoRun && (
              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                DEMONSTRATION MODE ACTIVE
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Record Tree Observation & Calculate Carbon
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Enter physical biometric measurements to trigger the deterministic, species-specific allometric calculation engine.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setShowGlossaryModal(true)}
            aria-label="Open scientific glossary"
          >
            [Scientific Glossary]
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setShowWalkthroughModal(true)}
            aria-label="Start interactive first-use walkthrough"
          >
            [Guided Walkthrough]
          </button>
        </div>
      </div>

      {/* Adaptive Workflow Role Selector */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          background: 'var(--surface-inset)',
          border: '1px solid var(--border-default)',
          padding: '1.15rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent-secondary)' }}>
              Adaptive Workflow Profile
            </span>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Tailors explanations and input detail to your technical background without altering scientific calculation rules.
            </div>
          </div>
          <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
            ONE SHARED ENGINE
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Select adaptive workflow profile"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}
        >
          <button
            type="button"
            className={`btn-sm ${workflowRole === 'beginner' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textAlign: 'left', padding: '0.6rem 0.75rem' }}
            onClick={() => setWorkflowRole('beginner')}
            role="radio"
            aria-checked={workflowRole === 'beginner'}
          >
            <strong style={{ display: 'block', fontSize: '0.82rem' }}>1. Beginner / Student</strong>
            <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>Plain language, analogies, guidance</span>
          </button>

          <button
            type="button"
            className={`btn-sm ${workflowRole === 'forestry' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textAlign: 'left', padding: '0.6rem 0.75rem' }}
            onClick={() => setWorkflowRole('forestry')}
            role="radio"
            aria-checked={workflowRole === 'forestry'}
          >
            <strong style={{ display: 'block', fontSize: '0.82rem' }}>2. Forestry Field Pro</strong>
            <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>D-tape protocol, site cores, GPS</span>
          </button>

          <button
            type="button"
            className={`btn-sm ${workflowRole === 'researcher' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textAlign: 'left', padding: '0.6rem 0.75rem' }}
            onClick={() => setWorkflowRole('researcher')}
            role="radio"
            aria-checked={workflowRole === 'researcher'}
          >
            <strong style={{ display: 'block', fontSize: '0.82rem' }}>3. Carbon Researcher</strong>
            <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>Allometric coefficients, DOIs, RSE</span>
          </button>

          <button
            type="button"
            className={`btn-sm ${workflowRole === 'advanced' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textAlign: 'left', padding: '0.6rem 0.75rem' }}
            onClick={() => setWorkflowRole('advanced')}
            role="radio"
            aria-checked={workflowRole === 'advanced'}
          >
            <strong style={{ display: 'block', fontSize: '0.82rem' }}>4. Model Auditor</strong>
            <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>Feature vectors, training splits</span>
          </button>
        </div>
      </div>

      {/* Demonstration Data Presets */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--surface-panel)',
          padding: '1rem 1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)' }}>
              Sample Demonstration Datasets
            </span>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Load verified test cases to explore deterministic predictions, calibration envelopes, and scientific refusals.
            </div>
          </div>
          {isDemoRun && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={clearForm}
              style={{ fontSize: '0.72rem' }}
            >
              Reset to Field Inventory Mode
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', textAlign: 'left', padding: '0.5rem 0.65rem' }}
            onClick={() => applyPresetScenario('oak_calibrated')}
          >
            <strong style={{ display: 'block', color: 'var(--text-primary)' }}>[Demo] Calibrated Oak</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Quercus robur (DBH 45 cm, H 22 m)</span>
          </button>

          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', textAlign: 'left', padding: '0.5rem 0.65rem' }}
            onClick={() => applyPresetScenario('pine_ml')}
          >
            <strong style={{ display: 'block', color: 'var(--text-primary)' }}>[Demo] Scots Pine ML</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Pinus sylvestris (DBH 32 cm, H 19 m)</span>
          </button>

          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', textAlign: 'left', padding: '0.5rem 0.65rem' }}
            onClick={() => applyPresetScenario('extrapolation_stress')}
          >
            <strong style={{ display: 'block', color: 'var(--status-warning)' }}>[Demo] Extrapolation Test</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>DBH 165 cm &gt; 140 cm max limit</span>
          </button>

          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', textAlign: 'left', padding: '0.5rem 0.65rem' }}
            onClick={() => applyPresetScenario('ash_deficient')}
          >
            <strong style={{ display: 'block', color: 'var(--status-error)' }}>[Demo] Data Deficiency</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Fraxinus excelsior safe refusal</span>
          </button>
        </div>
      </div>

      {/* Top Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--status-error-bg)',
            border: '1px solid var(--status-error)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            color: 'var(--status-error)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem'
          }}
        >
          <strong>Validation / Execution Error:</strong> {error}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleOpenReview} noValidate>
        {/* SECTION 1: SPECIES SELECTION */}
        <fieldset className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-default)' }}>
          <legend style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', padding: '0 0.5rem', marginBottom: '0.75rem' }}>
            1. Botanical Taxon (Tree Species) Selection
          </legend>

          <div className="form-group">
            <label htmlFor="species-select" className="form-label" style={{ fontWeight: 700 }}>
              Select Tree Species *
            </label>
            <select
              id="species-select"
              value={selectedSpeciesId}
              onChange={e => {
                setSelectedSpeciesId(e.target.value);
                setError(null);
              }}
              className="form-select"
              required
              aria-describedby="species-help-text"
              aria-invalid={!!fieldErrors.species}
            >
              {speciesList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.scientific_name} — {s.common_name} ({s.family}) [ρ = {s.wood_density_mean} g/cm³]
                </option>
              ))}
            </select>
            <div id="species-help-text" className="form-hint">
              Select the exact botanical taxon. GoNax will automatically resolve calibrated empirical equations and species-specific wood density coefficients.
            </div>
            {fieldErrors.species && (
              <div style={{ color: 'var(--status-error)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                {fieldErrors.species}
              </div>
            )}
          </div>

          {selectedSpecies && (
            <div
              style={{
                background: 'var(--surface-inset)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius)',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: '1rem',
                fontSize: '0.825rem'
              }}
            >
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Reference Mean Wood Density:</span>{' '}
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {selectedSpecies.wood_density_mean} ± {selectedSpecies.wood_density_sd} g/cm³
                </strong>
                <button
                  type="button"
                  onClick={() => openGlossaryForTerm('wood_density')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', marginLeft: '0.35rem', fontSize: '0.75rem', textDecoration: 'underline' }}
                >
                  [What is this?]
                </button>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Botanical Family:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{selectedSpecies.family}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Calibrated Equations:</span>{' '}
                <strong style={{ color: 'var(--accent-primary)' }}>{availableModels.length} equation(s) registered</strong>
              </div>
            </div>
          )}

          {/* Model Information Box */}
          {scientificModel && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius)',
                background: 'var(--surface-inset)',
                border: '1px solid var(--border-default)',
                fontSize: '0.825rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
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

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                <div>
                  <span>Calibrated DBH:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{dbhMin} – {dbhMax} cm</strong>
                </div>
                <div>
                  <span>Calibrated Height:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{heightMin} – {heightMax} m</strong>
                </div>
                <div>
                  <span>Carbon Fraction:</span>{' '}
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {(scientificModel.carbon_fraction * 100).toFixed(1)}%
                  </strong>
                </div>
              </div>
            </div>
          )}
        </fieldset>

        {/* SECTION 2: MEASURABLE PHYSICAL DIMENSIONS */}
        <fieldset className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-default)' }}>
          <legend style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', padding: '0 0.5rem', marginBottom: '0.75rem' }}>
            2. Measurable Physical Dimensions (Biometric Inputs)
          </legend>

          {selectedSpecies?.scientific_name === 'Fraxinus excelsior' ? (
            <div
              style={{
                background: 'var(--status-warning-bg)',
                border: '1px solid rgba(166, 130, 14, 0.4)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem',
                color: 'var(--status-warning)',
                lineHeight: 1.55
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>
                Scientific Prediction Refused for Fraxinus excelsior
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>
                This taxon is classified as <strong>Insufficient Scientific Data</strong>. GoNax refuses to invent or apply generic uncalibrated equations. To compute carbon, please select a species with an active empirical model (*Quercus robur*, *Pinus sylvestris*, *Fagus sylvatica*, or *Acer pseudoplatanus*).
              </p>
            </div>
          ) : (
            <>
              {/* UNIT TOGGLE BAR */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--surface-inset)',
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius)',
                  marginBottom: '1.25rem',
                  border: '1px solid var(--border-default)',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    PREFERRED FIELD UNITS:
                  </span>{' '}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    (Metric standard SI is the primary canonical reference)
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>DBH:</span>
                    <button
                      type="button"
                      className={`btn-sm ${dbhUnit === 'cm' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleUnitToggle('dbh', 'cm')}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                    >
                      Centimeters (cm)
                    </button>
                    <button
                      type="button"
                      className={`btn-sm ${dbhUnit === 'in' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleUnitToggle('dbh', 'in')}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                    >
                      Inches (in)
                    </button>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Height:</span>
                    <button
                      type="button"
                      className={`btn-sm ${heightUnit === 'm' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleUnitToggle('height', 'm')}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                    >
                      Meters (m)
                    </button>
                    <button
                      type="button"
                      className={`btn-sm ${heightUnit === 'ft' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleUnitToggle('height', 'ft')}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                    >
                      Feet (ft)
                    </button>
                  </div>
                </div>
              </div>

              {/* INPUT FIELDS: DBH & HEIGHT */}
              <div className="grid-2">
                {/* DBH Input Card */}
                <div
                  className="form-group"
                  style={{
                    background: 'var(--surface-inset)',
                    padding: '1rem',
                    borderRadius: 'var(--radius)',
                    border: fieldErrors.dbh ? '1px solid var(--status-error)' : '1px solid var(--border-default)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label htmlFor="dbh-input" className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      Diameter at Breast Height (DBH) *
                    </label>
                    <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                      REQUIRED [{dbhUnit.toUpperCase()}]
                    </span>
                  </div>

                  <input
                    id="dbh-input"
                    type="number"
                    step="0.1"
                    min="1"
                    max={dbhUnit === 'cm' ? '400' : '157'}
                    value={dbhInput}
                    onChange={e => {
                      setDbhInput(e.target.value);
                      setFieldErrors(prev => ({ ...prev, dbh: '' }));
                    }}
                    className="form-input"
                    required
                    aria-describedby="dbh-context-panel"
                    aria-invalid={!!fieldErrors.dbh}
                  />

                  {/* Explicit Conversion Readout */}
                  {dbhUnit === 'in' && !isNaN(rawNumDbh) && (
                    <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                      Explicit SI Conversion: {rawNumDbh} in × 2.54 = {canonicalDbhCm.toFixed(2)} cm
                    </div>
                  )}

                  {/* Range Check */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Calibrated Range:</span>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      [{dbhMin} – {dbhMax}] cm
                    </strong>
                  </div>

                  {/* Inline Status Badge */}
                  {!isNaN(canonicalDbhCm) && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      {canonicalDbhCm <= 0 || canonicalDbhCm > 400 ? (
                        <span style={{ color: 'var(--status-error)' }}>[INVALID] Exceeds physical bounds (1 – 400 cm)</span>
                      ) : canonicalDbhCm < dbhMin || canonicalDbhCm > dbhMax ? (
                        <span style={{ color: 'var(--status-warning)' }}>[EXTRAPOLATION] Outside model calibration range [{dbhMin} – {dbhMax} cm]</span>
                      ) : (
                        <span style={{ color: 'var(--status-success)' }}>[VALID] Within calibrated empirical domain</span>
                      )}
                    </div>
                  )}

                  {fieldErrors.dbh && (
                    <div style={{ color: 'var(--status-error)', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                      {fieldErrors.dbh}
                    </div>
                  )}

                  {/* Contextual Guidance Accordion */}
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-default)', paddingTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => toggleGuidance('dbh')}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}
                    >
                      <span>{expandedGuidance.dbh ? '▼' : '►'}</span>
                      <span>Measurement Guidance for DBH</span>
                    </button>

                    {expandedGuidance.dbh && (
                      <div id="dbh-context-panel" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem', lineHeight: 1.45 }}>
                        <div><strong>What it means:</strong> Stem diameter measured at 1.30 m height above ground level.</div>
                        <div><strong>Why GoNax needs it:</strong> Foundational proxy for stem cross-sectional area and dry mass.</div>
                        <div><strong>How it is measured:</strong> Forestry diameter tape (D-tape) on the uphill face of the tree.</div>
                        <div><strong>Required:</strong> Yes. Calculations cannot execute without DBH.</div>
                        <div><strong>Supported range:</strong> Model calibrated: [{dbhMin}, {dbhMax}] cm; Biological envelope: [1, 400] cm.</div>
                        <div><strong>When missing:</strong> Deterministic estimation halted to protect data integrity.</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tree Height Input Card */}
                <div
                  className="form-group"
                  style={{
                    background: 'var(--surface-inset)',
                    padding: '1rem',
                    borderRadius: 'var(--radius)',
                    border: fieldErrors.height ? '1px solid var(--status-error)' : '1px solid var(--border-default)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label htmlFor="height-input" className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      Total Tree Height (H) *
                    </label>
                    <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                      REQUIRED [{heightUnit.toUpperCase()}]
                    </span>
                  </div>

                  <input
                    id="height-input"
                    type="number"
                    step="0.1"
                    min="0.5"
                    max={heightUnit === 'm' ? '140' : '450'}
                    value={heightInput}
                    onChange={e => {
                      setHeightInput(e.target.value);
                      setFieldErrors(prev => ({ ...prev, height: '' }));
                    }}
                    className="form-input"
                    required
                    aria-describedby="height-context-panel"
                    aria-invalid={!!fieldErrors.height}
                  />

                  {/* Explicit Conversion Readout */}
                  {heightUnit === 'ft' && !isNaN(rawNumHeight) && (
                    <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                      Explicit SI Conversion: {rawNumHeight} ft × 0.3048 = {canonicalHeightM.toFixed(2)} m
                    </div>
                  )}

                  {/* Range Check */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Calibrated Range:</span>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      [{heightMin} – {heightMax}] m
                    </strong>
                  </div>

                  {/* Inline Status Badge */}
                  {!isNaN(canonicalHeightM) && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      {canonicalHeightM <= 0 || canonicalHeightM > 140 ? (
                        <span style={{ color: 'var(--status-error)' }}>[INVALID] Exceeds physical bounds (0.5 – 140 m)</span>
                      ) : canonicalHeightM < heightMin || canonicalHeightM > heightMax ? (
                        <span style={{ color: 'var(--status-warning)' }}>[EXTRAPOLATION] Outside model calibration range [{heightMin} – {heightMax} m]</span>
                      ) : (
                        <span style={{ color: 'var(--status-success)' }}>[VALID] Within calibrated empirical domain</span>
                      )}
                    </div>
                  )}

                  {fieldErrors.height && (
                    <div style={{ color: 'var(--status-error)', fontSize: '0.78rem', marginTop: '0.35rem' }}>
                      {fieldErrors.height}
                    </div>
                  )}

                  {/* Contextual Guidance Accordion */}
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-default)', paddingTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => toggleGuidance('height')}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}
                    >
                      <span>{expandedGuidance.height ? '▼' : '►'}</span>
                      <span>Measurement Guidance for Height</span>
                    </button>

                    {expandedGuidance.height && (
                      <div id="height-context-panel" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem', lineHeight: 1.45 }}>
                        <div><strong>What it means:</strong> Vertical distance from ground level at trunk base to top of canopy.</div>
                        <div><strong>Why GoNax needs it:</strong> Informs stem taper and vertical volume scaling.</div>
                        <div><strong>How it is measured:</strong> Optical clinometer, hypsometer, or vertex tool.</div>
                        <div><strong>Required:</strong> Yes. All models require height.</div>
                        <div><strong>Supported range:</strong> Model calibrated: [{heightMin}, {heightMax}] m; Biological envelope: [0.5, 140] m.</div>
                        <div><strong>When missing:</strong> Deterministic estimation halted to protect data integrity.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preflight Warning Alert */}
              {preflightWarning && (
                <div
                  role="status"
                  style={{
                    background: 'var(--status-warning-bg)',
                    border: '1px solid var(--status-warning)',
                    borderRadius: 'var(--radius)',
                    padding: '0.85rem 1rem',
                    color: 'var(--status-warning)',
                    fontSize: '0.825rem',
                    marginBottom: '1.25rem',
                    marginTop: '0.5rem'
                  }}
                >
                  {preflightWarning}
                </div>
              )}

              {/* OPTIONAL MEASUREMENTS (Shown based on role) */}
              {(workflowRole !== 'beginner' || crownDiameterM || woodDensityOverride) && (
                <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                  {/* Crown Diameter */}
                  <div
                    className="form-group"
                    style={{
                      background: 'var(--surface-inset)',
                      padding: '1rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border-default)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label htmlFor="crown-input" className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                        Crown Diameter (Cd)
                      </label>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                        OPTIONAL [m]
                      </span>
                    </div>

                    <input
                      id="crown-input"
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="70"
                      placeholder="e.g. 8.5"
                      value={crownDiameterM}
                      onChange={e => setCrownDiameterM(e.target.value)}
                      className="form-input"
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                      Average horizontal canopy diameter. Informs multi-variable branch models.
                    </div>
                  </div>

                  {/* Wood Density Override */}
                  <div
                    className="form-group"
                    style={{
                      background: 'var(--surface-inset)',
                      padding: '1rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border-default)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label htmlFor="density-input" className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                        Wood Density Override (ρ)
                      </label>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                        OPTIONAL [g/cm³]
                      </span>
                    </div>

                    <input
                      id="density-input"
                      type="number"
                      step="0.01"
                      min="0.15"
                      max="1.45"
                      placeholder={`Baseline: ${selectedSpecies?.wood_density_mean ?? '0.65'}`}
                      value={woodDensityOverride}
                      onChange={e => setWoodDensityOverride(e.target.value)}
                      className="form-input"
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                      Site-specific xylem core density. If empty, species baseline ρ = {selectedSpecies?.wood_density_mean ?? '0.65'} g/cm³ is used.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </fieldset>

        {/* SECTION 3: MODEL & ENGINE CONFIGURATION (RESEARCHER / ADVANCED) */}
        {workflowRole !== 'beginner' && (
          <fieldset className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--border-default)' }}>
            <legend style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', padding: '0 0.5rem', marginBottom: '0.75rem' }}>
              3. Prediction Engine & Model Selection
            </legend>

            <div className="grid-2">
              <div className="form-group">
                <label htmlFor="model-select" className="form-label">
                  Active Model Specification
                </label>
                <select
                  id="model-select"
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
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    {activeModel.formula_expression}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="engine-select" className="form-label">
                  Execution Engine Architecture
                </label>
                <select
                  id="engine-select"
                  value={engineType}
                  onChange={e => setEngineType(e.target.value as any)}
                  className="form-select"
                >
                  <option value="formula">FormulaPredictionEngine (Standard Forestry Allometry)</option>
                  <option value="ml_model">MLModelPredictionEngine (Trained Regressor Model)</option>
                </select>
                <div className="form-hint">
                  Deterministically computes dry biomass with 95% confidence intervals.
                </div>
              </div>
            </div>
          </fieldset>
        )}

        {/* SECTION 4: FIELD PLOT METADATA (FORESTRY / RESEARCHER) */}
        {(workflowRole === 'forestry' || workflowRole === 'researcher' || workflowRole === 'advanced') && (
          <fieldset className="card" style={{ marginBottom: '1.75rem', border: '1px solid var(--border-default)' }}>
            <legend style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', padding: '0 0.5rem', marginBottom: '0.75rem' }}>
              4. Geographic Coordinates & Plot Inventory Notes (Optional)
            </legend>

            <div className="grid-2">
              <div className="form-group">
                <label htmlFor="lat-input" className="form-label">Latitude (Decimal Degrees)</label>
                <input
                  id="lat-input"
                  type="number"
                  step="0.000001"
                  placeholder="e.g. 51.5074"
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="lon-input" className="form-label">Longitude (Decimal Degrees)</label>
                <input
                  id="lon-input"
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
              <label htmlFor="notes-input" className="form-label">Stand Notes & Canopy Layer</label>
              <textarea
                id="notes-input"
                rows={2}
                placeholder="e.g. Dominant canopy layer, mature stand, sandy loam soil."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="form-textarea"
              />
            </div>
          </fieldset>
        )}

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={clearForm}
            disabled={isSubmitting}
          >
            Clear / Reset Inputs
          </button>

          <button
            type="submit"
            disabled={isSubmitting || selectedSpecies?.scientific_name === 'Fraxinus excelsior'}
            className="btn-primary"
            style={{
              padding: '0.75rem 1.8rem',
              fontSize: '0.95rem',
              opacity: isSubmitting || selectedSpecies?.scientific_name === 'Fraxinus excelsior' ? 0.6 : 1,
              cursor: isSubmitting || selectedSpecies?.scientific_name === 'Fraxinus excelsior' ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting
              ? 'Executing Pipeline...'
              : selectedSpecies?.scientific_name === 'Fraxinus excelsior'
              ? 'Estimation Disabled (Data Deficient)'
              : 'Review & Calculate Carbon →'}
          </button>
        </div>
      </form>

      {/* Review Before Submit Modal */}
      <ReviewSubmitModal
        isOpen={showReviewModal}
        isSubmitting={isSubmitting}
        species={selectedSpecies}
        activeModel={activeModel}
        scientificModel={scientificModel}
        dbhInput={dbhInput}
        dbhUnit={dbhUnit}
        dbhMetricCm={canonicalDbhCm}
        heightInput={heightInput}
        heightUnit={heightUnit}
        heightMetricM={canonicalHeightM}
        crownDiameterM={crownDiameterM}
        woodDensityOverride={woodDensityOverride}
        latitude={latitude}
        longitude={longitude}
        notes={notes}
        engineType={engineType}
        isDemoRun={isDemoRun}
        preflightWarning={preflightWarning}
        onConfirmSubmit={executePrediction}
        onCancel={() => setShowReviewModal(false)}
      />

      {/* Scientific Glossary Modal */}
      <ScientificGlossaryModal
        isOpen={showGlossaryModal}
        onClose={() => setShowGlossaryModal(false)}
        initialTerm={glossaryInitialTerm}
      />

      {/* First-Use Walkthrough Modal */}
      <FirstUseWalkthrough
        isOpen={showWalkthroughModal}
        onClose={() => setShowWalkthroughModal(false)}
        onStartMeasurementWithDemo={applyPresetScenario}
        onNavigate={page => onNavigate && onNavigate(page)}
      />
    </div>
  );
};
