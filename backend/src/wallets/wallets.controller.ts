import { Controller, Get, Post, Body, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { BpayService } from '../bpay/bpay.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@ApiTags('Wallets')
@ApiBearerAuth()
// IDENT-02 (20/10/2026) — la neutralité monétique est SERVEUR, plus une
// convention de navigation. Whitelist EXPLICITE : marchand, producteur,
// cooperateur (les profils dont le wallet est une réalité du pilote).
// EXCLUS fail-closed : identificateur (IDENTIFICATEUR-16, arbitrage A-02 —
// celui qui enrôle ne touche pas à l'argent), institution (le régulateur
// n'a pas de portefeuille), comptes admin (doctrine blocage-wallet-admin).
// Tout rôle FUTUR de l'ENUM sera refusé par défaut tant que personne ne
// l'ajoute ici par une décision écrite. Invariant :
// ident-02-neutralite-monetic.spec.ts (prouvé rouge sur l'ancien code : 200).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('marchand', 'producteur', 'cooperateur')
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

  /**
   * Statuts opérateur qui signifient un échec DÉFINITIF du cashin. Tout
   * autre statut (PENDING, PROCESSING, vide, inconnu...) ne donne JAMAIS
   * lieu à un remboursement : le retrait reste PENDING_WITHDRAW et la
   * réconciliation (webhook + cron) tranche avec le statut opérateur réel.
   */
  private static readonly STATUTS_OPERATEUR_ECHEC = ['FAILED', 'EXPIRED', 'CANCELLED'];
  private static readonly STATUTS_OPERATEUR_SUCCES = ['SUCCESS', 'SUCCESSFULL', 'COMPLETED'];

  private async trouverRetrait(merchantTransactionId: string, userId: string) {
    const rows = await this.dataSource.query(
      `SELECT id, user_id, amount, provider, merchant_tx_id, status FROM bpay_transactions
        WHERE merchant_tx_id = $1 AND user_id = $2 LIMIT 1`,
      [merchantTransactionId, userId],
    );
    return rows[0] ?? null;
  }

  /**
   * Retrait Keiwa → mobile money (cashin B-Pay).
   *
   * C-01 (audit comptable 12/10) : le wallet est débité AVANT l'appel
   * opérateur — c'est le seul ordre sûr (sinon un client sans solde pourrait
   * recevoir un cashin). La contrepartie est une obligation stricte de
   * réconciliation :
   *
   *  1. La référence `merchantTransactionId` (uuid) sert AUSSI de `pay_token`
   *     en base — stable et interrogeable par le webhook et le cron
   *     (l'ancien `RET-TEMP-${Date.now()}` était introuvable côté opérateur).
   *  2. COMPLETED n'est JAMAIS posé sur la seule HTTP 200 : échec explicite
   *     de l'opérateur → remboursement immédiat gardé ; succès explicite →
   *     re-vérification check-status (une tentative) avant confirmation ;
   *     statut indéterminé → PENDING_WITHDRAW, le webhook/cron tranche.
   *  3. Tout remboursement passe par `rembourserRetraitBpay` (une seule
   *     transition PENDING_WITHDRAW → REFUNDED, crédit dans la même
   *     transaction) : webhook, cron et rollback synchrone peuvent se
   *     précipiter, le remboursement reste EXACTEMENT unique.
   */
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
    const merchantTransactionId = `RET-${randomUUID()}`;
    // pay_token = merchantTransactionId : référence stable, cherchable par le
    // webhook (pay_token OU merchant_tx_id) et interrogeable au check-status.
    await this.dataSource.query(
      `INSERT INTO bpay_transactions (user_id, pay_token, merchant_tx_id, amount, provider, type, status) VALUES ($1, $2, $3, $4, $5, 'RETRAIT', 'PENDING_WITHDRAW')`,
      [user.id, merchantTransactionId, merchantTransactionId, montantInt, body.provider]
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
    const rembourserEtRejeter = async (bpayStatut: string, message: string) => {
      const row = await this.trouverRetrait(merchantTransactionId, user.id);
      if (row) {
        await this.walletsService.rembourserRetraitBpay(row, bpayStatut, 'controller');
      }
      throw new BadRequestException(`${message} Le montant reste sur ton solde Keiwa.`);
    };
    try {
      const result = await this.bpayService.retraitVersMobileMoney({
        provider: body.provider,
        montant: montantInt,
        telephone: body.telephone,
        notifyUrl,
        merchantTransactionId,
      });
      const statutBrut = String(result.status || '').toUpperCase();
      if (WalletsController.STATUTS_OPERATEUR_ECHEC.includes(statutBrut)) {
        await rembourserEtRejeter(statutBrut, `Retrait refusé par ${body.provider}.`);
      }
      // Succès explicite du cashin : re-vérification opérateur AVANT de
      // graver COMPLETED (la HTTP 200 seule ne prouve pas le transfert).
      // check-status indisponible → on s'appuie sur la réponse cashin ; la
      // réconciliation asynchrone reste le filet de sécurité.
      let confirme = WalletsController.STATUTS_OPERATEUR_SUCCES.includes(statutBrut);
      if (confirme) {
        try {
          const check = await this.bpayService.verifierStatut(merchantTransactionId);
          const statutCheck = String(check.statut || '').toUpperCase();
          if (WalletsController.STATUTS_OPERATEUR_ECHEC.includes(statutCheck)) {
            await rembourserEtRejeter(statutCheck, `Retrait refusé par ${body.provider} (vérification opérateur).`);
          }
        } catch (e: any) {
          // Le rejet suite à un échec opérateur explicite doit sortir (sinon
          // on répondrait COMPLETED sur un retrait déjà remboursé) ; seul un
          // check-status INDISPONIBLE laisse la réponse cashin faire foi.
          if (e instanceof BadRequestException) throw e;
        }
      }
      if (confirme) {
        await this.dataSource.query(
          `UPDATE bpay_transactions SET status='COMPLETED', bpay_status=$1, updated_at=NOW() WHERE merchant_tx_id=$2 AND status='PENDING_WITHDRAW'`,
          [statutBrut || null, merchantTransactionId]
        );
      }
      // payToken = notre référence stable → le polling frontend
      // (/wallets/me/statut-paiement) devient fonctionnel pour le retrait.
      return { ...result, payToken: merchantTransactionId, merchantTransactionId, status: confirme ? 'COMPLETED' : 'PENDING_WITHDRAW' };
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      // Appel opérateur impossible (réseau/HTTP) : l'argent débité est
      // remboursé immédiatement — gardé, donc unique même si un webhook
      // concurrent découvrait le même échec au même moment.
      const row = await this.trouverRetrait(merchantTransactionId, user.id);
      let rembourse = false;
      if (row) {
        rembourse = await this.walletsService.rembourserRetraitBpay(row, 'CALL_FAILED', 'controller');
      }
      throw new BadRequestException(
        `Retrait échoué: ${e?.message || 'erreur inconnue'}${rembourse ? ' — montant remboursé sur ton solde Keiwa.' : ''}`,
      );
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
