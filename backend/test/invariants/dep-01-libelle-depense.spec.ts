// DEP-01 — LE LIBELLÉ D'UNE DÉPENSE DOIT ARRIVER EN BASE.
//
// PREUVE QUI TRAVERSE : entrée métier (POST /caisse/depense, tel que le
// téléphone l'envoie RÉELLEMENT) -> contrôleur -> DONNÉE PERSISTÉE
// (`caisse_transactions.description`) -> RELECTURE en base. Vérifier qu'un
// champ existe dans un corps de requête ne prouve rien : c'est la ligne relue
// après coup qui doit porter le motif que la marchande a saisi.
//
// LE DÉFAUT : trois couches, deux noms.
//   - `CaisseContext.enregistrerDepense` envoie `{ montant, notes, … }` ;
//   - `caisse-rest.controller.enregistrerDepense` lit `body.description || ''` ;
//   - `caisse-transaction.entity.ts` n'a que la colonne `description`.
// Le motif tombe dans le vide, SANS ERREUR : la dépense est enregistrée, son
// montant est juste, et la ligne est muette. La même perte se reproduit au
// rejeu hors ligne, qui repousse le payload tel quel sur la même route.
//
// CE QUE ÇA COÛTE À LA MARCHANDE : une dépense sans motif n'est plus une
// dépense, c'est un trou. Le soir, « 2 000 F » sans « transport marché » ne se
// justifie devant personne — ni devant elle-même, ni devant un crédit.
//
// CONTRAT TENU ICI : `description` est le nom canonique (colonne, entité) ;
// `notes` est la forme HÉRITÉE, acceptée en TRANSITION parce que des files
// hors ligne portant `notes` dorment déjà sur les téléphones installés.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

// Numéro dans la plage RÉSERVÉE aux suites ARGENT (+22507888800xx) : les specs
// partagent UNE base pour toute la suite, et un numéro déjà pris rend un signup
// 409 — la suite passe seule et échoue en groupe. Cf. le garde-fou
// backend/test/unit/telephones-tests-uniques.spec.ts.
describe('DEP-01 — le libellé saisi est celui persisté', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

  const PHONE = '+2250788880007';

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
      .send({ phone: PHONE, firstName: 'Mariam', lastName: 'Libelle', role: 'marchand', genre: 'femme' });
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

  /** Relecture EN BASE — pas dans la réponse HTTP : c'est la ligne persistée
   *  qui compte, c'est elle que la marchande relira demain. */
  const libellePersiste = async (cle: string): Promise<string | null> => {
    const [row] = await ds.query(
      `SELECT description FROM caisse_transactions
        WHERE marchand_id = $1 AND type = 'depense' AND idempotency_key = $2`,
      [marchandId, cle],
    );
    return row ? row.description : null;
  };

  it('le motif envoyé dans `notes` — la forme que le téléphone envoie AUJOURD’HUI — est persisté', async () => {
    const MOTIF = 'Transport marché — porteur de sacs';
    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/depense')
      .set('Authorization', `Bearer ${token}`)
      .send({ montant: '2000', notes: MOTIF, idempotency_key: 'DEP01-NOTES-001' });
    expect([200, 201]).toContain(r.status);

    // C'EST ICI QUE LE DÉFAUT SE VOIT : la dépense existe, son montant est
    // juste, et son libellé est vide.
    expect(await libellePersiste('DEP01-NOTES-001')).toBe(MOTIF);
  });

  it('le motif envoyé dans `description` — le contrat canonique — reste persisté', async () => {
    const MOTIF = 'Taxe mairie du jour';
    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/depense')
      .set('Authorization', `Bearer ${token}`)
      .send({ montant: '500', description: MOTIF, idempotency_key: 'DEP01-DESC-001' });
    expect([200, 201]).toContain(r.status);

    expect(await libellePersiste('DEP01-DESC-001')).toBe(MOTIF);
  });

  it('les deux formes ensemble : `description` est prioritaire, `notes` ne l’écrase jamais', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/depense')
      .set('Authorization', `Bearer ${token}`)
      .send({
        montant: '900',
        description: 'Sachets',
        notes: 'vieux motif de la file hors ligne',
        idempotency_key: 'DEP01-DEUX-001',
      });
    expect([200, 201]).toContain(r.status);

    expect(await libellePersiste('DEP01-DEUX-001')).toBe('Sachets');
  });

  it('sans aucun motif, la dépense passe quand même — le libellé n’est pas obligatoire', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/v1/caisse/depense')
      .set('Authorization', `Bearer ${token}`)
      .send({ montant: '300', idempotency_key: 'DEP01-VIDE-001' });
    expect([200, 201]).toContain(r.status);

    expect(await libellePersiste('DEP01-VIDE-001')).toBe('');
  });
});
