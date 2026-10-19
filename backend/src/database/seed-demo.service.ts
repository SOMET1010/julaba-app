import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';

// ─────────────────────────────────────────────────────────────────────────────
// Comptes de démonstration prêts à l'emploi.
//
// Le serveur V2 est indépendant : sa base démarre vide, donc aucune équipe ne
// peut se connecter. Ce service crée, au démarrage, quelques comptes marchands
// avec un mot de passe connu (à distribuer aux testeurs) + un jeu de données
// d'exemple pour l'un d'eux, afin que l'appli s'affiche déjà « peuplée ».
//
// Sécurité : actif par défaut en dev/test (turnkey), mais DÉSACTIVÉ D'OFFICE en
// production (NODE_ENV=production) sauf opt-in explicite SEED_DEMO="true" — un
// serveur de démo assume ce choix dans sa config, un serveur réel ne peut pas
// hériter des comptes de démo par oubli. SEED_DEMO=false le coupe partout.
// Idempotent : ne recrée jamais un compte ou des données déjà présents.
// ─────────────────────────────────────────────────────────────────────────────

interface CompteDemo {
  phone: string;
  firstName: string;
  lastName: string;
  genre: 'femme' | 'homme';
  role: UserRole;
  // Code de connexion. Rôles « acteur » = pavé à 4 chiffres -> ACTEUR_PASSWORD.
  // Rôles back-office = écran /backoffice/login (champ texte) -> BO_PASSWORD.
  // Exception 46-h : les rôles BO « terrain » (gestionnaire_zone,
  // operateur_terrain) portent motDePasseActeur=true — voir COMPTES.
  password: string;
  avecDonnees?: boolean; // jeu de données caisse (marchand uniquement)
  email?: string;        // back-office : connexion par email
  sousProfilMarchand?: string; // marchand : grossiste | demi_grossiste | detaillant
  cooperativeName?: string;
  // 46-h : utilise le mot de passe ACTEURS (publié, « 1234 ») au lieu du
  // secret BO. Réservé aux rôles BO SANS pouvoir d'administration ni d'argent.
  motDePasseActeur?: boolean;
  // Zone attribuée au compte (colonne users.zone_id) — gestionnaire_zone.
  zoneId?: string;
}

// Mot de passe unique pour TOUS les comptes acteurs de démo (connexion /login,
// pavé à 4 chiffres) : piloté par SEED_DEMO_PASSWORD, "1234" par défaut si la
// variable n'est pas fournie (même défaut que render.yaml). Un seul mot de
// passe pour tous les comptes acteurs évite qu'un testeur voie « Identifiants
// incorrects » sur un compte de démo parce qu'un autre groupe utilisait un
// code différent codé en dur.
const ACTEUR_PASSWORD = process.env.SEED_DEMO_PASSWORD || '1234';
/**
 * Mot de passe des comptes BACK-OFFICE de démo — désormais OBLIGATOIREMENT
 * fourni par l'environnement, et sans valeur par défaut.
 *
 * POURQUOI CE CHANGEMENT (17/09/2026). Il valait `'123456'`, écrit en dur, et
 * n'était piloté par AUCUNE variable : impossible à changer sans modifier le
 * code. Or ce dépôt est PUBLIC, et le seed crée des comptes ADMIN_GENERAL —
 * des administrateurs du back-office. Activer SEED_DEMO sur le serveur réel
 * revenait donc à y ouvrir un accès d'administration dont le mot de passe est
 * publié sur GitHub.
 *
 * Et le drapeau ne rattrape rien : le remettre à "false" ARRÊTE de créer, il
 * n'EFFACE pas. Les comptes seraient restés, avec ce mot de passe connu,
 * indéfiniment.
 *
 * Règle désormais : pas de variable → pas de compte back-office. Les comptes
 * acteurs (marchande, producteur…) sont seedés normalement ; seule
 * l'administration est refusée. Mieux vaut un jeu de démo incomplet qu'une
 * porte d'entrée publiée.
 */
export function motDePasseBackOffice(env: NodeJS.ProcessEnv = process.env): string | null {
  const valeur = (env.SEED_DEMO_BO_PASSWORD ?? '').trim();
  if (valeur.length === 0) return null;
  // Refus explicite de l'ancienne valeur publiée : si elle traîne encore dans
  // une configuration, elle ne doit pas revenir par la petite porte.
  if (valeur === '123456') return null;
  return valeur;
}

