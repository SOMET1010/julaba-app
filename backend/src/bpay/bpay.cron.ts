import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BpayService } from './bpay.service';
import { WalletsService } from '../wallets/wallets.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CronJobsConfigService } from '../cron-jobs/cron-jobs-config.service';
import { CRON_JOB_BPAY_RECONCILIATION } from '../cron-jobs/cron-jobs.registry';

@Injectable()
export class BpayCronService {
  private readonly logger = new Logger(BpayCronService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bpayService: BpayService,
    private readonly walletsService: WalletsService,
    private readonly notificationsService: NotificationsService,
    private readonly cronJobsConfig: CronJobsConfigService,
  ) {}

  @Cron('*/5 * * * *')
  async reconcilierTransactionsPending() {
    if (!(await this.cronJobsConfig.isEnabled(CRON_JOB_BPAY_RECONCILIATION))) {
      this.logger.debug('[BPAY CRON] désactivé depuis le back-office — exécution ignorée');
      return;
    }
    const startedAt = Date.now();
    try {
      await this.executerReconciliation();
      await this.cronJobsConfig.recordExecution(CRON_JOB_BPAY_RECONCILIATION, {
        status: 'success',
        durationMs: Date.now() - startedAt,
      });
    } catch (e: any) {
      await this.cronJobsConfig.recordExecution(CRON_JOB_BPAY_RECONCILIATION, {
        status: 'error',
        durationMs: Date.now() - startedAt,
        error: e?.message ?? String(e),
      });
      throw e;
    }
  }

  private async executerReconciliation() {
    this.logger.log('[BPAY CRON] Début réconciliation');
    const pending = await this.dataSource.query(`
      SELECT * FROM bpay_transactions
      WHERE status = 'PENDING'
      AND created_at < NOW() - INTERVAL '15 minutes'
      ORDER BY created_at ASC
      LIMIT 50
    `);
    this.logger.log(`[BPAY CRON] ${pending.length} transaction(s) à réconcilier`);
    for (const tx of pending) {
      try {
        let bpayStatut: string;
        try {
          const result = await this.bpayService.verifierStatut(tx.pay_token);
          bpayStatut = result.statut;
        } catch {
          this.logger.warn(`[BPAY CRON] check-status échec payToken=${tx.pay_token} — passé`);
          continue;
        }
        const statusMap: Record<string, string> = {
          'SUCCESS': 'COMPLETED',
          'FAILED': 'FAILED',
          'PENDING': 'PENDING',
          'EXPIRED': 'FAILED',
        };
        const newStatus = statusMap[bpayStatut] || 'FAILED';
        if (newStatus === 'PENDING') continue;
        if (newStatus === 'COMPLETED') {
          await this.dataSource.transaction(async (em) => {
            const updated = await em.query(
              `UPDATE bpay_transactions SET status='COMPLETED', source='cron', updated_at=NOW() WHERE pay_token=$1 AND status='PENDING' RETURNING id`,
              [tx.pay_token]
            );
            if (!updated || updated.length === 0) return;
            await this.walletsService.creditWallet(
              tx.user_id,
              tx.amount,
              `Recharge via ${tx.provider} (réconciliation)`,
              { payToken: tx.pay_token },
            );
            await this.notificationsService.create({
              userId: tx.user_id,
              type: 'paiement_recu',
              titre: 'Paiement reçu',
              message: `Vous avez reçu ${tx.amount} FCFA via ${tx.provider}`,
              priority: 'high',
              role: 'marchand',
              category: 'paiement',
              icon: '💰',
            });
            this.logger.log(`[BPAY CRON] Crédit OK payToken=${tx.pay_token}`);
          });
        } else {
          await this.dataSource.query(
            `UPDATE bpay_transactions SET status='FAILED', bpay_status=$1, source='cron', updated_at=NOW() WHERE pay_token=$2 AND status='PENDING'`,
            [bpayStatut, tx.pay_token]
          );
          this.logger.log(`[BPAY CRON] FAILED payToken=${tx.pay_token}`);
        }
      } catch (e: any) {
        this.logger.error(`[BPAY CRON] Erreur payToken=${tx.pay_token}: ${e.message}`);
      }
    }
    await this.reconcilierRetraitsPending();
    this.logger.log('[BPAY CRON] Fin réconciliation');
  }

