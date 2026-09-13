/**
 * Contrat de la couche Odoo — calqué sur l'API externe JSON-2 d'Odoo 19.
 *
 * Odoo 19 introduit l'External JSON-2 API en remplacement des anciennes
 * XML-RPC / JSON-RPC (`/xmlrpc`, `/xmlrpc/2`, `/jsonrpc`), en fin de vie
 * annoncée : `POST /json/2/<model>/<method>`, arguments TOUJOURS nommés
 * (aucun appel positionnel comme l'ancien `execute_kw`), authentification
 * par clé API en en-tête `Authorization: bearer <clé>`.
 *
 * `execute()` reproduit exactement cette forme d'appel : modèle + méthode +
 * un unique objet de paramètres nommés. Le nom est délibérément neutre —
 * PAS `callKw`, qui porte la sémantique de l'ancien XML-RPC/JSON-RPC — pour
 * ne pas figer ce contrat sur une API en fin de vie.
 *
 * Deux implémentations :
 * - `OdooMockClient` : simule le comportement, aucun réseau, aucun secret.
 *   Voir odoo-mock.client.ts.
 * - `OdooRealClient` : appelle réellement `POST {ODOO_BASE_URL}/json/2/
 *   <model>/<method>` avec :
 *     - `Authorization: bearer {ODOO_API_KEY}`
 *     - `Content-Type: application/json`
 *     - `X-Odoo-Database: {ODOO_DB}` (uniquement si plusieurs bases
 *       partagent le domaine)
 *   `ODOO_BASE_URL`/`ODOO_API_KEY`/`ODOO_DB` sont des variables
 *   d'environnement BACKEND UNIQUEMENT — jamais exposées au frontend
 *   JULABA, jamais transmises au navigateur. Voir odoo-real.client.ts : ce
 *   client reste lecture seule (mutations refusées localement) tant que
 *   `ODOO_REAL_WRITE_ENABLED` n'est pas explicitement activé, et n'a encore
 *   été validé QUE par tests contractuels (fetch simulé) — pas contre une
 *   vraie instance Odoo (voir docs/ETUDE_ARCHITECTURE_JULABA_ODOO.md).
 *
 * Bascule prévue : remplacer l'implémentation injectée sous le token
 * `ODOO_CLIENT` (voir odoo-gateway.module.ts) — ni ce fichier, ni le
 * service, ni le contrôleur n'ont besoin de changer.
 */
export interface OdooClient {
  execute<T = unknown>(model: string, method: string, params: Record<string, unknown>): Promise<T>;
}

/** Token d'injection NestJS — une interface TypeScript n'existe pas à l'exécution. */
export const ODOO_CLIENT = Symbol('ODOO_CLIENT');
