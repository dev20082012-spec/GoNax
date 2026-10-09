import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Species,
  EnrichedPrediction,
  GroundedScientificAnswer,
  BenchmarkSummaryReport,
  QuestionType,
  AnswerType
} from '../types';
import { SourceInspectorModal } from '../components/SourceInspectorModal';

interface Props {
  initialSpeciesId?: string | null;
  initialPrediction?: EnrichedPrediction | null;
  onNavigateToMeasurement?: (speciesId: string) => void;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text?: string;
  answer?: GroundedScientificAnswer;
}

export const ScientificAssistantPage: React.FC<Props> = ({
  initialSpeciesId,
  initialPrediction,
  onNavigateToMeasurement
}) => {
  const [speciesList, setSpeciesList] = useState<Species[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string>(initialSpeciesId || '');
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);

  const [recentPredictions, setRecentPredictions] = useState<EnrichedPrediction[]>([]);
  const [activePrediction, setActivePrediction] = useState<EnrichedPrediction | null>(initialPrediction || null);

  const [activeQuestionType, setActiveQuestionType] = useState<QuestionType | 'all'>('all');
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  const [inspectedSourceId, setInspectedSourceId] = useState<string | null>(null);

  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkSummaryReport | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);

  // fetch speceis list and last few predicitons when page loads
  useEffect(() => {
    api.getSpeciesList().then(list => {
      setSpeciesList(list);
      if (!selectedSpeciesId && list.length > 0) {
        setSelectedSpeciesId(list[0].id);
        setSelectedSpecies(list[0]);
      } else if (selectedSpeciesId) {
        const found = list.find(s => s.id === selectedSpeciesId);
        if (found) setSelectedSpecies(found);
      }
    }).catch(console.error);

    api.getPredictionHistory(10).then(preds => {
      setRecentPredictions(preds);
      if (!activePrediction && preds.length > 0) {
        setActivePrediction(preds[0]);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedSpeciesId && speciesList.length > 0) {
      const found = speciesList.find(s => s.id === selectedSpeciesId);
      setSelectedSpecies(found || null);
    }
  }, [selectedSpeciesId, speciesList]);

  // switiching active tree prediciton for context anchoring
  const handleSelectPrediction = (predId: string) => {
    if (!predId) {
      setActivePrediction(null);
      return;
    }
    const found = recentPredictions.find(p => p.prediction.id === predId);
    if (found) {
      setActivePrediction(found);
      setSelectedSpeciesId(found.species.id);
    }
  };

  const suggestedPrompts: Array<{ label: string; question: string; category: QuestionType }> = [
    {
      label: 'Tree Prediction Grounding',
      question: activePrediction
        ? `Why did GoNax predict ${activePrediction.prediction.estimated_carbon_kg.toLocaleString()} kg of carbon for this tree?`
        : 'Why did this tree receive this biomass and carbon estimate?',
      category: 'prediction_explanation'
    },
    {
      label: 'Wood Density Science',
      question: `What is known about ${selectedSpecies ? selectedSpecies.scientific_name : 'this species'} wood density and xylem specific gravity?`,
      category: 'species_knowledge'
    },
    {
      label: 'DBH Importance',
      question: 'Why is DBH the most important single predictor in biomass estimation?',
      category: 'measurement_explanation'
    },
    {
      label: 'Model Formulation',
      question: 'What variables does the trained model use and what is its equation?',
      category: 'model_explanation'
    },
    {
      label: 'Uncertainty Assessment',
      question: 'Why is the uncertainty relatively high and how are error bounds determined?',
      category: 'uncertainty_explanation'
    },
    {
      label: 'Destructive Datasets',
      question: `How many observations are in the ${selectedSpecies ? selectedSpecies.scientific_name : 'Scots pine'} training dataset and what is the harvest protocol?`,
      category: 'dataset_inquiry'
    },
    {
      label: 'Applicability Envelopes',
      question: 'Is this model appropriate outside its training region in Mediterranean drylands?',
      category: 'applicability'
    },
    {
      label: 'Interspecific Comparison',
      question: 'How does Quercus robur differ from Pinus sylvestris in wood density and carbon fraction?',
      category: 'species_comparison'
    },
    {
      label: 'Test Guardrail (Unsupported)',
      question: 'What is the biomass and wood density of Eucalyptus globulus in the Sahara desert?',
      category: 'general_scientific'
    }
  ];

  const filteredPrompts = activeQuestionType === 'all'
    ? suggestedPrompts
    : suggestedPrompts.filter(p => p.category === activeQuestionType);

  const handleAsk = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || loading) return;

    const userMsgId = `user-${Date.now()}`;
    const newMessages: MessageItem[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: q
      }
    ];
    setMessages(newMessages);
    setInputQuestion('');
    setLoading(true);

    try {
      const answer = await api.askScientificQuestion({
        question: q,
        speciesId: selectedSpeciesId || undefined,
        speciesName: selectedSpecies?.scientific_name,
        predictionId: activePrediction?.prediction.id
      });

      const assistantMsgId = `asst-${Date.now()}`;
      setMessages([
        ...newMessages,
        {
          id: assistantMsgId,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          answer
        }
      ]);
    } catch (err: any) {
      console.error('Failed to get answer:', err);
      const errorMsgId = `asst-${Date.now()}`;
      setMessages([
        ...newMessages,
        {
          id: errorMsgId,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `An error occurred while synthesizing the scientific answer: ${err.message}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRunBenchmark = async () => {
    setBenchmarkLoading(true);
    setShowBenchmarkModal(true);
    try {
      const report = await api.runScientificBenchmark();
      setBenchmarkReport(report);
    } catch (err: any) {
      console.error('Benchmark failed:', err);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const getAnswerTypeBadge = (type: AnswerType) => {
    switch (type) {
      case 'SUPPORTED_BY_GONAX_DATA':
        return <span className="answer-badge gonax-data">✓ Supported by GoNax Data</span>;
      case 'SUPPORTED_BY_SCIENTIFIC_SOURCES':
        return <span className="answer-badge scientific-source">✓ Supported by Scientific Literature</span>;
      case 'INFERENCE_FROM_PROVIDED_EVIDENCE':
        return <span className="answer-badge inference">ℹ Inferred from Provided Evidence</span>;
      case 'INSUFFICIENT_EVIDENCE':
        return <span className="answer-badge insufficient">⚠ Insufficient Scientific Evidence</span>;
      default:
        return null;
    }
  };

  return (
    <div className="scientific-assistant-page">
      {}
      <div className="assistant-header">
        <div className="header-content">
          <div className="badge-row">
            <span className="assistant-badge">Knowledge Intelligence Core</span>
            <span className="rag-badge">Hybrid RAG Retrieval</span>
            <span className="guardrail-badge">Zero Hallucination Guardrail</span>
          </div>
          <h1>Scientific Assistant & Literature Intelligence</h1>
          <p className="header-subtitle">
            Query verified peer-reviewed publications, destructive harvest datasets, and trained allometric models.
            Numerical calculations remain anchored to deterministic models; scientific evidence grounds all explanations.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-benchmark" onClick={handleRunBenchmark}>
            Run Scientific Benchmark Suite
          </button>
        </div>
      </div>

      {}
      <div className="assistant-context-strip">
        <div className="context-item species-selector-box">
          <label htmlFor="species-select">Active Taxon:</label>
          <select
            id="species-select"
            value={selectedSpeciesId}
            onChange={e => setSelectedSpeciesId(e.target.value)}
          >
            {speciesList.map(s => (
              <option key={s.id} value={s.id}>
                {s.scientific_name} ({s.common_name})
              </option>
            ))}
          </select>
        </div>

        <div className="context-item prediction-selector-box">
          <label htmlFor="pred-select">Active Prediction Context:</label>
          <select
            id="pred-select"
            value={activePrediction?.prediction.id || ''}
            onChange={e => handleSelectPrediction(e.target.value)}
          >
            <option value="">None (General Species Query)</option>
            {recentPredictions.map(p => (
              <option key={p.prediction.id} value={p.prediction.id}>
                {p.species.scientific_name} · DBH {p.observation.dbh_cm}cm, H {p.observation.height_m}m → {p.prediction.estimated_carbon_kg.toLocaleString()} kg C
              </option>
            ))}
          </select>
        </div>

        {activePrediction && (
          <div className="active-prediction-summary">
            <span className="summary-pill">
              DBH: <strong>{activePrediction.observation.dbh_cm} cm</strong>
            </span>
            <span className="summary-pill">
              Height: <strong>{activePrediction.observation.height_m} m</strong>
            </span>
            <span className="summary-pill highlight">
              Carbon: <strong>{activePrediction.prediction.estimated_carbon_kg.toLocaleString()} kg</strong>
            </span>
            <span className="summary-pill">
              Model: <strong>{activePrediction.model.name}</strong>
            </span>
            <span className="summary-pill status">
              Tier: <strong>{activePrediction.prediction.confidence_status}</strong>
            </span>
          </div>
        )}
      </div>

      {}
      <div className="question-types-filter">
        <span className="filter-label">Topic Filter:</span>
        <button
          className={`type-pill ${activeQuestionType === 'all' ? 'active' : ''}`}
          onClick={() => setActiveQuestionType('all')}
        >
          All Topics
        </button>
        <button
          className={`type-pill ${activeQuestionType === 'prediction_explanation' ? 'active' : ''}`}
          onClick={() => setActiveQuestionType('prediction_explanation')}
        >
          Prediction Grounding
        </button>
        <button
          className={`type-pill ${activeQuestionType === 'species_knowledge' ? 'active' : ''}`}
          onClick={() => setActiveQuestionType('species_knowledge')}
        >
          Wood Density & Anatomy
        </button>
        <button
          className={`type-pill ${activeQuestionType === 'model_explanation' ? 'active' : ''}`}
          onClick={() => setActiveQuestionType('model_explanation')}
        >
          Model Equations
        </button>
        <button
          className={`type-pill ${activeQuestionType === 'measurement_explanation' ? 'active' : ''}`}
          onClick={() => setActiveQuestionType('measurement_explanation')}
        >
          DBH & Scaling
        </button>
        <button
          className={`type-pill ${activeQuestionType === 'uncertainty_explanation' ? 'active' : ''}`}
          onClick={() => setActiveQuestionType('uncertainty_explanation')}
        >
          Uncertainty & RSE
        </button>
        <button
          className={`type-pill ${activeQuestionType === 'dataset_inquiry' ? 'active' : ''}`}
          onClick={() => setActiveQuestionType('dataset_inquiry')}
        >
          Dataset Demographics
        </button>
        <button
          className={`type-pill ${activeQuestionType === 'applicability' ? 'active' : ''}`}
          onClick={() => setActiveQuestionType('applicability')}
        >
          Applicability Limits
        </button>
        <button
          className={`type-pill ${activeQuestionType === 'species_comparison' ? 'active' : ''}`}
          onClick={() => setActiveQuestionType('species_comparison')}
        >
          Species Comparison
        </button>
      </div>

      {}
      <div className="suggested-prompts-container">
        <span className="suggested-label">Suggested Inquiries:</span>
        <div className="prompts-chips-wrapper">
          {filteredPrompts.map((p, idx) => (
            <button
              key={idx}
              className="prompt-chip"
              onClick={() => handleAsk(p.question)}
              disabled={loading}
            >
              <span className="chip-category">{p.label}:</span>
              <span className="chip-text">"{p.question}"</span>
            </button>
          ))}
        </div>
      </div>

      {}
      <div className="dialogue-container">
        {messages.length === 0 ? (
          <div className="empty-assistant-state">
            <div className="empty-icon font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>[Evidence Core]</div>
            <h3>Explore Species Allometry & Literature Evidence</h3>
            <p>
              Ask any question about <strong>{selectedSpecies?.scientific_name || 'selected tree species'}</strong>,
              its wood density, allometric equations, empirical datasets (BAAD, Silva Fennica), carbon fractions, or prediction uncertainties.
            </p>
            <div className="empty-guidance">
              <div className="guide-card">
                <strong>Prediction Questions</strong>
                <p>Anchored directly to the real trained model, mathematical substitution, and stoichiometric factors.</p>
              </div>
              <div className="guide-card">
                <strong>Literature Questions</strong>
                <p>Retrieved from real peer-reviewed forestry publications with verifiable DOI citations.</p>
              </div>
              <div className="guide-card">
                <strong>Safety Guardrail</strong>
                <p>When verified data is unavailable, GoNax explicitly reports insufficient evidence rather than hallucinating.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="messages-stream">
            {messages.map(msg => (
              <div key={msg.id} className={`message-row ${msg.sender}`}>
                {msg.sender === 'user' ? (
                  <div className="user-bubble">
                    <div className="bubble-meta">
                      <span className="sender-name">Field Researcher</span>
                      <span className="msg-time">{msg.timestamp}</span>
                    </div>
                    <p className="bubble-text">{msg.text}</p>
                  </div>
                ) : (
                  <div className="assistant-bubble">
                    <div className="bubble-meta">
                      <span className="sender-name">GoNax Scientific Assistant</span>
                      <span className="msg-time">{msg.timestamp}</span>
                      {msg.answer && getAnswerTypeBadge(msg.answer.answerType)}
                    </div>

                    {msg.text && <p className="bubble-text">{msg.text}</p>}

                    {msg.answer && (
                      <div className="grounded-answer-card">
                        {}
                        {msg.answer.predictionContextUsed && (
                          <div className="prediction-anchoring-box">
                            <div className="anchoring-header">
                              <span className="anchoring-title">Deterministic Numerical Prediction Anchor</span>
                              <span className="model-tag">{msg.answer.predictionContextUsed.modelName}</span>
                            </div>
                            <div className="anchoring-grid">
                              <div className="anchor-cell">
                                <span className="anchor-label">DBH</span>
                                <span className="anchor-value">{msg.answer.predictionContextUsed.dbhCm} cm</span>
                              </div>
                              <div className="anchor-cell">
                                <span className="anchor-label">Height</span>
                                <span className="anchor-value">{msg.answer.predictionContextUsed.heightM} m</span>
                              </div>
                              <div className="anchor-cell">
                                <span className="anchor-label">Dry Biomass</span>
                                <span className="anchor-value">{msg.answer.predictionContextUsed.biomassKg?.toLocaleString()} kg</span>
                              </div>
                              <div className="anchor-cell highlight">
                                <span className="anchor-label">Carbon Stock</span>
                                <span className="anchor-value">{msg.answer.predictionContextUsed.carbonKg?.toLocaleString()} kg C</span>
                              </div>
                              <div className="anchor-cell highlight">
                                <span className="anchor-label">CO₂ Equivalent</span>
                                <span className="anchor-value">{msg.answer.predictionContextUsed.co2eKg?.toLocaleString()} kg CO₂e</span>
                              </div>
                              <div className="anchor-cell">
                                <span className="anchor-label">Carbon Fraction</span>
                                <span className="anchor-value">{((msg.answer.predictionContextUsed.carbonFractionApplied || 0) * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {}
                        <div className="answer-markdown-content">
                          {msg.answer.answer.split('\n\n').map((paragraph, pIdx) => {
                            if (paragraph.startsWith('### ')) {
                              return <h3 key={pIdx}>{paragraph.replace('### ', '')}</h3>;
                            }
                            if (paragraph.startsWith('| ')) {
                              return (
                                <div key={pIdx} className="table-responsive">
                                  <pre className="table-pre">{paragraph}</pre>
                                </div>
                              );
                            }
                            return <p key={pIdx}>{paragraph}</p>;
                          })}
                        </div>

                        {}
                        {msg.answer.groundedClaims.length > 0 && (
                          <div className="grounded-claims-block">
                            <h4>Scientific Validation Claims:</h4>
                            <ul>
                              {msg.answer.groundedClaims.map((claim, cIdx) => (
                                <li key={cIdx}>
                                  <span className="claim-check">✔</span> {claim}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {}
                        {msg.answer.citations.length > 0 && (
                          <div className="citations-section">
                            <h4>Supporting Scientific Sources ({msg.answer.citations.length}):</h4>
                            <div className="citations-grid">
                              {msg.answer.citations.map((cit, citIdx) => (
                                <div key={citIdx} className="citation-card">
                                  <div className="citation-header">
                                    <span className="citation-journal">{cit.journal} ({cit.year})</span>
                                    <span className="citation-tier-badge">{cit.qualityTier.replace(/_/g, ' ')}</span>
                                  </div>
                                  <h5 className="citation-title">{cit.title}</h5>
                                  <p className="citation-authors">{cit.authors}</p>
                                  <p className="citation-section">
                                    <strong>Section:</strong> {cit.section}
                                  </p>
                                  <div className="citation-actions">
                                    {cit.doi && (
                                      <a
                                        href={cit.url || `https://doi.org/${cit.doi}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-cit-link"
                                      >
                                        DOI: {cit.doi} ↗
                                      </a>
                                    )}
                                    <button
                                      className="btn-inspect-source"
                                      onClick={() => setInspectedSourceId(cit.sourceId)}
                                    >
                                      [Inspect Source Evidence]
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {}
                        <div className="answer-footer-meta">
                          <span>Evaluated Chunks: {msg.answer.retrievalMetadata.totalChunksEvaluated}</span>
                          <span>Retrieved Passages: {msg.answer.retrievalMetadata.retrievedCount}</span>
                          <span>Relevance Score: {(msg.answer.retrievalMetadata.topCombinedScore * 100).toFixed(1)}%</span>
                          <span>Provider: {msg.answer.provider}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="message-row assistant">
                <div className="assistant-bubble loading-bubble">
                  <div className="spinner-inline"></div>
                  <span>Retrieving scientific passages, ranking evidence, and synthesizing grounded explanation...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {}
      <div className="assistant-input-tray">
        <form
          className="input-form"
          onSubmit={e => {
            e.preventDefault();
            handleAsk(inputQuestion);
          }}
        >
          <input
            type="text"
            className="question-input"
            placeholder={
              activePrediction
                ? `Ask about this prediction or ${selectedSpecies?.scientific_name || 'selected species'}...`
                : `Ask any scientific question about ${selectedSpecies?.scientific_name || 'tree species'}...`
            }
            value={inputQuestion}
            onChange={e => setInputQuestion(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn-ask" disabled={loading || !inputQuestion.trim()}>
            {loading ? 'Synthesizing...' : 'Ask Evidence Core ➔'}
          </button>
        </form>
      </div>

      {}
      <SourceInspectorModal
        sourceId={inspectedSourceId}
        onClose={() => setInspectedSourceId(null)}
      />

      {}
      {showBenchmarkModal && (
        <div className="modal-backdrop" onClick={() => setShowBenchmarkModal(false)}>
          <div className="benchmark-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Scientific Retrieval & Grounding Benchmark Suite</h2>
              <button className="modal-close-btn" onClick={() => setShowBenchmarkModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {benchmarkLoading && (
                <div className="inspector-loading">
                  <div className="spinner"></div>
                  <p>Executing 10 standardized scientific benchmark questions across retrieval, precision, citations, and hallucination guardrails...</p>
                </div>
              )}

              {benchmarkReport && !benchmarkLoading && (
                <div className="benchmark-report">
                  <div className="metrics-kpi-grid">
                    <div className="kpi-card">
                      <span className="kpi-value">{benchmarkReport.retrievalRecallAt3}%</span>
                      <span className="kpi-label">Retrieval Recall@3</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-value">{benchmarkReport.retrievalPrecisionAt3}%</span>
                      <span className="kpi-label">Retrieval Precision@3</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-value">{benchmarkReport.citationCorrectnessPct}%</span>
                      <span className="kpi-label">Citation Correctness</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-value">{benchmarkReport.groundednessPct}%</span>
                      <span className="kpi-label">Groundedness Pass Rate</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-value">{benchmarkReport.unsupportedDetectionRatePct}%</span>
                      <span className="kpi-label">Unsupported Detection</span>
                    </div>
                    <div className="kpi-card">
                      <span className="kpi-value">{benchmarkReport.averageLatencyMs} ms</span>
                      <span className="kpi-label">Average Latency</span>
                    </div>
                  </div>

                  <h4>Evaluated Test Cases ({benchmarkReport.totalQuestions})</h4>
                  <div className="cases-table-wrap">
                    <table className="cases-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Benchmark Query</th>
                          <th>Recall</th>
                          <th>Citation</th>
                          <th>Grounded</th>
                          <th>Latency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {benchmarkReport.results.map(c => (
                          <tr key={c.id}>
                            <td><span className="case-category">{c.category}</span></td>
                            <td className="case-question">"{c.question}"</td>
                            <td>{c.retrievalSuccess ? '✔ Pass' : '✖ Fail'}</td>
                            <td>{c.citationCorrect ? '✔ Pass' : '✖ Fail'}</td>
                            <td>{c.groundednessPass ? '✔ Pass' : '✖ Fail'}</td>
                            <td>{c.latencyMs} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowBenchmarkModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
