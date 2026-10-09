import React, { useState, useEffect, useRef } from 'react';
import { SCIENTIFIC_GLOSSARY, GlossaryTerm } from '../utils/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTerm?: string;
}

export const ScientificGlossaryModal: React.FC<Props> = ({ isOpen, onClose, initialTerm }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'biometrics' | 'carbon' | 'uncertainty'>('all');
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (initialTerm) {
      setSearch(initialTerm);
    }
  }, [initialTerm]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const termsList = Object.entries(SCIENTIFIC_GLOSSARY).map(([key, data]) => ({
    key,
    ...data
  }));

  const filteredTerms = termsList.filter(t => {
    const matchesSearch =
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      (t.abbreviation && t.abbreviation.toLowerCase().includes(search.toLowerCase())) ||
      t.plainMeaning.toLowerCase().includes(search.toLowerCase()) ||
      t.scientificDefinition.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'biometrics') {
      return ['dbh', 'height', 'wood_density'].includes(t.key);
    }
    if (selectedCategory === 'carbon') {
      return ['agb', 'bgb', 'carbon_fraction', 'co2e'].includes(t.key);
    }
    if (selectedCategory === 'uncertainty') {
      return ['prediction_interval', 'model_applicability'].includes(t.key);
    }
    return true;
  });

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
        backgroundColor: 'rgba(26, 26, 26, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="glossary-dialog-title"
        style={{
          backgroundColor: 'var(--surface-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius)',
          maxWidth: '780px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
            background: 'var(--surface-inset)'
          }}
        >
          <div>
            <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
              CONTEXTUAL SCIENTIFIC REFERENCE
            </span>
            <h2
              id="glossary-dialog-title"
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: '0.25rem 0 0.15rem 0'
              }}
            >
              Forestry & Carbon Allometry Glossary
            </h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0 }}>
              Plain-language explanations and formal physical definitions of tree carbon metrics.
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close glossary modal"
            className="btn-secondary btn-sm"
            style={{ minHeight: '36px', minWidth: '36px', padding: '0.25rem 0.6rem' }}
          >
            [Close]
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            backgroundColor: 'var(--surface-panel)'
          }}
        >
          <div style={{ flex: '1 1 240px' }}>
            <label htmlFor="glossary-search-input" className="sr-only">
              Search scientific terms
            </label>
            <input
              id="glossary-search-input"
              type="text"
              className="form-input"
              placeholder="Search terms, abbreviations, or definitions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: '0.85rem', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }} role="tablist" aria-label="Glossary categories">
            <button
              type="button"
              className={`btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('all')}
              role="tab"
              aria-selected={selectedCategory === 'all'}
            >
              All Terms ({termsList.length})
            </button>
            <button
              type="button"
              className={`btn-sm ${selectedCategory === 'biometrics' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('biometrics')}
              role="tab"
              aria-selected={selectedCategory === 'biometrics'}
            >
              Biometrics
            </button>
            <button
              type="button"
              className={`btn-sm ${selectedCategory === 'carbon' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('carbon')}
              role="tab"
              aria-selected={selectedCategory === 'carbon'}
            >
              Carbon & CO₂e
            </button>
            <button
              type="button"
              className={`btn-sm ${selectedCategory === 'uncertainty' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('uncertainty')}
              role="tab"
              aria-selected={selectedCategory === 'uncertainty'}
            >
              Uncertainty
            </button>
          </div>
        </div>

        {/* Scrollable Terms List */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            flex: 1
          }}
          tabIndex={0}
          aria-label="Glossary terms list"
        >
          {filteredTerms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              No terms match &ldquo;{search}&rdquo;. Try searching for &ldquo;DBH&rdquo;, &ldquo;Carbon&rdquo;, or &ldquo;Biomass&rdquo;.
            </div>
          ) : (
            filteredTerms.map(t => (
              <article
                key={t.key}
                style={{
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius)',
                  padding: '1.15rem',
                  backgroundColor: 'var(--surface-panel)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {t.term} {t.abbreviation && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>({t.abbreviation})</span>}
                  </h3>
                  <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                    Unit: {t.unit}
                  </span>
                </div>

                <div style={{ marginBottom: '0.65rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Plain Language Explanation
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0.15rem 0 0 0', lineHeight: 1.5 }}>
                    {t.plainMeaning}
                  </p>
                </div>

                <div style={{ marginBottom: '0.65rem', background: 'var(--surface-inset)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Scientific & Physical Definition
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0', lineHeight: 1.5 }}>
                    {t.scientificDefinition}
                  </p>
                </div>

                <div className="grid-2" style={{ gap: '0.75rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Why GoNax needs it:</strong>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{t.importance}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>How it is measured:</strong>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{t.measurementMethod}</div>
                  </div>
                </div>

                {t.typicalRange && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <em>Empirical Range:</em> {t.typicalRange}
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--border-default)',
            background: 'var(--surface-inset)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}
        >
          <span>Showing {filteredTerms.length} of {termsList.length} definitions</span>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            Close Glossary
          </button>
        </div>
      </div>
    </div>
  );
};
