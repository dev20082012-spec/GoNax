import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { ScientificSourceDetails } from '../types';

interface Props {
  sourceId: string | null;
  onClose: () => void;
}

export const SourceInspectorModal: React.FC<Props> = ({ sourceId, onClose }) => {
  const [details, setDetails] = useState<ScientificSourceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chunks' | 'claims' | 'provenance'>('chunks');

  useEffect(() => {
    if (!sourceId) return;
    setLoading(true);
    setError(null);
    api.getScientificSource(sourceId)
      .then(data => setDetails(data))
      .catch(err => setError(err.message || 'Failed to load source details'))
      .finally(() => setLoading(false));
  }, [sourceId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!sourceId) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="source-inspector-modal" onClick={e => e.stopPropagation()}>
        {}
        <div className="modal-header">
          <div className="header-titles">
            <span className="source-tag">Peer-Reviewed Scientific Provenance</span>
            <h2>{details?.source.title || 'Loading Source...'}</h2>
            {details && (
              <p className="source-authors">
                <strong>{details.source.authors}</strong> ({details.source.year}) · <em>{details.source.journal}</em>
              </p>
            )}
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        {}
        <div className="modal-body">
          {loading && (
            <div className="inspector-loading">
              <div className="spinner"></div>
              <p>Retrieving verified scientific text and extraction provenance...</p>
            </div>
          )}

          {error && (
            <div className="error-banner">
              <strong>Error Loading Source:</strong> {error}
            </div>
          )}

          {details && !loading && (
            <>
              {}
              <div className="source-meta-strip">
                <div className="meta-pill">
                  <span className="meta-label">Quality Tier:</span>
                  <span className="tier-badge verified">{details.source.quality_tier.replace(/_/g, ' ')}</span>
                </div>
                <div className="meta-pill">
                  <span className="meta-label">Type:</span>
                  <span>{details.source.source_type.replace(/_/g, ' ')}</span>
                </div>
                {details.source.doi && (
                  <div className="meta-pill">
                    <span className="meta-label">DOI:</span>
                    <a
                      href={details.source.url || `https://doi.org/${details.source.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="doi-link"
                    >
                      {details.source.doi} ↗
                    </a>
                  </div>
                )}
                <div className="meta-pill">
                  <span className="meta-label">Scope:</span>
                  <span>{details.source.geographic_scope}</span>
                </div>
              </div>

              {}
              <div className="source-tags-row">
                <div className="tag-group">
                  <strong>Species:</strong>
                  {details.source.species_tags.map(st => (
                    <span key={st} className="species-chip">{st}</span>
                  ))}
                </div>
                <div className="tag-group">
                  <strong>Topics:</strong>
                  {details.source.topic_tags.map(tt => (
                    <span key={tt} className="topic-chip">{tt}</span>
                  ))}
                </div>
              </div>

              {}
              <div className="inspector-tabs">
                <button
                  className={`tab-btn ${activeTab === 'chunks' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chunks')}
                >
                  Extracted Sections & Passages ({details.chunksCount})
                </button>
                <button
                  className={`tab-btn ${activeTab === 'claims' ? 'active' : ''}`}
                  onClick={() => setActiveTab('claims')}
                >
                  Verified Scientific Claims ({details.claims.length})
                </button>
                <button
                  className={`tab-btn ${activeTab === 'provenance' ? 'active' : ''}`}
                  onClick={() => setActiveTab('provenance')}
                >
                  Document Checksum & Provenance
                </button>
              </div>

              {}
              {activeTab === 'chunks' && (
                <div className="chunks-list">
                  {details.chunks.map(chunk => (
                    <div key={chunk.id} className="chunk-card">
                      <div className="chunk-header">
                        <h4>{chunk.sectionTitle}</h4>
                        <span className="chunk-index">Chunk #{chunk.chunkIndex + 1} · {chunk.tokenCount} words · {chunk.evidenceType}</span>
                      </div>
                      <div className="chunk-body">
                        <pre className="chunk-text">{chunk.chunkText}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {}
              {activeTab === 'claims' && (
                <div className="claims-list">
                  {details.claims.length === 0 ? (
                    <p className="empty-notice">No discrete claims isolated for this source yet.</p>
                  ) : (
                    details.claims.map(claim => (
                      <div key={claim.id} className="claim-card">
                        <div className="claim-header">
                          <span className="claim-badge">{claim.claim_type.replace(/_/g, ' ')}</span>
                          <span className="claim-evidence-level">{claim.evidence_level.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="claim-text">"{claim.claim_text}"</p>
                        {claim.uncertainty_note && (
                          <p className="claim-uncertainty">
                            <strong>Uncertainty / Confidence:</strong> {claim.uncertainty_note}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {}
              {activeTab === 'provenance' && details.document && (
                <div className="provenance-view">
                  <div className="provenance-table">
                    <div className="prov-row">
                      <span className="prov-key">Source ID</span>
                      <span className="prov-val code">{details.source.id}</span>
                    </div>
                    <div className="prov-row">
                      <span className="prov-key">Raw File Name</span>
                      <span className="prov-val">{details.document.fileName}</span>
                    </div>
                    <div className="prov-row">
                      <span className="prov-key">SHA-256 Checksum</span>
                      <span className="prov-val code">{details.document.sha256}</span>
                    </div>
                    <div className="prov-row">
                      <span className="prov-key">Total Sections Parsed</span>
                      <span className="prov-val">{details.document.sectionCount}</span>
                    </div>
                    <div className="prov-row">
                      <span className="prov-key">Total Words</span>
                      <span className="prov-val">{details.document.wordCount.toLocaleString()}</span>
                    </div>
                    <div className="prov-row">
                      <span className="prov-key">Ingestion Version</span>
                      <span className="prov-val">{details.document.version}</span>
                    </div>
                    <div className="prov-row">
                      <span className="prov-key">Audit Rule Enforced</span>
                      <span className="prov-val highlight">
                        Zero LLM document synthesis. Full provenance back to peer-reviewed publication.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close Inspector</button>
          {details?.source.doi && (
            <a
              href={details.source.url || `https://doi.org/${details.source.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Open Original Publication ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
