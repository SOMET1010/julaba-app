/** Verrou synchrone d'une opération async à session unique. */
export interface JetonSessionAsync {
  readonly id: symbol;
}

export function creerSessionAsyncExclusive() {
  let courant: JetonSessionAsync | null = null;

  return {
    demarrer(): JetonSessionAsync | null {
      if (courant) return null;
      courant = { id: Symbol('session-async') };
      return courant;
    },

    estCourante(jeton: JetonSessionAsync): boolean {
      return courant === jeton;
    },

    /** Libère uniquement le jeton propriétaire, jamais une session plus récente. */
    terminer(jeton: JetonSessionAsync): boolean {
      if (courant !== jeton) return false;
      courant = null;
      return true;
    },

    /** Invalide immédiatement toute continuation après annulation. */
    annuler(jeton: JetonSessionAsync): boolean {
      if (courant !== jeton) return false;
      courant = null;
      return true;
    },
  };
}
