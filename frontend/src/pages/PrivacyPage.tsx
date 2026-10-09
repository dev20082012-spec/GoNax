import React from 'react';
import { PageView } from '../components/Navbar';

interface Props {
  setCurrentPage?: (page: PageView) => void;
}

export const PrivacyPage: React.FC<Props> = ({ setCurrentPage }) => {
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-default)', paddingBottom: '1.5rem' }}>
        <span className="badge badge-neutral" style={{ marginBottom: '0.75rem' }}>LEGAL & SCIENTIFIC GOVERNANCE</span>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Privacy, Retention & Data Governance Policy
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Effective Date: October 2026 | Version 1.2.0 | Open Scientific Intelligence Architecture
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            1. What Data We Collect and Why
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            GoNax minimizes the collection of personal information. For public and guest demonstrations, no personal identifiers, names, phone numbers, or cookies are collected.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            We collect only dendrometric and biometric measurements required for empirical tree carbon calculations:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
            <li><strong>Biophysical measurements</strong>: Diameter at Breast Height (DBH), Total Tree Height, Crown Diameter, Wood Density override.</li>
            <li><strong>Taxonomic classification</strong>: Target species identifier (e.g. <em>Pinus sylvestris</em>, <em>Quercus robur</em>).</li>
            <li><strong>Geographic indicators</strong>: Optional latitude and longitude coordinates, strictly utilized to verify regional allometric model applicability envelopes.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            2. External AI & LLM Provider Data Transmission
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            Numerical calculations of biomass, carbon stock, and CO₂e are performed <strong>strictly by deterministic formulas and trained regression models on our servers</strong>—never by an LLM.
          </p>
          <p style={{ marginBottom: '0.75rem' }}>
            When users consult the interactive Scientific Assistant:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
            <li>The external AI provider (Google Gemini) receives only the active biophysical measurements and retrieved public peer-reviewed scientific literature text.</li>
            <li>No user account credentials, API tokens, passwords, or unrelated user plots are transmitted.</li>
            <li>Data transmitted to the model is not utilized to train foundation models under our enterprise API terms.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            3. Data Retention & Public Demonstrations
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            - <strong>Public Demonstration Runs</strong>: Measurements submitted without logging in are tagged as public demo runs and retained for a maximum of 90 days for benchmarking, after which they are automatically purged.
          </p>
          <p>
            - <strong>Authenticated Researcher Data</strong>: Observations and predictions linked to registered accounts are retained until the account holder requests export or deletion.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            4. User Rights: Data Export & Deletion
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            In accordance with global privacy principles:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
            <li>Users can export their complete historical observations, predictions, and uncertainty records via <code style={{ fontFamily: 'var(--font-mono)' }}>GET /api/v1/auth/export-data</code>.</li>
            <li>Users can delete all their saved records permanently via <code style={{ fontFamily: 'var(--font-mono)' }}>DELETE /api/v1/auth/data</code>.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            5. Legal Disclaimers & Regulatory Honesty
          </h2>
          <p>
            GoNax is an open-source scientific software research project. GoNax does not represent a registered corporate legal entity or certified carbon credit issuance registry. All estimates represent living in-situ biomass carbon pools and do not constitute certified carbon credits or financial investment advice.
          </p>
        </section>

        {setCurrentPage && (
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-default)' }}>
            <button className="btn-secondary" onClick={() => setCurrentPage('dashboard')}>
              Return to Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
