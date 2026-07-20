import { Controller, Get, Post, Param, Body, BadRequestException, Logger } from '@nestjs/common';
import { BpayService } from '../bpay/bpay.service';
import { WalletsService } from './wallets.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';

type PublicPayBody = {
  marchandId: string;
  provider: string;
  montant: number;
  telephone: string;
};

type PublicPayResponse = {
  payToken: string;
  paymentUrl: string;
};

type PublicMerchantResponse = {
  id: string;
  nom: string;
  phone: string;
  activity: string | null;
  market: string | null;
  commune: string | null;
  photoUrl: string | null;
};

type BpayCallbackBody = {
  pay_token?: string;
  payToken?: string;
  token?: string;
};

@Controller('wallets')
export class WalletsPublicController {
  private readonly logger = new Logger(WalletsPublicController.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly bpayService: BpayService,
    private readonly walletsService: WalletsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post('public/pay')
  async payMarchand(@Body() body: PublicPayBody): Promise<PublicPayResponse> {
    const { marchandId, provider, montant, telephone } = body;
    if (!marchandId || !provider || !montant || !telephone) throw new BadRequestException('Champs manquants');
    const montantInt = Math.round(montant);
    if (montantInt <= 0) throw new BadRequestException('Montant invalide');

    const rows = await this.dataSource.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'marchand'`, [marchandId]
    );
    if (!rows || rows.length === 0) throw new BadRequestException('Marchand introuvable');

    const merchantTransactionId = `PAY-${marchandId.slice(0, 8)}-${Date.now()}`;
    const notifyUrl = 'https://julaba.online/api/v1/wallets/public/pay-callback';

    const result = await this.bpayService.initierPaiement({
      provider,
      montant: montantInt,
      telephone,
      notifyUrl,
      merchantTransactionId,
      successUrl: 'https://julaba.online/paiement/success',
      failedUrl: 'https://julaba.online/paiement/failed',
    });

    await this.dataSource.query(
      `INSERT INTO bpay_transactions (user_id, pay_token, merchant_tx_id, amount, provider, type, status) VALUES ($1, $2, $3, $4, $5, 'PAY_MARCHAND', 'PENDING')`,
      [marchandId, result.payToken, merchantTransactionId, montantInt, provider]
    );

    return { payToken: result.payToken, paymentUrl: result.paymentUrl };
  }

  @Post('public/pay-callback')
  async payCallback(@Body() body: BpayCallbackBody): Promise<{ received: true }> {
    const payToken = body?.pay_token || body?.payToken || body?.token;
    if (!payToken) return { received: true };

    const tx = await this.dataSource.query(
      `SELECT * FROM bpay_transactions WHERE pay_token = $1 AND type = 'PAY_MARCHAND' AND status = 'PENDING'`, [payToken]
    );
    if (!tx || tx.length === 0) return { received: true };

    const transaction = tx[0];
    try {
      const { statut } = await this.bpayService.verifierStatut(payToken);
      if (statut === 'SUCCESS') {
        await this.dataSource.transaction(async (em) => {
          const updated = await em.query(
            `UPDATE bpay_transactions SET status='COMPLETED', updated_at=NOW() WHERE pay_token=$1 AND status='PENDING' RETURNING id`,
            [payToken]
          );
          if (!updated || updated.length === 0) return;
          await this.walletsService.creditWallet(
            transaction.user_id,
            transaction.amount,
            `Paiement QR recu via ${transaction.provider}`,
            { payToken, merchantTxId: transaction.merchant_tx_id }
          );
          await this.notificationsService.create({
            userId: transaction.user_id,
            type: 'paiement_recu',
            titre: 'Paiement reçu',
            message: `Vous avez reçu ${transaction.amount} FCFA via ${transaction.provider}`,
            priority: 'high',
            role: 'marchand',
            category: 'paiement',
            icon: '💰',
          });
        });
      } else if (statut === 'FAILED') {
        await this.dataSource.query(
          `UPDATE bpay_transactions SET status='FAILED', updated_at=NOW() WHERE pay_token=$1`, [payToken]
        );
      }
    } catch (error) {
      this.logger.error('payCallback failed', error instanceof Error ? error.stack : String(error));
    }
    return { received: true };
  }

  @Post('public/statut-paiement')
  async statutPaiementPublic(@Body() body: { payToken: string }) {
    if (!body.payToken) throw new BadRequestException('payToken requis');
    return this.bpayService.verifierStatut(body.payToken);
  }

  @Get('public/:marchandId')
  async getMarchandPublic(@Param('marchandId') marchandId: string): Promise<PublicMerchantResponse> {
    const rows = await this.dataSource.query(
      `SELECT u.id, u.first_name, u.last_name, u.phone, u.activity, u.market, u.photo_url, u.commune
       FROM users u WHERE u.id = $1 AND u.role = 'marchand'`,
      [marchandId]
    );
    if (!rows || rows.length === 0) throw new BadRequestException('Marchand introuvable');
    const m = rows[0];
    return {
      id: m.id,
      nom: `${m.first_name} ${m.last_name}`.trim(),
      phone: m.phone,
      activity: m.activity,
      market: m.market,
      photoUrl: m.photo_url,
      commune: m.commune,
    };
  }
}
