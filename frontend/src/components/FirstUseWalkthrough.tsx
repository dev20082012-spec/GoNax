import React, { useState, useEffect } from 'react';
import { PageView } from './Navbar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStartMeasurementWithDemo: (demoType: 'oak_calibrated' | 'pine_ml') => void;
  onNavigate: (page: PageView) => void;
}

interface WalkthroughStep {
  stepNumber: number;
  title: string;
  stageBadge: string;
  summary: string;
  detailedGuidance: string;
  demonstrationActionLabel?: string;
  actionType?: 'load_demo' | 'navigate_species' | 'navigate_assistant' | 'navigate_history' | 'next';
  demoType?: 'oak_calibrated' | 'pine_ml';
  callout?: {
    type: 'info' | 'warning' | 'scientific';
    text: string;
  };
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    stepNumber: 1,
    title: '1. Understand the Purpose of GoNax',
    stageBadge: 'FOUNDATION',
    summary: 'Why species-specific allometry matters over crude universal calculators.',
    detailedGuidance:
      'Universal calculators assume every tree behaves the same, using a single equation like B = a · DBH^b with a generic 50% carbon fraction. GoNax rejects this: oaks, pines, and beeches have fundamentally distinct wood densities, branch architectures, and moisture contents. GoNax routes each tree observation to calibrated empirical models trained on destructive harvest records.',
    callout: {
      type: 'scientific',
      text: 'Deterministic Core: GoNax computes biomass and carbon exclusively through verified deterministic allometric formulas. The AI model is strictly prohibited from altering or guessing numerical results.'
    }
  },
  {
    stepNumber: 2,
    title: '2. Choose a Tree Species (Taxon)',
    stageBadge: 'TAXONOMY',
    summary: 'Select from calibrated taxa with verified destructive harvest datasets.',
    detailedGuidance:
      'GoNax categorizes every species by scientific data readiness: Trained Models (e.g. Quercus robur, Pinus sylvestris), Prototype Models (e.g. Acer pseudoplatanus), Research Datasets, or Insufficient Data (Fraxinus excelsior, where predictions are safely refused).',
    callout: {
      type: 'info',
      text: 'For this sample walkthrough, we will select Pedunculate Oak (Quercus robur), which has a peer-reviewed destructive harvest dataset and calibrated allometric equations.'
    }
  },
  {
    stepNumber: 3,
    title: '3. Learn What Measurements Are Required',
    stageBadge: 'BIOMETRICS',
    summary: 'DBH and Height are required; wood density and canopy are optional refinements.',
    detailedGuidance:
      'Every tree requires Diameter at Breast Height (DBH, measured at 1.30 m) and Total Height (H). Advanced users can also provide site-specific xylem wood density overrides and crown diameter. If any mandatory measurement is missing, GoNax halts execution to prevent mathematical speculation.',
    callout: {
      type: 'warning',
      text: 'Measurement Protocol: DBH must be measured at 1.30 m on the uphill trunk face. Never measure over branch swellings or moss clumps.'
    }
  },
  {
    stepNumber: 4,
    title: '4. Enter Measurements (Sample Demonstration Data)',
    stageBadge: 'INPUT',
    summary: 'Preload explicitly identified demonstration data to explore the pipeline.',
    detailedGuidance:
      'We will populate a verified mature Oak specimen: DBH = 45.0 cm, Height = 22.0 m, Crown Spread = 8.5 m. This observation is explicitly flagged as DEMONSTRATION DATA so it is never confused with an unvalidated field inventory record.',
    callout: {
      type: 'info',
      text: 'Demonstration Guard: All results generated via demonstration presets display a prominent DEMONSTRATION RUN banner to ensure data governance and scientific audit integrity.'
    }
  },
  {
    stepNumber: 5,
    title: '5. Review Input Validation & Pre-Flight Envelope',
    stageBadge: 'VALIDATION',
    summary: 'Verify that measurements fall within the model’s empirical calibration envelope.',
    detailedGuidance:
      'Before calculating, GoNax checks your tree against the model’s calibrated range (for Quercus robur: DBH [10, 140] cm, Height [3, 40] m). If an input falls outside, an EXTRAPOLATION WARNING is automatically attached to prevent false scientific certainty.',
    callout: {
      type: 'scientific',
      text: 'Physical Plausibility: Biologically impossible values (negative dimensions or DBH > 400 cm) are immediately rejected with clear field-level error messages.'
    }
  },
  {
    stepNumber: 6,
    title: '6. Generate a Supported Estimate',
    stageBadge: 'EXECUTION',
    summary: 'Trigger the deterministic pipeline with duplicate submission protection.',
    detailedGuidance:
      'Once reviewed, clicking "Calculate Biomass & Carbon" locks the submission state, evaluates the power-law equation with Baskerville bias correction, and writes an immutable record to the local audit ledger.',
    actionType: 'load_demo',
    demoType: 'oak_calibrated',
    demonstrationActionLabel: 'Load Demo Preset & Open Measurement Form →'
  },
  {
    stepNumber: 7,
    title: '7. Understand the Result (Biomass vs Carbon vs CO₂e)',
    stageBadge: 'INTERPRETATION',
    summary: 'Distinguish dry wood weight, stored carbon atoms, and atmospheric greenhouse gas.',
    detailedGuidance:
      'GoNax separates results into three distinct physical quantities: 1) Above-Ground Dry Biomass (AGB, kg of 0% moisture wood matter); 2) Elemental Carbon Stock (pure carbon atoms, C = AGB × species carbon fraction 48.2%); and 3) Carbon Dioxide Equivalent (CO₂e = C × 3.6667, the mass of gaseous CO₂ pulled from the air).',
    callout: {
      type: 'warning',
      text: 'Statistical Estimate Notice: Every result is an allometric statistical estimate subject to biological variance, not a destructive physical scale measurement.'
    }
  },
  {
    stepNumber: 8,
    title: '8. Inspect Evidence & Mathematical Provenance',
    stageBadge: 'AUDIT',
    summary: 'Review step-by-step arithmetic substitutions and peer-reviewed citations.',
    detailedGuidance:
      'Every calculation includes a 7-stage traceability chain showing the exact scaling coefficients (a, b, c), wood density value, 95% log-normal confidence bounds, and clickable DOI links to peer-reviewed forestry literature.',
    callout: {
      type: 'scientific',
      text: 'Open Science: Anyone can independently verify the calculation by plugging the reported parameters into a handheld calculator.'
    }
  },
  {
    stepNumber: 9,
    title: '9. Ask the Grounded Scientific Assistant',
    stageBadge: 'REASONING',
    summary: 'Inquire about ecological context and model assumptions with zero hallucination.',
    detailedGuidance:
      'The Scientific Assistant uses Retrieval-Augmented Generation (RAG) anchored strictly to your calculation record and peer-reviewed forestry literature. If asked an unsupported or unscientific question, it explicitly reports INSUFFICIENT SCIENTIFIC EVIDENCE instead of inventing facts.',
    callout: {
      type: 'info',
      text: 'LLM Isolation: The language model can explain why DBH matters or what wood density implies, but cannot modify numerical biomass figures.'
    }
  },
  {
    stepNumber: 10,
    title: '10. Save, Compare, or Export the Result',
    stageBadge: 'EXPORT',
    summary: 'Download complete JSON audit records or export a print-ready research report.',
    detailedGuidance:
      'All calculations are automatically stored in your local persistent relational store. You can add multiple trees to a side-by-side comparison, download raw JSON data, or print formal field audit sheets.',
    callout: {
      type: 'info',
      text: 'Ready to try it yourself? Click the button below to launch the pre-configured Oak demonstration!'
    },
    actionType: 'load_demo',
    demoType: 'oak_calibrated',
    demonstrationActionLabel: 'Launch Walkthrough with Demonstration Data →'
  }
];

