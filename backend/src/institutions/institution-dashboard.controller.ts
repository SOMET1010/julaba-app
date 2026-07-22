import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { WalletTransaction } from '../wallets/entities/wallet-transaction.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('institution', 'super_admin', 'admin_general')
@Controller('institution')
export class InstitutionDashboardController {
  private readonly logger = new Logger(InstitutionDashboardController.name);

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(WalletTransaction)
    private txRepo: Repository<WalletTransaction>,
  ) {}

  @Get('dashboard')
  async getDashboard(@CurrentUser() user: User) {
    try {
      const acteurRoles = ['marchand', 'producteur', 'cooperateur', 'identificateur'];
      const isInstitution = user.role === 'institution';
      const users = await this.usersRepo.find({
        where: isInstitution
          ? ({ role: In(acteurRoles) } as any)
          : undefined,
        take: 5000,
        order: { createdAt: 'DESC' } as any,
      });
      if (isInstitution) {
        this.logger.warn('[DASHBOARD] Filtrage par institution_id indisponible (colonne absente/non mappée), fallback sur acteurs globaux');
      }
      const acteurIds = users.map((u) => u.id);
      const transactions = await this.txRepo.find({
        where: isInstitution
          ? ({ userId: In(acteurIds) } as any)
          : undefined,
        take: 10000,
        order: { createdAt: 'DESC' },
      });

      const today = new Date().toISOString().slice(0, 10);
      const now = new Date();

      const acteurs = users.filter(u => acteurRoles.includes(u.role as string));

      const totalActeurs     = acteurs.length;
      const acteursActifs    = acteurs.filter(u => (u as any).status === 'actif' || (u as any).validated === true).length;
      const acteursSuspendus = acteurs.filter(u => (u as any).status === 'suspendu').length;
      const tauxActivite     = totalActeurs > 0 ? Math.round((acteursActifs / totalActeurs) * 100) : 0;

      const nouveauxCeMois = acteurs.filter(u => {
        const d = new Date(u.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      const pctInclusionCNPS = totalActeurs > 0
        ? Math.round((acteurs.filter(u => Boolean((u as any).cnps)).length / totalActeurs) * 100) : 0;
      const pctInclusionCNAM = totalActeurs > 0
        ? Math.round((acteurs.filter(u => Boolean((u as any).cnam)).length / totalActeurs) * 100) : 0;

      const volumeTransactions = transactions.length;
      const valeurMonetaire    = transactions.reduce((s, t) => s + Number(t.montant || 0), 0);
      const valeurMoyenne      = volumeTransactions > 0 ? Math.round(valeurMonetaire / volumeTransactions) : 0;

      const txDigitales    = transactions.filter(t => t.type !== 'credit').length;
      const pctDigitalisation = volumeTransactions > 0
        ? Math.round((txDigitales / volumeTransactions) * 100) : 0;

      // resumeJour
      const nouveauxInscrits = acteurs.filter(u =>
        new Date(u.createdAt).toISOString().slice(0, 10) === today
      ).length;
      const dossiersValides = acteurs.filter(u =>
        new Date(u.createdAt).toISOString().slice(0, 10) === today &&
        ((u as any).status === 'actif' || (u as any).validated === true)
      ).length;
      const dossiersRejetes = acteurs.filter(u =>
        new Date(u.createdAt).toISOString().slice(0, 10) === today &&
        (u as any).status === 'rejete'
      ).length;
      const transactionsDuJour = transactions.filter(t =>
        new Date(t.createdAt).toISOString().slice(0, 10) === today
      ).length;

      // dataRepartition
      const dataRepartition = [
        { name: 'Marchands',       value: acteurs.filter(u => u.role === 'marchand').length,       color: '#C66A2C' },
        { name: 'Producteurs',     value: acteurs.filter(u => u.role === 'producteur').length,     color: '#2E8B57' },
        { name: 'Coopératives',    value: acteurs.filter(u => u.role === 'cooperateur').length,    color: '#2072AF' },
        { name: 'Identificateurs', value: acteurs.filter(u => u.role === 'identificateur').length, color: '#9F8170' },
      ];

      // byRole pour Analytics
      const byRole = acteurRoles.map(role => ({
        role,
        count: acteurs.filter(u => u.role === role).length,
      }));

      return {
        macroKPIs: {
          totalActeurs, acteursActifs, acteursSuspendus,
          volumeTransactions, valeurMonetaire,
          valeurMonetaireFormatted: Math.round((valeurMonetaire / 1_000_000_000) * 100) / 100,
          valeurMoyenne, pctDigitalisation,
          pctInclusionCNPS, pctInclusionCNAM,
          tauxActivite, nouveauxCeMois,
          croissanceMensuelle: 0,
        },
        resumeJour: {
          nouveauxInscrits, dossiersValides, dossiersRejetes,
          transactionsDuJour, alertesCritiquesActives: 0,
        },
        dataRepartition,
        byRole,
        total_users: totalActeurs,
        validated_users: acteursActifs,
        conversion_rate: tauxActivite,
      };
    } catch (e: any) {
      this.logger.error(`[DASHBOARD] Erreur: ${e?.message}`, e?.stack);
      return {
        macroKPIs: {
          totalActeurs: 0, acteursActifs: 0, acteursSuspendus: 0,
          volumeTransactions: 0, valeurMonetaire: 0, valeurMonetaireFormatted: 0,
          valeurMoyenne: 0, pctDigitalisation: 0,
          pctInclusionCNPS: 0, pctInclusionCNAM: 0,
          tauxActivite: 0, nouveauxCeMois: 0, croissanceMensuelle: 0,
        },
        resumeJour: {
          nouveauxInscrits: 0, dossiersValides: 0, dossiersRejetes: 0,
          transactionsDuJour: 0, alertesCritiquesActives: 0,
        },
        dataRepartition: [],
        byRole: [],
        total_users: 0, validated_users: 0, conversion_rate: 0,
      };
    }
  }

  @Get('acteurs')
  async getActeurs(@CurrentUser() user: User) {
    try {
      const acteurRoles = ['marchand', 'producteur', 'cooperateur', 'identificateur'];
      const isInstitution = user.role === 'institution';
      const users = await this.usersRepo.find({
        where: isInstitution
          ? ({ role: In(acteurRoles) } as any)
          : undefined,
        take: 5000,
        order: { createdAt: 'DESC' } as any,
      });
      const data = users.map((u: any) => ({
        id: u.id,
        nom: u.lastName || u.last_name || '',
        prenoms: u.firstName || u.first_name || '',
        telephone: u.phone || '',
        region: u.region || '',
        commune: u.commune || '',
        statut: u.status === 'actif' || u.validated === true ? 'actif' : (u.status === 'suspendu' ? 'suspendu' : (u.status || 'actif')),
        type: u.role,
        activite: u.activity || '',
        dateCreation: u.createdAt || '',
        activiteRecente: u.lastLoginAt || u.last_login_at || u.createdAt || '',
      }));
      return { data, total: data.length };
    } catch (e: any) {
      this.logger.error('[ACTEURS] Erreur: ' + e?.message, e?.stack);
      return { data: [], total: 0 };
    }
  }

  @Get('transactions')
  async getTransactions(@CurrentUser() user: User) {
    try {
      const acteurRoles = ['marchand', 'producteur', 'cooperateur', 'identificateur'];
      const isInstitution = user.role === 'institution';
      const users = await this.usersRepo.find({
        where: isInstitution
          ? ({ role: In(acteurRoles) } as any)
          : undefined,
        take: 5000,
      });
      const userMap = new Map(users.map((u: any) => [u.id, u]));
      const acteurIds = users.map((u) => u.id);
      const transactions = await this.txRepo.find({
        where: isInstitution
          ? ({ userId: In(acteurIds) } as any)
          : undefined,
        take: 10000,
        order: { createdAt: 'DESC' },
      });
      const data = transactions.map((t: any) => {
        const u: any = userMap.get(t.userId) || {};
        const statutMap = t.statut === 'completed' ? 'validee' : (t.statut === 'cancelled' ? 'annulee' : (t.statut || 'validee'));
        const firstName = u.firstName || u.first_name || '';
        const lastName = u.lastName || u.last_name || '';
        return {
          id: t.id,
          acteurNom: (firstName + ' ' + lastName).trim() || '-',
          acteurType: u.role || 'marchand',
          telephone: u.phone || '-',
          commune: u.commune || '-',
          region: u.region || '-',
          montant: Number(t.montant || 0),
          statut: statutMap,
          type: t.type || '',
          produit: t.description || '',
          date: t.createdAt,
          created_at: t.createdAt,
        };
      });
      return { data, total: data.length };
    } catch (e: any) {
      this.logger.error('[TRANSACTIONS] Erreur: ' + e?.message, e?.stack);
      return { data: [], total: 0 };
    }
  }
}
