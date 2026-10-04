import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GoNax ErrorBoundary] Uncaught render exception:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div className="card" style={{ maxWidth: '580px', width: '100%', textAlign: 'center' }}>
            <span className="badge badge-warning" style={{ marginBottom: '1rem', display: 'inline-block' }}>
              RUNTIME ERROR SAFEGUARD
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Scientific Workspace Render Error
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              An unexpected interface error occurred. Scientific prediction and underlying observation records remain securely persisted in the database.
            </p>
            {this.state.error && (
              <div style={{
                background: 'var(--surface-inset)',
                padding: '0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-default)',
                color: 'var(--status-error)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '1.5rem'
              }}>
                {this.state.error.message}
              </div>
            )}
            <button className="btn-primary" onClick={this.handleReset}>
              Reload GoNax Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