export const FirstUseWalkthrough: React.FC<Props> = ({
  isOpen,
  onClose,
  onStartMeasurementWithDemo,
  onNavigate
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentStep = WALKTHROUGH_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === WALKTHROUGH_STEPS.length - 1;

  const handleNext = () => {
    if (!isLast) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleActionClick = (step: WalkthroughStep) => {
    if (step.actionType === 'load_demo' && step.demoType) {
      onClose();
      onStartMeasurementWithDemo(step.demoType);
    } else if (step.actionType === 'navigate_species') {
      onClose();
      onNavigate('species');
    } else if (step.actionType === 'navigate_assistant') {
      onClose();
      onNavigate('assistant');
    } else {
      handleNext();
    }
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(26, 26, 26, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-dialog-title"
        style={{
          backgroundColor: 'var(--surface-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius)',
          maxWidth: '740px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.16)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-high" style={{ fontSize: '0.68rem' }}>
                FIRST-USE GUIDED JOURNEY
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                STAGE {currentStep.stepNumber} OF {WALKTHROUGH_STEPS.length}: {currentStep.stageBadge}
              </span>
            </div>
            <h2
              id="walkthrough-dialog-title"
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: 0
              }}
            >
              {currentStep.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close walkthrough"
            className="btn-secondary btn-sm"
            style={{ padding: '0.3rem 0.65rem' }}
          >
            [Exit Walkthrough]
          </button>
        </div>

        {/* Step Progress Bar */}
        <div
          style={{
            display: 'flex',
            height: '4px',
            backgroundColor: 'var(--border-default)',
            width: '100%'
          }}
          aria-hidden="true"
        >
          <div
            style={{
              height: '100%',
              backgroundColor: 'var(--accent-primary)',
              width: `${((currentStepIndex + 1) / WALKTHROUGH_STEPS.length) * 100}%`,
              transition: 'width 0.2s ease'
            }}
          />
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
          tabIndex={0}
        >
          {/* Quick Summary */}
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.45
            }}
          >
            {currentStep.summary}
          </div>

          {/* Detailed Guidance */}
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              margin: 0
            }}
          >
            {currentStep.detailedGuidance}
          </p>

          {/* Callout Box */}
          {currentStep.callout && (
            <div
              style={{
                backgroundColor:
                  currentStep.callout.type === 'warning'
                    ? 'var(--status-warning-bg)'
                    : currentStep.callout.type === 'scientific'
                    ? 'rgba(45, 106, 79, 0.08)'
                    : 'var(--surface-inset)',
                borderLeft: `4px solid ${
                  currentStep.callout.type === 'warning'
                    ? 'var(--status-warning)'
                    : currentStep.callout.type === 'scientific'
                    ? 'var(--accent-primary)'
                    : 'var(--accent-secondary)'
                }`,
                borderRadius: 'var(--radius)',
                padding: '0.85rem 1.1rem',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                lineHeight: 1.55
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem', color: currentStep.callout.type === 'warning' ? 'var(--status-warning)' : 'var(--accent-primary)' }}>
                {currentStep.callout.type === 'scientific' ? 'Scientific Axiom' : currentStep.callout.type === 'warning' ? 'Critical Rule' : 'Contextual Note'}
              </strong>
              {currentStep.callout.text}
            </div>
          )}

          {/* Demonstration Notice */}
          <div
            style={{
              backgroundColor: 'var(--surface-inset)',
              border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius)',
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Demonstration Safeguard:</strong> Sample walkthrough runs are explicitly labeled with demonstration banners to preserve the integrity of field research data.
            </div>
            {currentStep.demonstrationActionLabel && (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => handleActionClick(currentStep)}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
              >
                {currentStep.demonstrationActionLabel}
              </button>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-inset)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Step {currentStepIndex + 1} of {WALKTHROUGH_STEPS.length}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handlePrev}
              disabled={isFirst}
              style={{ opacity: isFirst ? 0.5 : 1, cursor: isFirst ? 'not-allowed' : 'pointer' }}
            >
              ← Previous Step
            </button>

            {!isLast ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={handleNext}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => handleActionClick(currentStep)}
              >
                Launch Demonstration Run →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
