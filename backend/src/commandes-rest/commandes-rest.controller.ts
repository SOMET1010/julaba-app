import { Controller, Get, Post, Patch, Body, Param, UseGuards, ForbiddenException, NotFoundException, Query, BadRequestException, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Commande, CommandeStatut } from '../commandes/entities/commande.entity';
import { Negociation, NegociationStatut } from '../commandes/entities/negociation.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Wallet } from '../wallets/entities/wallet.entity';
import { TransactionType, WalletTransaction } from '../wallets/entities/wallet-transaction.entity';

@UseGuards(JwtAuthGuard)
@Controller('commandes')
export class CommandesRestController {
  private readonly logger = new Logger(CommandesRestController.name);

  constructor(
    @InjectRepository(Commande) private repo: Repository<Commande>,
    @InjectRepository(Negociation) private negRepo: Repository<Negociation>,
    @InjectDataSource() private dataSource: DataSource,
    private notifService: NotificationsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('role') role?: string,
  ) {
    const take = Math.min(Number(limit) || 50, 200);
    const skip = (Number(page) - 1) * take;
    const pageNumber = Number(page);
    const emptyMeta = { total: 0, page: pageNumber, limit: take, pages: 0 };

    // Roles without order workflows return empty results directly.
    const rolesAvecCommandes = ['marchand', 'producteur', 'cooperateur'];
    if (!rolesAvecCommandes.includes(user.role)) {
      return { commandes: [], meta: emptyMeta };
    }

    // Metier aliases map to "vendeur" filtering.
    const normalizedRole =
      role === 'producteur' || role === 'cooperative' || role === 'cooperateur'
        ? 'vendeur'
        : role;
    const where =
      normalizedRole === 'acheteur' ? [{ acheteurId: user.id }]
      : normalizedRole === 'vendeur' ? [{ vendeurId: user.id }]
      : [{ acheteurId: user.id }, { vendeurId: user.id }];

    try {
      const [raw, total] = await this.repo.findAndCount({
        where,
        relations: ['acheteur', 'vendeur', 'publication'],
        order: { createdAt: 'DESC' },
        take,
        skip,
      });
      const commandes = raw.map(c => ({
        ...c,
        acheteurNom: c.acheteur
          ? `${c.acheteur.firstName || ''} ${c.acheteur.lastName || ''}`.trim()
          : (c.acheteurNom || c.acheteurId || ''),
        acheteurRole: c.acheteur?.role || '',
        vendeurNom: c.vendeur ? `${c.vendeur.firstName || ''} ${c.vendeur.lastName || ''}`.trim() : c.vendeurId,
        vendeurRole: c.vendeur?.role || '',
        imageUrl: c.imageUrl ?? null,
        unite: (c.publication as any)?.unite ?? null,
        acheteurTelephone: c.acheteurTelephone ?? null,
        localite: c.localite ?? null,
      }));
      return { commandes, meta: { total, page: pageNumber, limit: take, pages: Math.ceil(total / take) } };
    } catch (e: any) {
      this.logger.error('[commandes findAll] Erreur SQL', e instanceof Error ? e.stack : String(e));
      return { commandes: [], meta: emptyMeta };
    }
  }