/** Rôles qui se connectent par /backoffice/login (liste alignée sur auth.service). */
const ROLES_BACK_OFFICE = new Set<string>([
  'super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain',
]);

/** Vrai si ce compte de démo est un compte d'administration. */
export function estCompteBackOffice(role: string): boolean {
  return ROLES_BACK_OFFICE.has(role);
}

const BO_PASSWORD = motDePasseBackOffice() ?? '';

// Un compte de démo par univers, pour que les équipes testent CHAQUE rôle.
// Acteurs (connexion sur /login, code à 4 chiffres = ACTEUR_PASSWORD) :

// Zone de démonstration du gestionnaire_zone (géographie du scénario : Hervé
// enrôle et Bénito récolte à Korhogo). UUID fixe = idempotence du seed.
const ZONE_DEMO_ID = 'dede0000-0000-4000-8000-000000000701';

const COMPTES: CompteDemo[] = [
  // ── Marchand (caisse) ──
  { phone: '+2250700000009', firstName: 'Awa', lastName: 'Koné', genre: 'femme', role: UserRole.MARCHAND, password: ACTEUR_PASSWORD, avecDonnees: true },
  { phone: '+2250700000010', firstName: 'Kouassi', lastName: 'Yao', genre: 'homme', role: UserRole.MARCHAND, password: ACTEUR_PASSWORD },
  { phone: '+2250700000011', firstName: 'Fatou', lastName: 'Traoré', genre: 'femme', role: UserRole.MARCHAND, password: ACTEUR_PASSWORD },
  // ── Producteur (récoltes / marché) ──
  { phone: '+2250700000012', firstName: 'Yao', lastName: 'Kouadio', genre: 'homme', role: UserRole.PRODUCTEUR, password: ACTEUR_PASSWORD },
  // ── Coopérateur (coopérative) ──
  { phone: '+2250700000013', firstName: 'Mariam', lastName: 'Diallo', genre: 'femme', role: UserRole.COOPERATEUR, password: ACTEUR_PASSWORD },
  // ── Identificateur (enrôlement) ──
  { phone: '+2250700000014', firstName: 'Ibrahim', lastName: 'Touré', genre: 'homme', role: UserRole.IDENTIFICATEUR, password: ACTEUR_PASSWORD },
  // ── Institution (supervision / analytics) ──
  { phone: '+2250700000015', firstName: 'Aïcha', lastName: 'Bamba', genre: 'femme', role: UserRole.INSTITUTION, password: ACTEUR_PASSWORD },
  // ── Back-office admin (connexion sur /backoffice/login, code à 6 chiffres = BO_PASSWORD) ──
  { phone: '+2250700000016', firstName: 'Admin', lastName: 'Julaba', genre: 'homme', role: UserRole.ADMIN_GENERAL, password: BO_PASSWORD },
  // ── Back-office « terrain » (46-h — OPERATEUR-11 / GESTZONE : aucun compte
  //    démo n'existait pour ces deux rôles, la recette runtime était bloquée).
  //    Ils se connectent par /backoffice/login mais n'ont AUCUN pouvoir
  //    d'administration ni d'argent (J5 tenu, fail-closed vérifié par les
  //    audits) : ils reçoivent le mot de passe ACTEURS publié (1234) comme les
  //    comptes terrain, via motDePasseActeur — l'administration (admin_general,
  //    super_admin) reste derrière SEED_DEMO_BO_PASSWORD.
  { phone: '+2250740404040', firstName: 'Sékou', lastName: 'Diomandé', genre: 'homme', role: UserRole.GESTIONNAIRE_ZONE, password: ACTEUR_PASSWORD, motDePasseActeur: true, zoneId: ZONE_DEMO_ID },
  { phone: '+2250780808080', firstName: 'Nadège', lastName: 'Gnamien', genre: 'femme', role: UserRole.OPERATEUR_TERRAIN, password: ACTEUR_PASSWORD, motDePasseActeur: true },

  // ─────────────────────────────────────────────────────────────────────────
  // Comptes de démonstration OFFICIELS (numéros distribués pour la présentation).
  // Mots de passe : acteurs = ACTEUR_PASSWORD (même code que les autres comptes
  // acteurs ci-dessus) · administration = BO_PASSWORD.
  // ─────────────────────────────────────────────────────────────────────────
  { phone: '+2250726262626', firstName: 'Michelle', lastName: 'Walebo', genre: 'femme', role: UserRole.MARCHAND, password: ACTEUR_PASSWORD, sousProfilMarchand: 'grossiste', avecDonnees: true },
  { phone: '+2250725252525', firstName: 'Adjoua', lastName: 'Kouamé', genre: 'femme', role: UserRole.MARCHAND, password: ACTEUR_PASSWORD, sousProfilMarchand: 'demi_grossiste', avecDonnees: true },
  { phone: '+2250790909090', firstName: 'Aya', lastName: 'Koffi', genre: 'femme', role: UserRole.MARCHAND, password: ACTEUR_PASSWORD, sousProfilMarchand: 'detaillant', avecDonnees: true },
  { phone: '+2250960606060', firstName: 'Bénito', lastName: 'Bomisso', genre: 'homme', role: UserRole.PRODUCTEUR, password: ACTEUR_PASSWORD },
  { phone: '+2250970707070', firstName: 'Coopérative', lastName: 'Daloa', genre: 'femme', role: UserRole.COOPERATEUR, password: ACTEUR_PASSWORD, cooperativeName: 'COOP-CACAO Daloa' },
  { phone: '+2250710101010', firstName: 'Hervé', lastName: 'Koffi', genre: 'homme', role: UserRole.IDENTIFICATEUR, password: ACTEUR_PASSWORD },
  // Administration (connexion back-office par EMAIL) :
  { phone: '+2250700000017', email: 'dge-test@julaba.ci', firstName: 'Direction', lastName: 'Générale', genre: 'homme', role: UserRole.ADMIN_GENERAL, password: BO_PASSWORD },
];

