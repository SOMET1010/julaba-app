// Comment Tata s'adresse à la personne.
//
// « Bonjour Maman Awa » était écrit en dur à cinq endroits (écran de
// connexion, accueil marchande), avec « ma sœur » en repli. Un marchand se
// faisait donc appeler « Maman », et aucune de ces copies ne pouvait évoluer
// sans les quatre autres — le doublon que le principe 1 de la Constitution
// interdit.
//
// RÈGLE (décision Patrick, 15/09/2026) : on emploie le **prénom seul**, sauf
// si la personne a dit dans sa fiche d'identification comment elle veut
// qu'on l'appelle — et c'est alors ce nom-là, tel quel.
//
// On ne déduit jamais un titre du genre. La colonne `genre` a 'femme' pour
// valeur par défaut : en déduire « Maman » revient à en inventer un pour tout
// le monde, y compris pour un marchand. Se tromper de titre en s'adressant à
// quelqu'un est pire que de n'en employer aucun — et c'est à elle de dire
// comment on l'appelle, pas à nous de le deviner.

/**
 * Le nom à employer : celui qu'elle a choisi, sinon son prénom, sinon rien.
 * @param choisie `users.appellation` — ce qu'elle a demandé dans sa fiche.
 */
export function appellation(choisie?: string | null, prenom?: string | null): string {
  return (choisie || '').trim() || (prenom || '').trim();
}

/**
 * Salutation complète, prête à être dite ou affichée.
 * Sans rien de connu, reste un « Bonjour » correct plutôt qu'un nom faux.
 */
export function salutation(choisie?: string | null, prenom?: string | null): string {
  const qui = appellation(choisie, prenom);
  return qui ? `Bonjour ${qui}` : 'Bonjour';
}
