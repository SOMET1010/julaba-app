import { Controller, Post, Get, Body, Param, Logger, HttpCode, UseGuards, Request, ForbiddenException, Headers, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BpayService } from './bpay.service';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Wallet } from '../wallets/entities/wallet.entity';
import { WalletTransaction, TransactionType } from '../wallets/entities/wallet-transaction.entity';

@Controller('bpay')
export class BpayController {
  private readonly logger = new Logger(BpayController.name);

  constructor(
    private readonly bpayService: BpayService,
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Post('callback')
  @HttpCode(200)
  async handleCallback(@Body() body: any, @Headers() headers: Record<string, string | string[] | undefined>) {
    const expectedSecret = this.configService.get<string>('BPAY_WEBHOOK_SECRET') ?? '';
    const rawHeader = headers['x-bpay-secret'] ?? headers['x-webhook-secret'];
    const providedSecret = (Array.isArray(rawHeader) ? rawHeader[0] : rawHeader) ?? '';
    if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      this.logger.warn('[BPAY CALLBACK] Secret webhook absent ou non valide — ignoré');
      return { received: true };
    }
    try {
      const payToken = body?.pay_token || body?.payToken || body?.token;
      if (!payToken) {
        this.logger.warn('[BPAY CALLBACK] payToken manquant — ignoré');
        return { received: true };
      }
      this.logger.log(`[BPAY CALLBACK] Reçu pour payToken=${payToken}`);
      const tx = await this.dataSource.query(
        `SELECT * FROM bpay_transactions WHERE pay_token = $1`, [payToken]
      );
      if (!tx || tx.length === 0) {
        this.logger.warn(`[BPAY CALLBACK] Transaction inconnue payToken=${payToken}`);
        return { received: true };
      }
      const transaction = tx[0];
      if (transaction.status !== 'PENDING') {
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
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    if (!isAdmin && req.user.id !== userId) {
      throw new ForbiddenException('Acces refuse');
    }
    const rows = await this.dataSource.query(
      `SELECT id, amount, provider, status, created_at FROM bpay_transactions WHERE user_id = $1 AND status IN ('PENDING', 'PENDING_WITHDRAW') ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );
    return { hasPending: rows.length > 0, transactions: rows };
  }
}
