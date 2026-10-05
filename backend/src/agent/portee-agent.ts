/**
 * CE QU'UN AGENT A LE DROIT DE FAIRE — AGENT-A1, 05/10/2026.
 *
 * POURQUOI UN PRINCIPAL À PART. Jusqu'ici, le seul émetteur de jeton de ce
 * dépôt est `POST /auth/login`, pour un être humain : `JwtStrategy` recharge
 * un `User` en base à chaque requête, et tout ce qui s'écrit est scopé à son
 * identifiant. Un agent serveur n'est pas un utilisateur. Lui donner les
 * identifiants d'une marchande pour qu'il se connecte à sa place — la voie la
 * plus courte — ferait de lui le point unique dont la compromission ouvre
 * TOUTES les caisses. C'est exactement ce qu'ALERTE-SEC-01 et SEC-2
 * cherchent à éviter.
 *
 * LA PORTÉE EST UNE LISTE BLANCHE, JAMAIS UNE LISTE NOIRE. Un agent ne peut
 * faire que ce qui est écrit ici ; tout le reste est refusé, y compris une
 * action qui n'existe pas encore. Le choix est le même que celui de
 * `LECTURES_AUTORISEES` dans `odoo-real.client.ts`, et pour la même raison :
 * une liste noire oublie toujours quelque chose, et ce qu'elle oublie passe.
 *
 * ── L'INVARIANT QUI PRIME SUR TOUS LES AUTRES ────────────────────────────
 *
 * Arbitrage de Patrick, 05/10, mot pour mot : « le code SMS ne doit jamais
 * être suffisant à lui seul pour changer durablement le propriétaire, le
 * numéro de téléphone ou les moyens de récupération du compte. Il autorise
 * une délégation bornée, rien de plus. »
 *
 * Conséquence, et elle est absolue : AUCUNE portée d'agent ne donne accès à
 * l'identité, au mot de passe, au PIN, au numéro de téléphone, aux moyens de
 * récupération, ni à la délégation elle-même. Un agent compromis peut
 * enregistrer de fausses ventes — c'est grave, c'est réparable, c'est tracé.
 * Il ne doit PAS pouvoir prendre le compte, ce qui ne se répare pas.
 *
 * `PORTEES_INTERDITES` fige cette frontière pour qu'un ajout futur ne puisse
 * pas la franchir par distraction.
 */

/** Les seules choses qu'un agent peut demander. Décision de Patrick du 05/10 :
 *  « créer des ventes, des dépenses et des mouvements de stock, et lire ;
 *  rien d'autre ». */
export const PORTEES_AGENT = [
  'ventes:ecrire',
  'depenses:ecrire',
  'stock:ecrire',
  'lecture',
] as const;

export type PorteeAgent = (typeof PORTEES_AGENT)[number];

/**
 * CE QU'AUCUNE PORTÉE D'AGENT NE POURRA JAMAIS COUVRIR.
 *
 * Ce ne sont pas des portées existantes qu'on retirerait : c'est une barrière
 * nommée, pour que la question « peut-on ajouter `compte:ecrire` ? » ait déjà
 * sa réponse le jour où quelqu'un la posera. Un banc la tient.
 */
export const PORTEES_INTERDITES = [
  'compte',       // propriétaire, identité
  'telephone',    // le numéro EST le moyen de récupération
  'motdepasse',
  'pin',
  'recuperation',
  'delegation',   // un agent ne s'auto-délègue pas, ni n'élargit sa portée
  'admin',
] as const;

export function estPorteeAgent(valeur: unknown): valeur is PorteeAgent {
  return typeof valeur === 'string' && (PORTEES_AGENT as readonly string[]).includes(valeur);
}

/**
 * Lit la portée d'un jeton. Tout ce qui n'est pas reconnu est JETÉ, sans
 * erreur : un jeton forgé avec `"portees": ["admin"]` ne doit pas faire
 * échouer la requête d'une façon qui renseigne son auteur — il doit
 * simplement n'avoir aucun droit.
 */
export function porteesDuJeton(brut: unknown): PorteeAgent[] {
  if (!Array.isArray(brut)) return [];
  const vues = new Set<PorteeAgent>();
  for (const p of brut) if (estPorteeAgent(p)) vues.add(p);
  return [...vues];
}

/**
 * L'agent a-t-il le droit de faire ceci ?
 *
 * `lecture` N'IMPLIQUE AUCUNE ÉCRITURE, et aucune portée n'en implique une
 * autre : pas de hiérarchie, pas de « qui peut le plus peut le moins ». Une
 * hiérarchie se raisonne, et ce qui se raisonne s'oublie.
 */
export function agentPeut(portees: readonly PorteeAgent[], requise: PorteeAgent): boolean {
  return portees.includes(requise);
}

/**
 * Une portée demandée est-elle refusable d'office ?
 *
 * Utilisé à la CRÉATION d'un compte de service, pas à chaque requête : on ne
 * veut pas qu'un jeton interdit existe, même inutilisable. Le préfixe suffit
 * — `compte:lire` comme `compte:ecrire` tombent tous les deux.
 */
export function porteeInterdite(valeur: string): boolean {
  const v = valeur.toLowerCase().trim();
  return PORTEES_INTERDITES.some((i) => v === i || v.startsWith(`${i}:`));
}
