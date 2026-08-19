import { Controller, Get, Post, Body, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { BpayService } from '../bpay/bpay.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@ApiTags('Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly bpayService: BpayService,
    private readonly usersService: UsersService,
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

  @Post('me/rechercher-destinataire')
  @ApiOperation({ summary: "Rechercher un destinataire Jùlaba par téléphone (avant transfert)" })
  async rechercherDestinataire(@CurrentUser() user: User, @Body() body: { telephone: string }) {
    if (!body?.telephone) throw new BadRequestException('Téléphone requis');
    const { variants } = UsersService.normalizePhone(body.telephone);
    if (variants.length === 0) throw new BadRequestException('Numéro de téléphone invalide');
    const rows = await this.dataSource.query(
      `SELECT id, first_name, last_name, phone FROM users WHERE phone = ANY($1) LIMIT 1`,
      [variants],
    );
    if (!rows.length) throw new NotFoundException('Aucun compte Jùlaba trouvé pour ce numéro');
    const destinataire = rows[0];
    if (destinataire.id === user.id) {
      throw new BadRequestException('Vous ne pouvez pas vous transférer de l’argent à vous-même');
    }
    return {
      id: destinataire.id,
      prenom: destinataire.first_name,
      nom: destinataire.last_name,
      telephone: destinataire.phone,
    };
  }

  @Post('me/transfert')
  @ApiOperation({ summary: 'Transfert compte-à-compte interne (Jùlaba vers Jùlaba)' })
  async transfert(
    @CurrentUser() user: User,
    @Body()
    body: {
      destinataireTelephone?: string;
      destinataireUserId?: string;
      montant: number;
      note?: string;
      idempotencyKey?: string;
    },
  ) {
    const montantInt = Math.round(Number(body.montant));
    if (!montantInt || montantInt <= 0) throw new BadRequestException('Montant invalide');

    let destinataireId = body.destinataireUserId?.trim();
    if (!destinataireId) {
      if (!body.destinataireTelephone) {
        throw new BadRequestException('Destinataire requis (téléphone ou identifiant)');
      }
      const { variants } = UsersService.normalizePhone(body.destinataireTelephone);
      if (variants.length === 0) throw new BadRequestException('Numéro de téléphone invalide');
      const rows = await this.dataSource.query(
        `SELECT id FROM users WHERE phone = ANY($1) LIMIT 1`,
        [variants],
      );
      if (!rows.length) throw new NotFoundException('Aucun compte Jùlaba trouvé pour ce numéro');
      destinataireId = rows[0].id;
    }

    const note = body.note ? String(body.note).slice(0, 200) : undefined;
    const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey).slice(0, 120) : null;

    const resultat = await this.walletsService.transfererVersUtilisateur(
      user.id,
      destinataireId as string,
      montantInt,
      note,
      idempotencyKey,
    );

    return {
      success: true,
      dejaTraite: resultat.dejaTraite,
      reference: resultat.reference,
      solde: resultat.soldeExpediteur,
    };
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
