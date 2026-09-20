/**
 * fr-ci — LEXIQUE : produits, unités, nombres, monnaie, verbes métier.
 *
 * RIEN N'EST RECOPIÉ. Chaque table existait déjà, à un endroit qui reste sa
 * source ; ce fichier les ABSORBE en les important et en les présentant sous
 * la forme commune à toutes les langues (`Lexique`, types.ts) :
 *   - produits      ← voice-offline/vocabulaire.ts (PRODUITS_FORMES, inversé :
 *                     identifiant → formes) ;
 *   - unités        ← utils/unite.utils.ts (GRAPHIES_CANONIQUES) ;
 *   - nombres       ← voice-offline/extraction.ts (UNITES, DIZAINES) ;
 *   - monnaie       ← config/devise.ts (DEVISE_PARLEE, DEVISE_SYMBOLE) et
 *                     extraction.ts (marqueurs « à », « pour », « francs ») ;
 *                     les NOMS DE COUPURES ont déménagé de utils/fcfa.ts
 *                     (direCoupure) — fcfa les relit ici ;
 *   - verbes métier ← voice-offline/vocabulaire.ts (INTENTIONS_MAP) ;
 *   - unités dites  ← déménagées de components/marchand/ChoixUnite.tsx
 *                     (PHRASES) : « kg » se DIT « au kilo ».
 *
 * LIMITE ASSUMÉE. Aujourd'hui, l'identifiant d'un produit dans le parseur
 * EST son libellé français (`PRODUITS_FORMES['tomates'] === 'tomate'`). Le
 * lexique expose cet identifiant tel quel (`produits.tomate`) ; découpler
 * l'identifiant du libellé (« tomato ») demande de toucher extraction.ts et
 * les tests gelés de localIntent — hors de ce lot, signalé dans le rapport.
 */
import { INTENTIONS_MAP, PRODUITS_FORMES } from '../../../../voice-offline/vocabulaire';
import { DIZAINES, MARQUEURS_APRES, MARQUEURS_AVANT, UNITES } from '../../../../voice-offline/extraction';
import { GRAPHIES_CANONIQUES } from '../../../../utils/unite.utils';
import { DEVISE_PARLEE, DEVISE_SYMBOLE } from '../../../../config/devise';
import type { Lexique } from '../../types';

/** PRODUITS_FORMES (forme → identifiant), inversé en identifiant → formes, ordre du source conservé. */
function inverser(formes: Readonly<Record<string, string>>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [forme, id] of Object.entries(formes)) (out[id] ??= []).push(forme);
  return out;
}

export const LEXIQUE_FR_CI: Lexique = {
  produits: inverser(PRODUITS_FORMES),
  unites: GRAPHIES_CANONIQUES,
  nombres: {
    mots: { ...UNITES, ...DIZAINES },
    echelles: { cent: 100, cents: 100, mille: 1000 },
    connecteurs: ['et'],
  },
  monnaie: {
    parlee: DEVISE_PARLEE,
    symbole: DEVISE_SYMBOLE,
    marqueursAvant: [...MARQUEURS_AVANT],
    marqueursApres: [...MARQUEURS_APRES],
    // Noms dits des coupures (ex-utils/fcfa.ts, direCoupure) : « dix mille francs ».
    coupures: {
      10000: 'dix mille', 5000: 'cinq mille', 2000: 'deux mille', 1000: 'mille',
      500: 'cinq cents', 250: 'deux cent cinquante', 200: 'deux cents',
      100: 'cent', 50: 'cinquante', 25: 'vingt-cinq',
    },
  },
  verbesMetier: INTENTIONS_MAP,
  // La tournure est celle du marché (« je vends au kilo »), pas celle du
  // bouton (« kg » ne se prononce pas). Ex-components/marchand/ChoixUnite.tsx.
  unitesDites: {
    'unité': "à l'unité",
    'tas': 'au tas',
    'kg': 'au kilo',
    'sac': 'au sac',
    'bassine': 'à la bassine',
    'régime': 'au régime',
  },
};
