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
import * as audioManager from '../src/app/services/audioManager';
import { AppProvider } from './stubs/AppContext';
import { CaisseProvider } from './stubs/CaisseContext';

// Le guidage vocal lit une préférence locale ; « lecture » évite que le stub
// `speak` (muet de toute façon) soit sollicité à chaque geste de capture.
// `?voix=on` rejoue au contraire le profil qui ENTEND (banc de parcours).
try {
  const voulue = new URLSearchParams(location.search).get('voix') === 'on' ? 'voix' : 'lecture';
  localStorage.setItem('julaba_access_mode', voulue);
} catch { /* ignore */ }

// ── LE CATALOGUE MAÎTRE DU TÉLÉPHONE ──────────────────────────────────────
// Le banc coupe le réseau : `useCatalogueMaitre` retombait donc TOUJOURS sur
// un cache vide, et la branche « une référence Odoo porte le même nom »
// (`choisirReference`) de `ouvrirPrixManquant` n'était JAMAIS jouée — alors
// que sur un vrai téléphone ce cache est rempli dès la première synchro.
// `?maitre=garni` rejoue ce téléphone-là. Son catalogue À ELLE reste vide :
// le référentiel maître est commun, il ne lui donne aucun prix.
try {
  const CLE = 'julaba_cache_catalogue_maitre';
  if (new URLSearchParams(location.search).get('maitre') === 'garni') {
    localStorage.setItem(CLE, JSON.stringify([
      { default_code: 'ODOO-TOM-01', nom: 'Tomate', categorie: 'Légumes' },
      { default_code: 'ODOO-OIG-01', nom: 'Oignon', categorie: 'Légumes' },
    ]));
  } else {
    localStorage.removeItem(CLE);
  }
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

// ── CE QUI SORT VRAIMENT DU HAUT-PARLEUR ──────────────────────────────────
// `__journalDits` ne prouvait qu'un APPEL à `speak`. Or entre l'appel et le
// son il y a tout `audioManager` : le mute, l'anti-répétition, et surtout la
// règle « la plus récente gagne », qui COUPE la lecture en cours. Une phrase
// annoncée puis supplantée 10 ms plus tard n'a jamais été entendue — et
// l'ancien banc la comptait comme dite. On se branche donc sur les LECTEURS
// eux-mêmes : `__journalRendu` ne contient que ce qui a réellement commencé à
// être joué, avec son issue (`ended` = entendu, `cancelled` = coupé avant la
// fin par une voix plus récente).
const journalRendu = ((window as any).__journalRendu ??= [] as unknown[]);
const lecteurFactice = (quoi: Record<string, unknown>) => {
  const entree: Record<string, unknown> = { ...quoi, issue: 'en_cours' };
  journalRendu.push(entree);
  let regler!: (r: 'ended' | 'failed' | 'cancelled') => void;
  const promise = new Promise<'ended' | 'failed' | 'cancelled'>(res => { regler = res; });
  // Une lecture prend du temps : sans délai, elle serait terminée avant même
  // que la voix suivante puisse la couper, et le banc ne verrait jamais une
  // phrase supplantée — exactement le défaut qu'on cherche à voir.
  const fin = setTimeout(() => { entree.issue = 'ended'; regler('ended'); }, 120);
  return {
    promise,
    stop: () => { clearTimeout(fin); if (entree.issue === 'en_cours') { entree.issue = 'cancelled'; regler('cancelled'); } },
  };
};
audioManager.__setPlayers(
  (texte: string) => lecteurFactice({ moteur: 'texte', texte }),
  (source: { base64?: string; url?: string }) => lecteurFactice({ moteur: 'clip', url: source.url ?? '(base64)' }),
);

(window as any).__viderJournalVoix = () => {
  (window as any).__journalVoix = [];
  (window as any).__journalDits = [];
  (window as any).__journalRendu.length = 0;
};

// ── DICTER POUR DE VRAI (22/09/2026) ──────────────────────────────────────
// Le banc ne remplace plus `useVoiceCore` : il APPUIE SUR LE MICRO, comme un
// doigt. Le vrai moteur enregistre (média factice de Chromium), demande la
// transcription — seul maillon bouchonné — puis fait tout le reste lui-même.
const attendre = (ms: number) => new Promise(r => setTimeout(r, ms));
const bouton = () => document.querySelector<HTMLButtonElement>(
  'button[aria-label="Appuie pour parler"], button[aria-label="Appuie pour terminer"]',
);
(window as any).__apercuVoix = {
  dicter: async (texte: string) => {
    (window as any).__prochaineTranscription = texte;
    const debut = bouton();
    if (!debut) throw new Error('micro introuvable : la caisse ne rend pas son bouton');
    debut.click();
    await attendre(900); // de quoi capter plus que le seuil de 800 octets
    bouton()?.click();   // (le debounce du micro est de 300 ms)
    await attendre(1200);
  },
  /** Compatibilité `capture.mjs` : on dicte la phrase, on n'injecte plus l'intention. */
  injecter: async (d: { transcript?: string }) => (window as any).__apercuVoix.dicter(d.transcript || ''),
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/marchand/caisse']}>
    <AppProvider>
      <CaisseProvider>
        <POSCaisse />
      </CaisseProvider>
    </AppProvider>
  </MemoryRouter>,
);
