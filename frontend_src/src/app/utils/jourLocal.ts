/**
 * JULABA — Jour LOCAL (fuseau de l'appareil)
 *
 * `new Date().toISOString().split('T')[0]` renvoie le jour en **UTC**, ce qui
 * peut décaler « aujourd'hui » d'un jour près de minuit hors UTC. À Abidjan
 * (Africa/Abidjan = UTC+0) le résultat est identique à l'UTC — donc ce helper
 * est un NO-OP à la locale de production, tout en devenant correct ailleurs.
 *
 * On calcule le jour à partir des composantes LOCALES (getFullYear/Month/Date),
 * jamais via toISOString (UTC). Un seul point de vérité, testé.
 */
export function jourLocal(date: string | number | Date = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const an = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${an}-${mois}-${jour}`;
}

/** true si `date` tombe le même jour LOCAL que `reference` (par défaut : maintenant). */
export function estAujourdhui(date: string | number | Date, reference: Date = new Date()): boolean {
  const j = jourLocal(date);
  return j !== '' && j === jourLocal(reference);
}
