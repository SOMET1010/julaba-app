/**
 * LA DÉLÉGATION, CÔTÉ BASE — AGENT-A2, 05/10/2026.
 *
 * Toutes les décisions vivent dans `delegation-agent.ts` et `portee-agent.ts`,
 * qui sont purs et prouvés sans base. Ce service ne fait que lire, écrire et
 * envoyer un SMS. S'il contenait une règle, elle serait la seule du lot à ne
 * pas être prouvable sans Postgres.
 */
import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import { DataSource } from 'typeorm';
import { SmsService } from '../sms/sms.service';
import {
  CODE_ESSAIS_MAX, delegationActive, etatDuCode,
  type CodeDelegation, type Delegation, type EtatCode, type PlafondsAgent,
} from './delegation-agent';
import { porteesDuJeton, type PorteeAgent } from './portee-agent';

export interface CompteAgent {
  readonly id: string;
  readonly portees: PorteeAgent[];
  readonly actif: boolean;
  readonly plafonds: PlafondsAgent;
}

/**
 * Un code à six chiffres, tiré par `randomInt` du module `crypto` et JAMAIS
 * par `Math.random` — ce dernier est prévisible, et un code de délégation
 * prévisible est un compte ouvert.
 */
function tirerCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** On ne range jamais le code lui-même. Même raison que pour un mot de passe :
 *  une base lue ne doit pas donner les codes en cours. */
