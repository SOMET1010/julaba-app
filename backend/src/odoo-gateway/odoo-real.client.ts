import { Logger } from '@nestjs/common';
import { OdooClient } from './odoo-client.interface';
import { OdooRealClientConfig } from './odoo-client.config';

/**
 * ALLOWLIST stricte des lectures autorisées pour ce lot — PAS une blacklist
 * de méthodes mutantes. Odoo peut exposer des méthodes métier qui mutent
 * l'état sans s'appeler `create`/`write`/`unlink` (ex. des `action_*`), et la
 * surface réelle dépend de la base ; une blacklist ne peut donc pas garantir
 * "lecture seule". Seules les combinaisons `model/method` listées ici passent
 * tant que `ODOO_REAL_WRITE_ENABLED` n'est pas activé — tout le reste est
 * refusé par défaut, y compris une méthode inconnue.
 */
const LECTURES_AUTORISEES = new Set(['product.product/search_read', 'product.product/read']);

function estLecture(model: string, method: string): boolean {
  return LECTURES_AUTORISEES.has(`${model}/${method}`);
}

/** 1 essai + 1 retry, uniquement pour les LECTURES et uniquement sur erreur
 *  transitoire (réseau/5xx). Jamais de retry sur une erreur fonctionnelle
 *  (4xx) — rejouer un mauvais payload ne le rend pas valide. Les mutations
 *  n'utilisent JAMAIS ce compteur — voir `execute()`. */
const MAX_TENTATIVES_LECTURE = 2;

export class OdooRealError extends Error {
  constructor(
    message: string,
    /** true = réseau/5xx, potentiellement transitoire → peut être rejoué
     *  (lectures uniquement). false = erreur fonctionnelle (4xx) ou refus
     *  local (hors allowlist) → ne JAMAIS rejouer tel quel. */
    public readonly transitoire: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OdooRealError';
  }
}

/**
 * Client Odoo RÉEL — Odoo 19 External API JSON-2 (`POST /json/2/<model>/
 * <method>`, paramètres nommés uniquement). Remplacement direct de
 * `OdooMockClient` derrière le même contrat `OdooClient.execute()` : ni
 * `OdooGatewayService` ni le contrôleur n'ont besoin de changer (voir
 * odoo-gateway.module.ts pour la bascule mock/réel).
 *
 * PORTÉE DE CE LOT — lecture seule contre une vraie instance :
 * - Tant que `ODOO_REAL_WRITE_ENABLED` n'est pas explicitement à `'true'`,
 *   SEULES les combinaisons `model/method` de `LECTURES_AUTORISEES`
 *   ci-dessus sont exécutées ; tout le reste est refusé AVANT tout appel
 *   réseau. Allowlist, pas blacklist — voir le commentaire sur
 *   `LECTURES_AUTORISEES`.
 * - Même une fois `ODOO_REAL_WRITE_ENABLED=true`, une mutation (tout ce qui
 *   n'est pas dans `LECTURES_AUTORISEES`) n'est JAMAIS rejouée
 *   automatiquement : un timeout peut survenir après que l'opération a
 *   réellement été exécutée côté Odoo, et la rejouer dupliquerait l'effet.
 *   Seules les lectures bénéficient du retry borné.
 *
 * Non couvert par ce lot : la forme exacte de la réponse JSON-2 (ce client
 * suppose que le corps de la réponse EST le résultat de la méthode, sans
 * enveloppe façon ancien JSON-RPC `{jsonrpc, result, id}`) — hypothèse à
 * confirmer dès qu'une instance de test réelle sera disponible, voir tests
 * contractuels (odoo-gateway.contract.spec.ts).
 */
export class OdooRealClient implements OdooClient {
  private readonly logger = new Logger(OdooRealClient.name);

  constructor(private readonly config: OdooRealClientConfig) {}

  async execute<T = unknown>(model: string, method: string, params: Record<string, unknown>): Promise<T> {
    const lecture = estLecture(model, method);

    if (!lecture && !this.config.writeEnabled) {
      throw new OdooRealError(
        `Opération refusée en lecture seule : "${model}.${method}" n'est pas dans l'allowlist de lecture ` +
          `(${[...LECTURES_AUTORISEES].join(', ')}) et ODOO_REAL_WRITE_ENABLED≠true.`,
        false,
      );
    }

    if (!lecture) {
      // Mutation autorisée (écriture activée) : appel UNIQUE, zéro retry —
      // voir doc de classe ci-dessus.
      return this.appelUnique<T>(model, method, params);
    }

    // Lecture (toujours autorisée, même écriture désactivée) : retry borné
    // sur erreur transitoire uniquement.
    let derniereErreur: unknown;
    for (let tentative = 1; tentative <= MAX_TENTATIVES_LECTURE; tentative++) {
      try {
        return await this.appelUnique<T>(model, method, params);
      } catch (e) {
        derniereErreur = e;
        const transitoire = e instanceof OdooRealError ? e.transitoire : true;
        if (!transitoire) break;
        if (tentative < MAX_TENTATIVES_LECTURE) {
          this.logger.warn(`[ODOO] ${model}.${method} tentative ${tentative} en échec (transitoire) — nouvel essai`);
        }
      }
    }
    throw derniereErreur;
  }

  private async appelUnique<T>(model: string, method: string, params: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const headers: Record<string, string> = {
        // Casse volontairement en minuscules — voir odoo-client.interface.ts,
        // contrat documenté lors du cadrage de ce Gateway.
        Authorization: `bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      };
      if (this.config.database) headers['X-Odoo-Database'] = this.config.database;

      const res = await fetch(`${this.config.baseUrl}/json/2/${model}/${method}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new OdooRealError(`Odoo a répondu ${res.status} pour ${model}.${method}`, res.status >= 500);
      }
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof OdooRealError) throw e;
      // fetch a levé avant même une réponse HTTP (timeout de l'AbortController,
      // DNS, connexion coupée…) — toujours transitoire.
      const message = e instanceof Error ? e.message : String(e);
      throw new OdooRealError(`Appel Odoo ${model}.${method} en échec : ${message}`, true, e);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
