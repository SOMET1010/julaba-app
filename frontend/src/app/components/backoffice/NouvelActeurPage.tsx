import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { FicheIdentificationDynamiqueBO } from './FicheIdentificationDynamiqueBO';

export function NouvelActeurPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClose = () => {
    navigate('/backoffice/acteurs');
  };

  const handleSuccess = () => {
    navigate('/backoffice/acteurs');
  };

  return (
    <FicheIdentificationDynamiqueBO
      key={location.key}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );
}