function empreinteDe(code: string, agentId: string, marchandId: string): string {
  return createHash('sha256').update(`${agentId}|${marchandId}|${code}`).digest('hex');
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sms: SmsService,
  ) {}

  async compte(agentId: string): Promise<CompteAgent | null> {
    const lignes = await this.dataSource.query(
      `SELECT id, portees, actif, plafond_par_operation, plafond_par_jour, revoque_le
         FROM agent_service WHERE id = $1 LIMIT 1`,
      [agentId],
    );
    const l = lignes[0];
    if (!l) return null;
    return {
      id: l.id,
      portees: porteesDuJeton(l.portees),
      // Révoqué OU inactif : les deux ferment, et la lecture n'a pas à savoir
      // laquelle des deux a servi.
      actif: l.actif === true && l.revoque_le == null,
      plafonds: {
        parOperation: l.plafond_par_operation ?? null,
        parJour: l.plafond_par_jour ?? null,
      },
    };
  }

  /**
   * Envoie à la marchande un code de délégation, PAR SMS.
   *
   * Le numéro est lu dans `users`, jamais fourni par l'agent : sinon un agent
   * demanderait un code pour un numéro qu'il contrôle, et se déléguerait
   * lui-même. C'est tout le sens d'un canal séparé.
   */
  async demanderCode(agentId: string, marchandId: string, appareil: string, maintenant: number): Promise<boolean> {
    const lignes = await this.dataSource.query(
      `SELECT phone FROM users WHERE id = $1 LIMIT 1`,
      [marchandId],
    );
    const phone = lignes[0]?.phone;
    if (!phone) return false;

    const code = tirerCode();
    await this.dataSource.query(
      `INSERT INTO agent_code_delegation (agent_id, marchand_id, empreinte, appareil, essais, cree_le, utilise_le)
       VALUES ($1,$2,$3,$4,0,$5,NULL)
       ON CONFLICT (agent_id, marchand_id) DO UPDATE SET
         empreinte = EXCLUDED.empreinte, appareil = EXCLUDED.appareil,
         essais = 0, cree_le = EXCLUDED.cree_le, utilise_le = NULL`,
      [agentId, marchandId, empreinteDe(code, agentId, marchandId), appareil, maintenant],
    );

    // Le texte dit ce que le code AUTORISE, et ce qu'il n'autorise pas. Une
    // marchande qui ne lit pas se le fera lire : autant que la phrase soit
    // juste et courte.
    const texte =
      `Julaba : code ${code}. Il autorise WhatsApp a enregistrer tes ventes. ` +
      `Il ne donne PAS acces a ton compte. Ne le partage avec personne.`;
    const r = await this.sms.sendSms(phone, texte);
    return r?.success !== false;
  }

  /** L'état du code tel que les règles pures le jugent. */
  private async lireCode(agentId: string, marchandId: string): Promise<CodeDelegation | null> {
    const lignes = await this.dataSource.query(
      `SELECT empreinte, essais, cree_le, utilise_le, appareil
         FROM agent_code_delegation WHERE agent_id = $1 AND marchand_id = $2 LIMIT 1`,
      [agentId, marchandId],
    );
    const l = lignes[0];
    if (!l) return null;
    return {
      empreinte: l.empreinte,
      essais: Number(l.essais) || 0,
      creeLe: Number(l.cree_le) || 0,
      utiliseLe: l.utilise_le == null ? null : Number(l.utilise_le),
    };
  }

  /**
   * La marchande confirme : la délégation naît.
   *
   * UN ÉCHEC COMPTE UN ESSAI, et c'est ce qui ferme la porte au bout de cinq.
   * On incrémente AVANT de répondre, jamais après : une réponse interrompue
   * ne doit pas offrir un essai gratuit.
   */
  async confirmerCode(
    agentId: string, marchandId: string, code: string, appareil: string, maintenant: number,
  ): Promise<EtatCode> {
    const enregistre = await this.lireCode(agentId, marchandId);
    const etat = etatDuCode(enregistre, maintenant);
    if (!etat.valide) return etat;

    if (enregistre!.empreinte !== empreinteDe(code, agentId, marchandId)) {
      await this.dataSource.query(
        `UPDATE agent_code_delegation SET essais = essais + 1
          WHERE agent_id = $1 AND marchand_id = $2`,
        [agentId, marchandId],
      );
      const restants = CODE_ESSAIS_MAX - (enregistre!.essais + 1);
      return { valide: false, raison: restants <= 0 ? 'trop-d-essais' : 'inconnu' };
    }

    await this.dataSource.query(
      `UPDATE agent_code_delegation SET utilise_le = $3
        WHERE agent_id = $1 AND marchand_id = $2`,
      [agentId, marchandId, maintenant],
    );
    await this.dataSource.query(
      `INSERT INTO agent_delegation (agent_id, marchand_id, appareil, cree_le, revoquee_le)
       VALUES ($1,$2,$3,$4,NULL)
       ON CONFLICT (agent_id, marchand_id, appareil) DO UPDATE SET
         cree_le = EXCLUDED.cree_le, revoquee_le = NULL`,
      [agentId, marchandId, appareil, maintenant],
    );
    this.logger.log(`[AGENT] délégation accordée — agent=${agentId} marchand=${marchandId}`);
    return { valide: true };
  }

  /** L'agent peut-il agir pour cette marchande, depuis cet appareil ? */
  async delegationValide(
    agentId: string, marchandId: string, appareil: string, maintenant: number,
  ): Promise<boolean> {
    const lignes = await this.dataSource.query(
      `SELECT agent_id, marchand_id, appareil, cree_le, revoquee_le
         FROM agent_delegation
        WHERE agent_id = $1 AND marchand_id = $2 AND appareil = $3 LIMIT 1`,
      [agentId, marchandId, appareil],
    );
    const l = lignes[0];
    const d: Delegation | null = l
      ? {
          agentId: l.agent_id, marchandId: l.marchand_id, appareil: l.appareil,
          creeLe: Number(l.cree_le) || 0,
          revoqueeLe: l.revoquee_le == null ? null : Number(l.revoquee_le),
        }
      : null;
    return delegationActive(d, { agentId, marchandId, appareil }, maintenant);
  }

  /**
   * La marchande retire son autorisation. `appareil` absent = TOUT révoquer
   * pour cet agent.
   *
   * On ne supprime pas la ligne : une délégation révoquée explique des
   * écritures passées, et on ne détruit pas la trace de ce qui a autorisé de
   * l'argent.
   */
  async revoquer(marchandId: string, maintenant: number, agentId?: string, appareil?: string): Promise<number> {
    const conditions = ['marchand_id = $1', 'revoquee_le IS NULL'];
    const params: unknown[] = [marchandId, maintenant];
    if (agentId) { params.push(agentId); conditions.push(`agent_id = $${params.length}`); }
    if (appareil) { params.push(appareil); conditions.push(`appareil = $${params.length}`); }
    const r = await this.dataSource.query(
      `UPDATE agent_delegation SET revoquee_le = $2 WHERE ${conditions.join(' AND ')}`,
      params,
    );
    return Array.isArray(r) && typeof r[1] === 'number' ? r[1] : 0;
  }

  /** Ce que la marchande voit : qui agit pour elle, depuis quel appareil, et
   *  ce qui a été révoqué. On montre AUSSI les révoquées — elles expliquent
   *  des écritures passées, et les cacher laisserait croire qu'elles
   *  n'avaient jamais existé. */
  async delegationsDe(marchandId: string): Promise<unknown[]> {
    return this.dataSource.query(
      `SELECT agent_id, appareil, cree_le, revoquee_le
         FROM agent_delegation WHERE marchand_id = $1 ORDER BY cree_le DESC`,
      [marchandId],
    );
  }

  /** Ce que l'agent a déjà écrit pour cette marchande aujourd'hui — le cumul
   *  que `montantAutorise` compare au plafond journalier. */
  async cumulDuJour(marchandId: string): Promise<number> {
    const lignes = await this.dataSource.query(
      `SELECT COALESCE(SUM(montant), 0) AS total FROM caisse_transactions
        WHERE user_id = $1 AND source = 'whatsapp'
          AND created_at::date = CURRENT_DATE AND type = 'vente'`,
      [marchandId],
    );
    return Number(lignes[0]?.total) || 0;
  }
}
