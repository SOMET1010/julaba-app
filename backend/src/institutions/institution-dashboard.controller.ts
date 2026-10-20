import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CaisseTransaction } from '../caisse-rest/caisse-transaction.entity';
import { bilanVentesDeCaisse, conditionVenteRetenue, montantLisible } from '../commun/vente-de-caisse';
import { InstitutionScopeGuard, InstitutionScope } from './guards/institution-scope.guard';
import { RequireInstitutionModule } from './decorators/institution-required-module.decorator';
import { CurrentInstitutionScope } from './decorators/institution-scope.decorator';

const ACTEUR_ROLES = ['marchand', 'producteur', 'cooperateur', 'identificateur'];

/** Indicateurs sur les acteurs du perimetre (aucun argent ici). */
function indicateursActeurs(acteurs: User[], now: Date) {
  const pct = (n: number) => (acteurs.length > 0 ? Math.round((n / acteurs.length) * 100) : 0);
  const estActif = (u: any) => u.status === 'actif' || u.validated === true;
  const parRole = (role: string) => acteurs.filter(u => u.role === role).length;
  const today = now.toISOString().slice(0, 10);
  const creesAujourdhui = acteurs.filter(u => new Date(u.createdAt).toISOString().slice(0, 10) === today);
  const acteursActifs = acteurs.filter(estActif).length;
  return {
    macroActeurs: {
      totalActeurs: acteurs.length,
      acteursActifs,
      acteursSuspendus: acteurs.filter(u => (u as any).status === 'suspendu').length,
      tauxActivite: pct(acteursActifs),
      nouveauxCeMois: acteurs.filter(u => {
        const d = new Date(u.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      pctInclusionCNPS: pct(acteurs.filter(u => Boolean((u as any).cnps)).length),
      pctInclusionCNAM: pct(acteurs.filter(u => Boolean((u as any).cnam)).length),
    },
    resumeActeurs: {
      nouveauxInscrits: creesAujourdhui.length,
      dossiersValides: creesAujourdhui.filter(estActif).length,
      dossiersRejetes: creesAujourdhui.filter(u => (u as any).status === 'rejete').length,
    },
    dataRepartition: [
      { name: 'Marchands',       value: parRole('marchand'),       color: '#C66A2C' },
      { name: 'Producteurs',     value: parRole('producteur'),     color: '#2E8B57' },
      { name: 'Coopératives',    value: parRole('cooperateur'),    color: '#2072AF' },
      { name: 'Identificateurs', value: parRole('identificateur'), color: '#9F8170' },
    ],
    byRole: ACTEUR_ROLES.map(role => ({ role, count: parRole(role) })),
  };
}

// Isolement inter-institutions (correctif audit securite/vie privee) :
// InstitutionScopeGuard resout, pour le role `institution` uniquement, le
// perimetre reel du compte (zone) et le pose sur la requete en
// `institutionScope`. Chaque endpoint filtre EXPLICITEMENT ses requetes SQL
// par cette zone -- jamais de fallback silencieux sur les donnees globales.
// super_admin / admin_general restent non scopes (vue plateforme complete).
//
// « TRANSACTIONS » ET « VOLUME » = LES VENTES DE CAISSE des acteurs du
// perimetre (definition unique : commun/vente-de-caisse.ts). Ce controleur
// lisait le portefeuille Keiwa, hors pilote. Une erreur de lecture sort en
// erreur (5xx) : elle rendait des zeros, indiscernables d'une zone sans vente.
@UseGuards(JwtAuthGuard, RolesGuard, InstitutionScopeGuard)
@Roles('institution', 'super_admin', 'admin_general')
@Controller('institution')
export class InstitutionDashboardController {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(CaisseTransaction)
    private ventesRepo: Repository<CaisseTransaction>,
  ) {}

  private acteursDuPerimetre(user: User, scope?: InstitutionScope): Promise<User[]> {
    return this.usersRepo.find({
      where: user.role === 'institution'
        ? ({ role: In(ACTEUR_ROLES), zoneId: scope!.zoneId } as any)
        : undefined,
      take: 5000,
      order: { createdAt: 'DESC' } as any,
    });
  }

  /** Lignes de caisse des acteurs du perimetre (filtre de vente a ajouter). */
  private caisseDuPerimetre(user: User, scope?: InstitutionScope): SelectQueryBuilder<CaisseTransaction> {
    const qb = this.ventesRepo.createQueryBuilder('t')
      .leftJoin('users', 'u', 'u.id::text = t.user_id');
    if (user.role === 'institution') {
      qb.where('u.zone_id = :zoneId AND u.role IN (:...roles)', { zoneId: scope!.zoneId, roles: ACTEUR_ROLES });
    }
    return qb;
  }

  @Get('dashboard')
  @RequireInstitutionModule('dashboard')
  async getDashboard(@CurrentUser() user: User, @CurrentInstitutionScope() scope?: InstitutionScope) {
    const acteurs = (await this.acteursDuPerimetre(user, scope))
      .filter(u => ACTEUR_ROLES.includes(u.role as string));
    const caisse = this.caisseDuPerimetre(user, scope);
    const now = new Date();
    const debutMois = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const debutMoisPrecedent = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const [ventes, ventesDuJour, ventesDuMois, ventesMoisPrecedent] = await Promise.all([
      bilanVentesDeCaisse(caisse, 't'),
      bilanVentesDeCaisse(caisse.clone().andWhere("t.created_at >= date_trunc('day', now())"), 't'),
      bilanVentesDeCaisse(caisse.clone().andWhere('t.created_at >= :debut', { debut: debutMois }), 't'),
      bilanVentesDeCaisse(caisse.clone().andWhere('t.created_at >= :debutP AND t.created_at < :finP',
        { debutP: debutMoisPrecedent, finP: debutMois }), 't'),
    ]);

    const { macroActeurs, resumeActeurs, dataRepartition, byRole } = indicateursActeurs(acteurs, now);

    const volumeTransactions = ventes.nombre_ventes;
    const valeurMonetaire    = ventes.volume_ventes;
    const valeurMoyenne      = valeurMonetaire === null ? null
      : (volumeTransactions > 0 ? Math.round(valeurMonetaire / volumeTransactions) : 0);
    // Croissance du volume des ventes, mois courant contre mois precedent.
    // Sans base de comparaison (mois precedent vide ou illisible), on ne
    // l'invente pas : `null`. Elle valait 0 en dur.
    const croissanceMensuelle =
      ventesDuMois.volume_ventes !== null && ventesMoisPrecedent.volume_ventes
        ? Math.round(((ventesDuMois.volume_ventes - ventesMoisPrecedent.volume_ventes)
            / ventesMoisPrecedent.volume_ventes) * 100)
        : null;

    return {
      macroKPIs: {
        ...macroActeurs,
        volumeTransactions, valeurMonetaire,
        // Plus de valeur « formatée » en milliards arrondis à 0,01 :
        // 2 500 000 F y valaient 0. Le front affiche valeurMonetaire en FCFA.
        montantsIllisibles: ventes.montants_illisibles,
        valeurMoyenne,
        // La part « digitale » se lisait sur le portefeuille Keiwa (hors
        // pilote). Le pilote encaisse en especes : rien a mesurer ici.
        pctDigitalisation: null,
        croissanceMensuelle,
      },
      resumeJour: {
        ...resumeActeurs,
        transactionsDuJour: ventesDuJour.nombre_ventes, alertesCritiquesActives: 0,
      },
      dataRepartition,
      byRole,
      total_users: macroActeurs.totalActeurs,
      validated_users: macroActeurs.acteursActifs,
      conversion_rate: macroActeurs.tauxActivite,
    };
  }

  // DGE-03 — L'ANALYTIQUE DE L'ESPACE INSTITUTION, SUR DES ROUTES À LUI.
  // Le contexte institution appelait /admin/analytics/{roles,produits,
  // graphique,alertes} et /admin/config : N'EXISTENT PAS (404), et même si
  // elles existaient, @Roles('ADMIN') exclut le rôle institution → 403 —
  // l'écran DashboardAnalytics rendait des zéros silencieux (audit DGE 20/10).
  // Une seule route scopée par le périmètre (InstitutionScopeGuard, même
  // fail-closed que le reste), définition unique des « ventes » =
  // conditionVenteRetenue. Rien n'est inventé : chaque série vient d'une
  // requête réelle, une journée sans vente vaut zéro.
  @Get('analytics')
  @RequireInstitutionModule('dashboard')
  async getAnalytics(@CurrentUser() user: User, @CurrentInstitutionScope() scope?: InstitutionScope) {
    const acteurs = (await this.acteursDuPerimetre(user, scope))
      .filter(u => ACTEUR_ROLES.includes(u.role as string));

    // Répartition réelle par rôle (même source que le dashboard) : total,
    // actifs et nouveaux du mois sont des COMPTES réels sur les acteurs du
    // périmètre — jamais des zéros décoratifs.
    const estActif = (u: any) => u.status === 'actif' || (u as any).validated === true;
    const dansLeMois = (u: User) => {
      const d = new Date(u.createdAt);
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    };
    const roles = ACTEUR_ROLES.map((role) => {
      const duRole = acteurs.filter(u => u.role === role);
      return {
        role,
        count: duRole.length,
        actifs: duRole.filter(estActif).length,
        nouveauxCeMois: duRole.filter(dansLeMois).length,
      };
    });

    // Inscriptions réelles par jour — 7 derniers jours du périmètre (le filtre
    // vit dans le JOIN pour que les jours sans inscription restent à zéro).
    const paramsInsc: unknown[] = [];
    let filtreInsc = '';
    if (user.role === 'institution') {
      filtreInsc = 'AND u.zone_id::text = $1 AND u.role::text = ANY($2::text[])';
      paramsInsc.push(String(scope!.zoneId), ACTEUR_ROLES);
    }
    const inscriptionsParJour = await this.ventesRepo.query(
      `SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS jour, COUNT(u.id)::int AS inscriptions
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
         LEFT JOIN users u ON u.created_at::date = d.day::date ${filtreInsc}
        GROUP BY d.day ORDER BY d.day`,
      paramsInsc,
    );

    // Ventes de caisse par jour — la définition unique (conditionVenteRetenue),
    // périmètre appliqué sur les lignes EXISTANTES seulement (t.id IS NULL
    // garde les jours vides).
    const paramsVentes: unknown[] = [];
    let filtreVentes = '';
    if (user.role === 'institution') {
      filtreVentes = 'AND (u.zone_id::text = $1 AND u.role::text = ANY($2::text[]))';
      paramsVentes.push(String(scope!.zoneId), ACTEUR_ROLES);
    }
    const graphique = await this.ventesRepo.query(
      `SELECT TO_CHAR(d.day, 'YYYY-MM-DD') AS jour,
              COUNT(t.id) FILTER (WHERE t.type = 'vente' AND t.statut <> 'annulee')::int AS transactions,
              COALESCE(SUM(t.montant) FILTER (WHERE t.type = 'vente' AND t.statut <> 'annulee'), 0)::float AS volume
         FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
         LEFT JOIN caisse_transactions t ON t.created_at::date = d.day::date
         LEFT JOIN users u ON u.id::text = t.user_id::text
        WHERE t.id IS NULL OR (TRUE ${filtreVentes})
        GROUP BY d.day ORDER BY d.day`,
      paramsVentes,
    );

    // Top produits réels : les commandes du périmètre (hors annulée/litige).
    const paramsProd: unknown[] = [];
    let filtreProd = '';
    if (user.role === 'institution') {
      filtreProd = 'AND u.zone_id::text = $1';
      paramsProd.push(String(scope!.zoneId));
    }
    const produits = await this.ventesRepo.query(
      `SELECT c.produit AS nom, COUNT(*)::int AS commandes, COALESCE(SUM(c.total), 0)::float AS volume
         FROM commandes c
         JOIN users u ON u.id::text = c.vendeur_id::text
        WHERE c.statut NOT IN ('annulee', 'litige') ${filtreProd}
        GROUP BY c.produit ORDER BY volume DESC LIMIT 5`,
      paramsProd,
    );

    // Alertes réelles du périmètre — rien de simulé.
    const alertes: Array<{ niveau: string; message: string }> = [];
    const suspendus = acteurs.filter(u => (u as any).status === 'suspendu').length;
    if (suspendus > 0) {
      alertes.push({ niveau: 'info', message: `${suspendus} acteur(s) suspendu(s) dans votre périmètre` });
    }
    const epuises = await this.ventesRepo.query(
      `SELECT COUNT(*)::int AS n
         FROM publications p
         JOIN users u ON u.id::text = p.user_id::text
        WHERE p.statut = 'epuise' ${filtreProd}`,
      paramsProd,
    );
    const nEpuises = Number(epuises[0]?.n) || 0;
    if (nEpuises > 0) {
      alertes.push({ niveau: 'info', message: `${nEpuises} publication(s) épuisée(s) dans votre périmètre` });
    }

    return { roles, produits, graphique, inscriptionsParJour, alertes };
  }

  @Get('acteurs')
  @RequireInstitutionModule('acteurs')
  async getActeurs(@CurrentUser() user: User, @CurrentInstitutionScope() scope?: InstitutionScope) {
    const users = await this.acteursDuPerimetre(user, scope);
    const data = users.map((u: any) => ({
      id: u.id,
      nom: u.lastName || '',
      prenoms: u.firstName || '',
      telephone: u.phone || '',
      region: u.region || '',
      commune: u.commune || '',
      statut: u.status === 'actif' || u.validated === true ? 'actif' : (u.status === 'suspendu' ? 'suspendu' : (u.status || 'actif')),
      type: u.role,
      activite: u.activity || '',
      dateCreation: u.createdAt || '',
      activiteRecente: u.lastLoginAt || u.createdAt || '',
    }));
    return { data, total: data.length };
  }

  @Get('transactions')
  @RequireInstitutionModule('transactions')
  async getTransactions(@CurrentUser() user: User, @CurrentInstitutionScope() scope?: InstitutionScope) {
    const lignes = await this.caisseDuPerimetre(user, scope)
      .andWhere(conditionVenteRetenue('t'))
      .select(['t.id AS id', 't.montant AS montant', 't.statut AS statut', 't.type AS type',
        't.produit AS produit', 't.description AS description', 't.created_at AS created_at',
        'u.first_name AS first_name', 'u.last_name AS last_name', 'u.role AS role',
        'u.phone AS phone', 'u.commune AS commune', 'u.region AS region'])
      .orderBy('t.created_at', 'DESC')
      .limit(10000)
      .getRawMany();
    const data = lignes.map((t: any) => ({
      id: t.id,
      acteurNom: `${t.first_name || ''} ${t.last_name || ''}`.trim() || '-',
      acteurType: t.role || '-',
      telephone: t.phone || '-',
      commune: t.commune || '-',
      region: t.region || '-',
      // Illisible => null, jamais 0 (ACC-03).
      montant: montantLisible(t.montant),
      statut: t.statut,
      type: t.type,
      produit: t.produit || t.description || '',
      date: t.created_at,
      created_at: t.created_at,
    }));
    return { data, total: data.length };
  }
}
