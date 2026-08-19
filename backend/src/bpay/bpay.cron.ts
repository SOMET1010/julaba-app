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
    this.logger.log('[BPAY CRON] Fin réconciliation');
  }
}
