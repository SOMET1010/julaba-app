// ──────────────────────────────────────────────────────────────────────────
// Intention LOCALE (offline) pour Julaba.
//
// Transforme une transcription (issue du STT sur l'appareil) en la MÊME forme
// que la réponse serveur (VoiceProcessResponse), pour que la suite du flux Julaba
// (confirmation, enregistrement caisse/stock) fonctionne à l'identique, sans LLM
// ni réseau.
//
// `null` EST UNE FIN DE PARCOURS, PAS UNE DÉLÉGATION — corrigé le 18/09/2026.
// Ce commentaire disait « l'appelant peut alors retomber sur le serveur (si en
// ligne) ». C'est faux depuis le commit 9cbe711 : le chemin vocal serveur a été
// retiré (backend/src/voice/, 10 fichiers). L'architecture réelle est
// téléphone -> Sherpa STT -> vocabulaire fermé -> téléphone, le serveur ne
// faisant plus qu'ENREGISTRER le résultat.
//
// Ce que ça change pour qui lit ce fichier : renvoyer `null` ne passe la main à
// personne. Ça termine la demande. useVoiceCore dit alors « je n'ai pas bien
// compris » et la marchande recommence. Toute sévérité ajoutée ici se paie donc
// comptant — c'est cette croyance en un filet inexistant qui avait rendu
// acceptable de jeter une vente entière pour un seul champ manquant.
// ──────────────────────────────────────────────────────────────────────────

import { extraire } from './extraction';
import { detecterEncaissement, type IntentionEncaissement } from './grammaireEncaissement';
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
  navigate: null;
  offline: true;
}

/**
 * Une intention d'encaissement, au MÊME format que les autres. `response` est
 * vide et `needsConfirmation` faux, et ce n'est pas un oubli : le moteur vocal
 * ne doit ni parler ni demander « oui/non » ici. C'est la machine
 * d'encaissement (POSCaisse) qui relit le compte et attend la seconde phrase —
 * sa confirmation à elle est liée au panier et au reçu, pas à une question.
 */
function resultatEncaissement(texte: string, intention: IntentionEncaissement): LocalVoiceResult {
  return {
    transcript: texte,
    normalizedText: texte,
    intent: intention,
    action: { type: intention },
    response: '',
    needsConfirmation: false,
    audioBase64: null,
    navigate: null,
    offline: true,
  };
}

/**
 * @param texte transcription brute (STT on-device)
 * @returns la réponse locale, ou null si non reconnu avec assez de confiance.
 */
export function intentLocal(texte: string): LocalVoiceResult | null {
  if (!texte || !texte.trim()) return null;

  // L'ENCAISSEMENT EST CONSULTÉ EN PREMIER (VOIX-01, lot C). « Combien elle
  // doit » contient « doit », qu'`extraire` lit comme un crédit ; « encaisse »
  // et « oui valide » ne contiennent rien qu'elle connaisse. Passée après,
  // la grammaire d'encaissement ne verrait jamais la première phrase et les
  // deux autres finiraient en « je n'ai pas bien compris » — c'est exactement
  // ce qui était mesuré sur cc26647.
  //
  // UNE SEULE EXCEPTION : l'annulation attend la fin. Sa grammaire est large
  // par choix (« non », « attends », « laisse »… : le doute profite au refus),
  // mais « attends, vends deux tomates à 500 » n'est pas un abandon, c'est
  // une correction qui porte une vente entière — et c'était une vente avant
  // ce lot. Une annulation n'écrit jamais d'argent, et une vente ajoutée au
  // panier invalide d'elle-même toute confirmation en attente (l'empreinte
  // change) : laisser la vente gagner ne coûte rien sur l'argent, alors que
  // l'avaler en silence coûterait la ligne.
  const encaissement = detecterEncaissement(texte);
  if (encaissement && encaissement !== 'annuler_validation') return resultatEncaissement(texte, encaissement);

  const p = extraire(texte);
  if (!p.intention) return encaissement ? resultatEncaissement(texte, encaissement) : null;

  // On ne traite localement que le transactionnel financier sûr (vente/dépense).
  // Le reste (soldes, questions ouvertes) reste au serveur quand on est en ligne.
  //
  // UNE VENTE SANS MONTANT N'EST PLUS JETÉE — correctif du 18/09/2026.
  // Patrick dit « un tas de piment » : l'extraction comprend tout (vente,
  // piment, 1), seul le montant manque. Cette ligne rejetait alors l'énoncé
  // ENTIER, et il ne se passait plus rien du tout — pas de ligne, pas un mot.
  // Or le prix, l'application le connaît : il est au catalogue. Ce module ne
  // va PAS le chercher (il resterait pur, sans catalogue) ; il remonte ce
  // qu'il a compris, et c'est vendreVocalUnifie — qui, lui, a le catalogue —
  // qui décide du prix. Le montant dicté y garde toujours la priorité.
  //
  // La dépense, elle, exige toujours un montant : rien ne permet de deviner
  // ce qu'on a payé.
  let type: string | null = null;
  let intent: string | null = null;
  if (p.intention === 'vente' && (p.montant != null || p.produit)) { type = 'vendre'; intent = 'vendre'; }
  else if (p.intention === 'depense' && p.montant != null) { type = 'depense'; intent = 'depense'; }
  // Pas de vente ni de dépense reconnue : un refus entendu plus haut vaut
  // alors pour ce qu'il est, une annulation.
  if (!type || !intent) return encaissement ? resultatEncaissement(texte, encaissement) : null;

  const action: LocalVoiceResult['action'] = { type };
  if (p.produit) action.produit = p.produit;
  if (p.quantite != null) action.quantite = p.quantite;
  if (p.montant != null) action.montant = p.montant;
  if (intent === 'depense' && p.produit) action.description = p.produit;

  // Accord du pluriel (« Vente de 2 tomates », pas « 2 tomate ») — même règle
  // que les dialogues de la vente guidée.
  const nomProduit = p.produit
    ? (p.quantite && p.quantite > 1 ? plurielNom(p.produit) : p.produit)
    : 'produit';
  // Sans montant dicté, on n'en ANNONCE aucun : le prix sera celui du
  // catalogue, et affirmer un chiffre qu'on n'a pas serait pire que se taire.
  const partMontant = p.montant != null ? ` pour ${fmt(p.montant)} francs` : '';
  const response =
    intent === 'vendre'
      ? `Vente de ${p.quantite ? `${p.quantite} ` : ''}${nomProduit}${partMontant}, c'est bien ça ?`
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
