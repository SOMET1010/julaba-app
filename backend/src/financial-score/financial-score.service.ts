import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type FinancialScoreNiveau =
  | 'Excellent'
  | 'Bon'
  | 'Moyen'
  | 'Faible'
  | 'Insuffisant';

export interface FinancialDimension {
  score: number;
  details: string;
}

export interface FinancialScoreResult {
  userId: string;
  scoreTotal: number;
  niveau: FinancialScoreNiveau;
  recommandation: string;
  montantEligible: number;
  dimensions: {
    regularite: FinancialDimension;
    volume: FinancialDimension;
    equilibre: FinancialDimension;
    croissance: FinancialDimension;
    wallet: FinancialDimension;
    anciennete: FinancialDimension;
    diversification: FinancialDimension;
  };
  calculéLe: string;
}

const ADMIN_SCORE_ROLES = new Set(['super_admin', 'admin']);

@Injectable()
export class FinancialScoreService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  static isAdminRole(role: string | undefined): boolean {
    if (!role) return false;
    return ADMIN_SCORE_ROLES.has(role);
  }

  async computeForUser(userId: string): Promise<FinancialScoreResult> {
    const [userRow] = await this.dataSource.query(
      `SELECT id, role, created_at FROM users WHERE id = $1 LIMIT 1`,
      [userId],
    ) as [Record<string, unknown> | undefined];

    if (!userRow?.id) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const roleUser = String(userRow.role ?? '');
    const ROLES_SCORES_AUTORISES = ['marchand', 'producteur', 'cooperateur'];
    if (!ROLES_SCORES_AUTORISES.includes(roleUser)) {
      throw new BadRequestException('Score financier disponible uniquement pour les acteurs terrain');
    }

    let sessionRow: Array<{ cnt: string }>;
    let volumeRow: Array<{ total: string }>;
    let equilibreRow: Array<{ ventes: string; depenses: string }>;
    let croissanceRow: Array<{ ca_current: string; ca_prev: string }>;
    let walletRow: Array<{ solde: string }>;
    let fluxPositifRow: Array<{ flux_pos: string }>;
    let diversificationRow: Array<{ n: string }>;
    try {
      [
        sessionRow,
        volumeRow,
        equilibreRow,
        croissanceRow,
        walletRow,
        fluxPositifRow,
        diversificationRow,
      ] = await Promise.all([
        this.dataSource.query(
          `SELECT COUNT(*)::text AS cnt
           FROM caisse_sessions
           WHERE marchand_id = $1
             AND date >= (NOW() - INTERVAL '30 days')`,
          [userId],
        ) as Promise<Array<{ cnt: string }>>,
        this.dataSource.query(
          `SELECT COALESCE(SUM(montant), 0)::text AS total
           FROM caisse_transactions
           WHERE user_id = $1
             AND type = 'vente'
             AND created_at >= (NOW() - INTERVAL '90 days')`,
          [userId],
        ) as Promise<Array<{ total: string }>>,
        this.dataSource.query(
          `SELECT
             COALESCE(SUM(montant) FILTER (WHERE type = 'vente'), 0)::text AS ventes,
             COALESCE(SUM(montant) FILTER (WHERE type = 'depense'), 0)::text AS depenses
           FROM caisse_transactions
           WHERE user_id = $1
             AND created_at >= (NOW() - INTERVAL '30 days')`,
          [userId],
        ) as Promise<Array<{ ventes: string; depenses: string }>>,
        this.dataSource.query(
          `SELECT
             COALESCE(SUM(montant) FILTER (
               WHERE created_at >= date_trunc('month', NOW())
                 AND created_at < date_trunc('month', NOW()) + INTERVAL '1 month'
             ), 0)::text AS ca_current,
             COALESCE(SUM(montant) FILTER (
               WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '1 month'
                 AND created_at < date_trunc('month', NOW())
             ), 0)::text AS ca_prev
           FROM caisse_transactions
           WHERE user_id = $1 AND type = 'vente'`,
          [userId],
        ) as Promise<Array<{ ca_current: string; ca_prev: string }>>,
        this.dataSource.query(
          `SELECT COALESCE(solde, 0)::text AS solde
           FROM wallets
           WHERE user_id = $1
           LIMIT 1`,
          [userId],
        ) as Promise<Array<{ solde: string }>>,
        this.dataSource.query(
          `SELECT COALESCE(SUM(wt.montant), 0)::text AS flux_pos
           FROM wallet_transactions wt
           WHERE wt.user_id = $1
             AND wt.type = 'credit'
             AND wt.montant > 0
             AND wt.created_at >= (NOW() - INTERVAL '90 days')`,
          [userId],
        ) as Promise<Array<{ flux_pos: string }>>,
        this.dataSource.query(
          `SELECT COUNT(DISTINCT NULLIF(TRIM(produit), ''))::text AS n
           FROM caisse_transactions
           WHERE user_id = $1 AND type = 'vente'`,
          [userId],
        ) as Promise<Array<{ n: string }>>,
      ]);
    } catch (e: any) {
      throw new InternalServerErrorException(`Erreur calcul score financier: ${e.message}`);
    }

    const nbSessions = parseInt(sessionRow[0]?.cnt ?? '0', 10) || 0;
    const denomSessions = 22;
    const regularite = Math.min((nbSessions / denomSessions) * 100, 100);
    const regulariteDetails = `${nbSessions} session(s) caisse sur les 30 derniers jours (référence 22 jours ouvrés).`;

    const totalVentes90j = parseFloat(volumeRow[0]?.total ?? '0') || 0;
    const caMoyenMensuel = totalVentes90j / 3;
    const denomVolume = 500_000;
    const volume = Math.min((caMoyenMensuel / denomVolume) * 100, 100);
    const volumeDetails = `CA moyen mensuel (3 mois glissants) : ${Math.round(caMoyenMensuel).toLocaleString('fr-FR')} FCFA.`;

    const ventes30 = parseFloat(equilibreRow[0]?.ventes ?? '0') || 0;
    const depenses30 = parseFloat(equilibreRow[0]?.depenses ?? '0') || 0;
    const denomEquilibre = ventes30 + depenses30;
    let equilibre = 0;
    if (denomEquilibre > 0) {
      equilibre = (ventes30 / denomEquilibre) * 100;
    } else {
      equilibre = 50;
    }
    const equilibreDetails =
      denomEquilibre > 0
        ? `Ratio ventes / (ventes + dépenses) sur 30 j : ${(ventes30 / denomEquilibre * 100).toFixed(1)} %.`
        : `Aucune vente ni dépense sur 30 j - score neutre (50).`;

    const caCurrent = parseFloat(croissanceRow[0]?.ca_current ?? '0') || 0;
    const caPrev = parseFloat(croissanceRow[0]?.ca_prev ?? '0') || 0;
    let growthRate = 0;
    if (caPrev > 0) {
      growthRate = (caCurrent - caPrev) / caPrev;
    } else if (caCurrent > 0) {
      growthRate = 1;
    }
    const growthDenom = 0.2;
    const nearZeroGrowth = Math.abs(growthRate) < 1e-9;
    let croissance = 50;
    if (!nearZeroGrowth && growthRate > 0) {
      croissance = Math.min((growthRate / growthDenom) * 100, 100);
    } else if (!nearZeroGrowth && growthRate < 0) {
      croissance = Math.max(0, 50 + (growthRate / growthDenom) * 50);
    }
    const croissanceDetails = `CA ventes mois en cours vs mois précédent : ${Math.round(caCurrent).toLocaleString('fr-FR')} FCFA vs ${Math.round(caPrev).toLocaleString('fr-FR')} FCFA (variation ${(growthRate * 100).toFixed(1)} %).`;

    const solde = parseFloat(walletRow[0]?.solde ?? '0') || 0;
    const fluxPos = parseFloat(fluxPositifRow[0]?.flux_pos ?? '0') || 0;
    const denomWallet = 50_000;
    const wallet = Math.min((solde / denomWallet) * 100, 100);
    const walletDetails = `Solde wallet : ${Math.round(solde).toLocaleString('fr-FR')} FCFA ; crédits 90 j : ${Math.round(fluxPos).toLocaleString('fr-FR')} FCFA.`;

    const createdAt = userRow.created_at
      ? new Date(String(userRow.created_at))
      : new Date();
    const nbJours = Math.max(
      0,
      Math.floor((Date.now() - createdAt.getTime()) / 86_400_000),
    );
    const denomAnciennete = 365;
    const anciennete = Math.min((nbJours / denomAnciennete) * 100, 100);
    const ancienneteDetails = `Compte créé il y a ${nbJours} jour(s).`;

    const nbProduits = parseInt(diversificationRow[0]?.n ?? '0', 10) || 0;
    const denomDiv = 10;
    const diversification = Math.min((nbProduits / denomDiv) * 100, 100);
    const diversificationDetails = `${nbProduits} produit(s) distinct(s) vendus (historique ventes).`;

    const score0to100 =
      regularite * 0.25 +
      volume * 0.2 +
      equilibre * 0.15 +
      croissance * 0.15 +
      wallet * 0.15 +
      anciennete * 0.05 +
      diversification * 0.05;

    const scoreTotal = Math.round(score0to100 * 10);

    const { niveau, recommandation, montantEligible } =
      this.mapNiveau(scoreTotal);

    return {
      userId,
      scoreTotal,
      niveau,
      recommandation,
      montantEligible,
      dimensions: {
        regularite: { score: Math.round(regularite * 10) / 10, details: regulariteDetails },
        volume: { score: Math.round(volume * 10) / 10, details: volumeDetails },
        equilibre: { score: Math.round(equilibre * 10) / 10, details: equilibreDetails },
        croissance: { score: Math.round(croissance * 10) / 10, details: croissanceDetails },
        wallet: { score: Math.round(wallet * 10) / 10, details: walletDetails },
        anciennete: { score: Math.round(anciennete * 10) / 10, details: ancienneteDetails },
        diversification: {
          score: Math.round(diversification * 10) / 10,
          details: diversificationDetails,
        },
      },
      calculéLe: new Date().toISOString(),
    };
  }

  private mapNiveau(scoreTotal: number): {
    niveau: FinancialScoreNiveau;
    recommandation: string;
    montantEligible: number;
  } {
    if (scoreTotal >= 800) {
      return {
        niveau: 'Excellent',
        recommandation:
          'Profil solide : crédit sans garantie envisageable dans la limite indiquée, sous validation interne.',
        montantEligible: 500_000,
      };
    }
    if (scoreTotal >= 600) {
      return {
        niveau: 'Bon',
        recommandation:
          'Profil correct : crédit avec légère garantie possible après analyse des pièces justificatives.',
        montantEligible: 200_000,
      };
    }
    if (scoreTotal >= 400) {
      return {
        niveau: 'Moyen',
        recommandation:
          'Éligible à une microfinance supervisée ; montants modérés et suivi renforcé recommandés.',
        montantEligible: 50_000,
      };
    }
    if (scoreTotal >= 200) {
      return {
        niveau: 'Faible',
        recommandation:
          "Priorité à la formation et à l'accompagnement avant tout déblocage de crédit.",
        montantEligible: 0,
      };
    }
    return {
      niveau: 'Insuffisant',
      recommandation:
        'Historique insuffisant ou fragile : pas encore éligible au crédit Keiwa.',
      montantEligible: 0,
    };
  }
}
