import React from 'react';
import { PageView } from '../components/Navbar';

interface Props {
  setCurrentPage?: (page: PageView) => void;
}

export const PrivacyPage: React.FC<Props> = ({ setCurrentPage }) => {
  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '1rem 0 3rem' }}>
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-default)', paddingBottom: '1.5rem' }}>
        <span className="badge badge-neutral" style={{ marginBottom: '0.75rem' }}>LEGAL & GOVERNANCE</span>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
          Privacy & Data Governance Policy
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Effective Date: October 2026 | Version 1.0.4 | GoNax Research & Production Standards
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            1. Scientific Data Integrity & Collection
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            GoNax collects observational forestry field data—specifically Diameter at Breast Height (DBH), Total Height (H), Crown Diameter (CD), Geographic Coordinates (Latitude/Longitude), and Species Identification. This data is processed strictly for the calculation of forest biomass, carbon sequestration stocks, and allometric uncertainty propagation.
          </p>
          <p>
            Field measurements are recorded deterministically against peer-reviewed mathematical engines. No personally identifiable telemetry or device identifiers are embedded into public or shared calculation outputs.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            2. Large Language Model (LLM) Boundary & Data Protection
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            A fundamental architectural principle of GoNax is the isolation of numerical computation from generative models. When interacting with the Scientific Explanation Layer:
          </p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '0.75rem' }}>
            <li>Only anonymized biological metrics, evaluated outputs, and user prompts are transmitted to the synthesis provider.</li>
            <li>No proprietary enterprise plot data is retained or utilized for foundation model retraining.</li>
            <li>The LLM operates in an isolated stateless inference runtime and does not hold state between disparate calculation sessions.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            3. Provenance & Audit Trail Storage
          </h2>
          <p style={{ marginBottom: '0.75rem' }}>
            All allometric predictions generate an immutable provenance chain containing exact mathematical substitution steps, parameter versions, and reference citations. This record is stored in persistent audit storage to enable scientific verification, peer review, and MRV (Measurement, Reporting, and Verification) compliance.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            4. Geographic & Ecological Coordinates
          </h2>
          <p>
            Geographic coordinates supplied during measurement are cross-referenced with ecoregion classifications and wood density spatial databases. Users may redact precise coordinates in favor of broad regional or ecoregion indicators if sensitive conservation habitats or proprietary timber holdings are involved.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            5. Contact for Inquiries
          </h2>
          <p>
            For data inquiries, audits, or scientific verification protocols, contact the GoNax Data Standards Board at <code style={{ fontFamily: 'var(--font-mono)' }}>governance@gonax-intelligence.org</code>.
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
