import React from 'react';
import { RefreshCw } from 'lucide-react';
import tataLouImg from '../../../assets/images/tantie-portrait.png';

interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erreur capturée:', error.message, error.stack);
    console.error('[ErrorBoundary] Info composant:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const isNetworkFetchError =
        err instanceof TypeError && /\bfailed to fetch\b/i.test(String(err.message));
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '2rem', backgroundColor: '#FFF2E9', textAlign: 'center'
        }}>
          <img
            src={tataLouImg}
            alt="Tata Lou"
            style={{ width: 140, marginBottom: '1rem', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
          />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
            {isNetworkFetchError ? 'Pas de connexion' : 'Aïe, quelque chose a raté !'}
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: 300 }}>
            {isNetworkFetchError
              ? 'Vérifie ta connexion internet et réessaye ma chère.'
              : 'Pas d\'inquiétude, ça arrive. Clique sur réessayer pour continuer.'
            }
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.5rem', borderRadius: '1rem',
              backgroundColor: '#C66A2C', color: 'white',
              fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer'
            }}
          >
            <RefreshCw style={{ width: 20, height: 20 }} />
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
