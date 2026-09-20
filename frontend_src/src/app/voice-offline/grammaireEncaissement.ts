// ──────────────────────────────────────────────────────────────────────────
// GRAMMAIRE D'ENCAISSEMENT — VOIX-01, lot C. Module PUR, hors ligne d'abord.
//
// CE QU'ON OUVRE. Jusqu'ici, « encaisse » ne voulait rien dire pour JULABA :
// mesuré sur `cc26647`, les phrases « encaisse », « on encaisse »,
// « combien elle doit », « oui valide » renvoyaient TOUTES `null` — c'est-à-dire
// « Je n'ai pas bien compris ». La voix savait remplir un panier, pas le
// terminer.
//
// CE QUE CE MODULE NE FAIT PAS, ET NE DOIT JAMAIS FAIRE. Il ne décide de rien.
// Il ne connaît ni le panier, ni le total, ni le montant reçu. Reconnaître
// « oui valide » n'autorise AUCUN paiement : c'est `machineEncaissement.ts`
// qui détient la seule porte vers l'argent, et elle exige de retrouver
// exactement l'état financier que Tata vient de relire.
//
// LA SÉVÉRITÉ EST LE SUJET, PAS UN DÉTAIL. Au marché, il y a du bruit, des
// clientes qui parlent, et la reconnaissance vocale se trompe. Les interdits
// suivants sont donc des règles, pas des préférences :
//
//   « oui » seul            → rien
//   « d'accord »            → rien
//   « valide » seul         → rien
//   une phrase où « oui » traîne loin d'un « valide » → rien
//
// La validation finale exige DEUX mots concordants et VOISINS : une
// affirmation, puis la validation. C'est ce qui distingue une réponse d'un
// bruit, pour une phrase qui va écrire de l'argent.
//
// MONTANT REÇU : HORS PÉRIMÈTRE DU PILOTE (arbitrage du 20/09/2026). « Il m'a
// donné cinq mille » n'est volontairement PAS reconnu. Le montant reçu se
// saisit en billets, au doigt, parce qu'un chiffre financier dicté dans le
// bruit est exactement le genre d'erreur qu'on ne veut pas découvrir le soir.
// ──────────────────────────────────────────────────────────────────────────

export type IntentionEncaissement =
  /** « encaisse » — PRÉPARE l'encaissement. N'écrit jamais d'argent. */
  | 'encaisser'
  /** « combien elle doit » — lecture seule, à voix haute. */
  | 'combien_doit'
  /** « oui, valide » — la SECONDE phrase, celle qui peut confirmer. */
  | 'oui_valide'
  /** « non », « annule » — abandonne la confirmation en cours. */
  | 'annuler_validation';

/**
 * Minuscules, sans accents, ponctuation aplatie, bordée d'espaces. La
 * reconnaissance vocale est irrégulière sur les accents : la détection ne doit
 * jamais en dépendre. Les bords en espace permettent d'écrire `\bmot\b` sans
 * se soucier du début et de la fin de phrase.
 */
function normaliser(texte: string): string {
  return ` ${texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’`]/g, "'")
    .replace(/[.,!;:?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

// ── VALIDATION FINALE ─────────────────────────────────────────────────────
// Une affirmation ET une validation, VOISINES. Le « voisines » est ce qui
// empêche « oui, je regarderai si je valide demain » de payer une cliente.
// On tolère entre les deux : une virgule (aplatie en espace), « je »/« on »,
// et « c'est bon »/« c'est ca » — les liants réellement dits.
const LIANT = "(?:je |on |c'est bon |c'est ca |ca va |)";
const AFFIRMATION_PUIS_VALIDE = new RegExp(
  ` (?:oui|ouais|voila|hm hm|mm hm) (?:${LIANT})?valid\\w*[ ]`,
);
// L'ordre inverse se dit aussi : « valide oui ».
const VALIDE_PUIS_AFFIRMATION = /\bvalid\w* (?:oui|ouais|voila)[ ]/;

// ── ANNULATION ────────────────────────────────────────────────────────────
// Large volontairement : abandonner ne coûte rien, se tromper en payant coûte
// de l'argent. Le doute profite donc TOUJOURS au refus.
const ANNULATION = /\b(non|annule|annuler|attends|attend|arrete|arreter|pas encore|laisse)\b/;

// ── PRÉPARATION DE L'ENCAISSEMENT ─────────────────────────────────────────
// « encaisse » sous ses formes réellement dites, plus deux tournures
// naturelles sans ambiguïté. On n'admet PAS « fini », « c'est tout » ou
// « voilà » seuls : ce sont des mots de conversation ordinaire, et il n'y a
// aucune raison de faire basculer un écran d'argent sur un mot qui traîne.
const ENCAISSER = /\b(encaisse|encaisser|encaissement|encaissons)\b|\b(termine|terminer|finis|finir) (la )?vente\b/;

// ── QUESTION « COMBIEN ELLE DOIT » ────────────────────────────────────────
// Lecture seule : aucune écriture possible, on peut donc être plus accueillant.
// Reste borné à la DETTE DE LA CLIENTE et au TOTAL DU PANIER — jamais aux
// statistiques du jour, qui appartiennent à intentionsCaisse.ts (« combien
// j'ai vendu aujourd'hui » ne doit pas être détourné ici).
const COMBIEN_DOIT = /\bcombien (elle|il|la cliente|le client) doi(t|s)\b|\belle doit combien\b|\bil doit combien\b|\bca fait combien\b|\bc'est combien\b|\b(le |mon |)total\b/;

/**
 * Reconnaît une intention d'encaissement dans une phrase dictée.
 * `null` = ce n'est pas une phrase d'encaissement ; l'appelant continue son
 * parcours normal (vente, dépense, question…).
 */
export function detecterEncaissement(texte: string): IntentionEncaissement | null {
  if (!texte || !texte.trim()) return null;
  const t = normaliser(texte);

  // L'ANNULATION PASSE AVANT TOUT. « non, pas valide » contient « valid » :
  // si la validation était testée d'abord, un refus deviendrait un paiement.
  // C'est l'ordre de ces deux blocs qui rend ce module sûr.
  if (ANNULATION.test(t)) return 'annuler_validation';

  if (AFFIRMATION_PUIS_VALIDE.test(t) || VALIDE_PUIS_AFFIRMATION.test(t)) return 'oui_valide';

  if (ENCAISSER.test(t)) return 'encaisser';

  if (COMBIEN_DOIT.test(t)) return 'combien_doit';

  return null;
}
