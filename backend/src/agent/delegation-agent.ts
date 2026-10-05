/**
 * UNE MARCHANDE AUTORISE UN AGENT À AGIR POUR ELLE — AGENT-A2, 05/10/2026.
 *
 * Contrat arrêté par Patrick le 05/10, et ce module n'en est que la règle
 * pure : identité connue, code à usage unique envoyé par SMS, durée de vie
 * courte, non réutilisable, délégation liée à l'agent ET à la marchande ET à
 * l'appareil, révocable, journalisée. AUCUNE délégation par WhatsApp.
 *
 * POURQUOI LE SMS, ET PAS WHATSAPP. C'est la décision la plus structurante du
 * lot. Le code doit voyager par un canal que l'agent NE CONTRÔLE PAS. Envoyé
 * sur WhatsApp, quiconque tient le WhatsApp — c'est-à-dire précisément ce
 * qu'on cherche à se prémunir — s'auto-déléguerait. Le SMS oblige à tenir la
 * ligne téléphonique, et rétablit la séparation que WhatsApp effacerait.
 * C'est aussi la règle que SEC-2 applique déjà au PIN.
 *
 * ── CE QU'UNE DÉLÉGATION N'EST PAS ───────────────────────────────────────
 *
 * Elle n'est PAS une connexion. Elle n'ouvre pas le compte : elle autorise un
 * agent nommé à faire, pour une marchande nommée, les quelques gestes de sa
 * portée. Elle ne peut jamais servir à changer le propriétaire, le numéro de
 * téléphone ou les moyens de récupération — voir `portee-agent.ts`, où cette
 * frontière est nommée et tenue par un banc.
 *
 * CE MODULE NE LIT NI BASE NI HORLOGE SYSTÈME. L'instant lui est TOUJOURS
 * passé. C'est ce qui permet de prouver l'expiration sans attendre, et ce qui
 * évite qu'un test devienne instable à minuit.
 */

/** Durée de vie d'un code. Court, parce qu'un code qui traîne est un code qui
 *  fuit — et assez long pour qu'une marchande au marché ait le temps de lire
 *  son SMS et de répondre. */
export const CODE_VALIDITE_MS = 10 * 60 * 1000;

/** Au-delà, on ne laisse plus essayer : un code à 6 chiffres se devine en
 *  un million de coups, pas en cinq. */
export const CODE_ESSAIS_MAX = 5;

export type EtatCode =
  /** Utilisable maintenant. */
  | { readonly valide: true }
  /** Refusé, et la raison ne dit JAMAIS si le code existait : un attaquant ne
   *  doit pas apprendre, par la forme du refus, qu'il a trouvé un numéro. */
  | { readonly valide: false; readonly raison: 'expire' | 'deja-utilise' | 'trop-d-essais' | 'inconnu' };

export interface CodeDelegation {
  /** Jamais le code en clair : son empreinte. Une base lue ne donne pas les
   *  codes en cours, exactement comme pour un mot de passe. */
  readonly empreinte: string;
  readonly creeLe: number;
  readonly utiliseLe?: number | null;
  readonly essais: number;
}

/**
 * Ce code est-il utilisable à cet instant ?
 *
 * L'ORDRE DES TESTS EST VOLONTAIRE : « déjà utilisé » passe AVANT
 * « expiré ». Un code consommé puis présenté après son délai doit se dire
 * consommé — c'est l'information utile pour comprendre ce qui s'est passé,
 * et la plus sévère des deux.
 */
export function etatDuCode(code: CodeDelegation | null | undefined, maintenant: number): EtatCode {
  if (!code) return { valide: false, raison: 'inconnu' };
  if (code.utiliseLe) return { valide: false, raison: 'deja-utilise' };
  if (code.essais >= CODE_ESSAIS_MAX) return { valide: false, raison: 'trop-d-essais' };
  if (maintenant - code.creeLe >= CODE_VALIDITE_MS) return { valide: false, raison: 'expire' };
  return { valide: true };
}

