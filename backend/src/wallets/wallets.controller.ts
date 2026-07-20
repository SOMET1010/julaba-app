import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { BpayService } from '../bpay/bpay.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly bpayService: BpayService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Récupérer mon wallet' })
  @ApiResponse({ status: 200, description: 'Wallet récupéré avec succès' })
  async getMyWallet(@CurrentUser() user: User) {
    return this.walletsService.getByUserId(user.id);
  }

  @Get('me/transactions')
  @ApiOperation({ summary: 'Récupérer mes transactions' })
  @ApiResponse({ status: 200, description: 'Transactions récupérées avec succès' })
  async getMyTransactions(@CurrentUser() user: User) {
    return this.walletsService.getTransactions(user.id);
  }

  @Post('me/recharge-mobile')
  async rechargeMobile(
    @CurrentUser() user: User,
    @Body() body: { provider: string; montant: number; telephone: string },
  ) {
    const notifyUrl = 'https://julaba.online/api/v1/bpay/callback';
    const merchantTransactionId = `RCH-${user.id.slice(0, 8)}-${Date.now()}`;
    const montantInt = Math.round(body.montant);
    if (montantInt < 200) throw new BadRequestException('Montant minimum : 200 FCFA');
    const result = await this.bpayService.initierPaiement({
      provider: body.provider,
      montant: montantInt,
      telephone: body.telephone,
      notifyUrl,
      merchantTransactionId,
      successUrl: 'https://julaba.online/paiement/success',
      failedUrl: 'https://julaba.online/paiement/failed',
    });
    await this.dataSource.query(
      `INSERT INTO bpay_transactions (user_id, pay_token, merchant_tx_id, amount, provider, type, status) VALUES ($1, $2, $3, $4, $5, 'RECHARGE', 'PENDING')`,
      [user.id, result.payToken, merchantTransactionId, montantInt, body.provider]
    );
    return { ...result, merchantTransactionId };
  }

  @Post('me/retrait-mobile')
  async retraitMobile(
    @CurrentUser() user: User,
    @Body() body: { provider: string; montant: number; telephone: string },
  ) {
    const montantInt = Math.round(body.montant);
    if (montantInt < 200) throw new BadRequestException('Montant minimum : 200 FCFA');
    const wallet = await this.walletsService.getByUserId(user.id);
    const soldeDisponible = Number(wallet.solde) - Number(wallet.soldeBloque);
    if (soldeDisponible < montantInt) {
      throw new BadRequestException(`Solde insuffisant: ${soldeDisponible} < ${montantInt}`);
    }
    const notifyUrl = 'https://julaba.online/api/v1/bpay/callback';
    const merchantTransactionId = `RET-${user.id.slice(0, 8)}-${Date.now()}`;
    await this.dataSource.query(
      `INSERT INTO bpay_transactions (user_id, pay_token, merchant_tx_id, amount, provider, type, status) VALUES ($1, $2, $3, $4, $5, 'RETRAIT', 'PENDING_WITHDRAW')`,
      [user.id, `RET-TEMP-${Date.now()}`, merchantTransactionId, montantInt, body.provider]
    );
    try {
      await this.walletsService.debitWallet(
        user.id, montantInt,
        `Retrait vers ${body.provider}`,
        { provider: body.provider, merchantTransactionId },
      );
    } catch (e: any) {
      await this.dataSource.query(
        `UPDATE bpay_transactions SET status='FAILED', error_message=$1, updated_at=NOW() WHERE merchant_tx_id=$2`,
        [e.message || 'Débit wallet échoué', merchantTransactionId]
      );
      throw new BadRequestException(`Débit wallet échoué: ${e.message || 'erreur inconnue'}`);
    }
    try {
      const result = await this.bpayService.retraitVersMobileMoney({
        provider: body.provider,
        montant: montantInt,
        telephone: body.telephone,
        notifyUrl,
        merchantTransactionId,
      });
      await this.dataSource.query(
        `UPDATE bpay_transactions SET status='COMPLETED', updated_at=NOW() WHERE merchant_tx_id=$1`,
        [merchantTransactionId]
      );
      return result;
    } catch (e: any) {
      await this.walletsService.creditWallet(
        user.id,
        montantInt,
        `Rollback retrait échoué vers ${body.provider}`,
        { provider: body.provider, merchantTransactionId, rollback: true },
      );
      await this.dataSource.query(
        `UPDATE bpay_transactions SET status='FAILED', error_message=$1, updated_at=NOW() WHERE merchant_tx_id=$2`,
        [e.message, merchantTransactionId]
      );
      throw new BadRequestException(`Retrait échoué: ${e.message}`);
    }
  }

  @Get('me/pending')
  async myPendingTransactions(@CurrentUser() user: User) {
    const rows = await this.dataSource.query(
      `SELECT id, pay_token, amount, provider, status, created_at FROM bpay_transactions WHERE user_id = $1 AND status IN ('PENDING', 'PENDING_WITHDRAW') ORDER BY created_at DESC LIMIT 10`,
      [user.id]
    );
    return { hasPending: rows.length > 0, transactions: rows };
  }

  @Post('me/statut-paiement')
  async statutPaiement(@CurrentUser() user: User, @Body() body: { payToken: string }) {
    const rows = await this.dataSource.query(
      `SELECT id FROM bpay_transactions WHERE pay_token = $1 AND user_id = $2 LIMIT 1`,
      [body.payToken, user.id],
    );
    if (!rows.length) throw new BadRequestException('Transaction introuvable');
    return this.bpayService.verifierStatut(body.payToken);
  }
}