  @Post()
  async create(@Body() body: any, @CurrentUser() user: User) {
    const isVenteDirecte = body.type === 'vente_directe';
    const vendeurId = body.vendeur_id || body.vendeurId;
    if (!vendeurId) {
      throw new BadRequestException('vendeur_id requis');
    }
    if (isVenteDirecte && vendeurId !== user.id) {
      throw new ForbiddenException('Vente directe : le vendeur doit être le compte connecté');
    }

    const rawAcheteur = body.acheteur_id ?? body.acheteurId;
    const acheteurIdTrimmed =
      rawAcheteur != null && String(rawAcheteur).trim() !== '' ? String(rawAcheteur).trim() : null;
    const acheteurId = isVenteDirecte ? acheteurIdTrimmed : user.id;

    const nomLibre = String(body.acheteur_nom || body.acheteurNom || '').trim() || null;

    let statut: CommandeStatut = CommandeStatut.EN_ATTENTE;
    const s = body.statut as string | undefined;
    if (s && Object.values(CommandeStatut).includes(s as CommandeStatut)) {
      statut = s as CommandeStatut;
    }
    const quantite = Number(body.quantite);
    const prixUnitaire = Number(body.prix_unitaire || body.prixUnitaire);
    const total = Number(body.total);
    if (isNaN(quantite) || quantite <= 0) throw new BadRequestException('quantite invalide');
    if (isNaN(prixUnitaire) || prixUnitaire <= 0) throw new BadRequestException('prixUnitaire invalide');
    if (isNaN(total) || total <= 0) throw new BadRequestException('total invalide');

    const saved = await this.repo.save(
      this.repo.create({
        acheteurId,
        vendeurId,
        publicationId: body.publication_id || body.publicationId || null,
        type: body.type,
        produit: body.produit,
        quantite,
        prixUnitaire,
        total,
        statut,
        dateCommande: new Date(),
        notes: body.notes || null,
        modePaiement: body.mode_paiement || body.modePaiement || null,
        acheteurNom: nomLibre,
        imageUrl: body.image_url || null,
        acheteurTelephone: body.acheteur_telephone || null,
        localite: body.localite || null,
        dateLivraison: body.date_livraison ? new Date(body.date_livraison) : null,
      }),
    );
    try {
      await this.notifService.notifyCommande(saved.vendeurId, saved.id, Number(saved.total || 0));
    } catch (error) {
      this.logger.error('notifyCommande failed', error instanceof Error ? error.stack : String(error));
    }
    return { commande: saved };
  }

  @Patch(':id/livrer')
  async livrer(@Param('id') id: string, @CurrentUser() user: User) {
    const cmd = await this.repo.findOne({ where: { id } });
    if (!cmd) throw new NotFoundException('Commande introuvable');
    if (cmd.vendeurId !== user.id) throw new ForbiddenException('Accès refusé');
    cmd.statut = CommandeStatut.LIVREE;
    return this.repo.save(cmd);
  }


