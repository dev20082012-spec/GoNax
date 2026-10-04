import React from 'react';
import { PageView } from './Navbar';

interface Props {
  setCurrentPage?: (page: PageView) => void;
}

export const Footer: React.FC<Props> = ({ setCurrentPage }) => {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-content">
        <div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>
            GoNax
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: '480px' }}>
            Species-specific carbon intelligence for individual trees.
            Deterministic allometric engines grounded in peer-reviewed forestry literature.
          </div>
        </div>
        <div className="footer-links">
          {setCurrentPage && (
            <>
              <button className="footer-link" onClick={() => setCurrentPage('about')}>
                Methodology
              </button>
              <button className="footer-link" onClick={() => setCurrentPage('evidence')}>
                Evidence
              </button>
              <button className="footer-link" onClick={() => setCurrentPage('privacy')}>
                Privacy Policy
              </button>
              <button className="footer-link" onClick={() => setCurrentPage('terms')}>
                Terms of Service
              </button>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};