  /**
   * Réconciliation des RETRAITS mobile money (C-01 — audit comptable 12/10).
   *
   * Un retrait débite le wallet AVANT l'appel opérateur ; si le cashin reste
   * indéterminé (PENDING/HTTP 200 sans confirmation), la ligne reste
   * PENDING_WITHDRAW et c'est CE passage qui tranche avec le statut opérateur
   * réel :
   *  - succès explicite → COMPLETED (aucun mouvement wallet : l'argent est
   *    déjà parti, l'opérateur confirme l'envoi) + notification ;
   *  - échec explicite → remboursement via `rembourserRetraitBpay`
   *    (transition unique PENDING_WITHDRAW → REFUNDED + crédit du wallet dans
   *    la même transaction — jamais deux fois) + notification ;
   *  - statut indéterminé / opérateur injoignable → on retente au prochain
   *    passage (l'argent n'est jamais abandonné).
   * Un retrait qui reste PENDING_WITHDRAW > 24 h est signalé en ERROR : il
   * demande un regard humain (l'opérateur ne répond ni succès ni échec).
   */
  private async reconcilierRetraitsPending() {
    const retraits = await this.dataSource.query(`
      SELECT * FROM bpay_transactions
      WHERE status = 'PENDING_WITHDRAW'
      AND created_at < NOW() - INTERVAL '2 minutes'
      ORDER BY created_at ASC
      LIMIT 50
    `);
    if (retraits.length > 0) {
      this.logger.log(`[BPAY CRON] ${retraits.length} retrait(s) à réconcilier`);
    }
    for (const tx of retraits) {
      try {
        let bpayStatut: string;
        try {
          const result = await this.bpayService.verifierStatut(tx.pay_token);
          bpayStatut = String(result.statut || '').toUpperCase();
        } catch {
          this.logger.warn(`[BPAY CRON] check-status retrait échec ref=${tx.pay_token} — passé`);
          continue;
        }
        if (['SUCCESS', 'SUCCESSFULL', 'COMPLETED'].includes(bpayStatut)) {
          const updated = await this.dataSource.query(
            `UPDATE bpay_transactions SET status='COMPLETED', bpay_status=$1, source='cron', updated_at=NOW() WHERE id=$2 AND status='PENDING_WITHDRAW' RETURNING id`,
            [bpayStatut, tx.id],
          );
          if (updated && updated.length > 0) {
            await this.notificationsService.create({
              userId: tx.user_id,
              type: 'retrait_effectue',
              titre: 'Retrait effectué',
              message: `Ton retrait de ${Number(tx.amount).toLocaleString('fr-FR')} FCFA vers ${tx.provider} a été envoyé.`,
              priority: 'high',
              role: 'marchand',
              category: 'paiement',
              icon: '💸',
            });
            this.logger.log(`[BPAY CRON] Retrait COMPLETED ref=${tx.pay_token}`);
          }
        } else if (['FAILED', 'EXPIRED', 'CANCELLED'].includes(bpayStatut)) {
          const rembourse = await this.walletsService.rembourserRetraitBpay(tx, bpayStatut, 'cron');
          if (rembourse) {
            await this.notificationsService.create({
              userId: tx.user_id,
              type: 'retrait_rembourse',
              titre: 'Retrait remboursé',
              message: `Le retrait de ${Number(tx.amount).toLocaleString('fr-FR')} FCFA vers ${tx.provider} a été refusé par l'opérateur. Le montant est revenu sur ton solde Keiwa.`,
              priority: 'high',
              role: 'marchand',
              category: 'paiement',
              icon: '↩️',
            });
            this.logger.log(`[BPAY CRON] Retrait REFUNDED ref=${tx.pay_token}`);
          }
        }
        // PENDING / statut inconnu → on retente au prochain passage.
      } catch (e: any) {
        this.logger.error(`[BPAY CRON] Erreur retrait ref=${tx.pay_token}: ${e.message}`);
      }
    }
    // Alerte vieillissement : au-delà de 24 h sans verdict opérateur, la
    // réconciliation automatique ne suffit plus — investigation humaine.
    const ages = await this.dataSource.query(`
      SELECT COUNT(*)::int AS n FROM bpay_transactions
      WHERE status = 'PENDING_WITHDRAW' AND created_at < NOW() - INTERVAL '24 hours'
    `);
    if (ages[0]?.n > 0) {
      this.logger.error(
        `[BPAY CRON] ALERTE : ${ages[0].n} retrait(s) PENDING_WITHDRAW depuis plus de 24h — investigation manuelle requise`,
      );
    }
  }
}
