import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallets/entities/wallet.entity';
import { TransactionType, WalletTransaction } from '../wallets/entities/wallet-transaction.entity';
import { WalletsService } from '../wallets/wallets.service';
import {
  CotisationSociale,
  ModePaiementCotisation,
  OrganismeSocial,
} from './entities/cotisation-sociale.entity';

const ORGANISMES: OrganismeSocial[] = ['CNPS', 'CNAM'];
const MODES: ModePaiementCotisation[] = ['especes', 'keiwa', 'mobile_money'];
const PERIODE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Persistance réelle des cotisations sociales (CNPS/CNAM) déclarées par la
 * commerçante — remplace le `localStorage` de `protectionSociale.service.ts`
 * (front). Le suivi reste DÉCLARATIF (aucune connexion à la vraie API
 * CNPS/CNAM, cf. docs/PARCOURS.md) : seul le lieu de stockage devient réel,
 * et le mode « keiwa » devient un vrai débit du wallet de l'utilisatrice —
 * jamais celui d'un tiers, jamais autre chose que son propre wallet.
 *
 * Isolation stricte : un utilisateur ne voit et ne crée QUE ses propres
 * cotisations — `user_id` vient toujours du JWT (@CurrentUser), jamais du
 * corps de la requête.
 */
@UseGuards(JwtAuthGuard)
@Controller('protection-sociale')
export class ProtectionSocialeController {
  constructor(
    @InjectRepository(CotisationSociale) private repo: Repository<CotisationSociale>,
    @InjectDataSource() private dataSource: DataSource,
    private walletsService: WalletsService,
  ) {}

  @Get('cotisations')
  async lister(@CurrentUser() user: User) {
    const cotisations = await this.repo.find({
      where: { userId: user.id },
      order: { datePaiement: 'DESC', createdAt: 'DESC' },
    });
    return { cotisations };
  }

  /**
   * Enregistre un versement. Si mode === 'keiwa', débite réellement le
   * wallet de l'utilisatrice — dans la MÊME transaction SQL que la création
   * de la cotisation : solde insuffisant (ou compte bloqué) ⇒ AUCUNE
   * cotisation créée, AUCUN mouvement wallet (tout ou rien, cf.
   * CONSTITUTION.md §7). Pour espèces/mobile money, simple enregistrement
   * déclaratif, aucun mouvement wallet.
   */
  @Post('cotisations')
  async enregistrer(@Body() body: any, @CurrentUser() user: User) {
    const organisme = String(body?.organisme || '').toUpperCase() as OrganismeSocial;
    if (!ORGANISMES.includes(organisme)) {
      throw new BadRequestException('organisme invalide (CNPS ou CNAM attendu)');
    }
    const montant = Number(body?.montant);
    if (!(montant > 0)) {
      throw new BadRequestException('montant invalide');
    }
    if (montant > 10_000_000) {
      throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');
    }
    const periode = String(body?.periode || '');
    if (!PERIODE_RE.test(periode)) {
      throw new BadRequestException('periode invalide (format attendu : AAAA-MM)');
    }
    const mode = String(body?.mode || '').toLowerCase() as ModePaiementCotisation;
    if (!MODES.includes(mode)) {
      throw new BadRequestException('mode invalide (especes, keiwa ou mobile_money attendu)');
    }

    // Id généré AVANT l'insertion : sert de related_entity_id pour le débit
    // wallet (mode keiwa) ET de clé primaire de la cotisation — une seule
    // écriture pour chaque table, aucune mise à jour ultérieure de la ligne
    // cotisation (append-only, cf. entité).
    const cotisationId = randomUUID();
    const datePaiement = new Date();

    const cotisation = await this.dataSource.transaction(async (entityManager) => {
      let walletTransactionId: string | null = null;

      if (mode === 'keiwa') {
        const wallet = await entityManager.findOne(Wallet, {
          where: { userId: user.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!wallet) throw new NotFoundException('Wallet introuvable');

        // Cf. WalletsService.assertCompteActif : un compte bloqué ne doit
        // plus pouvoir bouger d'argent, vérifié sous le verrou, dans la même
        // transaction que l'écriture.
        await this.walletsService.assertCompteActif(user.id, entityManager);

        const disponible = Number(wallet.solde) - Number(wallet.soldeBloque);
        if (disponible < montant) {
          throw new BadRequestException('Solde insuffisant');
        }

        wallet.solde = Number(wallet.solde) - montant;
        await entityManager.save(Wallet, wallet);

        const debitTx = entityManager.create(WalletTransaction, {
          userId: user.id,
          type: TransactionType.DEBIT,
          montant,
          description: `Cotisation ${organisme} ${periode}`,
          statut: 'completed',
          relatedEntityType: 'cotisation_sociale',
          relatedEntityId: cotisationId,
          metadata: { cotisationId, organisme, periode, modePaiement: 'keiwa' },
        });
        // related_entity_id + type protégés par l'index unique partiel
        // ux_wallet_tx_cotisation_idempotence : un second débit pour la même
        // cotisation échouerait ici même si le verrou ci-dessus était
        // contourné par une course concurrente.
        await entityManager.save(WalletTransaction, debitTx);
        walletTransactionId = debitTx.id;
      }

      const nouvelle = entityManager.create(CotisationSociale, {
        id: cotisationId,
        userId: user.id,
        organisme,
        montant,
        periode,
        datePaiement,
        mode,
        walletTransactionId,
      });
      await entityManager.save(CotisationSociale, nouvelle);
      return nouvelle;
    });

    return { cotisation };
  }
}
