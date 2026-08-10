/**
 * MARCHAND ACADEMY PAGE - Wrapper pour Marchand
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { JulabaAcademy } from './JulabaAcademy';
import { useUser } from '../../contexts/UserContext';

export function MarchandAcademy() {
  const navigate = useNavigate();
  const { user } = useUser();

  const handleBack = () => {
    navigate('/marchand/profil');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900 mb-2">Chargement...</p>
          <p className="text-sm text-gray-600">Accès à Academy</p>
        </div>
      </div>
    );
  }

  return (
    <JulabaAcademy
      role="marchand"
      userId={user.numeroMarchand}
      onBack={handleBack}
    />
  );
}