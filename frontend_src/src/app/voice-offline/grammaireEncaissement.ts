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
//   « oui valide » AU MILIEU D'AUTRE CHOSE → rien
//
// LA VALIDATION EST UNE LISTE BLANCHE FERMÉE (VOIX-02, décision de Patrick
// du 20/09/2026). La première version cherchait « oui … valide » quelque
// part dans la phrase : « oui je valide pas » devenait une validation, et
// après relecture, un REFUS écrivait de l'argent — le montant était bien
// celui relu, l'esprit du critère était contredit. On n'a pas rajouté « pas »
// à une liste de négations : il y aurait toujours eu la phrase suivante
// (« oui valide la dépense », « ma cliente a dit oui valide », « oui je
// valide mon panier plus tard »). Une phrase qui écrit de l'argent se
// reconnaît par sa FORME EXACTE, pas par des mots qui traînent : la phrase
// ENTIÈRE, normalisée, doit être l'une des réponses autonomes ci-dessous —
// rien avant, rien après. La liste est courte, faite de ce qui se dit
// réellement, et on s'arrête là : l'agrandir, c'est agrandir la surface
// par laquelle un bruit peut payer.
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
 * LA LISTE DE RÉFÉRENCE, en un seul endroit. Le micro de la caisse doit
 * déclarer ces quatre intentions dans DEUX listes du moteur vocal (dispense de
 * confirmation orale, exécution immédiate hors ligne) : une intention oubliée
 * dans l'une des deux ne casserait rien de visible — elle serait juste mise
 * en file ou parlée deux fois. On les écrit ici, et nulle part ailleurs.
 */
export const INTENTIONS_ENCAISSEMENT: readonly IntentionEncaissement[] =
  ['encaisser', 'combien_doit', 'oui_valide', 'annuler_validation'];

/** Vrai si `type` (un `action.type` du moteur vocal) est une intention d'encaissement. */
export function estIntentionEncaissement(type: string): type is IntentionEncaissement {
  return (INTENTIONS_ENCAISSEMENT as readonly string[]).includes(type);
}

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

// ── VALIDATION FINALE : LISTE BLANCHE ─────────────────────────────────────
// Chaque entrée est une réponse AUTONOME, écrite sous sa forme normalisée
// (minuscules, sans accents, ponctuation aplatie) : « Oui, valide ! »,
// « oui validé » et « oui valide » sont la même entrée. On compare la phrase
// entière — jamais une sous-chaîne. Fermée par choix : voir l'en-tête.
const REPONSES_VALIDATION: ReadonlySet<string> = new Set([
  'oui valide',
  'oui je valide',
  'ouais valide',
  'ouais je valide',
  'valide oui',
  "oui c'est bon valide",
  'oui on valide',
  'oui valide ca',
]);

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

  // La phrase ENTIÈRE, ou rien. « oui je valide pas », « oui valide la
  // dépense », « ma cliente a dit oui valide » ne sont dans aucune liste :
  // elles ne valent rien ici, et retombent en « je n'ai pas compris ».
  if (REPONSES_VALIDATION.has(t.trim())) return 'oui_valide';

  if (ENCAISSER.test(t)) return 'encaisser';

  if (COMBIEN_DOIT.test(t)) return 'combien_doit';

  return null;
}
