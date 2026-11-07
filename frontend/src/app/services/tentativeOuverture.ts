export type ResultatTentativeOuverture =
  | { etat: 'ouverte' }
  | { etat: 'echec' }
  | { etat: 'ignoree' };

/** Une écriture à la fois; seul un rejet permet une nouvelle tentative. */
export function creerTentativeOuverture() {
  let enCours = false;
  let terminee = false;

  return {
    async executer(ouvrir: () => void | Promise<void>): Promise<ResultatTentativeOuverture> {
      if (enCours || terminee) return { etat: 'ignoree' };
      enCours = true;
      try {
        await ouvrir();
        terminee = true;
        return { etat: 'ouverte' };
      } catch {
        return { etat: 'echec' };
      } finally {
        enCours = false;
      }
    },
  };
}
