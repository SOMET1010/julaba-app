import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Tontine, TontineStatut } from './entities/tontine.entity';
import { TontineMembre } from './entities/tontine-membre.entity';
import { TontineMouvement } from './entities/tontine-mouvement.entity';
import { CreateTontineDto } from './dto/create-tontine.dto';
import { User } from '../users/entities/user.entity';
import { WalletsService } from '../wallets/wallets.service';

function estViolationUnicite(e: any): boolean {
  return e?.code === '23505' || /duplicate key|unique constraint/i.test(e?.message || '');
}

@Injectable()
export class TontinesService {
  constructor(
    @InjectRepository(Tontine) private readonly tontineRepo: Repository<Tontine>,
    @InjectRepository(TontineMembre) private readonly membreRepo: Repository<TontineMembre>,
    @InjectRepository(TontineMouvement) private readonly mouvementRepo: Repository<TontineMouvement>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly walletsService: WalletsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crée une tontine : le responsable = utilisateur connecté, l'ordre de
   * réception = l'ordre du tableau `membres` fourni (0, 1, 2…), fixé
   * définitivement. Tous les userId doivent correspondre à de vrais comptes
   * Jùlaba, et aucun doublon n'est toléré.
   */
  async create(dto: CreateTontineDto, responsableId: string): Promise<Tontine> {
    const userIds = dto.membres.map((m) => m.userId);
    const idsUniques = new Set(userIds);
    if (idsUniques.size !== userIds.length) {
      throw new BadRequestException('Un même utilisateur ne peut pas apparaître deux fois dans la liste des membres');
    }

    const utilisateursExistants = await this.userRepo.find({ where: { id: In(userIds) } });
    if (utilisateursExistants.length !== userIds.length) {
      const idsTrouves = new Set(utilisateursExistants.map((u) => u.id));
      const manquants = userIds.filter((id) => !idsTrouves.has(id));
      throw new BadRequestException(`Utilisateur(s) introuvable(s) : ${manquants.join(', ')}`);
    }

    return this.dataSource.transaction(async (manager) => {
      const tontine = manager.create(Tontine, {
        nom: dto.nom.trim(),
        responsableId,
        montantCotisation: dto.montantCotisation,
        cadenceJours: dto.cadenceJours,
        dateDebut: dto.dateDebut,
        statut: TontineStatut.ACTIVE,
        cycleCourant: 0,
      });
      await manager.save(Tontine, tontine);

      const membres = userIds.map((userId, ordre) =>
        manager.create(TontineMembre, { tontineId: tontine.id, userId, ordre, aRecu: false }),
      );
      await manager.save(TontineMembre, membres);

      return tontine;
    });
  }

  /** Tontines où l'utilisateur connecté est responsable OU membre. */
  async findMine(userId: string): Promise<any[]> {
    const commeResponsable = await this.tontineRepo.find({ where: { responsableId: userId } });
    const adhesions = await this.membreRepo.find({ where: { userId } });
    const idsCommeMembreSet = new Set(adhesions.map((a) => a.tontineId));
    const idsDejaLus = new Set(commeResponsable.map((t) => t.id));
    const idsACharger = [...idsCommeMembreSet].filter((id) => !idsDejaLus.has(id));
    const commeMembre = idsACharger.length
      ? await this.tontineRepo.find({ where: { id: In(idsACharger) } })
      : [];

    const toutes = [...commeResponsable, ...commeMembre];
    // Enrichit chaque tontine du nombre de membres (utile pour l'écran liste
    // sans un aller-retour par tontine).
    const nombreMembresParTontine = await this.compterMembres(toutes.map((t) => t.id));
    return toutes.map((t) => ({
      ...t,
      estResponsable: t.responsableId === userId,
      nombreMembres: nombreMembresParTontine.get(t.id) ?? 0,
    }));
  }

  private async compterMembres(tontineIds: string[]): Promise<Map<string, number>> {
    if (!tontineIds.length) return new Map();
    const rows = await this.membreRepo
      .createQueryBuilder('m')
      .select('m.tontineId', 'tontineId')
      .addSelect('COUNT(*)', 'total')
      .where('m.tontineId IN (:...ids)', { ids: tontineIds })
      .groupBy('m.tontineId')
      .getRawMany();
    return new Map(rows.map((r: any) => [r.tontineId, Number(r.total)]));
  }

  /** Vérifie l'accès (responsable OU membre) — sinon 403. Isolation stricte entre tontines. */
  private async assertAcces(tontineId: string, userId: string, tontine: Tontine): Promise<void> {
    if (tontine.responsableId === userId) return;
    const estMembre = await this.membreRepo.findOne({ where: { tontineId, userId } });
    if (!estMembre) {
      throw new ForbiddenException("Vous n'appartenez pas à cette tontine");
    }
  }

  /** Détail d'une tontine — accessible uniquement au responsable ou à un membre. */
  async findOne(id: string, userId: string): Promise<any> {
    const tontine = await this.tontineRepo.findOne({ where: { id } });
    if (!tontine) throw new NotFoundException('Tontine introuvable');
    await this.assertAcces(id, userId, tontine);

    const membres = await this.membreRepo.find({ where: { tontineId: id }, order: { ordre: 'ASC' } });
    const userIds = membres.map((m) => m.userId);
    const utilisateurs = userIds.length ? await this.userRepo.find({ where: { id: In(userIds) } }) : [];
    const utilisateurParId = new Map(utilisateurs.map((u) => [u.id, u]));

    const cotisationsCycleCourant = await this.mouvementRepo.find({
      where: { tontineId: id, cycleNumero: tontine.cycleCourant, type: 'cotisation' },
    });
    const membresAyantCotiseCeCycle = new Set(cotisationsCycleCourant.map((m) => m.membreId));

    return {
      id: tontine.id,
      nom: tontine.nom,
      responsableId: tontine.responsableId,
      montantCotisation: Number(tontine.montantCotisation),
      cadenceJours: tontine.cadenceJours,
      dateDebut: tontine.dateDebut,
      statut: tontine.statut,
      cycleCourant: tontine.cycleCourant,
      nombreMembres: membres.length,
      estResponsable: tontine.responsableId === userId,
      membres: membres.map((m) => {
        const u = utilisateurParId.get(m.userId);
        return {
          userId: m.userId,
          ordre: m.ordre,
          aRecu: m.aRecu,
          aCotiseCeCycle: membresAyantCotiseCeCycle.has(m.userId),
          nom: u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : null,
          telephone: u?.phone ?? null,
        };
      }),
    };
  }

  /**
   * Le membre connecté cotise pour le cycle courant. Toutes les vérifications
   * et écritures ci-dessous tournent dans UNE SEULE transaction SQL :
   *
   *  1. Verrouille la ligne `tontines` (pessimistic_write) EN PREMIER — avant
   *     tout verrou wallet. Ce verrou sérialise TOUTES les cotisations
   *     concurrentes sur CETTE tontine : deux membres qui cotisent au même
   *     instant pour le même cycle ne peuvent jamais tous les deux dépasser
   *     ce point en même temps, ce qui rend impossible une double
   *     distribution ou une corruption de `cycleCourant` par une course
   *     (cf. invariant de concurrence, comme le transfert compte-à-compte
   *     PR #204).
   *  2. Vérifie tontine active, appelant membre, pas déjà cotisé ce cycle.
   *  3. Débite le cotisant via `WalletsService.debitWallet` (même
   *     transaction — refus propre si solde insuffisant, RIEN ne bouge).
   *  4. Trace la cotisation dans `tontine_mouvements`.
   *  5. Si c'est la DERNIÈRE cotisation manquante du cycle : crédite le
   *     bénéficiaire du tour via `WalletsService.creditWallet` (même
   *     transaction), trace la distribution, marque `aRecu`, avance
   *     `cycleCourant`, et termine la tontine si c'était le dernier tour.
   */
  async cotiser(tontineId: string, userId: string): Promise<any> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const tontine = await manager.findOne(Tontine, {
          where: { id: tontineId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!tontine) throw new NotFoundException('Tontine introuvable');

        const membreAppelant = await manager.findOne(TontineMembre, {
          where: { tontineId, userId },
        });
        if (!membreAppelant) {
          throw new ForbiddenException("Vous n'êtes pas membre de cette tontine");
        }

        if (tontine.statut !== TontineStatut.ACTIVE) {
          throw new BadRequestException(
            tontine.statut === TontineStatut.TERMINEE
              ? 'Cette tontine est terminée : plus aucune cotisation possible'
              : 'Cette tontine est annulée',
          );
        }

        const cycle = tontine.cycleCourant;

        const dejaCotise = await manager.findOne(TontineMouvement, {
          where: { tontineId, membreId: userId, cycleNumero: cycle, type: 'cotisation' },
        });
        if (dejaCotise) {
          throw new BadRequestException('Vous avez déjà cotisé pour ce cycle');
        }

        const membres = await manager.find(TontineMembre, { where: { tontineId }, order: { ordre: 'ASC' } });
        const totalMembres = membres.length;
        const montant = Number(tontine.montantCotisation);

        // Débit réel du cotisant — seul chemin autorisé pour bouger l'argent.
        // Lève BadRequestException si solde insuffisant : la transaction
        // entière (y compris ce qui précède) est alors annulée par NestJS/
        // TypeORM, donc RIEN ne bouge.
        const { transaction: debitTx } = await this.walletsService.debitWallet(
          userId,
          montant,
          `Cotisation tontine "${tontine.nom}" — cycle ${cycle + 1}/${totalMembres}`,
          { tontineId, cycleNumero: cycle, relatedEntityType: 'tontine_cotisation' },
          manager,
        );

        const mouvementCotisation = manager.create(TontineMouvement, {
          tontineId,
          type: 'cotisation',
          membreId: userId,
          cycleNumero: cycle,
          montant,
          walletTransactionId: debitTx.id,
        });
        await manager.save(TontineMouvement, mouvementCotisation);

        const nombreCotisationsCycle = await manager.count(TontineMouvement, {
          where: { tontineId, cycleNumero: cycle, type: 'cotisation' },
        });

        let distribution: { beneficiaireUserId: string; montant: number } | null = null;

        if (nombreCotisationsCycle >= totalMembres) {
          const beneficiaire = membres.find((m) => m.ordre === cycle);
          if (!beneficiaire) {
            // Ne devrait jamais arriver (cycleCourant est toujours dans
            // [0, totalMembres[ tant que la tontine est active) — garde-fou
            // explicite plutôt qu'un crash silencieux.
            throw new BadRequestException('Bénéficiaire du tour introuvable — état de tontine incohérent');
          }

          const montantTotal = montant * totalMembres;
          const { transaction: creditTx } = await this.walletsService.creditWallet(
            beneficiaire.userId,
            montantTotal,
            `Distribution tontine "${tontine.nom}" — cycle ${cycle + 1}/${totalMembres}`,
            { tontineId, cycleNumero: cycle, relatedEntityType: 'tontine_distribution' },
            manager,
          );

          const mouvementDistribution = manager.create(TontineMouvement, {
            tontineId,
            type: 'distribution',
            membreId: beneficiaire.userId,
            cycleNumero: cycle,
            montant: montantTotal,
            walletTransactionId: creditTx.id,
          });
          await manager.save(TontineMouvement, mouvementDistribution);

          beneficiaire.aRecu = true;
          await manager.save(TontineMembre, beneficiaire);

          tontine.cycleCourant = cycle + 1;
          if (tontine.cycleCourant >= totalMembres) {
            tontine.statut = TontineStatut.TERMINEE;
          }
          await manager.save(Tontine, tontine);

          distribution = { beneficiaireUserId: beneficiaire.userId, montant: montantTotal };
        }

        return {
          success: true,
          cycleCourant: tontine.cycleCourant,
          statut: tontine.statut,
          distribution,
        };
      });
    } catch (e: any) {
      // Défense en profondeur : si l'index unique (tontine_id, membre_id,
      // cycle_numero, type) refuse une écriture malgré le verrou applicatif
      // ci-dessus, on renvoie un 400 propre plutôt qu'une 500 SQL brute.
      if (estViolationUnicite(e)) {
        throw new BadRequestException('Cotisation déjà enregistrée pour ce cycle (course détectée)');
      }
      throw e;
    }
  }
}
