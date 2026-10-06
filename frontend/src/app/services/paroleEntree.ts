/**
 * QUI A LE DROIT DE PARLER AVANT LA CONNEXION — AKW-02.
 *
 * LE DÉFAUT D'ORIGINE. `AppContext.speak` refuse tout ce qui n'est pas
 * `role === 'marchand'`. Sur les écrans d'entrée PERSONNE n'est connecté : la
 * phrase partait, se faisait refuser, et l'écran restait muet en silence.
 *
 * CE QUE C'EST DEVENU, ET QUI EST PIRE. Depuis AKW-01 les trois écrans
 * d'entrée ne sont plus muets — mais chacun s'est fait SA PROPRE porte
 * dérobée vers `audioManager`, et aucune règle ne dit qui a le droit de
 * l'emprunter. N'importe quel écran peut importer `audioManager.speak` et
 * parler, y compris un écran d'institution. Trois contournements sans règle,
 * c'est pire qu'un refus : le refus, au moins, se voyait.
 *
 * CE QU'ON NE FAIT PAS — arbitrage de Patrick, 23/09 : desserrer
 * `user?.role !== 'marchand'`. Autoriser naïvement `user === null` partout
 * ouvrirait la voix à TOUS les écrans non connectés, pour toujours. La voie
 * est donc NOMMÉE : elle ne s'ouvre que pour des écrans listés ici.
 *
 * `AppContext.tsx` EST FIGÉ PAR VOICE-01. Ce module ne le touche pas d'une
 * ligne : il ne remplace pas la garde de rôle, il la complète pour les seuls
 * écrans où il n'y a personne à qui attribuer un rôle.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */

/**
 * Les écrans qui précèdent toute connexion. La liste est COURTE et fermée :
 * c'est elle, et elle seule, qui rend la voie utilisable.
 *
 *   akwaba     — écran 1, le tout premier du téléphone
 *   onboarding — écran 2, Tantie se présente
 *   connexion  — écran 3, numéro et code
 */
export const ECRANS_DENTREE = ['akwaba', 'onboarding', 'connexion'] as const;

export type EcranParlant = typeof ECRANS_DENTREE[number];

export interface DemandeDeParole {
  /** L'écran d'entrée qui demande, ou `null` pour un appel ordinaire. */
  readonly ecran: EcranParlant | null;
  /** Le rôle de qui est connecté. `null` = personne. */
  readonly role: string | null;
  /** Le muet global, tel que la marchande l'a réglé. */
  readonly muet: boolean;
}

export interface DecisionDeParole {
  readonly autorisee: boolean;
  /** Pourquoi on se tait. Reprend les mots déjà tracés par `AppContext.speak`. */
  readonly raison: 'muet' | 'role-non-marchand' | null;
}

const estEcranDentree = (e: unknown): e is EcranParlant =>
  (ECRANS_DENTREE as readonly unknown[]).includes(e);

export function paroleAutorisee(d: DemandeDeParole): DecisionDeParole {
  // LE MUET PASSE AVANT TOUT. Elle a coupé le son : aucune voie, si nommée
  // soit-elle, ne rouvre ce qu'elle a fermé.
  if (d.muet) return { autorisee: false, raison: 'muet' };

  // La marchande connectée parle partout, comme aujourd'hui.
  if (d.role === 'marchand') return { autorisee: true, raison: null };

  // LA VOIE D'ENTRÉE, ET SA BORNE. Elle sert à celle qui n'est PAS ENCORE
  // connectée — donc `role === null`, strictement. Une institution connectée
  // qui repasserait par l'écran d'entrée ne gagne rien : la voie d'entrée
  // n'est pas un contournement de la garde de rôle, c'est son complément là
  // où il n'y a personne à qui attribuer un rôle.
  if (d.role === null && estEcranDentree(d.ecran)) {
    return { autorisee: true, raison: null };
  }

  // Tout le reste : le refus d'aujourd'hui, avec le mot d'aujourd'hui.
  return { autorisee: false, raison: 'role-non-marchand' };
}

// ── LA PRIMITIVE ───────────────────────────────────────────────────────────

import { speak as direAuMoteur } from './audioManager';

/**
 * LA SEULE PORTE DE PAROLE D'AVANT LA CONNEXION — AKW-02.
 *
 * AVANT : chaque écran d'entrée importait `audioManager` et parlait
 * lui-même. Trois portes, trois décisions implicites, et rien pour empêcher
 * une quatrième. Un écran d'institution pouvait faire exactement pareil.
 *
 * MAINTENANT : une porte, nommée, qui demande la permission avant de passer.
 * Le garde `paroleEntree.test.mts` interdit qu'un écran d'entrée en ouvre une
 * autre.
 *
 * LE MUET GLOBAL EST RESPECTÉ PAR DÉLÉGATION, et c'est vérifié : il vit dans
 * `audioManager` (`_muted`, lu par `runExclusive` et `playHandle`), pas dans
 * la garde de rôle. Cette primitive ne le contourne pas — elle passe par lui.
 *
 * `emettre` EXISTE POUR NE RIEN CHANGER À CE QUI EST DIT. L'écran de connexion
 * parle par `direEntreeTexte` (clip exact, aucune voix étrangère en repli) ;
 * l'accueil par le moteur. Imposer un seul canal changerait le SON entendu par
 * la marchande — ce lot ne change que QUI a le droit de parler.
 *
 * Rend `true` si la parole est partie, `false` si la porte est restée fermée.
 */
export async function parlerAvantConnexion(
  ecran: EcranParlant,
  texte: string,
  emettre: (t: string) => Promise<unknown> = direAuMoteur,
): Promise<boolean> {
  if (!texte?.trim()) return false;
  // `role: null` — cette porte ne sert QUE l'avant-connexion. Un rôle connu
  // passe par le chemin ordinaire, garde comprise.
  // `muet: false` — le muet n'est pas jugé ici : il appartient à
  // `audioManager`, qui le lit à chaque prise de parole.
  if (!paroleAutorisee({ ecran, role: null, muet: false }).autorisee) return false;
  try { await emettre(texte); return true; } catch { return false; }
}
