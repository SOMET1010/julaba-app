import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction, TransactionType } from './entities/wallet-transaction.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import { stripSensitiveUserFields } from '../users/sanitize-user.util';

export interface ResultatTransfert {
  dejaTraite: boolean;
  reference: string;
  soldeExpediteur: number;
  transaction: WalletTransaction;
}

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Créer un wallet pour un nouvel utilisateur
   */
  async createForUser(userId: string): Promise<Wallet> {
    const wallet = this.walletRepository.create({
      userId,
      solde: 0,
      soldeBloque: 0,
      currency: 'XOF',
    });

    const savedWallet = await this.walletRepository.save(wallet);
    this.logger.log(`Wallet créé pour l'utilisateur ${userId}`);
    return savedWallet;
  }

  /**
   * Récupérer le wallet d'un utilisateur
   */
  async getByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!wallet) {
      throw new NotFoundException('Wallet introuvable');
    }

    // Sécurité : la relation `user` chargée ci-dessus embarque l'entité User
    // complète (passwordHash, pinCodeHash, webauthnCredentials...). Même
    // mécanisme que users.service.ts/auth.service.ts (cf. sanitize-user.util.ts)
    // — sinon GET /wallets/me expose le hash bcrypt du mot de passe dans le
    // JSON renvoyé au client.
    if ((wallet as any).user) {
      (wallet as any).user = stripSensitiveUserFields((wallet as any).user);
    }

    return wallet;
  }

  /**
   * Vérifie qu'un compte n'est pas bloqué (users.status = 'suspendu') avant
   * tout mouvement de fonds touchant son wallet. C'est la SEULE source de
   * vérité pour le blocage — cf. CONSTITUTION.md §7 (l'argent est sacré) et
   * §2 (un concept = une seule source de vérité) : pas de champ de blocage
   * dupliqué sur `wallets`, on réutilise `users.status` qui bloque déjà la
   * connexion (voir JwtStrategy). Un compte bloqué ne doit plus pouvoir ni
   * recevoir ni envoyer d'argent, y compris quand le mouvement est déclenché
   * par un tiers (paiement Keiwa payé par le vendeur, webhook bpay, action
   * admin) — d'où l'appel explicite ici plutôt que de compter uniquement sur
   * le blocage de connexion, qui ne protège que les mouvements que LE
   * TITULAIRE déclenche lui-même.
   *
   * IMPORTANT : toujours appeler avec l'`EntityManager` de la transaction SQL
   * qui effectue l'écriture qui suit, pour que la vérification et l'écriture
   * soient atomiques (un blocage concurrent ne peut pas se glisser entre les
   * deux).
   */
  async assertCompteActif(userId: string, manager?: EntityManager): Promise<void> {
    const runner = manager ?? this.dataSource.manager;
    const user = await runner.findOne(User, { where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    if (user.status === UserStatus.SUSPENDU) {
      throw new ForbiddenException('Compte bloqué : mouvement de fonds refusé');
    }
  }

  /**
   * Créditer un wallet (recharge)
   *
   * `manager` (optionnel) : quand un appelant a déjà ouvert sa propre
   * transaction SQL (ex. TontinesService.cotiser, qui doit débiter le
   * cotisant PUIS créditer le bénéficiaire dans la MÊME transaction que
   * l'écriture des mouvements de tontine — cf. CONSTITUTION.md §7), on lui
   * permet de passer son `EntityManager` pour que ce crédit y participe au
   * lieu d'ouvrir une transaction concurrente. Sans `manager`, le
   * comportement est strictement identique à avant (transaction dédiée) —
   * extension rétrocompatible, tous les appelants existants continuent de
   * fonctionner sans changement.
   */
  async creditWallet(
    userId: string,
    montant: number,
    description: string,
    metadata?: any,
    manager?: EntityManager,
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    if (montant <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }
    if (montant > 10_000_000) throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');

    const executer = async (entityManager: EntityManager) => {
      // Récupérer le wallet avec un verrou
      const wallet = await entityManager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet introuvable');
      }

      await this.assertCompteActif(userId, entityManager);

      // Mettre à jour le solde
      wallet.solde = Number(wallet.solde) + Number(montant);
      await entityManager.save(Wallet, wallet);

      // Créer la transaction
      const transaction = entityManager.create(WalletTransaction, {
        userId,
        type: TransactionType.CREDIT,
        montant,
        description,
        statut: 'completed',
        metadata,
      });

      await entityManager.save(WalletTransaction, transaction);

      this.logger.log(`Wallet ${userId} crédité de ${montant} XOF`);

      return { wallet, transaction };
    };

    return manager ? executer(manager) : this.dataSource.transaction(executer);
  }

  /**
   * Débiter un wallet (retrait)
   *
   * `manager` (optionnel) : voir la docstring de `creditWallet` — même
   * mécanisme, pour participer à une transaction déjà ouverte par l'appelant.
   */
  async debitWallet(
    userId: string,
    montant: number,
    description: string,
    metadata?: any,
    manager?: EntityManager,
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    if (montant <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }
    if (montant > 10_000_000) throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');

    const executer = async (entityManager: EntityManager) => {
      const wallet = await entityManager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet introuvable');
      }

      await this.assertCompteActif(userId, entityManager);

      const soldeDisponible = Number(wallet.solde) - Number(wallet.soldeBloque);

      if (soldeDisponible < montant) {
        throw new BadRequestException('Solde insuffisant');
      }

      wallet.solde = Number(wallet.solde) - Number(montant);
      await entityManager.save(Wallet, wallet);

      const transaction = entityManager.create(WalletTransaction, {
        userId,
        type: TransactionType.DEBIT,
        montant,
        description,
        statut: 'completed',
        metadata,
      });

      await entityManager.save(WalletTransaction, transaction);

      this.logger.log(`Wallet ${userId} débité de ${montant} XOF`);

      return { wallet, transaction };
    };

    return manager ? executer(manager) : this.dataSource.transaction(executer);
  }

  /**
   * Transfert compte-à-compte interne : déplace de l'argent réel entre deux
   * wallets Jùlaba (aucun partenaire externe, contrairement à Keiwa
   * banque/carte). Dans UNE seule transaction SQL :
   *  - verrous pessimistes sur LES DEUX wallets, acquis dans un ORDRE
   *    DÉTERMINISTE (tri lexicographique des userId, indépendant de qui est
   *    expéditeur/destinataire) — si A transfère à B et B transfère à A en
   *    même temps, les deux transactions verrouillent dans le même ordre et
   *    l'une attend simplement l'autre au lieu de deadlocker ;
   *  - assertCompteActif sur les deux comptes (aucun des deux ne doit être
   *    bloqué, cf. CONSTITUTION.md §7 et blocage-wallet-admin) ;
   *  - débit expéditeur (refusé si solde disponible insuffisant), crédit
   *    destinataire, DEUX lignes wallet_transactions liées par une référence
   *    commune (relatedEntityType='transfert', relatedEntityId=reference).
   *
   * Idempotence : si `idempotencyKey` est fourni (généré côté client, un par
   * tentative d'envoi), rejouer la MÊME clé — retry réseau, double-clic sur
   * "Envoyer maintenant" — ne crée AUCUN second mouvement : on relit d'abord
   * sous verrou puis on retourne le résultat déjà enregistré. Un index UNIQUE
   * partiel en base (ux_wallet_tx_idempotency_key) est la seconde ligne de
   * défense si ce chemin applicatif était contourné par une course.
   */
  async transfererVersUtilisateur(
    expediteurId: string,
    destinataireId: string,
    montant: number,
    note: string | undefined,
    idempotencyKey: string | null,
  ): Promise<ResultatTransfert> {
    if (expediteurId === destinataireId) {
      throw new BadRequestException('Impossible de transférer vers son propre compte');
    }
    if (!montant || montant <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }
    if (montant > 10_000_000) {
      throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');
    }

    try {
      return await this.dataSource.transaction(async (entityManager) => {
        // Idempotence : rejouer la même clé ne doit jamais rejouer le
        // mouvement. Vérifié DANS la même transaction que l'écriture pour
        // rester cohérent avec les verrous posés juste après.
        if (idempotencyKey) {
          const dejaTraitee = await entityManager.findOne(WalletTransaction, {
            where: { userId: expediteurId, idempotencyKey, type: TransactionType.DEBIT },
          });
          if (dejaTraitee) {
            const wallet = await entityManager.findOne(Wallet, { where: { userId: expediteurId } });
            return {
              dejaTraite: true,
              reference: dejaTraitee.relatedEntityId,
              soldeExpediteur: Number(wallet?.solde ?? 0),
              transaction: dejaTraitee,
            };
          }
        }

        // Ordre déterministe de verrouillage — cf. docstring de la méthode.
        const [idA, idB] = [expediteurId, destinataireId].sort();
        const walletA = await entityManager.findOne(Wallet, {
          where: { userId: idA },
          lock: { mode: 'pessimistic_write' },
        });
        if (!walletA) throw new NotFoundException('Wallet introuvable');
        const walletB = await entityManager.findOne(Wallet, {
          where: { userId: idB },
          lock: { mode: 'pessimistic_write' },
        });
        if (!walletB) throw new NotFoundException('Wallet introuvable');

        const walletExpediteur = idA === expediteurId ? walletA : walletB;
        const walletDestinataire = idA === expediteurId ? walletB : walletA;

        // Un compte bloqué ne doit plus pouvoir ni envoyer ni recevoir
        // d'argent — vérifié sous les deux verrous, dans la même transaction
        // que l'écriture (cf. assertCompteActif ci-dessus).
        await this.assertCompteActif(expediteurId, entityManager);
        await this.assertCompteActif(destinataireId, entityManager);

        const disponible = Number(walletExpediteur.solde) - Number(walletExpediteur.soldeBloque);
        if (disponible < montant) {
          throw new BadRequestException('Solde insuffisant');
        }

        walletExpediteur.solde = Number(walletExpediteur.solde) - Number(montant);
        walletDestinataire.solde = Number(walletDestinataire.solde) + Number(montant);
        await entityManager.save(Wallet, walletExpediteur);
        await entityManager.save(Wallet, walletDestinataire);

        const reference = randomUUID();
        const debitTx = entityManager.create(WalletTransaction, {
          userId: expediteurId,
          type: TransactionType.DEBIT,
          montant,
          description: note ? `Transfert envoyé : ${note}` : 'Transfert envoyé',
          statut: 'completed',
          relatedEntityType: 'transfert',
          relatedEntityId: reference,
          idempotencyKey,
          metadata: { reference, sens: 'debit_expediteur', destinataireId },
        });
        const creditTx = entityManager.create(WalletTransaction, {
          userId: destinataireId,
          type: TransactionType.CREDIT,
          montant,
          description: note ? `Transfert reçu : ${note}` : 'Transfert reçu',
          statut: 'completed',
          relatedEntityType: 'transfert',
          relatedEntityId: reference,
          idempotencyKey,
          metadata: { reference, sens: 'credit_destinataire', expediteurId },
        });
        // related_entity_id partagé par les deux lignes (traçabilité d'un
        // même transfert) ; idempotency_key protégé par l'index unique
        // partiel ux_wallet_tx_idempotency_key (idempotency_key, user_id,
        // type) : une double écriture pour la MÊME clé échouerait ici même
        // si le check ci-dessus était contourné par une course concurrente.
        await entityManager.save(WalletTransaction, debitTx);
        await entityManager.save(WalletTransaction, creditTx);

        this.logger.log(
          `Transfert ${montant} XOF de ${expediteurId} vers ${destinataireId} (ref ${reference})`,
        );

        return {
          dejaTraite: false,
          reference,
          soldeExpediteur: Number(walletExpediteur.solde),
          transaction: debitTx,
        };
      });
    } catch (e: any) {
      // Course sur la clé d'idempotence : deux requêtes concurrentes avec la
      // MÊME clé peuvent toutes deux dépasser le check ci-dessus avant que
      // l'une n'ait committé — l'index unique tranche, la perdante récupère
      // ici le résultat déjà enregistré au lieu de renvoyer une 500.
      if (idempotencyKey && (e?.code === '23505' || /duplicate key|unique constraint/i.test(e?.message || ''))) {
        const dejaTraitee = await this.transactionRepository.findOne({
          where: { userId: expediteurId, idempotencyKey, type: TransactionType.DEBIT },
        });
        if (dejaTraitee) {
          const wallet = await this.getByUserId(expediteurId);
          return {
            dejaTraite: true,
            reference: dejaTraitee.relatedEntityId,
            soldeExpediteur: Number(wallet.solde),
            transaction: dejaTraitee,
          };
        }
      }
      throw e;
    }
  }

  /**
   * Récupérer les transactions d'un wallet
   */
  async getTransactions(userId: string, limit = 50): Promise<WalletTransaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Bloquer des fonds (escrow)
   */
  async blockFunds(userId: string, montant: number): Promise<Wallet> {
    if (montant <= 0) throw new BadRequestException('Le montant doit être supérieur à 0');
    if (montant > 10_000_000) throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');
    return await this.dataSource.transaction(async (entityManager) => {
      const wallet = await entityManager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet introuvable');
      }

      await this.assertCompteActif(userId, entityManager);

      const soldeDisponible = Number(wallet.solde) - Number(wallet.soldeBloque);

      if (soldeDisponible < montant) {
        throw new BadRequestException('Solde insuffisant pour bloquer');
      }

      wallet.soldeBloque = Number(wallet.soldeBloque) + Number(montant);
      await entityManager.save(Wallet, wallet);
      const transaction = entityManager.create(WalletTransaction, {
        userId,
        type: TransactionType.ESCROW_BLOCK,
        montant,
        description: 'Blocage fonds escrow',
        statut: 'completed',
      });
      await entityManager.save(WalletTransaction, transaction);

      this.logger.log(`${montant} XOF bloqués sur wallet ${userId}`);

      return wallet;
    });
  }

  /**
   * Libérer des fonds bloqués
   */
  async releaseFunds(userId: string, montant: number): Promise<Wallet> {
    if (montant <= 0) throw new BadRequestException('Le montant doit être supérieur à 0');
    if (montant > 10_000_000) throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');
    return await this.dataSource.transaction(async (entityManager) => {
      const wallet = await entityManager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet introuvable');
      }

      await this.assertCompteActif(userId, entityManager);

      if (Number(wallet.soldeBloque) < montant) {
        throw new BadRequestException('Montant bloqué insuffisant');
      }

      wallet.soldeBloque = Number(wallet.soldeBloque) - Number(montant);
      wallet.solde = Number(wallet.solde) - Number(montant);
      await entityManager.save(Wallet, wallet);
      const transaction = entityManager.create(WalletTransaction, {
        userId,
        type: TransactionType.ESCROW_RELEASE,
        montant,
        description: 'Libération fonds escrow',
        statut: 'completed',
      });
      await entityManager.save(WalletTransaction, transaction);

      this.logger.log(`${montant} XOF libérés du wallet ${userId}`);

      return wallet;
    });
  }

  /**
   * Rembourser des fonds bloqués
   */
  async refundFunds(userId: string, montant: number): Promise<Wallet> {
    if (montant <= 0) throw new BadRequestException('Le montant doit être supérieur à 0');
    if (montant > 10_000_000) throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');
    return await this.dataSource.transaction(async (entityManager) => {
      const wallet = await entityManager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet introuvable');
      }

      await this.assertCompteActif(userId, entityManager);

      if (Number(wallet.soldeBloque) < montant) {
        throw new BadRequestException('Montant bloqué insuffisant');
      }

      wallet.soldeBloque = Number(wallet.soldeBloque) - Number(montant);
      await entityManager.save(Wallet, wallet);
      const transaction = entityManager.create(WalletTransaction, {
        userId,
        type: TransactionType.ESCROW_REFUND,
        montant,
        description: 'Remboursement fonds escrow',
        statut: 'completed',
      });
      await entityManager.save(WalletTransaction, transaction);

      this.logger.log(`${montant} XOF remboursés sur wallet ${userId}`);

      return wallet;
    });
  }

  /**
   * Rembourser un retrait mobile money refusé par l'opérateur (C-01).
   *
   * Un retrait Keiwa → mobile money débite le wallet AVANT l'appel opérateur.
   * Si l'opérateur refuse le cashin (explicitement ou révélé plus tard par
   * check-status / webhook / cron), l'argent débité doit revenir au wallet —
   * EXACTEMENT UNE FOIS, quelle que soit la voie qui découvre l'échec
   * (rollback synchrone du contrôleur, webhook B-Pay, cron de réconciliation).
   *
   * Idempotence : la transition `PENDING_WITHDRAW → REFUNDED` est une écriture
   * conditionnelle (`WHERE status='PENDING_WITHDRAW' RETURNING id`) dans la
   * MÊME transaction SQL que le crédit du wallet. Deux appelants concurrents
   * ne peuvent pas tous deux gagner la course : le perdant n'écrit rien.
   *
   * Compte suspendu : `creditWallet` lève (assertCompteActif) → la transaction
   * entière est annulée, y compris la bascule de statut — le retrait reste
   * PENDING_WITHDRAW et la réconciliation retentera après déblocage.
   * L'argent d'un retrait refusé n'est JAMAIS perdu (même logique que la
   * recharge réconciliée, en miroir).
   *
   * @param tx ligne brute `bpay_transactions` (SELECT * : snake_case)
   * @param bpayStatut statut brut opérateur qui motive le remboursement
   * @param source 'controller' | 'cron' | 'webhook' (traçabilité)
   * @returns true si CET appel a effectué le remboursement (le gagnant de la
   *          course), false si le retrait n'était plus à rembourser
   */
  async rembourserRetraitBpay(
    tx: { id: string; user_id: string; amount: number; provider: string; merchant_tx_id: string },
    bpayStatut: string,
    source: string,
  ): Promise<boolean> {
    const montant = Number(tx.amount);
    if (!montant || montant <= 0) {
      this.logger.warn(
        `[RETRAIT] remboursement refusé : montant invalide (${tx.amount}) bpay_tx=${tx.id}`,
      );
      return false;
    }
    if (montant > 10_000_000) {
      throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');
    }
    return this.dataSource.transaction(async (em) => {
      const updated = await em.query(
        `UPDATE bpay_transactions
            SET status = 'REFUNDED', bpay_status = $1, source = $2, updated_at = NOW()
          WHERE id = $3 AND status = 'PENDING_WITHDRAW'
          RETURNING id`,
        [bpayStatut || null, source, tx.id],
      );
      if (!updated || updated.length === 0) {
        return false;
      }
      await this.creditWallet(
        tx.user_id,
        montant,
        `Remboursement retrait refusé vers ${tx.provider}`,
        { refundOf: tx.merchant_tx_id, bpayStatus: bpayStatut || null, source },
        em,
      );
      this.logger.log(
        `[RETRAIT] remboursé ${montant} XOF → userId=${tx.user_id} (bpay_tx=${tx.id}, source=${source}, statut opérateur=${bpayStatut || 'n/a'})`,
      );
      return true;
    });
  }
}
