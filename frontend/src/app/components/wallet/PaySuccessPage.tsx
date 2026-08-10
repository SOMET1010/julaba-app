import React from 'react';
import { useLocation, useNavigate } from 'react-router';

export default function PaySuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSuccess = !location.pathname.includes('error');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF2E9', padding: 24 }}>
      <div style={{ fontSize: 72 }}>{isSuccess ? '✅' : '❌'}</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: isSuccess ? '#1a8c5a' : '#e53e3e', marginTop: 16 }}>
        {isSuccess ? 'Paiement effectué' : 'Paiement échoué'}
      </h1>
      <p style={{ color: '#888', marginTop: 8, textAlign: 'center' }}>
        {isSuccess ? 'Votre paiement a bien été reçu.' : 'Une erreur est survenue. Veuillez réessayer.'}
      </p>
      <button
        onClick={() => navigate('/')}
        style={{ marginTop: 32, padding: '14px 32px', borderRadius: 16, backgroundColor: '#C66A2C', color: 'white', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' }}
      >
        Retour
      </button>
    </div>
  );
}
