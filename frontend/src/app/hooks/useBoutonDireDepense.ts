import { useEffect, useRef, useState } from 'react';
import { ControleurCaptureDepense, type OptionsCaptureDepense } from './controleurCaptureDepense';

export function useBoutonDireDepense(options: OptionsCaptureDepense) {
  const [ecoute, setEcoute] = useState(false);
  const [messageMicroIndisponible, setMessageMicroIndisponible] = useState<string | null>(null);
  const controleur = useRef<ControleurCaptureDepense | null>(null);
  controleur.current ??= new ControleurCaptureDepense(setEcoute, setMessageMicroIndisponible);
  controleur.current.configurer(options);

  useEffect(() => () => controleur.current?.detruire(), []);
  return {
    ecoute,
    messageMicroIndisponible,
    ecouter: () => { void controleur.current?.ecouter(); },
  };
}
