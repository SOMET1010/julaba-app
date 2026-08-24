// ──────────────────────────────────────────────────────────────────────────
// Intention LOCALE (offline) pour Julaba.
//
// Transforme une transcription (issue du STT sur l'appareil) en la MÊME forme
// que la réponse serveur (VoiceProcessResponse), pour que la suite du flux Julaba
// (confirmation, enregistrement caisse/stock) fonctionne à l'identique, sans LLM
// ni réseau. Renvoie null si l'intention n'est pas reconnue avec assez de
// confiance -> l'appelant peut alors retomber sur le serveur (si en ligne).
// ──────────────────────────────────────────────────────────────────────────

import { extraire } from './extraction';
import { detecterNavigation } from './navigationIntent';
import { plurielNom } from '../services/dialoguesTata';

const fmt = (n: number) => n.toLocaleString('fr-FR');

// Réponse minimale au MÊME format que le serveur (champs utiles au flux).
export interface LocalVoiceResult {
  transcript: string;
  normalizedText: string;
  intent: string;
  action: { type: string; montant?: number; produit?: string; quantite?: number; description?: string };
  response: string;
  needsConfirmation: boolean;
  audioBase64: null;
  navigate: string | null;
  offline: true;
}

function resultat(
  texte: string,
  intent: string,
  action: LocalVoiceResult['action'],
  response: string,
  opts: { needsConfirmation?: boolean; navigate?: string | null } = {},
): LocalVoiceResult {
  return {
    transcript: texte,
    normalizedText: texte,
    intent,
    action,
    response,
    needsConfirmation: opts.needsConfirmation ?? false,
    audioBase64: null,
    navigate: opts.navigate ?? null,
    offline: true,
  };
}

/**
 * @param texte transcription brute (STT on-device)
 * @returns la réponse locale, ou null si non reconnu avec assez de confiance.
 */
export function intentLocal(texte: string): LocalVoiceResult | null {
  if (!texte || !texte.trim()) return null;
  const p = extraire(texte);

  // ── Transactionnel financier sûr (vente/dépense) — priorité absolue ──────
  if ((p.intention === 'vente' || p.intention === 'depense') && p.montant != null) {
    const intent = p.intention === 'vente' ? 'vendre' : 'depense';
    const action: LocalVoiceResult['action'] = { type: intent, montant: p.montant };
    if (p.produit) action.produit = p.produit;
    if (p.quantite != null) action.quantite = p.quantite;
    if (intent === 'depense' && p.produit) action.description = p.produit;

    // Accord du pluriel (« Vente de 2 tomates », pas « 2 tomate ») — même règle
    // que les dialogues de la vente guidée.
    const nomProduit = p.produit
      ? (p.quantite && p.quantite > 1 ? plurielNom(p.produit) : p.produit)
      : 'produit';
    const response =
      intent === 'vendre'
        ? `Vente de ${p.quantite ? `${p.quantite} ` : ''}${nomProduit} pour ${fmt(p.montant!)} francs, c'est bien ça ?`
        : `Dépense de ${fmt(p.montant!)} francs${p.produit ? ` pour ${p.produit}` : ''}, c'est bien ça ?`;
    return resultat(texte, intent, action, response, { needsConfirmation: true });
  }

  // ── Réappro : stock reçu (« j'ai reçu 20 tomates ») — écriture non
  // financière, toujours confirmée avant application (comme vente/dépense).
  // Exige un produit ET une quantité : sans quantité, mieux vaut ne rien
  // faire que deviner de combien augmenter le stock.
  if (p.intention === 'reappro' && p.produit && p.quantite != null) {
    const nomProduit = p.quantite > 1 ? plurielNom(p.produit) : p.produit;
    return resultat(
      texte,
      'reappro',
      { type: 'reappro', produit: p.produit, quantite: p.quantite },
      `Stock reçu : ${p.quantite} ${nomProduit}, c'est bien ça ?`,
      { needsConfirmation: true },
    );
  }

  // ── Crédit / remboursement : pas encore activés sur la caisse (pilote
  // espèces, voir POSCaisse.CAISSE_CREDIT_ACTIF) — on le dit clairement au
  // lieu de laisser la marchande croire qu'il faut juste reformuler.
  if (p.intention === 'credit' || p.intention === 'remboursement') {
    return resultat(
      texte,
      p.intention,
      { type: 'none' },
      "Le crédit n'est pas encore activé sur ta caisse. Cette fonction arrive bientôt.",
    );
  }

  // ── Navigation explicite (« va au stock », « ferme ma journée »…) ───────
  // Note : les QUESTIONS de lecture (« combien j'ai vendu ? ») ne passent
  // jamais par ici — detecterNavigation exige un verbe d'action explicite,
  // et sont traitées séparément par intentionsCaisse.ts (answerQuestion).
  const nav = detecterNavigation(texte);
  if (nav) {
    return resultat(texte, nav.type, { type: nav.type }, nav.response, { navigate: nav.path });
  }

  return null;
}