  @Post(':id/paiement')
  async recupererPaiement(@Param('id') id: string, @CurrentUser() user: User) {
    const cmd = await this.repo.findOne({ where: { id } });
    if (!cmd) throw new NotFoundException('Commande introuvable');
    if (cmd.statutPaiement === 'paye') {
      return { success: true, message: 'Commande déjà payée' };
    }
    if (cmd.vendeurId !== user.id) throw new ForbiddenException('Accès refusé');

    const modePaiementRaw = String(cmd.modePaiement || '').toLowerCase();
    const montant = Number(cmd.total || 0);

    // Paiement espèces : aucun mouvement keiwa, simple attestation du vendeur
    if (modePaiementRaw !== 'keiwa') {
      cmd.statutPaiement = 'paye';
      cmd.payeAt = new Date();
      await this.repo.save(cmd);
      return { success: true };
    }

    if (!cmd.acheteurId) {
      throw new BadRequestException('Acheteur introuvable pour paiement keiwa');
    }
    if (montant <= 0) {
      throw new BadRequestException('Montant de commande invalide');
    }
    await this.dataSource.transaction(async (entityManager) => {
      const walletAcheteur = await entityManager.findOne(Wallet, {
        where: { userId: cmd.acheteurId! },
        lock: { mode: 'pessimistic_write' },
      });
      if (!walletAcheteur) throw new NotFoundException('Wallet acheteur introuvable');
      const walletVendeur = await entityManager.findOne(Wallet, {
        where: { userId: cmd.vendeurId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!walletVendeur) throw new NotFoundException('Wallet vendeur introuvable');
      if (Number(walletAcheteur.solde) < montant) {
        throw new BadRequestException('Solde insuffisant');
      }
      walletAcheteur.solde = Number(walletAcheteur.solde) - montant;
      walletVendeur.solde = Number(walletVendeur.solde) + montant;
      await entityManager.save(Wallet, walletAcheteur);
      await entityManager.save(Wallet, walletVendeur);
      const debitTx = entityManager.create(WalletTransaction, {
        userId: cmd.acheteurId,
        type: TransactionType.DEBIT,
        montant,
        description: `Paiement commande ${cmd.id}`,
        statut: 'completed',
        metadata: { commandeId: cmd.id, modePaiement: 'keiwa', sens: 'debit_acheteur' },
      });
      const creditTx = entityManager.create(WalletTransaction, {
        userId: cmd.vendeurId,
        type: TransactionType.CREDIT,
        montant,
        description: `Encaissement commande ${cmd.id}`,
        statut: 'completed',
        metadata: { commandeId: cmd.id, modePaiement: 'keiwa', sens: 'credit_vendeur' },
      });
      await entityManager.save(WalletTransaction, debitTx);
      await entityManager.save(WalletTransaction, creditTx);
    });
    cmd.statutPaiement = 'paye';
    cmd.payeAt = new Date();
    await this.repo.save(cmd);

    return { success: true };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    const cmd = await this.repo.findOne({ where: { id } });
    if (!cmd) throw new ForbiddenException('Commande introuvable');
    const isAcheteur = cmd.acheteurId != null && cmd.acheteurId === user.id;
    const isVendeur = cmd.vendeurId === user.id;
    if (!isAcheteur && !isVendeur) throw new ForbiddenException('Acces refuse');
    if (body.statut && !Object.values(CommandeStatut).includes(body.statut)) {
      throw new BadRequestException('statut invalide');
    }
    const nextStatut = body.statut as CommandeStatut | undefined;
    if (nextStatut) {
      const statutsVendeur = [
        CommandeStatut.CONFIRMEE,
        CommandeStatut.EN_LIVRAISON,
        CommandeStatut.LIVREE,
        CommandeStatut.ANNULEE,
      ];
      if (statutsVendeur.includes(nextStatut) && !isVendeur) {
        throw new ForbiddenException('Seul le vendeur peut appliquer ce statut');
      }
    }
    const allowed = ['statut', 'dateLivraison', 'notes'];
    const safeBody = Object.fromEntries(
      Object.entries(body).filter(([k]) => allowed.includes(k))
    );
    await this.repo.update(id, safeBody);
    if (nextStatut && nextStatut !== cmd.statut) {
      const map: Record<string, { titre: string; message: string }> = {
        confirmee: { titre: 'Commande confirmée', message: `La commande ${cmd.produit} a été confirmée.` },
        annulee: { titre: 'Commande annulée', message: `La commande ${cmd.produit} a été annulée.` },
        en_livraison: { titre: 'Commande en livraison', message: `La commande ${cmd.produit} est en livraison.` },
        livree: { titre: 'Commande livrée', message: `La commande ${cmd.produit} a été livrée.` },
      };
      const notif = map[nextStatut];
      if (notif) {
        try {
          if (cmd.acheteurId) {
            await this.notifService.create({
              userId: cmd.acheteurId,
              type: 'commande_statut',
              titre: notif.titre,
              message: notif.message,
              category: 'commandes',
              priority: 'medium',
              metadata: { commandeId: cmd.id, statut: nextStatut, audience: 'acheteur' },
            });
          }
          if (cmd.vendeurId) {
            await this.notifService.create({
              userId: cmd.vendeurId,
              type: 'commande_statut',
              titre: notif.titre,
              message: notif.message,
              category: 'commandes',
              priority: 'medium',
              metadata: { commandeId: cmd.id, statut: nextStatut, audience: 'vendeur' },
            });
          }
        } catch (error) {
          this.logger.error('commande status notification failed', error instanceof Error ? error.stack : String(error));
        }
      }
    }

    // Décrémenter stock_disponible de la publication quand confirmée
    if (body.statut === 'confirmee' && cmd.publicationId && cmd.statut !== 'confirmee') {
      await this.repo.manager.query(
        `UPDATE publications SET
           quantite_disponible = GREATEST(0, quantite_disponible - $1),
           statut = CASE WHEN GREATEST(0, quantite_disponible - $1) = 0 THEN 'epuise' ELSE statut END,
           updated_at = NOW()
         WHERE id = $2`,
        [Number(cmd.quantite), cmd.publicationId]
      );
      // Mettre à jour stock_disponible de la récolte liée
      await this.repo.manager.query(
        `UPDATE recoltes r
         SET stock_disponible = GREATEST(0, r.stock_disponible - $1),
             stock_vendu = r.stock_vendu + $1,
             statut = CASE WHEN GREATEST(0, r.stock_disponible - $1) = 0 THEN 'vendue' ELSE r.statut END,
             updated_at = NOW()
         FROM publications p
         WHERE p.id = $2 AND p.recolte_id = r.id`,
        [Number(cmd.quantite), cmd.publicationId]
      );
    }
    return { success: true };
  }

  // ── NÉGOCIATION DIRECTE ──────────────────────────────────────────
  @Post('negociation')
  async proposerNegociation(@Body() body: any, @CurrentUser() user: User) {
    const { vendeurId, produit, quantite, prixOriginal, prixPropose, unite, message } = body;
    if (!vendeurId || !produit || !quantite || !prixPropose) throw new BadRequestException('Champs manquants');
    const neg = this.negRepo.create({
      marchandId: user.id, vendeurId, produit,
      quantite: Number(quantite), prixOriginal: Number(prixOriginal),
      prixPropose: Number(prixPropose), unite: unite || 'kg',
      message: message || '',
    });
    const saved = await this.negRepo.save(neg);
    // Notification push au producteur/vendeur
    try {
      await this.notifService.create({
        userId: vendeurId,
        type: 'negociation',
        titre: `Proposition de prix pour ${produit}`,
        message: `Un marchand propose ${Number(prixPropose).toLocaleString('fr-FR')} FCFA/${unite || 'kg'} pour ${quantite} ${unite || 'kg'} de ${produit}${message ? ` : "${message}"` : ''}`,
      });
    } catch (error) {
      this.logger.error('negociation notification failed', error instanceof Error ? error.stack : String(error));
    }
    return { negociation: saved, message: 'Proposition envoyée au vendeur' };
  }

  @Get('negociations')
  async getMesNegociations(@CurrentUser() user: User) {
    const negs = await this.negRepo.find({
      where: [{ marchandId: user.id }, { vendeurId: user.id }],
      order: { createdAt: 'DESC' },
    });
    return { negociations: negs };
  }

  @Patch('negociation/:id/repondre')
  async repondreNegociation(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    const neg = await this.negRepo.findOne({ where: { id } });
    if (!neg) throw new ForbiddenException('Negociation introuvable');
    if (neg.vendeurId !== user.id) throw new ForbiddenException('Acces refuse');
    if (!body.statut || !Object.values(NegociationStatut).includes(body.statut)) {
      throw new BadRequestException('statut négociation invalide');
    }
    const statut: NegociationStatut = body.statut;
    const prixContreOffre: number | undefined = body.prixContreOffre;
    const messageReponse: string | undefined = body.messageReponse;

    // Limite 3 contre-offres
    if (statut === NegociationStatut.CONTRE_OFFRE) {
      if (neg.nbContreOffres >= 3) {
        throw new ForbiddenException('Limite de 3 contre-offres atteinte');
      }
      if (!prixContreOffre || isNaN(Number(prixContreOffre)) || Number(prixContreOffre) <= 0) {
        throw new BadRequestException('prixContreOffre requis et doit être positif');
      }
      await this.negRepo.update(id, {
        statut,
        prixContreOffre,
        messageReponse,
        nbContreOffres: neg.nbContreOffres + 1,
      });
    } else {
      await this.negRepo.update(id, { statut, prixContreOffre, messageReponse });
    }

    // Si accepte -> creer une Commande confirmee
    let commande: Commande | null = null;
    if (statut === NegociationStatut.ACCEPTE) {
      const prixFinal = Number(prixContreOffre ?? neg.prixPropose);
      const qte = Number(neg.quantite);
      commande = await this.repo.save(
        this.repo.create({
          acheteurId: neg.marchandId,
          vendeurId: neg.vendeurId,
          type: 'achat',
          produit: neg.produit,
          quantite: qte,
          prixUnitaire: prixFinal,
          total: prixFinal * qte,
          statut: CommandeStatut.CONFIRMEE,
          dateCommande: new Date(),
          notes: 'Issu de negociation ' + id,
        }),
      );
    }

    // Notifier le marchand
    try {
      const label =
        statut === NegociationStatut.ACCEPTE ? 'accepte' :
        statut === NegociationStatut.REFUSE ? 'refuse' : 'contre-propose';
      await this.notifService.create({
        userId: neg.marchandId,
        type: 'negociation_reponse',
        titre: 'Reponse negociation ' + neg.produit,
        message: 'Votre proposition a ete ' + label +
          (prixContreOffre
            ? ' : contre-offre ' + Number(prixContreOffre).toLocaleString('fr-FR') + ' FCFA'
            : ''),
      });
    } catch (error) {
      this.logger.error('notify marchand negociation response failed', error instanceof Error ? error.stack : String(error));
    }
    return { message: 'Reponse enregistree', commande: commande ?? undefined };
  }

  // Marchand accepte ou refuse une contre-offre du producteur
  @Patch('negociation/:id/marchand-repondre')
  async marchandRepondreContreOffre(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    const neg = await this.negRepo.findOne({ where: { id } });
    if (!neg) throw new ForbiddenException('Negociation introuvable');
    if (neg.marchandId !== user.id) throw new ForbiddenException('Acces refuse');
    if (neg.statut !== NegociationStatut.CONTRE_OFFRE) throw new ForbiddenException('Aucune contre-offre en attente');
    if (!['accepte', 'refuse'].includes(body.statut)) {
      throw new BadRequestException('statut invalide - valeurs acceptées : accepte, refuse');
    }
    const { statut }: { statut: 'accepte' | 'refuse' } = body;

    let commande: Commande | null = null;
    if (statut === 'accepte') {
      const prixFinal = Number(neg.prixContreOffre ?? neg.prixPropose);
      const qte = Number(neg.quantite);
      commande = await this.repo.save(
        this.repo.create({
          acheteurId: neg.marchandId,
          vendeurId: neg.vendeurId,
          type: 'achat',
          produit: neg.produit,
          quantite: qte,
          prixUnitaire: prixFinal,
          total: prixFinal * qte,
          statut: CommandeStatut.CONFIRMEE,
          dateCommande: new Date(),
          notes: 'Contre-offre acceptee par marchand ' + id,
        }),
      );
      await this.negRepo.update(id, { statut: NegociationStatut.ACCEPTE });
    } else {
      await this.negRepo.update(id, { statut: NegociationStatut.REFUSE });
    }

    // Notifier le producteur
    try {
      const label = statut === 'accepte' ? 'acceptee' : 'refusee';
      await this.notifService.create({
        userId: neg.vendeurId,
        type: 'negociation_reponse',
        titre: 'Contre-offre ' + label + ' - ' + neg.produit,
        message: 'Le marchand a ' + label + ' votre contre-offre pour ' + neg.produit,
      });
    } catch (error) {
      this.logger.error('notify producteur negociation response failed', error instanceof Error ? error.stack : String(error));
    }
    return { message: 'Reponse enregistree', commande: commande ?? undefined };
  }
}
