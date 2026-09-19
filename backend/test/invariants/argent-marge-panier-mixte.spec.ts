// ARGENT-1 — La marge d'un panier MIXTE (coûts connus + coûts inconnus).
//
// PREUVE QUI TRAVERSE : entrée métier (POST /caisse/vente) -> contrôleur ->
// DONNÉE PERSISTÉE (colonne `marge` de caisse_transactions). Le maillon
// suivant — ligne persistée -> écran -> phrase de Tata — est tenu par
// `margePartielle.test.mts` côté frontend, sur LE MÊME fichier de données.
//
// Pourquoi ce test existe : 195 tests backend, et AUCUN sur la marge. Le seul
// test de marge du dépôt (`margePerte.test.mts`) vérifie une fonction du
// téléphone qui ne s'exécute quasiment jamais — le serveur gagne toujours.
// C'est ce trou, pas un principe, qui a laissé passer le défaut.
//
// LE DÉFAUT : le contrôleur agrège `prix_achat` sur TOUTES les lignes (une
// ligne sans coût y contribue 0), puis soustrait ce total du montant de TOUTE
// la vente. Le prix de vente entier de la ligne sans coût devient donc du
// bénéfice : elle est traitée comme offerte.
//
// LA RÈGLE (arbitrage de Patrick, 19/09/2026) : une ligne sans prix d'achat ne
// vaut ni zéro coût ni zéro information. On calcule ce qu'on SAIT — ici 100 —
// et on ne présente jamais ce chiffre comme la marge complète de la vente.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

const FIXTURE = JSON.parse(
  readFileSync(join(__dirname, '../../../tests/fixtures/argent-panier-mixte.json'), 'utf8'),
);

describe('ARGENT-1 — marge d’un panier mixte (coût connu + coût inconnu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

  const PHONE = '+2250700000091';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone: PHONE, firstName: 'Awa', lastName: 'Argent1', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('une ligne sans prix d’achat n’apporte NI gain NI perte à la marge persistée', async () => {
    const KEY = 'ARGENT1-MIXTE-001';
    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/vente')
      .set('Authorization', `Bearer ${token}`)
      .send({
        montant: String(FIXTURE.vente.montant),
        produits: FIXTURE.vente.details,
        details: FIXTURE.vente.details,
        idempotency_key: KEY,
      });
    expect([200, 201]).toContain(r.status);

    const rows = await ds.query(
      'SELECT marge, benefice, prix_achat, prix_vente FROM caisse_transactions WHERE idempotency_key = $1 AND user_id = $2',
      [KEY, marchandId],
    );
    expect(rows).toHaveLength(1);

    // 100, et surtout PAS 400. 400 = 800 − 400, c'est-à-dire le prix de vente
    // entier du Piment compté comme du bénéfice, comme s'il avait été offert.
    expect(Number(rows[0].marge)).toBe(FIXTURE.attendu.marge_persistee);
  });

  it('une vente dont AUCUNE ligne n’a de coût ne fabrique pas de marge', async () => {
    const KEY = 'ARGENT1-MIXTE-002';
    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/vente')
      .set('Authorization', `Bearer ${token}`)
      .send({
        montant: '300',
        produits: [{ nom: 'Piment-ARGENT1', quantite: 1, prix: 300, total: 300 }],
        details: [{ nom: 'Piment-ARGENT1', quantite: 1, prix: 300, total: 300 }],
        idempotency_key: KEY,
      });
    expect([200, 201]).toContain(r.status);

    const rows = await ds.query(
      'SELECT marge FROM caisse_transactions WHERE idempotency_key = $1 AND user_id = $2',
      [KEY, marchandId],
    );
    expect(Number(rows[0].marge)).toBe(0);
  });

  it('une vente entièrement coûtée, à perte, garde sa perte', async () => {
    const KEY = 'ARGENT1-MIXTE-003';
    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/vente')
      .set('Authorization', `Bearer ${token}`)
      .send({
        montant: '800',
        produits: [{ nom: 'Riz-ARGENT1', quantite: 1, prix: 800, total: 800, prix_achat: 1000 }],
        details: [{ nom: 'Riz-ARGENT1', quantite: 1, prix: 800, total: 800, prix_achat: 1000 }],
        idempotency_key: KEY,
      });
    expect([200, 201]).toContain(r.status);

    const rows = await ds.query(
      'SELECT marge FROM caisse_transactions WHERE idempotency_key = $1 AND user_id = $2',
      [KEY, marchandId],
    );
    // Une perte est une perte (arbitrage du 19/09) : −200, pas 0.
    expect(Number(rows[0].marge)).toBe(-200);
  });
});