@Injectable()
export class SeedDemoService {
  private readonly logger = new Logger(SeedDemoService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  // Appelé APRÈS le bind du port (depuis main.ts), en arrière-plan. Le seed est
  // idempotent : s'il échoue, l'app reste debout et sert quand même.
  async runSeed(): Promise<void> {
    // Production : HARD-OFF sauf opt-in explicite SEED_DEMO="true". Les comptes
    // de démo (mots de passe publiés dans ce fichier) ne doivent jamais exister
    // sur un vrai serveur par simple oubli d'une variable d'environnement.
    if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') return;
    if (process.env.SEED_DEMO === 'false') return; // désactivable partout ailleurs

    // 46-h : convergence des bases de démo DÉJÀ peuplées. L'early-exit
    // ci-dessous court-circuite toute la boucle de création : les comptes BO
    // « terrain » ajoutés après coup n'apparaîtraient jamais sur un serveur de
    // démo existant (recette GZ/OT bloquée pour toujours — OPERATEUR-11,
    // GESTZONE). On garantit donc CES comptes-là avant l'early-exit (deux
    // findOne, quelques ms) ; tout le reste du seed, lui, ne rejoue pas.
    try {
      await this.assurerComptesTerrain(this.dataSource.getRepository(User));
    } catch {
      // Tables pas encore prêtes : le seed normal (plus bas) prendra le relais.
    }

    // Démarrage rapide : si le jeu de démo est DÉJÀ chargé (acteur en attente
    // « Awa Nénè », créé en fin de scénario), on ne rejoue RIEN. Rejouer le seed
    // à chaque redémarrage (bcrypt + dizaines de requêtes vers Paris) chargeait
    // inutilement l'instance après « live » et pouvait entretenir une boucle de
    // redémarrage. Une fois la base peuplée, le redémarrage devient quasi gratuit.
    try {
      const done = await this.dataSource.query(
        `SELECT 1 FROM users WHERE phone = $1 LIMIT 1`,
        ['+2250799999999'],
      );
      if (done && done.length > 0) {
        this.logger.log('Seed déjà présent en base — démarrage rapide (aucun rechargement).');
        return;
      }
    } catch {
      // Table users pas encore prête : on laisse le seed s'exécuter normalement.
    }

    const users = this.dataSource.getRepository(User);

    // Sans SEED_DEMO_BO_PASSWORD, les comptes d'ADMINISTRATION ne sont pas
    // créés du tout (voir motDePasseBackOffice). Les comptes acteurs, eux,
    // sont seedés normalement : on dégrade le jeu de démo, on n'ouvre pas une
    // porte.
    const motDePasseBO = motDePasseBackOffice();
    const comptesAcreer = COMPTES.filter((c) => {
      // 46-h : les comptes BO « terrain » (motDePasseActeur) sont créés comme
      // les acteurs — ils n'ouvrent aucun pouvoir d'administration.
      if (c.motDePasseActeur) return true;
      if (!estCompteBackOffice(String(c.role))) return true;
      if (motDePasseBO) return true;
      return false;
    });
    const refuses = COMPTES.length - comptesAcreer.length;
    if (refuses > 0) {
      this.logger.warn(
        `${refuses} compte(s) back-office NON créé(s) : SEED_DEMO_BO_PASSWORD absente ou égale à l'ancienne valeur publiée. ` +
        `C'est volontaire — un accès d'administration ne doit jamais exister avec un mot de passe connu de tous.`,
      );
    }

    for (const c of comptesAcreer) {
      try {
        let user = await users.findOne({ where: { phone: c.phone } });
        // BUG #correctif — le mot de passe des comptes back-office se lit à
        // RUNTIME, pas via la constante module-level `BO_PASSWORD` : celle-ci
        // est évaluée à l'IMPORT du module, AVANT que ConfigModule ne remplisse
        // `process.env` depuis .env (production Render : env injectée au
        // process, la constante tombait juste ; dev local : hash vide, connexion
        // BO impossible). Le filtre d'activation (`motDePasseBO`) ci-dessus,
        // lui, lit déjà l'env au runtime — on s'aligne sur lui.
        const motDePasseCompte = c.motDePasseActeur
          ? c.password
          : estCompteBackOffice(String(c.role))
            ? (motDePasseBackOffice() ?? '')
            : c.password;
        const passwordHash = await bcrypt.hash(motDePasseCompte, 10);
        if (!user) {
          const nouveau = users.create({
            phone: c.phone,
            passwordHash,
            firstName: c.firstName,
            lastName: c.lastName,
            genre: c.genre,
            role: c.role,
            status: UserStatus.ACTIF,
            validated: true,
            ...(c.email ? { email: c.email } : {}),
            ...(c.sousProfilMarchand ? { sousProfilMarchand: c.sousProfilMarchand } : {}),
            ...(c.cooperativeName ? { cooperativeName: c.cooperativeName } : {}),
            ...(c.zoneId ? { zoneId: c.zoneId } : {}),
            // Compte de démo : directement utilisable, pas d'écran « changez
            // votre mot de passe » à la première connexion.
            mustChangePassword: false,
          } as Partial<User>) as User;
          user = await users.save(nouveau);
          this.logger.log(`Compte démo créé : ${c.email || c.phone} (${c.firstName} ${c.lastName} — ${c.role})`);
        } else {
          // Compte déjà présent : on réaligne le mot de passe de démo connu, le
          // rôle et les attributs de démo (utile si un testeur les a modifiés).
          await users.update(user.id, {
            passwordHash,
            role: c.role,
            ...(c.email ? { email: c.email } : {}),
            ...(c.sousProfilMarchand ? { sousProfilMarchand: c.sousProfilMarchand } : {}),
            ...(c.cooperativeName ? { cooperativeName: c.cooperativeName } : {}),
            ...(c.zoneId ? { zoneId: c.zoneId } : {}),
            mustChangePassword: false,
          } as Partial<User>);
        }
        if (c.avecDonnees) await this.seedDonnees(user.id);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Seed compte ${c.phone} ignoré : ${message}`);
      }
    }

    // Scénario de démonstration COHÉRENT : relie les comptes entre eux pour que
    // le parcours raconte une vraie histoire (Hervé enrôle → Bénito récolte →
    // la COOP achète ses tomates → Michelle vend → la DG valide). Défensif :
    // n'interrompt jamais le démarrage si une table diffère.
    try {
      await this.seedScenario();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Seed scénario ignoré : ${message}`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 46-h : comptes back-office « terrain » (gestionnaire_zone,
  // operateur_terrain — les COMPTES marqués motDePasseActeur). Idempotent,
  // défensif, conçu pour être sûr AVANT l'early-exit : sur une base de démo
  // déjà peuplée, c'est le SEUL chemin qui fait exister ces comptes.
  // ───────────────────────────────────────────────────────────────────────────
  private async assurerComptesTerrain(users: Repository<User>): Promise<void> {
    for (const c of COMPTES.filter((x) => x.motDePasseActeur)) {
      try {
        const passwordHash = await bcrypt.hash(c.password, 10);
        let u = await users.findOne({ where: { phone: c.phone } });
        if (!u) {
          u = await users.save(
            users.create({
              phone: c.phone,
              passwordHash,
              firstName: c.firstName,
              lastName: c.lastName,
              genre: c.genre,
              role: c.role,
              status: UserStatus.ACTIF,
              validated: true,
              ...(c.zoneId ? { zoneId: c.zoneId } : {}),
              mustChangePassword: false,
            } as Partial<User>) as User,
          );
          this.logger.log(`Compte BO terrain créé : ${c.phone} (${c.firstName} ${c.lastName} — ${c.role})`);
        } else if (String(u.role) !== String(c.role)) {
          // Compte présent sous un autre rôle (testeur) : réaligné.
          await users.update(u.id, { role: c.role, passwordHash } as Partial<User>);
        }
        // La zone du gestionnaire doit exister pour que le zone_id du compte
        // pointe vers une ligne réelle (recette de l'isolation territoriale).
        if (c.zoneId) await this.assurerZoneGestionnaire(c.zoneId, u.id);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Compte BO terrain ${c.phone} ignoré : ${message}`);
      }
    }
  }

  // Garantit la ligne zone + son gestionnaire + le zone_id du compte (idempotent).
  private async assurerZoneGestionnaire(zoneId: string, gestionnaireId: string): Promise<void> {
    const dejaLa = await this.dataSource.query(
      `SELECT 1 FROM zones WHERE id = $1 LIMIT 1`,
      [zoneId],
    );
    if (!dejaLa || dejaLa.length === 0) {
      await this.dataSource.query(
        `INSERT INTO zones (id, nom, ville, region, description, gestionnaire_id, actif, created_at, updated_at)
         VALUES ($1, 'Zone Korhogo (démo)', 'Korhogo', 'Poro',
                 'Zone de démonstration du gestionnaire de zone', $2, true, now(), now())`,
        [zoneId, gestionnaireId],
      );
    }
    // Réalignement TOUJOURS rejoué (compte repris d'un testeur, zone recréée…).
    await this.dataSource.query(
      `UPDATE zones SET gestionnaire_id = $2, updated_at = now() WHERE id = $1`,
      [zoneId, gestionnaireId],
    );
    await this.dataSource.query(
      `UPDATE users SET zone_id = $1, updated_at = now() WHERE id = $2 AND (zone_id IS NULL OR zone_id <> $1)`,
      [zoneId, gestionnaireId],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Scénario lié bout-à-bout, pour une démonstration où chaque écran découle du
  // précédent. Idempotent : UUIDs fixes + ON CONFLICT DO NOTHING. Chaque bloc
  // est isolé (un échec local n'empêche pas les autres).
  // ───────────────────────────────────────────────────────────────────────────
  private async seedScenario(): Promise<void> {
    const users = this.dataSource.getRepository(User);
    const idByPhone = async (phone: string): Promise<string | null> => {
      const u = await users.findOne({ where: { phone } });
      return u ? u.id : null;
    };

    const herve = await idByPhone('+2250710101010');   // identificateur
    const benito = await idByPhone('+2250960606060');   // producteur (Korhogo)
    const michelle = await idByPhone('+2250726262626'); // marchand grossiste
    const coop = await idByPhone('+2250970707070');     // coopérative (COOP-CACAO)
    const adjoua = await idByPhone('+2250725252525');   // demi-grossiste
    const aya = await idByPhone('+2250790909090');      // détaillant
    const gestionnaireZone = await idByPhone('+2250740404040'); // 46-h : gestionnaire_zone

    const run = async (label: string, fn: () => Promise<void>): Promise<void> => {
      try {
        await fn();
      } catch (e: unknown) {
        const m = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Seed scénario · ${label} ignoré : ${m}`);
      }
    };

    // 1) Un acteur EN ATTENTE de validation, enrôlé par Hervé, que la DG valide
    //    en direct pendant la démo (marchande détaillante non encore validée).
    let awa: string | null = null;
    await run('acteur en attente', async () => {
      const phone = '+2250799999999';
      let u = await users.findOne({ where: { phone } });
      if (!u) {
        const passwordHash = await bcrypt.hash(ACTEUR_PASSWORD, 10);
        u = await users.save(
          users.create({
            phone,
            passwordHash,
            firstName: 'Awa',
            lastName: 'Nénè',
            genre: 'femme',
            role: UserRole.MARCHAND,
            status: UserStatus.EN_ATTENTE_VALIDATION,
            validated: false,
            sousProfilMarchand: 'detaillant',
            mustChangePassword: false,
          } as Partial<User>) as User,
        );
      }
      awa = u.id;
    });

    // 2) Dossiers d'identification d'Hervé : 3 validés (Bénito, Michelle, la COOP)
    //    + 1 en attente (Awa). Alimente son tableau de bord territoire ET la
    //    "Performance des identificateurs" du back-office national.
    if (herve) {
      const dossiers: Array<[string, string | null, string, string, string]> = [
        // id fixe, acteur_id, type_acteur, statut, nom
        ['dede0000-0000-4000-8000-000000000001', benito, 'producteur', 'valide', 'Bénito Bomisso'],
        ['dede0000-0000-4000-8000-000000000002', michelle, 'marchand', 'valide', 'Michelle Walebo'],
        ['dede0000-0000-4000-8000-000000000003', coop, 'cooperateur', 'valide', 'COOP-CACAO Daloa'],
        ['dede0000-0000-4000-8000-000000000004', awa, 'marchand', 'en_attente', 'Awa Nénè'],
      ];
      for (const [id, acteurId, typeActeur, statut, nom] of dossiers) {
        if (!acteurId) continue;
        await run(`dossier ${nom}`, async () => {
          await this.dataSource.query(
            `INSERT INTO identifications
               (id, identificateur_id, acteur_id, type_acteur, statut, acteur_nom,
                region, commune, source, date_identification, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,'Poro','Korhogo','terrain', now(), now(), now())
             ON CONFLICT DO NOTHING`,
            [id, herve, acteurId, typeActeur, statut, nom],
          );
        });
      }
    }

    // 3) Bénito déclare une récolte de TOMATES à Korhogo, publiée sur le marché.
    const recolteId = 'dede0000-0000-4000-8000-000000000101';
    const pubId = 'dede0000-0000-4000-8000-000000000201';
    if (benito) {
      await run('récolte Bénito', async () => {
        await this.dataSource.query(
          `INSERT INTO recoltes
             (id, user_id, produit, quantite, unite, qualite, date_recolte, statut,
              prix_unitaire, parcelle, notes, stock_disponible, stock_vendu, created_at, updated_at)
           VALUES ($1,$2,'Tomate',400,'kg','standard', CURRENT_DATE - 3, 'validee',
                   500,'Parcelle Korhogo','Récolte de démonstration',200,200, now(), now())
           ON CONFLICT DO NOTHING`,
          [recolteId, benito],
        );
      });
      await run('publication Bénito', async () => {
        await this.dataSource.query(
          `INSERT INTO publications
             (id, user_id, recolte_id, produit, culture, quantite_disponible, quantite_initiale,
              unite, prix_unitaire, qualite, localisation, active, statut, type_marche,
              date_publication, date_recolte, description, created_at, updated_at)
           VALUES ($1,$2,$3,'Tomate','Tomate',200,400,'kg',500,'standard','Korhogo',
                   true,'disponible','producteur', now(), CURRENT_DATE - 3,
                   'Tomates fraîches de Korhogo', now(), now())
           ON CONFLICT DO NOTHING`,
          [pubId, benito, recolteId],
        );
      });
    }

    // 4) La COOP-CACAO achète les tomates de Bénito : 2 commandes (120 kg + 80 kg)
    //    = 200 kg cumulés · 100 000 FCFA. Alimente "Achats groupés" (cumul par
    //    produit) et les cartes "Mes commandes / En attente / Livrées".
    if (coop && benito) {
      const cmds: Array<[string, number, number, string]> = [
        // id fixe, quantite, total, statut
        ['dede0000-0000-4000-8000-000000000301', 120, 60000, 'en_attente'],
        ['dede0000-0000-4000-8000-000000000302', 80, 40000, 'livree'],
      ];
      for (const [id, quantite, total, statut] of cmds) {
        await run(`commande COOP ${quantite}kg`, async () => {
          await this.dataSource.query(
            `INSERT INTO commandes
               (id, acheteur_id, acheteur_nom, vendeur_id, publication_id, type, produit,
                quantite, prix_unitaire, total, statut, date_commande, created_at, updated_at)
             VALUES ($1,$2,'COOP-CACAO Daloa',$3,$4,'achat','Tomate',$5,500,$6,$7, now(), now(), now())
             ON CONFLICT DO NOTHING`,
            [id, coop, benito, pubId, quantite, total, statut],
          );
        });
      }
    }

    // 5) La coopérative elle-même : fiche + membres + quelques besoins, pour que
    //    les écrans "Membres" et "Besoins" soient peuplés et cohérents.
    const coopId = 'dede0000-0000-4000-8000-000000000401';
    if (coop) {
      await run('fiche coopérative', async () => {
        await this.dataSource.query(
          `INSERT INTO cooperatives (id, nom, responsable_id, actif, created_at, updated_at)
           VALUES ($1,'COOP-CACAO Daloa',$2,true, now(), now())
           ON CONFLICT DO NOTHING`,
          [coopId, coop],
        );
      });
      const membres: Array<[string, string | null]> = [
        ['dede0000-0000-4000-8000-000000000501', benito],
        ['dede0000-0000-4000-8000-000000000502', adjoua],
        ['dede0000-0000-4000-8000-000000000503', aya],
      ];
      for (const [id, membreId] of membres) {
        if (!membreId) continue;
        await run('membre coopérative', async () => {
          await this.dataSource.query(
            `INSERT INTO cooperative_membres
               (id, cooperative_id, membre_id, statut, role, actif, date_adhesion)
             VALUES ($1,$2,$3,'actif','membre',true, now())
             ON CONFLICT DO NOTHING`,
            [id, coopId, membreId],
          );
        });
      }
      // La table cooperative_besoins est créée à la demande par le contrôleur
      // coopérative ; au moment du seed elle peut ne pas exister encore. On la crée
      // ici (IF NOT EXISTS) pour que les besoins de démo s'insèrent bien.
      await run('table cooperative_besoins', async () => {
        await this.dataSource.query(
          `CREATE TABLE IF NOT EXISTS cooperative_besoins (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cooperative_id UUID NOT NULL,
            marchand_id UUID NOT NULL,
            produit VARCHAR(255), categorie VARCHAR(120), quantite NUMERIC, unite VARCHAR(50),
            prix_max NUMERIC NULL, priorite VARCHAR(30) DEFAULT 'normale',
            statut VARCHAR(50) DEFAULT 'en_attente', notes TEXT NULL, date_besoin TIMESTAMPTZ NULL,
            prix_achat NUMERIC NULL, prix_dispatch NUMERIC NULL, quantite_attribuee NUMERIC NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
          )`,
        );
      });
      const besoins: Array<[string, string, string, number, string | null]> = [
        ['dede0000-0000-4000-8000-000000000601', 'Tomate', 'Légumes', 200, benito],
        ['dede0000-0000-4000-8000-000000000602', 'Maïs', 'Céréales', 180, adjoua],
      ];
      for (const [id, produit, categorie, quantite, membreId] of besoins) {
        await run(`besoin ${produit}`, async () => {
          await this.dataSource.query(
            `INSERT INTO cooperative_besoins
               (id, cooperative_id, marchand_id, produit, categorie, quantite, unite,
                priorite, statut, date_besoin, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,'kg','normale','en_attente', now(), now(), now())
             ON CONFLICT DO NOTHING`,
            [id, coopId, membreId, produit, categorie, quantite],
          );
        });
      }
    }

    // 6) 46-h : la zone du gestionnaire_zone (+2250740404040) — sans elle, le
    //    compte aurait un zone_id qui ne pointe vers aucune ligne et la
    //    recette de l'isolation territoriale (GESTZONE) resterait impossible.
    if (gestionnaireZone) {
      await run('zone démo du gestionnaire', async () => {
        await this.assurerZoneGestionnaire(ZONE_DEMO_ID, gestionnaireZone);
      });
    }

    this.logger.log('Scénario de démonstration cohérent chargé (Hervé → Bénito → COOP → Michelle → DG).');
  }

  // Jeu de données d'exemple pour un marchand : produits + journée ouverte +
  // quelques opérations. N'insère rien s'il y a déjà des produits (idempotent).
  private async seedDonnees(marchandId: string): Promise<void> {
    // Garantit que les tables existent même si ce service tourne AVANT DbInit
    // (l'ordre des hooks n'est pas garanti) — sinon le jeu de démo était sauté
    // et le compte restait vide. IF NOT EXISTS = no-op si déjà là.
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS produits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), marchand_id text NOT NULL,
        nom text NOT NULL, prix numeric DEFAULT 0, prix_achat numeric DEFAULT 0,
        categorie text, stock numeric DEFAULT 0, unite text, image text,
        actif boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      );`);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS caisse_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), marchand_id text NOT NULL, date date NOT NULL,
        fond_initial numeric DEFAULT 0, fond_final numeric DEFAULT 0, ouvert boolean DEFAULT true,
        heure_ouverture timestamptz, heure_fermeture timestamptz, notes text,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
      );`);
    await this.dataSource.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_caisse_sessions_marchand_date ON caisse_sessions (marchand_id, date);`,
    );

    const dejaDesProduits = await this.dataSource.query(
      'SELECT 1 FROM produits WHERE marchand_id = $1 LIMIT 1',
      [marchandId],
    );
    if (dejaDesProduits.length > 0) return;

    // Produits (catalogue / stock)
    const produits: Array<[string, number, number, string, number, string]> = [
      // nom, prix, prix_achat, categorie, stock, unite
      ['Tomate', 200, 120, 'Légumes', 50, 'kg'],
      ['Banane', 100, 60, 'Fruits', 40, 'régime'],
      ['Riz (sac)', 15000, 13000, 'Céréales', 10, 'sac'],
    ];
    for (const [nom, prix, prixAchat, categorie, stock, unite] of produits) {
      await this.dataSource.query(
        `INSERT INTO produits (marchand_id, nom, prix, prix_achat, categorie, stock, unite, actif)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [marchandId, nom, prix, prixAchat, categorie, stock, unite],
      );
    }

