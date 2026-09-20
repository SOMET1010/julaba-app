// ARGENT-1 — Une dépense hors-ligne appartient au jour où elle a été FAITE.
//
// PREUVE QUI TRAVERSE, et elle ne s'arrête pas au payload : entrée métier
// (POST /caisse/depense avec `date_operation`) -> contrôleur -> DONNÉE
// PERSISTÉE (`created_at`) -> LECTURE MÉTIER (la caisse théorique de clôture du
// jour concerné). Vérifier que `date_operation` existe dans un corps de requête
// ne prouve rien : c'est la caisse du soir qui doit bouger, ou pas.
//
// LE DÉFAUT : le correctif du jour comptable n'a couvert que la vente.
//   - `offlineCaisse.ts` : ENDPOINTS_DATES = ['/caisse/vente'] — la dépense
//     n'y est pas, donc le téléphone ne joint même pas la date au rejeu.
//   - `enregistrerDepense` ne lit JAMAIS `date_operation`, sous un commentaire
//     qui affirme « dépense rattachée au jour, comme la vente ».
//
// CE QUE ÇA COÛTE À LA MARCHANDE : `caisseTheorique` = fond + ventes −
// dépenses, filtré sur `created_at::date`. Une dépense de 2 000 F faite à 23h55
// sans réseau et remontée à 00h05 laisse la caisse théorique d'hier trop HAUTE
// de 2 000 F, et celle d'aujourd'hui trop BASSE d'autant. C'est le chiffre
// qu'on confronte à ce qu'elle a réellement en main le soir : le correctif
// avait été fait pour le protéger, il le laisse faux par l'autre côté du livre.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

const jourISO = (decalageJours: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + decalageJours);
  return d.toISOString().split('T')[0];
};

// Numéros dans la plage RÉSERVÉE aux suites ARGENT (+22507888800xx) : les
// specs partagent UNE base pour toute la suite, et un numéro déjà pris rend un
// signup 409 — la suite passe seule et échoue en groupe. Cf. le garde-fou
// backend/test/unit/telephones-tests-uniques.spec.ts.
describe('ARGENT-1 — la dépense porte son jour comptable', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

  const PHONE = '+2250788880002';
  const HIER = jourISO(-1);
  const AUJOURDHUI = jourISO(0);

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
      .send({ phone: PHONE, firstName: 'Awa', lastName: 'Depense', role: 'marchand', genre: 'femme' });
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

  const depensesDuJour = async (jour: string): Promise<number> => {
    const [r] = await ds.query(
      `SELECT COALESCE(SUM(montant), 0)::float AS total
         FROM caisse_transactions
        WHERE marchand_id = $1 AND type = 'depense'
          AND statut <> 'annulee' AND created_at::date = $2::date`,
      [marchandId, jour],
    );
    return Number(r.total);
  };

  it('une dépense d’hier, remontée aujourd’hui, est comptée SUR HIER', async () => {
    const avantHier = await depensesDuJour(HIER);
    const avantAujourdhui = await depensesDuJour(AUJOURDHUI);

    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/depense')
      .set('Authorization', `Bearer ${token}`)
      .send({
        montant: '2000',
        description: 'Transport marché — payé hier soir, sans réseau',
        date_operation: `${HIER}T23:55:00.000Z`,
        idempotency_key: 'ARGENT1-DEP-001',
      });
    expect([200, 201]).toContain(r.status);

    // La caisse théorique d'HIER doit bouger de 2 000…
    expect(await depensesDuJour(HIER)).toBe(avantHier + 2000);
    // …et celle d'AUJOURD'HUI ne doit PAS bouger.
    expect(await depensesDuJour(AUJOURDHUI)).toBe(avantAujourdhui);
  });

  it('une dépense sans date reste sur aujourd’hui — rien ne change pour la saisie normale', async () => {
    const avantAujourdhui = await depensesDuJour(AUJOURDHUI);

    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/depense')
      .set('Authorization', `Bearer ${token}`)
      .send({ montant: '500', description: 'Sachets', idempotency_key: 'ARGENT1-DEP-002' });
    expect([200, 201]).toContain(r.status);

    expect(await depensesDuJour(AUJOURDHUI)).toBe(avantAujourdhui + 500);
  });

  it('une date aberrante est REFUSÉE comme pour la vente, pas silencieusement acceptée', async () => {
    const jourLointain = jourISO(-400);
    const avant = await depensesDuJour(jourLointain);

    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/depense')
      .set('Authorization', `Bearer ${token}`)
      .send({
        montant: '900',
        description: 'Dépense à date aberrante',
        date_operation: `${jourLointain}T10:00:00.000Z`,
        idempotency_key: 'ARGENT1-DEP-003',
      });
    expect([200, 201]).toContain(r.status);

    // Hors des bornes de `dateOperationValide` (10 min dans le futur, 14 jours
    // dans le passé) : la dépense existe, mais rattachée à AUJOURD'HUI. On
    // n'écrit jamais dans un mois clos sur la foi d'une horloge de téléphone.
    expect(await depensesDuJour(jourLointain)).toBe(avant);
  });
});
