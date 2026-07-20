import React from 'react';
import { useNavigate, useRouteError } from 'react-router';
import { AlertCircle } from 'lucide-react';

export function ErrorFallback() {
  const navigate = useNavigate();
  const error = useRouteError() as any;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gray-50">
      <AlertCircle className="w-16 h-16 text-orange-400 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Oops, une erreur est survenue</h2>
      <p className="text-gray-500 text-center mb-6">Vérifiez votre connexion internet et réessayez.</p>
      {error && import.meta.env.DEV && (
        <p className="text-xs text-red-400 text-center mb-4 max-w-sm break-all">
          {error.message || String(error)}
        </p>
      )}
      <button onClick={() => navigate(-1)} className="px-6 py-3 rounded-2xl bg-orange-400 text-white font-bold">
        Retour
      </button>
    </div>
  );
}