    // Journée de caisse ouverte aujourd'hui (une seule par marchand/jour)
    const today = new Date().toISOString().split('T')[0];
    await this.dataSource.query(
      `INSERT INTO caisse_sessions (marchand_id, date, fond_initial, ouvert, heure_ouverture)
       VALUES ($1, $2, 0, true, now())
       ON CONFLICT (marchand_id, date) DO NOTHING`,
      [marchandId, today],
    );

    // Quelques opérations d'exemple (ventes + une dépense)
    const ops: Array<[string, number, string, number, string]> = [
      // type, montant, produit/description, quantite, idempotency_key
      ['vente', 2000, 'Tomate', 10, `seed-${marchandId}-v1`],
      ['vente', 500, 'Banane', 5, `seed-${marchandId}-v2`],
      ['depense', 1000, 'Transport', 0, `seed-${marchandId}-d1`],
    ];
    for (const [type, montant, libelle, quantite, idem] of ops) {
      if (type === 'vente') {
        await this.dataSource.query(
          `INSERT INTO caisse_transactions
             (user_id, marchand_id, type, montant, produit, description, quantite,
              mode_paiement, source, prix_vente, idempotency_key)
           VALUES ($1, $1, 'vente', $2, $3, $3, $4, 'especes', 'seed', $2, $5)
           ON CONFLICT DO NOTHING`,
          [marchandId, montant, libelle, quantite, idem],
        );
      } else {
        await this.dataSource.query(
          `INSERT INTO caisse_transactions
             (user_id, marchand_id, type, montant, description, mode_paiement, source, idempotency_key)
           VALUES ($1, $1, 'depense', $2, $3, 'especes', 'seed', $4)
           ON CONFLICT DO NOTHING`,
          [marchandId, montant, libelle, idem],
        );
      }
    }
    this.logger.log(`Données d'exemple créées pour le marchand ${marchandId}`);
  }
}
