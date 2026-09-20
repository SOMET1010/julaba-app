// ARGENT-2 — Une marchande en rupture doit être PRÉVENUE.
//
// PREUVE QUI TRAVERSE : produit créé par l'API caisse -> vente qui épuise le
// stock -> déclenchement de l'alerte -> NOTIFICATION persistée.
//
// LE DÉFAUT : `checkStocksFaibles` et `checkStockApreVente` lisent
// `FROM stocks WHERE proprietaire_id = $1`. Or le stock d'une marchande vit
// TOUJOURS dans `produits` : la branche qui écrit dans `stocks` est réservée à
// `cooperateur` et `producteur` (stocks-rest.controller.ts:115). Aucun chemin
// n'insère jamais une ligne de marchande dans `stocks`.
//
// Deux tables portent le même concept avec des noms de colonnes différents
// (`nom`/`produit`, `stock`/`quantite`, `marchand_id`/`proprietaire_id`), et le
// service d'alerte s'est adressé à la mauvaise. Les notifications
// `stock_rupture` et `stock_faible` sont, pour une marchande, du code mort.
//
// CE QUE ÇA LUI COÛTE : elle part au marché sans riz, sans avoir été prévenue.
// L'avertissement existe bien au moment même de la vente (POSCaisse), mais il
// ne survit pas à la fermeture de l'écran — et il ne lui sert à rien la veille
// au soir, quand elle décide de ses achats. C'est précisément le moment où une
// application qui parle devrait parler.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

// Numéros dans la plage RÉSERVÉE aux suites ARGENT (+22507888800xx) : les
// specs partagent UNE base pour toute la suite, et un numéro déjà pris rend un
// signup 409 — la suite passe seule et échoue en groupe. Cf. le garde-fou
// backend/test/unit/telephones-tests-uniques.spec.ts.
describe('ARGENT-2 — la marchande est prévenue quand son stock tombe', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

  const PHONE = '+2250788880005';
  const PRODUIT = 'Riz-ALERTE';

  const notifications = async (type: string): Promise<any[]> =>
    ds.query(
      `SELECT type, titre, message FROM notifications WHERE user_id = $1 AND type = $2`,
      [marchandId, type],
    );

  const attendre = async (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      .send({ phone: PHONE, firstName: 'Awa', lastName: 'Alerte', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });

    // 3 kg de riz, seuil d'alerte à 10 : elle est déjà sous son seuil.
    const p = await request(app.getHttpServer())
      .post('/api/v1/caisse/produits')
      .set('Authorization', `Bearer ${token}`)
      .send({ nom: PRODUIT, stock: 3, prix: 500, prix_achat: 400, unite: 'kg', seuil_alerte: 10 });
    expect([200, 201]).toContain(p.status);
  }, 90000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('le stock de la marchande est bien dans `produits`, et PAS dans `stocks`', async () => {
    const [dansProduits] = await ds.query(
      `SELECT count(*)::int AS n FROM produits WHERE marchand_id = $1::text AND lower(nom) = lower($2)`,
      [marchandId, PRODUIT],
    );
    const [dansStocks] = await ds.query(
      `SELECT count(*)::int AS n FROM stocks WHERE proprietaire_id::text = $1::text`,
      [marchandId],
    );
    expect(dansProduits.n).toBe(1);
    // C'est TOUT le défaut : le service d'alerte interroge cette table-là.
    expect(dansStocks.n).toBe(0);
  });

  it('vendre les 3 derniers kilos déclenche une alerte de RUPTURE', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/vente')
      .set('Authorization', `Bearer ${token}`)
      .send({
        montant: '1500',
        produits: [{ nom: PRODUIT, quantite: 3 }],
        details: [{ nom: PRODUIT, quantite: 3, prix: 500, total: 1500, prix_achat: 400 }],
        idempotency_key: 'A2-ALERTE-001',
      });
    expect([200, 201]).toContain(r.status);

    // L'alerte part en arrière-plan (`.catch()` non attendu par la vente) :
    // on laisse le temps à l'écriture, sans dépendre d'un ordonnancement.
    await attendre(1500);

    const [stock] = await ds.query(
      `SELECT stock::float AS s FROM produits WHERE marchand_id = $1::text AND lower(nom) = lower($2)`,
      [marchandId, PRODUIT],
    );
    expect(stock.s).toBe(0);

    const rupture = await notifications('stock_rupture');
    expect(rupture.length).toBeGreaterThanOrEqual(1);
    // Elle doit savoir DE QUOI on parle : une alerte qui ne nomme pas le
    // produit n'aide pas quelqu'un qui ne lit pas et se fait lire ses messages.
    expect(`${rupture[0].titre} ${rupture[0].message}`).toContain(PRODUIT);
  });

  it('la vérification quotidienne voit aussi un stock sous le seuil', async () => {
    // On remet du stock, mais sous le seuil de 10.
    await ds.query(
      `UPDATE produits SET stock = 2 WHERE marchand_id = $1::text AND lower(nom) = lower($2)`,
      [marchandId, PRODUIT],
    );
    const r = await request(app.getHttpServer())
      .post('/api/v1/notifications/alertes/check-user')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect([200, 201]).toContain(r.status);
    await attendre(1500);

    const faible = await notifications('stock_faible');
    expect(faible.length).toBeGreaterThanOrEqual(1);
  });
});
