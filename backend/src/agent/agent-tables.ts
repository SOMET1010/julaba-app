/**
 * LES TROIS TABLES DE L'AGENT — AGENT-A1/A2, 05/10/2026.
 *
 * Le DDL vit ici, en un seul endroit, et `DbInitService` comme la migration
 * le reprennent mot pour mot (ADR-0002, « DbInit ⊆ migrations »). Deux copies
 * d'un schéma finissent toujours par diverger ; une seule chaîne ne le peut
 * pas.
 *
 * POURQUOI DES TABLES ET PAS DES ENTITÉS TypeORM. `synchronize` ne tourne que
 * sur une base vierge, et `migrationsRun` est OFF : sur la base réelle, c'est
 * DbInit qui construit. Les tables sans entité sont la norme de ce dépôt
 * (`caisse_sessions`, `produits`, `stock_mouvements`…), pas une exception.
 */

/**
 * LE COMPTE DE SERVICE. Ce n'est PAS un utilisateur : il n'a ni téléphone, ni
 * mot de passe, ni PIN, et aucune ligne de `users` ne lui correspond. C'est
 * voulu — un agent qui aurait un compte utilisateur pourrait, un jour, s'en
 * servir comme tel.
 *
 * `portees` est un tableau de texte, validé à l'écriture contre
 * `PORTEES_AGENT` : la base garde ce que le code a accepté, elle n'arbitre
 * pas. `actif` permet de couper un agent d'un geste, sans effacer son
 * historique ni ses délégations.
 */
export const DDL_AGENT_SERVICE = `
  CREATE TABLE IF NOT EXISTS agent_service (
    id varchar(64) PRIMARY KEY,
    nom text NOT NULL,
    portees text[] NOT NULL DEFAULT '{}',
    actif boolean NOT NULL DEFAULT true,
    plafond_par_operation integer,
    plafond_par_jour integer,
    cree_le timestamptz NOT NULL DEFAULT now(),
    revoque_le timestamptz
  );
`;

/**
 * LE CODE DE DÉLÉGATION, envoyé par SMS et JAMAIS par WhatsApp.
 *
 * `empreinte` et jamais le code en clair : une base lue ne donne pas les
 * codes en cours, exactement comme pour un mot de passe. `essais` est
 * incrémenté à chaque tentative ratée, et `utilise_le` scelle l'usage unique.
 *
 * L'UNICITÉ EST SUR LE COUPLE (agent, marchande) — un agent n'a qu'un code en
 * cours par marchande à la fois. Demander un nouveau code remplace le
 * précédent, ce qui l'invalide : c'est le comportement attendu quand une
 * marchande dit « je n'ai rien reçu, renvoie ».
 */
export const DDL_CODE_DELEGATION = `
  CREATE TABLE IF NOT EXISTS agent_code_delegation (
    agent_id varchar(64) NOT NULL,
    marchand_id varchar(64) NOT NULL,
    empreinte text NOT NULL,
    appareil text NOT NULL,
    essais integer NOT NULL DEFAULT 0,
    cree_le bigint NOT NULL,
    utilise_le bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (agent_id, marchand_id)
  );
`;

/**
 * LA DÉLÉGATION. Trois termes, et les trois comptent : l'agent, la marchande
 * et l'appareil. La clé primaire les porte tous les trois — une même
 * marchande peut déléguer à un agent depuis deux appareils, et en révoquer un
 * sans toucher l'autre.
 *
 * `revoquee_le` n'efface rien : une délégation révoquée reste lisible, parce
 * qu'elle explique des écritures passées. On ne supprime pas la trace de ce
 * qui a autorisé de l'argent.
 */
export const DDL_DELEGATION = `
  CREATE TABLE IF NOT EXISTS agent_delegation (
    agent_id varchar(64) NOT NULL,
    marchand_id varchar(64) NOT NULL,
    appareil text NOT NULL,
    cree_le bigint NOT NULL,
    revoquee_le bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (agent_id, marchand_id, appareil)
  );
`;

/** Retrouver vite les délégations d'une marchande : c'est ce qu'elle voit
 *  quand elle demande « qui a le droit d'agir pour moi ? ». */
export const DDL_DELEGATION_INDEX = `
  CREATE INDEX IF NOT EXISTS ix_agent_delegation_marchand
  ON agent_delegation (marchand_id, revoquee_le);
`;

/** Toutes les instructions, dans l'ordre. DbInit et la migration itèrent
 *  dessus — aucune ne peut en oublier une. */
export const DDL_AGENT = [
  DDL_AGENT_SERVICE,
  DDL_CODE_DELEGATION,
  DDL_DELEGATION,
  DDL_DELEGATION_INDEX,
] as const;
