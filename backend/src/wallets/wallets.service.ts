import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletTransaction, TransactionType } from './entities/wallet-transaction.entity';

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

    return wallet;
  }

  /**
   * Créditer un wallet (recharge)
   */
  async creditWallet(
    userId: string,
    montant: number,
    description: string,
    metadata?: any,
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    if (montant <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }
    if (montant > 10_000_000) throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');

    return await this.dataSource.transaction(async (entityManager) => {
      // Récupérer le wallet avec un verrou
      const wallet = await entityManager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet introuvable');
      }

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
    });
  }

  /**
   * Débiter un wallet (retrait)
   */
  async debitWallet(
    userId: string,
    montant: number,
    description: string,
    metadata?: any,
  ): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    if (montant <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0');
    }
    if (montant > 10_000_000) throw new BadRequestException('Montant dépasse le plafond autorisé (10 000 000 XOF)');

    return await this.dataSource.transaction(async (entityManager) => {
      const wallet = await entityManager.findOne(Wallet, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet introuvable');
      }

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
    });
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
}
