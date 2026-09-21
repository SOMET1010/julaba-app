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
import { enregistrerRenduVocal, RENDU_PAR_DEFAUT } from '../src/app/i18n/voice/contrat-audio';
import { t } from '../src/app/i18n/voice/runtime';
import { AppProvider } from './stubs/AppContext';
import { CaisseProvider } from './stubs/CaisseContext';

// Le guidage vocal lit une préférence locale ; « lecture » évite que le stub
// `speak` (muet de toute façon) soit sollicité à chaque geste de capture.
// `?voix=on` rejoue au contraire le profil qui ENTEND (banc de parcours).
try {
  const voulue = new URLSearchParams(location.search).get('voix') === 'on' ? 'voix' : 'lecture';
  localStorage.setItem('julaba_access_mode', voulue);
} catch { /* ignore */ }

// ── JOURNAL DE VOIX DU BANC (parcours.mjs) ────────────────────────────────
// Une capture d'écran ne prouve pas qu'une phrase a été DITE. On s'enregistre
// donc comme rendu vocal : on note la CLÉ du catalogue, ses VARIABLES et le
// texte résolu, puis on laisse le rendu par défaut faire son travail. Rien
// n'est simulé — c'est le vrai chemin `speakMessage` → `rendreMessage`.
enregistrerRenduVocal((message, direTexte) => {
  const j = ((window as any).__journalVoix ??= []);
  j.push({ id: message.id, variables: message.variables, texte: message.texte });
  return RENDU_PAR_DEFAUT(message, direTexte);
});
(window as any).__t = (id: string, vars?: Record<string, string | number>) => t(id as never, vars ?? {});
(window as any).__viderJournalVoix = () => { (window as any).__journalVoix = []; (window as any).__journalDits = []; };

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/marchand/caisse']}>
    <AppProvider>
      <CaisseProvider>
        <POSCaisse />
      </CaisseProvider>
    </AppProvider>
  </MemoryRouter>,
);
