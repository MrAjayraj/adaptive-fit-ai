// src/components/ErrorBoundary.tsx
// Catches chunk-load errors (stale deploy) and offers a one-click reload.
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; isChunkError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    const isChunk =
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError';
    return { hasError: true, isChunkError: isChunk };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { isChunkError } = this.state;

    return (
      <div style={{
        minHeight: '100dvh', background: '#0C0F14',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 32, fontFamily: 'system-ui, sans-serif', textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>
          {isChunkError ? '🔄' : '⚠️'}
        </div>
        <h2 style={{ color: '#FAFAFA', fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>
          {isChunkError ? 'App updated — reload needed' : 'Something went wrong'}
        </h2>
        <p style={{ color: '#8E9BAA', fontSize: 15, maxWidth: 300, margin: '0 0 28px', lineHeight: 1.5 }}>
          {isChunkError
            ? 'FitPulse was updated in the background. Tap Reload to get the latest version.'
            : 'An unexpected error occurred. Please reload the page.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#00E676', color: '#000', border: 'none',
            borderRadius: 28, padding: '14px 36px',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,230,118,0.35)',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
