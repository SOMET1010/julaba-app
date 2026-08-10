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
  navigate: null;
  offline: true;
}

/**
 * @param texte transcription brute (STT on-device)
 * @returns la réponse locale, ou null si non reconnu avec assez de confiance.
 */
export function intentLocal(texte: string): LocalVoiceResult | null {
  if (!texte || !texte.trim()) return null;
  const p = extraire(texte);
  if (!p.intention) return null;

  // On ne traite localement que le transactionnel financier sûr (vente/dépense).
  // Le reste (soldes, questions ouvertes) reste au serveur quand on est en ligne.
  let type: string | null = null;
  let intent: string | null = null;
  if (p.intention === 'vente' && p.montant != null) { type = 'vendre'; intent = 'vendre'; }
  else if (p.intention === 'depense' && p.montant != null) { type = 'depense'; intent = 'depense'; }
  if (!type || !intent) return null;

  const action: LocalVoiceResult['action'] = { type };
  if (p.produit) action.produit = p.produit;
  if (p.quantite != null) action.quantite = p.quantite;
  if (p.montant != null) action.montant = p.montant;
  if (intent === 'depense' && p.produit) action.description = p.produit;

  const response =
    intent === 'vendre'
      ? `Vente de ${p.quantite ? `${p.quantite} ` : ''}${p.produit ?? 'produit'} pour ${fmt(p.montant!)} francs, c'est bien ça ?`
      : `Dépense de ${fmt(p.montant!)} francs${p.produit ? ` pour ${p.produit}` : ''}, c'est bien ça ?`;

  return {
    transcript: texte,
    normalizedText: texte,
    intent,
    action,
    response,
    needsConfirmation: true, // toujours confirmer une opération financière
    audioBase64: null,
    navigate: null,
    offline: true,
  };
}
