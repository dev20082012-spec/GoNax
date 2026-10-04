import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { GroundedScientificAnswer, ScientificCitation, AnswerType } from '../types';
import { SourceInspectorModal } from './SourceInspectorModal';

interface Props {
  predictionId: string;
  speciesName: string;
  onOpenAssistantWorkspace?: () => void;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text?: string;
  answer?: GroundedScientificAnswer;
  timestamp: string;
}

export const LLMExplanationChat: React.FC<Props> = ({
  predictionId,
  speciesName,
  onOpenAssistantWorkspace
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: `Hello. I am the GoNax Scientific Knowledge & Retrieval Assistant for this ${speciesName} prediction. You can ask why this estimate was produced, what empirical equations were evaluated, how wood density scales mass, or what peer-reviewed research supports this calculation. Every answer is grounded in verified literature citations and deterministic model parameters.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspectedSourceId, setInspectedSourceId] = useState<string | null>(null);

  const sampleQuestions = [
    'Why did GoNax predict this amount of carbon for this tree?',
    'What variables does the trained model use and what is its equation?',
    'Why is the uncertainty at this tier and how are error bounds determined?',
    'What research supports this species wood density and carbon fraction?'
  ];

  const handleAsk = async (qText: string) => {
    const question = qText.trim();
    if (!question || loading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: question, timestamp: timeStr }
    ]);
    setInputQuestion('');
    setLoading(true);

    try {
      const groundedAnswer = await api.askScientificQuestion({
        question,
        predictionId,
        speciesName
      });

      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          answer: groundedAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Scientific Grounding Error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getBadge = (type: AnswerType) => {
    switch (type) {
      case 'SUPPORTED_BY_GONAX_DATA':
        return <span className="answer-badge gonax-data">✓ Supported by GoNax Data</span>;
      case 'SUPPORTED_BY_SCIENTIFIC_SOURCES':
        return <span className="answer-badge scientific-source">✓ Supported by Scientific Literature</span>;
      case 'INFERENCE_FROM_PROVIDED_EVIDENCE':
        return <span className="answer-badge inference">ℹ Inferred from Evidence</span>;
      case 'INSUFFICIENT_EVIDENCE':
        return <span className="answer-badge insufficient">⚠ Insufficient Scientific Evidence</span>;
      default:
        return null;
    }
  };

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      {}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Scientific Evidence & Grounded Q&A
            </h3>
            <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
              RAG INTELLIGENCE
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Answers anchored strictly to deterministic prediction metrics and peer-reviewed forestry publications.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            background: 'var(--surface-inset)',
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-default)',
            fontFamily: 'var(--font-mono)'
          }}>
            Zero Hallucination Guardrail Active
          </div>
          {onOpenAssistantWorkspace && (
            <button
              className="btn-secondary btn-sm"
              onClick={onOpenAssistantWorkspace}
              style={{ fontSize: '0.75rem' }}
            >
              Open Assistant Workspace ↗
            </button>
          )}
        </div>
      </div>

      {}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {sampleQuestions.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(sq)}
            disabled={loading}
            className="btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', textAlign: 'left' }}
          >
            "{sq}"
          </button>
        ))}
      </div>

      {}
      <div className="chat-window">
        <div className="chat-history">
          {messages.map((m, idx) => (
            <div key={idx} className={`chat-bubble ${m.sender}`}>
              <div style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: m.sender === 'ai' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                marginBottom: '0.4rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.4rem'
              }}>
                <span>{m.sender === 'ai' ? 'GoNax Scientific Assistant' : 'Researcher'} · {m.timestamp}</span>
                {m.answer && getBadge(m.answer.answerType)}
              </div>

              {m.text && (
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {m.text}
                </div>
              )}

              {m.answer && (
                <div className="grounded-chat-answer">
                  {}
                  <div className="answer-markdown-content" style={{ fontSize: '0.875rem' }}>
                    {m.answer.answer.split('\n\n').map((paragraph, pIdx) => {
                      if (paragraph.startsWith('### ')) {
                        return <h4 key={pIdx} style={{ fontSize: '0.95rem', margin: '0.6rem 0 0.3rem 0' }}>{paragraph.replace('### ', '')}</h4>;
                      }
                      return <p key={pIdx} style={{ margin: '0.4rem 0' }}>{paragraph}</p>;
                    })}
                  </div>

                  {}
                  {m.answer.citations.length > 0 && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-default)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Supporting Scientific Citations ({m.answer.citations.length}):
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                        {m.answer.citations.map((c, cIdx) => (
                          <div key={cIdx} style={{
                            background: 'var(--surface-inset)',
                            padding: '0.45rem 0.65rem',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.78rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.4rem'
                          }}>
                            <div>
                              <strong>{c.authors} ({c.year})</strong> — <em>{c.title}</em>
                              <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem' }}>[{c.section}]</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              {c.doi && (
                                <a
                                  href={c.url || `https://doi.org/${c.doi}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: 'var(--accent-primary)', fontSize: '0.75rem' }}
                                >
                                  DOI ↗
                                </a>
                              )}
                              <button
                                className="btn-secondary btn-sm"
                                style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                                onClick={() => setInspectedSourceId(c.sourceId)}
                              >
                                Inspect 🔍
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="chat-bubble ai" style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
              Retrieving peer-reviewed evidence and synthesizing grounded explanation...
            </div>
          )}
        </div>

        {}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleAsk(inputQuestion);
          }}
          style={{
            display: 'flex',
            borderTop: '1px solid var(--border-default)',
            backgroundColor: 'var(--surface-panel)'
          }}
        >
          <input
            type="text"
            placeholder="Ask a scientific question regarding this tree calculation..."
            value={inputQuestion}
            onChange={e => setInputQuestion(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '0.75rem 1rem',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '0.875rem',
              fontFamily: 'inherit'
            }}
          />
          <button
            type="submit"
            disabled={loading || !inputQuestion.trim()}
            className="btn-primary btn-sm"
            style={{
              margin: '0.35rem 0.5rem',
              padding: '0.4rem 1rem',
              opacity: loading || !inputQuestion.trim() ? 0.5 : 1
            }}
          >
            {loading ? 'Synthesizing...' : 'Ask Evidence Core ➔'}
          </button>
        </form>
      </div>

      {}
      <SourceInspectorModal
        sourceId={inspectedSourceId}
        onClose={() => setInspectedSourceId(null)}
      />
    </div>
  );
};
