/**
 * ENTRÉE JETABLE — aperçu visuel de la caisse (VOIX-01, lot F).
 *
 * Monte le VRAI `POSCaisse` (et donc le vrai `MicroVenteCaisse`) avec les
 * MÊMES feuilles de style que l'application, mais des contextes factices
 * (voir ./stubs et l'alias dans ./vite.config.ts). Aucun backend, aucune
 * connexion, aucune donnée réelle : c'est un banc de capture pour l'œil,
 * pas une caisse. Ce dossier n'entre pas dans `vite build` (l'entrée de
 * production reste index.html à la racine) ni dans `tsc -b` (tsconfig
 * n'inclut que `src`).
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import '../src/styles/fonts.css';
import '../src/styles/icons-tabler.css';
import '../src/styles/theme.css';
import '../src/styles/tailwind.css';
import '../src/styles/index.css';
import '../src/styles/tokens.css';
import '../src/styles/soleil.css';
import '../src/styles/commerce.css';
import '../src/styles/login.css';
import { POSCaisse } from '../src/app/components/marchand/POSCaisse';
import { AppProvider } from './stubs/AppContext';
import { CaisseProvider } from './stubs/CaisseContext';

// Le guidage vocal lit une préférence locale ; « lecture » évite que le stub
// `speak` (muet de toute façon) soit sollicité à chaque geste de capture.
try { localStorage.setItem('julaba_access_mode', 'lecture'); } catch { /* ignore */ }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/marchand/caisse']}>
    <AppProvider>
      <CaisseProvider>
        <POSCaisse />
      </CaisseProvider>
    </AppProvider>
  </MemoryRouter>,
);
