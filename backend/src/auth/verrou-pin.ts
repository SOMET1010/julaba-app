/**
 * LE VERROU DU CODE SECRET — une échelle d'attente, jamais une porte murée.
 *
 * CE QU'ON REMPLACE, et pourquoi c'était grave. Au 9ᵉ code raté, le serveur
 * posait `lockedUntil = maintenant + 100 ans`. Pas une minute : définitivement.
 * Seul un identificateur DE LA MÊME ZONE pouvait le lever. Une marchande qui
 * hésite sur son code un jour de marché perdait sa caisse — son argent, ses
 * ventes, ses crédits — sans aucun recours sur place.
 *
 * Le pire : l'échelle progressive existait DÉJÀ, mais écrite dans l'écran de
 * connexion, en mémoire JavaScript, avec ce commentaire — « blocage total
 * (déblocage identificateur, COSMÉTIQUE POUR L'INSTANT) ». Elle disparaissait au
 * moindre rechargement. L'intention juste était au mauvais endroit : le côté
 * doux était décoratif, le côté brutal était réel. Ce module remet l'échelle là
 * où elle protège vraiment — le serveur — et supprime le blocage à vie.
 *
 * POURQUOI UN VERROU RESTE NÉCESSAIRE. Un code à 4 chiffres, c'est 10 000
 * combinaisons. Le seul débit réseau (5 tentatives/minute) laisserait un
 * téléphone volé céder en ~1,4 jour. L'échelle ci-dessous ramène un attaquant à
 * ~72 essais par jour : il lui faut alors ~139 jours pour tout épuiser. C'est le
 * compromis assumé — une marchande récupère sa caisse en attendant, un voleur
 * n'a pas la patience.
 *
 * LA RÈGLE, en clair : on n'attend QUE sur un palier de 3 échecs.
 *   3 échecs  →  5 minutes
 *   6 échecs  → 15 minutes
 *   9 échecs  →  1 heure
 *   12, 15, 18… → 1 heure à chaque fois. Sans fin, mais jamais définitif.
 * Entre deux paliers (4ᵉ, 5ᵉ, 7ᵉ… essai), elle peut réessayer tout de suite :
 * c'est le droit à l'hésitation.
 *
 * Le compteur repart à zéro dès qu'un code juste passe.
 */

/** Un palier tombe tous les 3 échecs — pas avant, pas entre. */
export const PALIER = 3;

const CINQ_MINUTES = 5 * 60 * 1000;
const QUINZE_MINUTES = 15 * 60 * 1000;
const UNE_HEURE = 60 * 60 * 1000;

/**
 * Combien de temps attendre après `echecs` échecs consécutifs.
 * `0` = aucune attente, elle peut réessayer immédiatement.
 */
export function attenteApresEchecs(echecs: number): number {
  if (echecs <= 0 || echecs % PALIER !== 0) return 0;
  if (echecs === 3) return CINQ_MINUTES;
  if (echecs === 6) return QUINZE_MINUTES;
  return UNE_HEURE; // 9 et au-delà : le plafond, jamais l'infini.
}

/**
 * Combien d'essais restent avant la prochaine attente.
 * Sert à PRÉVENIR — « attention, encore deux essais » — parce qu'aujourd'hui
 * rien n'annonce le palier : on tombe dedans sans le voir venir.
 */
export function essaisAvantAttente(echecs: number): number {
  const reste = PALIER - (Math.max(0, echecs) % PALIER);
  return reste === 0 ? PALIER : reste;
}

/** Une attente, dite comme on la dirait à quelqu'un qui n'a pas de montre. */
export function attenteEnClair(ms: number): string {
  if (ms <= 0) return '';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  const heures = Math.round(minutes / 60);
  return `${heures} heure${heures > 1 ? 's' : ''}`;
}

/**
 * Un verrou POSÉ PAR L'ANCIENNE POLITIQUE (100 ans) doit-il être levé ?
 *
 * Ces verrous n'expirent jamais : sans ce filtre, les comptes bloqués avant ce
 * correctif le resteraient pour toujours, alors même que la règle qui les a
 * créés n'existe plus. On considère hors-échelle tout verrou qui dépasse
 * largement le plafond d'une heure.
 */
export const HORIZON_MAX_MS = 24 * 60 * 60 * 1000;

export function estVerrouHeriteSansFin(lockedUntil: Date | null, maintenant = Date.now()): boolean {
  if (!lockedUntil) return false;
  return lockedUntil.getTime() - maintenant > HORIZON_MAX_MS;
}
