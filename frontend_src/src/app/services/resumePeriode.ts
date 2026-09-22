/**
 * LA PÉRIODE QU'UN RÉSUMÉ DÉCRIT — HIS-01.
 *
 * LE DÉFAUT, relevé par la recette terrain (matrice v1.0, MAR-HIS-001) :
 * « je sélectionne la périodicité "Ce mois" et il est affiché "Aujourd'hui tu
 * as gagné 33 600 francs" ». Le mot « Aujourd'hui » était écrit EN DUR dans la
 * phrase, à deux endroits — celle qui s'affiche et celle qui se dit.
 *
 * Les chiffres, eux, étaient justes : ils venaient bien de la période choisie.
 * C'est la phrase qui mentait sur ce qu'ils comptaient. Une marchande lit
 * « aujourd'hui tu as gagné 33 600 » sur le total d'un mois et croit avoir fait
 * une journée exceptionnelle. C'est la faute que ce dépôt combat partout :
 * une donnée qui a deux sens.
 *
 * CE MODULE EST PUR. Il ne calcule aucun montant — il nomme une période, et
 * c'est tout. Les chiffres continuent de venir de `getFinancialSummary`.
 */

/** Les périodes que l'écran propose (ResumeCaisse). */
export type PeriodeResume = 'today' | '7days' | '30days' | 'custom';

/**
 * Le fragment de phrase qui NOMME la période, prêt à ouvrir une phrase.
 *
 * Pas le libellé du bouton : « 7 derniers jours, tu as gagné » ne se dit pas.
 * Ce sont les mots qu'une personne emploierait — avec leur préposition.
 */
export function ouverturePhrasePeriode(periode: PeriodeResume): string {
  switch (periode) {
    case 'today': return "Aujourd'hui";
    case '7days': return 'Sur les 7 derniers jours';
    case '30days': return 'Sur les 30 derniers jours';
    case 'custom': return 'Sur la période choisie';
  }
}

/**
 * La même période, mais à l'intérieur d'une phrase (« Résumé {de} »).
 * « Résumé aujourd'hui » ne se dit pas ; « Résumé du jour » si.
 */
export function complementPeriode(periode: PeriodeResume): string {
  switch (periode) {
    case 'today': return 'du jour';
    case '7days': return 'des 7 derniers jours';
    case '30days': return 'des 30 derniers jours';
    case 'custom': return 'de la période choisie';
  }
}

/**
 * LE GARDE-FOU DE SENS. Aucune période autre que « today » n'a le droit de
 * produire une phrase qui parle du jour — c'est exactement le défaut fermé ici,
 * et c'est la propriété qu'un test peut vérifier sur les quatre périodes d'un
 * coup, plutôt que d'espérer qu'on n'oubliera pas un cas en ajoutant le
 * cinquième.
 */
export function parleDuJour(periode: PeriodeResume): boolean {
  return periode === 'today';
}
