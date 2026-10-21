// PROD-12 — l'endpoint mensonger GET /revenus est SUPPRIMÉ (20/10/2026).
//
// Constat (AUDIT-PARCOURS-PRODUCTEUR §PROD-12, portant PRODUCTEUR-19 du docx)
// : GET /revenus sommait prixUnitaire × quantite de TOUTES les récoltes,
// quel que soit leur statut — des récoltes déclarées (jamais vendues) y
// devenaient du « revenu ». Le chiffre contredisait frontalement
// /producteur/stats, qui ne compte comme revenu que l'argent ENCAISSÉ
// (commandes payées — PROD-05/BUG-010). Pire : AUCUN écran du frontend
// n'appelait cet endpoint (orphelin, zéro consommateur) — un mensonge
// disponible pour qui savait où chercher, rien de plus.
//
// Décision : SUPPRIMER (l'option honnête de l'audit — aligner un calcul faux
// n'a pas de sens quand la source de vérité existe déjà : /producteur/stats).
//
// Propriétés vérifiées (🟢 attendu) :
//  - PROD-12-a : GET /api/v1/revenus répond 404 (route inexistante).
//  - PROD-12-b : /producteur/stats reste LA source de revenus (200, champs
//    revenusTotal / revenusEnAttente présents et cohérents).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole } from '../../src/users/entities/user.entity';

describe('Invariant PROD-12 — l\'endpoint mensonger /revenus n\'existe plus (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  let token: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }) })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    const repo = ds.getRepository(User);
    const u = repo.create({
      phone: '+2250700013001', firstName: 'Prod', lastName: 'Douze', genre: 'femme',
      role: UserRole.PRODUCTEUR, status: 'actif' as any, passwordHash: await bcrypt.hash('1234', 10),
    } as any);
    const saved: any = await repo.save(u as any);
    token = await jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('PROD-12-a : GET /revenus → 404 (route supprimée)', async () => {
    const res = await api().get('/api/v1/revenus').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PROD-12-b : /producteur/stats reste la source de revenus (200, champs cohérents)', async () => {
    const res = await api().get('/api/v1/producteur/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('revenusTotal');
    expect(res.body).toHaveProperty('revenusEnAttente');
    expect(Number(res.body.revenusTotal)).toBe(0); // aucune commande : zéro inventé
  });
});
