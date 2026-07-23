import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
// Sécurité : actif par DÉFAUT (serveur de démo/test). Pour un vrai serveur de
// production, poser SEED_DEMO=false pour le désactiver complètement.
// (Défaut « on » choisi pour rester turnkey : aucune variable à régler à la main
//  sur l'hébergeur.)
// Idempotent : ne recrée jamais un compte ou des données déjà présents.
// ─────────────────────────────────────────────────────────────────────────────

interface CompteDemo {
  phone: string;
  firstName: string;
  lastName: string;
  genre: 'femme' | 'homme';
  role: UserRole;
  // Code de connexion. Rôles « acteur » = pavé à 4 chiffres -> 4 chiffres.
  // Rôles back-office = écran /backoffice/login (champ texte) -> 6 chiffres.
  password: string;
  avecDonnees?: boolean; // jeu de données caisse (marchand uniquement)
  email?: string;        // back-office : connexion par email
  sousProfilMarchand?: string; // marchand : grossiste | demi_grossiste | detaillant
  cooperativeName?: string;
}

// Un compte de démo par univers, pour que les équipes testent CHAQUE rôle.
// Acteurs (connexion sur /login, code à 4 chiffres = 1234) :
const COMPTES: CompteDemo[] = [
  // ── Marchand (caisse) ──
  { phone: '+2250700000009', firstName: 'Awa', lastName: 'Koné', genre: 'femme', role: UserRole.MARCHAND, password: '1234', avecDonnees: true },
  { phone: '+2250700000010', firstName: 'Kouassi', lastName: 'Yao', genre: 'homme', role: UserRole.MARCHAND, password: '1234' },
  { phone: '+2250700000011', firstName: 'Fatou', lastName: 'Traoré', genre: 'femme', role: UserRole.MARCHAND, password: '1234' },
  // ── Producteur (récoltes / marché) ──
  { phone: '+2250700000012', firstName: 'Yao', lastName: 'Kouadio', genre: 'homme', role: UserRole.PRODUCTEUR, password: '1234' },
  // ── Coopérateur (coopérative) ──
  { phone: '+2250700000013', firstName: 'Mariam', lastName: 'Diallo', genre: 'femme', role: UserRole.COOPERATEUR, password: '1234' },
  // ── Identificateur (enrôlement) ──
  { phone: '+2250700000014', firstName: 'Ibrahim', lastName: 'Touré', genre: 'homme', role: UserRole.IDENTIFICATEUR, password: '1234' },
  // ── Institution (supervision / analytics) ──
  { phone: '+2250700000015', firstName: 'Aïcha', lastName: 'Bamba', genre: 'femme', role: UserRole.INSTITUTION, password: '1234' },
  // ── Back-office admin (connexion sur /backoffice/login, code à 6 chiffres = 123456) ──
  { phone: '+2250700000016', firstName: 'Admin', lastName: 'Julaba', genre: 'homme', role: UserRole.ADMIN_GENERAL, password: '123456' },

  // ─────────────────────────────────────────────────────────────────────────
  // Comptes de démonstration OFFICIELS (numéros distribués pour la présentation).
  // Mots de passe : acteurs = 0000 · administration = 123456.
  // ─────────────────────────────────────────────────────────────────────────
  { phone: '+2250726262626', firstName: 'Michelle', lastName: 'Walebo', genre: 'femme', role: UserRole.MARCHAND, password: '0000', sousProfilMarchand: 'grossiste', avecDonnees: true },
  { phone: '+2250725252525', firstName: 'Adjoua', lastName: 'Kouamé', genre: 'femme', role: UserRole.MARCHAND, password: '0000', sousProfilMarchand: 'demi_grossiste', avecDonnees: true },
  { phone: '+2250790909090', firstName: 'Aya', lastName: 'Koffi', genre: 'femme', role: UserRole.MARCHAND, password: '0000', sousProfilMarchand: 'detaillant', avecDonnees: true },
  { phone: '+2250960606060', firstName: 'Bénito', lastName: 'Bomisso', genre: 'homme', role: UserRole.PRODUCTEUR, password: '0000' },
  { phone: '+2250970707070', firstName: 'Coopérative', lastName: 'Daloa', genre: 'femme', role: UserRole.COOPERATEUR, password: '0000', cooperativeName: 'COOP-CACAO Daloa' },
  { phone: '+2250710101010', firstName: 'Hervé', lastName: 'Koffi', genre: 'homme', role: UserRole.IDENTIFICATEUR, password: '0000' },
  // Administration (connexion back-office par EMAIL) :
  { phone: '+2250700000017', email: 'dge-test@julaba.ci', firstName: 'Direction', lastName: 'Générale', genre: 'homme', role: UserRole.ADMIN_GENERAL, password: '123456' },
];

@Injectable()
export class SeedDemoService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedDemoService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_DEMO === 'false') return; // désactivable en production
    const users = this.dataSource.getRepository(User);

    for (const c of COMPTES) {
      try {
        let user = await users.findOne({ where: { phone: c.phone } });
        const passwordHash = await bcrypt.hash(c.password, 10);
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
            mustChangePassword: false,
          } as Partial<User>);
        }
        if (c.avecDonnees) await this.seedDonnees(user.id);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Seed compte ${c.phone} ignoré : ${message}`);
      }
    }
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
