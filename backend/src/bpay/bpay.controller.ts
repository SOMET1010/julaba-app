import { Controller, Post, Get, Body, Param, Logger, HttpCode, UseGuards, Request, ForbiddenException, Headers, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BpayService } from './bpay.service';
import { accesWebhookAutoriseBpay } from './bpay-webhook.securite';
import { estRoleBO } from '../auth/bo-autorisation';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Wallet } from '../wallets/entities/wallet.entity';
import { WalletTransaction, TransactionType } from '../wallets/entities/wallet-transaction.entity';
import { WalletsService } from '../wallets/wallets.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('bpay')
export class BpayController {
  private readonly logger = new Logger(BpayController.name);

  constructor(
    private readonly bpayService: BpayService,
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly walletsService: WalletsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post('callback')
  @HttpCode(200)
  async handleCallback(
    @Body() body: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Request() req: any,
  ) {
    // C-07/SEC-022 — porte unique du webhook : allowlist IP (BPAY_WEBHOOK_IPS),
    // HMAC-SHA256 du corps BRUT (BPAY_WEBHOOK_SECRET, cf. bpay-webhook.securite.ts
    // et la capture rawBody dans main.ts), voie legacy (x-bpay-secret) si
    // BPAY_WEBHOOK_LEGACY=true. Sans secret configuré : fail-closed (la route
    // refusait déjà tout callback avant ce chantier) — la réponse reste 200
    // { received: true } pour ne pas dire à l'appelant s'il a été filtré.
    if (!accesWebhookAutoriseBpay(this.configService, this.logger, 'bpay/callback', req, headers, 'REFUSER')) {
      return { received: true };
    }
    try {
      // B-Pay peut désigner la transaction par son pay_token OU par la
      // référence marchande (cashin = retrait : le pay_token réel n'existe
      // pas côté opérateur, notre merchantTransactionId fait foi).
      const candidats = [
        body?.pay_token, body?.payToken, body?.token,
        body?.merchant_transaction_id, body?.merchantTransactionId,
      ].filter((v: unknown): v is string => typeof v === 'string' && v.length > 0);
      if (candidats.length === 0) {
        this.logger.warn('[BPAY CALLBACK] payToken manquant — ignoré');
        return { received: true };
      }
      const payToken = candidats[0];
      this.logger.log(`[BPAY CALLBACK] Reçu pour payToken=${payToken}`);
      const tx = await this.dataSource.query(
        `SELECT * FROM bpay_transactions WHERE pay_token = ANY($1) OR merchant_tx_id = ANY($1) LIMIT 1`, [candidats]
      );
      if (!tx || tx.length === 0) {
        this.logger.warn(`[BPAY CALLBACK] Transaction inconnue payToken=${payToken}`);
        return { received: true };
      }
      const transaction = tx[0];
      const estRetrait = transaction.type === 'RETRAIT';
      // Recharge : uniquement PENDING. Retrait : PENDING_WITHDRAW (argent
      // déjà débité, verdict opérateur en attente) — c'était le trou C-01 :
      // le webhook ignorait les retraits (status !== 'PENDING') et un cashin
      // qui échouait ASYNCHRONEMENT n'était jamais remboursé.
      const statutsAcceptes = estRetrait ? ['PENDING_WITHDRAW'] : ['PENDING'];
      if (!statutsAcceptes.includes(transaction.status)) {
        this.logger.warn(`[BPAY CALLBACK] Déjà traité payToken=${payToken} status=${transaction.status}`);
        return { received: true };
      }
      const result = await this.bpayCheckStatusWithRetry(payToken);
      const bpayStatut = result.statut;
      this.logger.log(`[BPAY CALLBACK] check-status=${bpayStatut} payToken=${payToken}`);
      const statusMap: Record<string, string> = {
        'SUCCESS': 'COMPLETED',
        'FAILED': 'FAILED',
        'PENDING': 'PENDING',
        'EXPIRED': 'FAILED',
      };
      const newStatus = statusMap[bpayStatut] || 'FAILED';
      if (newStatus === 'PENDING') {
        this.logger.log(`[BPAY CALLBACK] Toujours PENDING — attente cron`);
        return { received: true };
      }
      if (estRetrait) {
        if (newStatus === 'COMPLETED') {
          const updated = await this.dataSource.query(
            `UPDATE bpay_transactions SET status='COMPLETED', bpay_status=$1, source='webhook', updated_at=NOW() WHERE id=$2 AND status='PENDING_WITHDRAW' RETURNING id`,
            [bpayStatut, transaction.id],
          );
          if (updated && updated.length > 0) {
            await this.notificationsService.create({
              userId: transaction.user_id,
              type: 'retrait_effectue',
              titre: 'Retrait effectué',
              message: `Ton retrait de ${Number(transaction.amount).toLocaleString('fr-FR')} FCFA vers ${transaction.provider} a été envoyé.`,
              priority: 'high',
              role: 'marchand',
              category: 'paiement',
              icon: '💸',
            });
            this.logger.log(`[BPAY CALLBACK] Retrait COMPLETED payToken=${payToken}`);
          }
        } else {
          const rembourse = await this.walletsService.rembourserRetraitBpay(transaction, bpayStatut, 'webhook');
          if (rembourse) {
            await this.notificationsService.create({
              userId: transaction.user_id,
              type: 'retrait_rembourse',
              titre: 'Retrait remboursé',
              message: `Le retrait de ${Number(transaction.amount).toLocaleString('fr-FR')} FCFA vers ${transaction.provider} a été refusé par l'opérateur. Le montant est revenu sur ton solde Keiwa.`,
              priority: 'high',
              role: 'marchand',
              category: 'paiement',
              icon: '↩️',
            });
            this.logger.log(`[BPAY CALLBACK] Retrait REFUNDED payToken=${payToken}`);
          }
        }
        return { received: true };
      }
      if (newStatus === 'FAILED') {
        await this.dataSource.query(
          `UPDATE bpay_transactions SET status='FAILED', bpay_status=$1, updated_at=NOW() WHERE pay_token=$2 AND status='PENDING'`,
          [bpayStatut, payToken]
        );
        this.logger.log(`[BPAY CALLBACK] FAILED payToken=${payToken}`);
        return { received: true };
      }
      await this.dataSource.transaction(async (em) => {
        const updated = await em.query(
          `UPDATE bpay_transactions SET status='COMPLETED', bpay_status=$1, source='webhook', updated_at=NOW() WHERE pay_token=$2 AND status='PENDING' RETURNING id`,
          [bpayStatut, payToken]
        );
        if (!updated || updated.length === 0) {
          this.logger.warn(`[BPAY] Verrou : déjà traité payToken=${payToken}`);
          return;
        }
        const montant = Number(transaction.amount);
        if (montant <= 0) {
          throw new BadRequestException('Le montant doit être supérieur à 0');
        }
        if (montant > 10_000_000) {
          throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');
        }
        const wallet = await em.findOne(Wallet, {
          where: { userId: transaction.user_id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!wallet) {
          throw new NotFoundException('Wallet introuvable');
        }
        // Compte bloqué : on ne crédite pas. Le rollback remet
        // bpay_transactions à 'PENDING', donc le cron de réconciliation
        // reprendra le crédit dès que le compte sera débloqué — l'argent
        // n'est jamais perdu.
        await this.walletsService.assertCompteActif(transaction.user_id, em);
        wallet.solde = Number(wallet.solde) + montant;
        await em.save(Wallet, wallet);
        const wtx = em.create(WalletTransaction, {
          userId: transaction.user_id,
          type: TransactionType.CREDIT,
          montant,
          description: `Recharge via ${transaction.provider}`,
          statut: 'completed',
          metadata: { payToken, merchantTxId: transaction.merchant_tx_id },
        });
        await em.save(WalletTransaction, wtx);
        this.logger.log(`[BPAY] Crédit OK userId=${transaction.user_id} amount=${transaction.amount}`);
      });
      return { received: true };
    } catch (e: any) {
      this.logger.error(
        `[BPAY CALLBACK] Erreur après contrôle secret: ${e?.message ?? e}`,
        e?.stack,
      );
      return { received: true };
    }
  }

  private async bpayCheckStatusWithRetry(payToken: string): Promise<{ statut: string }> {
    const delays = [1000, 2000, 4000];
    let lastError: Error | null = null;
    for (let i = 0; i < 3; i++) {
      try {
        return await this.bpayService.verifierStatut(payToken);
      } catch (e: any) {
        lastError = e;
        this.logger.warn(`[BPAY] check-status tentative ${i+1}/3 échec: ${e.message}`);
        if (i < 2) await new Promise(r => setTimeout(r, delays[i]));
      }
    }
    throw lastError || new Error('check-status échec total');
  }

  @Get('pending/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPendingTransactions(@Param('userId') userId: string, @Request() req: any) {
    if (!req.user) {
      throw new ForbiddenException('Acces refuse');
    }
    // M-01 (audit comptable 12/10 ; reco SUPERADMIN-02 du 19/10) : le rôle
    // fantôme 'admin' (inexistant dans UserRole) rendait cette garde
    // inatteignable pour les admins BO légitimes — fail-closed mais faux.
    // La route expose les transactions B-PAY EN ATTENTE d'un utilisateur
    // (montants, opérateurs) : lecture de supervision d'argent → la liste
    // canonique des rôles du back-office (auth/bo-autorisation.ts, décision
    // J6) remplace le littéral, fantôme et doublons compris.
    if (!estRoleBO(req.user.role) && req.user.id !== userId) {
      throw new ForbiddenException('Acces refuse');
    }
    const rows = await this.dataSource.query(
      `SELECT id, amount, provider, status, created_at FROM bpay_transactions WHERE user_id = $1 AND status IN ('PENDING', 'PENDING_WITHDRAW') ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );
    return { hasPending: rows.length > 0, transactions: rows };
  }
}
