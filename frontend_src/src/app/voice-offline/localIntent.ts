// ──────────────────────────────────────────────────────────────────────────
// Intention LOCALE (offline) pour Julaba.
//
// Transforme une transcription (issue du STT sur l'appareil) en la MÊME forme
// que la réponse serveur (VoiceProcessResponse), pour que la suite du flux Julaba
// (confirmation, enregistrement caisse/stock) fonctionne à l'identique, sans LLM
// ni réseau. Renvoie null si l'intention n'est pas reconnue avec assez de
// confiance -> l'appelant peut alors retomber sur le serveur (si en ligne).
// ──────────────────────────────────────────────────────────────────────────

import { validerOperationVocale } from './validationVocale';

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

  // POST-FILTRE STRICT anti-hallucination : n'accepte l'opération que si le montant
  // est propre ET ancré dans une vraie tournure de commande. Sinon null -> on
  // redemande (aucun montant halluciné n'est enregistré).
  const p = validerOperationVocale(texte);
  if (!p) return null;

  const type = p.intention === 'vente' ? 'vendre' : 'depense';
  const intent = type;

  const action: LocalVoiceResult['action'] = { type };
  if (p.produit) action.produit = p.produit;
  if (p.quantite != null) action.quantite = p.quantite;
  action.montant = p.montant;
  if (intent === 'depense' && p.produit) action.description = p.produit;

  const response =
    intent === 'vendre'
      ? `Vente de ${p.quantite ? `${p.quantite} ` : ''}${p.produit ?? 'produit'} pour ${fmt(p.montant)} francs, c'est bien ça ?`
      : `Dépense de ${fmt(p.montant)} francs${p.produit ? ` pour ${p.produit}` : ''}, c'est bien ça ?`;

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