export interface Delegation {
  readonly agentId: string;
  readonly marchandId: string;
  /** L'appareil ou la session pour laquelle elle vaut. Une délégation n'est
   *  pas un blanc-seing : elle est liée aux trois à la fois. */
  readonly appareil: string;
  readonly creeLe: number;
  readonly revoqueeLe?: number | null;
}

/**
 * Cet agent peut-il agir pour cette marchande, depuis cet appareil, à cet
 * instant ?
 *
 * LES TROIS DOIVENT CORRESPONDRE. Une délégation accordée à l'agent A pour la
 * marchande M depuis l'appareil D n'autorise rien d'autre — ni l'agent B, ni
 * la marchande N, ni un autre appareil. Sans le troisième terme, un agent
 * légitime dont une session fuit continuerait d'agir depuis n'importe où.
 */
export function delegationActive(
  d: Delegation | null | undefined,
  demande: { agentId: string; marchandId: string; appareil: string },
  maintenant: number,
): boolean {
  if (!d) return false;
  if (d.revoqueeLe != null && d.revoqueeLe <= maintenant) return false;
  return (
    d.agentId === demande.agentId &&
    d.marchandId === demande.marchandId &&
    d.appareil === demande.appareil
  );
}

/**
 * ── LES PLAFONDS ─────────────────────────────────────────────────────────
 *
 * Arbitrage de Patrick, 05/10 : « je ne veux pas encore fixer un chiffre
 * arbitraire. Le montant doit être choisi à partir des montants réels des
 * transactions, pas inventé dans le code. »
 *
 * Ils sont donc des PARAMÈTRES NON RENSEIGNÉS, et `null` veut dire « pas
 * encore décidé », jamais « illimité ». La différence porte sur l'argent :
 * un plafond absent qui laisserait tout passer serait une porte ouverte que
 * personne n'aurait choisi d'ouvrir.
 *
 * TANT QU'UN PLAFOND N'EST PAS RENSEIGNÉ, L'ÉCRITURE EST REFUSÉE. C'est
 * volontairement gênant : c'est ce qui force la décision au lieu de la
 * laisser dormir. Et c'est le sens de refuser plutôt que de deviner.
 */
export interface PlafondsAgent {
  /** En francs CFA. `null` = À DÉFINIR, et donc rien ne passe. */
  readonly parOperation: number | null;
  /** En francs CFA, cumulé sur la journée. `null` = À DÉFINIR. */
  readonly parJour: number | null;
}

export type VerdictPlafond =
  | { readonly permis: true }
  | { readonly permis: false; readonly raison: 'non-defini' | 'operation' | 'journalier' };

/**
 * Ce montant passe-t-il ?
 *
 * `dejaAujourdhui` est le cumul DÉJÀ écrit par l'agent pour cette marchande
 * aujourd'hui — l'appelant le calcule, ce module ne lit rien.
 *
 * Un dépassement n'est pas un écrêtement : on ne laisse JAMAIS passer une
 * partie du montant. Une vente de 50 000 F au-dessus du plafond est refusée
 * entière, elle n'entre pas à 20 000. Écrêter écrirait un chiffre faux dans
 * la caisse d'une marchande — « ne jamais masquer une réalité économique ».
 */
export function montantAutorise(
  plafonds: PlafondsAgent,
  montant: number,
  dejaAujourdhui: number,
): VerdictPlafond {
  if (plafonds.parOperation == null || plafonds.parJour == null) {
    return { permis: false, raison: 'non-defini' };
  }
  if (!Number.isFinite(montant) || montant <= 0) return { permis: false, raison: 'operation' };
  if (montant > plafonds.parOperation) return { permis: false, raison: 'operation' };
  const cumul = (Number.isFinite(dejaAujourdhui) ? dejaAujourdhui : 0) + montant;
  if (cumul > plafonds.parJour) return { permis: false, raison: 'journalier' };
  return { permis: true };
}
