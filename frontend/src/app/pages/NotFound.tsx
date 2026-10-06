import { useNavigate } from 'react-router';

export default function NotFound() {
  const navigate = useNavigate();

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f0',
    padding: '2rem',
    textAlign: 'center',
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    padding: '2.5rem 2rem',
    maxWidth: 400,
    width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: '#E65C1A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <span style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>J</span>
        </div>
        <p style={{ fontSize: 48, fontWeight: 700, color: '#E65C1A', margin: '0 0 4px' }}>404</p>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px' }}>
          Page introuvable
        </h1>
        <p style={{ fontSize: 13, color: '#888', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
          Cette page n'existe pas ou a été déplacée.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{ background: '#E65C1A', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
