// Invariant I2 — Idempotence de la vente.
//
// Propriété attendue : rejouer une vente avec la MÊME idempotency_key ne doit
// produire qu'UNE SEULE caisse_transaction ET qu'UN SEUL décrément de stock.
// On vérifie les DEUX effets (pas seulement l'index unique) : c'est l'idempotence
// métier complète.
//
// État attendu vs code actuel : 🟢 (déjà satisfait — sert de preuve que le
// harnais démarre l'app, migre une base vierge, appelle l'API et vérifie la base).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariant I2 — idempotence de la vente (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

  const PHONE = '+2250700000012';
  const PRODUIT = 'Tomate-I2';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);

    // Tables « plates » (produits, index d'idempotence…) : créées par runInit(),
    // que main.ts appelle en prod mais que le boot de test contourne.
    await app.get(DbInitService, { strict: false }).runInit();

    // Seed MINIMAL et déterministe, via les vrais contrats API.
    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone: PHONE, firstName: 'Awa', lastName: 'Test', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    expect(token).toBeTruthy();

    // Le mot de passe acteur par défaut est « 0000 » + mustChangePassword : on le lève.
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });

    // Un produit avec un stock connu.
    const p = await request(app.getHttpServer())
      .post('/api/v1/caisse/produits')
      .set('Authorization', `Bearer ${token}`)
      .send({ nom: PRODUIT, stock: 100, prix: 200 });
    expect([200, 201]).toContain(p.status);
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const stockActuel = async (): Promise<number> => {
    const r = await ds.query(
      'SELECT stock FROM produits WHERE marchand_id = $1::text AND lower(nom) = lower($2)',
      [marchandId, PRODUIT],
    );
    return Number(r[0]?.stock);
  };
  const nbTransactions = async (key: string): Promise<number> => {
    const r = await ds.query(
      'SELECT count(*)::int AS n FROM caisse_transactions WHERE idempotency_key = $1 AND user_id = $2',
      [key, marchandId],
    );
    return r[0].n;
  };

  it('même idempotency_key rejoué ⇒ UNE transaction ET UN seul décrément', async () => {
    const KEY = 'I2-KEY-001';
    const vendre = () =>
      request(app.getHttpServer())
        .post('/api/v1/caisse/vente')
        .set('Authorization', `Bearer ${token}`)
        .send({ montant: '1000', produits: [{ nom: PRODUIT, quantite: 5 }], idempotency_key: KEY });

    // État initial
    expect(await stockActuel()).toBe(100);

    // 1er envoi
    const r1 = await vendre();
    expect([200, 201]).toContain(r1.status);
    expect(await nbTransactions(KEY)).toBe(1); // une transaction
    expect(await stockActuel()).toBe(95); // un décrément (100 - 5)

    // Rejeu avec la MÊME clé
    const r2 = await vendre();
    expect([200, 201]).toContain(r2.status);
    expect(await nbTransactions(KEY)).toBe(1); // TOUJOURS une seule transaction
    expect(await stockActuel()).toBe(95); // TOUJOURS 95 — pas de 2e décrément
  });
});
