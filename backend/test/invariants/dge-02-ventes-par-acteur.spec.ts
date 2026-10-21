// DGE-02 — HISTORIQUE DES VENTES PAR ACTEUR, buckets jour / mois / année.
// (plan d'action audit workflow officiel §5 item 4, 20/10/2026)
//
// Le docx officiel demande à la DGE les « ventes par acteur journalier /
// mensuel / annuel ». Aucun GROUP BY temporel n'existait côté backend ; le
// sélecteur de période de l'espace institution était décoratif.
//
// Correctif : GET /admin/analytics/ventes-par-acteur?bucket=jour|mois|annee —
// agrégat par vendeur et période, volume_total / volume_encaisse (paye) /
// volume_en_attente séparés, annulée/litige hors périmètre.
//
// Propriétés vérifiées (🟢 attendu) :
//  - DGE-02-a : les ventes du vendeur apparaissent par acteur (jour) —
//    ventes = 2, volume_total = payée + non-payée.
//  - DGE-02-b : volume_encaisse compte SEULEMENT la commande payée (la DGE ne
//    doit pas lire une promesse comme de l'argent encaissé).
//  - DGE-02-c : une commande ANNULÉE ne compte nulle part.
//  - DGE-02-d : bucket 'annee' — la période est l'année courante, mêmes
//    volumes ; bucket 'mois' — le mois courant.
//  - DGE-02-e : un marchand (rôle non BO) → 403 (la DGE opère via comptes BO).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

const PHONE_PROD = '+2250700020401';
const PHONE_ADMIN = '+2250700020402';
const PHONE_MARCHAND = '+2250700020403';

const PAYEE = 45000;
const NON_PAYEE = 30000;
const ANNULEE = 5000;

describe('Invariant DGE-02 — ventes par acteur J/M/A pour la DGE', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let tokenAdmin: string;
  let tokenMarchand: string;
  let vendeurId: string;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    const repo = ds.getRepository(User);
    const prod: any = await repo.save(repo.create({
      phone: PHONE_PROD, firstName: 'Vendeur', lastName: 'DGE02', genre: 'homme',
      role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    vendeurId = prod.id;
    const admin: any = await repo.save(repo.create({
      phone: PHONE_ADMIN, firstName: 'Admin', lastName: 'DGE02', genre: 'femme',
      role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    tokenAdmin = await jwt.signAsync(
      { sub: admin.id, phone: admin.phone, role: admin.role },
      { secret: process.env.JWT_SECRET },
    );
    const marchand: any = await repo.save(repo.create({
      phone: PHONE_MARCHAND, firstName: 'Marchand', lastName: 'DGE02', genre: 'homme',
      role: UserRole.MARCHAND, sousProfilMarchand: 'grossiste', status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    tokenMarchand = await jwt.signAsync(
      { sub: marchand.id, phone: marchand.phone, role: marchand.role },
      { secret: process.env.JWT_SECRET },
    );

    // Trois commandes du vendeur (le CONTRAT testé = la requête d'agrégation).
    const seedCommande = (total: number, statut: string, statutPaiement: string) =>
      ds.query(
        `INSERT INTO commandes
           (acheteur_nom, acheteur_telephone, vendeur_id, type, produit, quantite,
            prix_unitaire, total, statut, date_commande, statut_paiement)
         VALUES ('Acheteur DGE02', '+2250700000098', $1, 'directe', 'Igname', 10, $2, $2, $3, now(), $4)`,
        [vendeurId, total, statut, statutPaiement],
      );
    await seedCommande(PAYEE, 'confirmee', 'paye');
    await seedCommande(NON_PAYEE, 'confirmee', 'non_paye');
    await seedCommande(ANNULEE, 'annulee', 'non_paye');
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const lignesDuVendeur = async (query: string) => {
    const r = await api()
      .get(`/api/v1/admin/analytics/ventes-par-acteur${query}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(r.status).toBe(200);
    return (r.body.data || []).filter((l: any) => l.acteur_id === String(vendeurId));
  };

  it('DGE-02-a : les ventes du vendeur apparaissent par acteur (bucket jour)', async () => {
    const lignes = await lignesDuVendeur('?bucket=jour');
    expect(lignes.length).toBeGreaterThanOrEqual(1);
    const total = lignes.reduce((s: number, l: any) => s + Number(l.ventes), 0);
    expect(total).toBe(2);
    const volume = lignes.reduce((s: number, l: any) => s + Number(l.volume_total), 0);
    expect(volume).toBe(PAYEE + NON_PAYEE);
  });

  it('DGE-02-b : volume_encaisse = payée SEULEMENT (la DGE ne lit pas une promesse)', async () => {
    const lignes = await lignesDuVendeur('?bucket=jour');
    const encaisse = lignes.reduce((s: number, l: any) => s + Number(l.volume_encaisse), 0);
    const attente = lignes.reduce((s: number, l: any) => s + Number(l.volume_en_attente), 0);
    expect(encaisse).toBe(PAYEE);
    expect(attente).toBe(NON_PAYEE);
    expect(encaisse).not.toBe(PAYEE + NON_PAYEE);
  });

  it('DGE-02-c : la commande ANNULÉE ne compte nulle part', async () => {
    const lignes = await lignesDuVendeur('?bucket=jour');
    const total = lignes.reduce((s: number, l: any) => s + Number(l.volume_total), 0);
    expect(total).not.toBe(PAYEE + NON_PAYEE + ANNULEE);
    expect(total).toBe(PAYEE + NON_PAYEE);
  });

  it('DGE-02-d : buckets annee et mois — périodes courantes, mêmes volumes', async () => {
    const annee = await lignesDuVendeur('?bucket=annee');
    expect(annee.length).toBeGreaterThanOrEqual(1);
    expect(String(annee[0].periode)).toContain(String(new Date().getFullYear()));
    const mois = await lignesDuVendeur('?bucket=mois');
    expect(mois.length).toBeGreaterThanOrEqual(1);
    const volumeMois = mois.reduce((s: number, l: any) => s + Number(l.volume_total), 0);
    expect(volumeMois).toBe(PAYEE + NON_PAYEE);
  });

  it('DGE-02-e : un marchand (rôle non BO) → 403 — la DGE opère via comptes BO', async () => {
    const r = await api()
      .get('/api/v1/admin/analytics/ventes-par-acteur?bucket=jour')
      .set('Authorization', `Bearer ${tokenMarchand}`);
    expect(r.status).toBe(403);
  });
});
