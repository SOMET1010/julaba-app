// Comment Tata s'adresse à la personne.
//
// « Bonjour Maman Awa » était écrit en dur à trois endroits (écran de
// connexion, accueil marchande × 2), avec « ma sœur » en repli. Un marchand
// se faisait donc appeler « Maman », et aucune de ces trois copies ne pouvait
// évoluer sans les deux autres — exactement le doublon que le principe 1 de
// la Constitution interdit.
//
// Règle : le titre suit le genre RÉEL de la personne. Quand il n'est pas
// connu, on ne le devine pas — on emploie le prénom seul. Se tromper de
// titre en s'adressant à quelqu'un est pire que de n'en employer aucun.

/** Titre d'adresse, éventuellement vide si rien n'est connu. */
export function appellation(genre?: string | null, prenom?: string | null): string {
  const p = (prenom || '').trim();
  switch ((genre || '').toLowerCase().trim()) {
    case 'femme':
      return p ? `Maman ${p}` : 'ma sœur';
    case 'homme':
      return p ? `Papa ${p}` : 'mon frère';
    default:
      // Genre inconnu : le prénom seul, jamais un titre deviné.
      return p;
  }
}

/**
 * Salutation complète, prête à être dite ou affichée.
 * Sans rien de connu, reste un « Bonjour ! » correct plutôt qu'un titre faux.
 */
export function salutation(genre?: string | null, prenom?: string | null): string {
  const qui = appellation(genre, prenom);
  return qui ? `Bonjour ${qui}` : 'Bonjour';
}
