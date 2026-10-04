import React, { useState } from 'react';

export type PageView =
  | 'landing'
  | 'dashboard'
  | 'species'
  | 'measure'
  | 'result'
  | 'comparison'
  | 'history'
  | 'models'
  | 'datasets'
  | 'evidence'
  | 'assistant'
  | 'about'
  | 'research'
  | 'privacy'
  | 'terms';

interface Props {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  activeSpeciesId?: string | null;
  comparisonCount?: number;
}

export const Navbar: React.FC<Props> = ({ currentPage, setCurrentPage, comparisonCount = 0 }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (page: PageView) => {
    setCurrentPage(page);
    setMenuOpen(false);
  };

  return (
    <header className="navbar" role="banner">
      <div className="nav-wrapper">
        <div
          className="brand"
          onClick={() => navigate('landing')}
          onKeyDown={e => e.key === 'Enter' && navigate('landing')}
          tabIndex={0}
          role="button"
          aria-label="GoNax home"
        >
          <svg className="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2L4 12h3v8h10v-8h3L12 2z" fill="currentColor" fillOpacity="0.15"/>
            <path d="M12 22V12" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <span>GoNax</span>
        </div>

        <button
          className="nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? '\u2715' : '\u2630'}
        </button>

        <nav
          id="main-nav"
          className={`nav-links ${menuOpen ? 'open' : ''}`}
          role="navigation"
          aria-label="Main navigation"
        >
          <button
            className={`nav-button ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigate('dashboard')}
          >
            Workspace
          </button>
          <button
            className={`nav-button ${currentPage === 'species' ? 'active' : ''}`}
            onClick={() => navigate('species')}
          >
            Species
          </button>
          <button
            className={`nav-button ${currentPage === 'models' ? 'active' : ''}`}
            onClick={() => navigate('models')}
          >
            Models
          </button>
          <button
            className={`nav-button ${currentPage === 'history' ? 'active' : ''}`}
            onClick={() => navigate('history')}
          >
            History
          </button>
          <button
            className={`nav-button ${currentPage === 'evidence' ? 'active' : ''}`}
            onClick={() => navigate('evidence')}
          >
            Evidence
          </button>
          <button
            className={`nav-button ${currentPage === 'assistant' ? 'active' : ''}`}
            onClick={() => navigate('assistant')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span style={{ fontSize: '0.85rem' }}>🔬</span>
            Scientific Assistant
          </button>
          <button
            className={`nav-button ${currentPage === 'about' ? 'active' : ''}`}
            onClick={() => navigate('about')}
          >
            Methodology
          </button>
          {comparisonCount > 0 && (
            <button
              className={`nav-button ${currentPage === 'comparison' ? 'active' : ''}`}
              onClick={() => navigate('comparison')}
            >
              Compare ({comparisonCount})
            </button>
          )}
          <button
            className="nav-cta"
            onClick={() => navigate('measure')}
          >
            New Measurement
          </button>
        </nav>
      </div>
    </header>
  );
};
