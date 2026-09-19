// ARGENT-2 — Le chiffre montré aux institutions doit être une RECETTE.
//
// PREUVE QUI TRAVERSE : ventes et dépenses réelles écrites par l'API caisse ->
// colonnes persistées -> agrégats servis aux écrans administrateur.
//
// LE DÉFAUT : `SELECT COALESCE(SUM(montant), 0) AS revenus FROM
// caisse_transactions` — sans filtre sur `type`, sans filtre sur `statut`.
// `montant` est une valeur ABSOLUE dont le sens vit dans une AUTRE colonne
// (`type`) et la validité dans une TROISIÈME (`statut`). Tout consommateur qui
// les oublie obtient un chiffre faux, et ici ils sont oubliés.
//
// Conséquence : les DÉPENSES des marchandes sont additionnées aux recettes et
// appelées « revenus », et les ventes ANNULÉES sont comptées comme encaissées.
// Ce n'est pas un écran de marchande : c'est le chiffre sur lequel le pilote
// est jugé de l'extérieur. Il surévalue le volume du montant exact de ce que
// les marchandes ont dépensé.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User } from '../../src/users/entities/user.entity';

describe('ARGENT-2 — les agrégats administrateur disent une recette, pas une somme', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let tokenMarchande: string;
  let tokenAdmin: string;

  const PHONE = '+2250700000093';
  const VENTE_VALIDE = 40000;
  const VENTE_ANNULEE = 15000;
  const DEPENSE = 12000;
  /** La seule réponse juste : ce que les clientes ont réellement laissé. */
  const RECETTE_REELLE = VENTE_VALIDE;
  /** Ce que le code répondait : ventes + annulée + dépense. */
  const SOMME_AVEUGLE = VENTE_VALIDE + VENTE_ANNULEE + DEPENSE;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone: PHONE, firstName: 'Awa', lastName: 'Agregat', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    tokenMarchande = su.body.accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${tokenMarchande}`)
      .send({ oldPassword: '0000', newPassword: '1234' });

    // Un super_admin posé directement en base : l'inscription publique refuse
    // (à raison) tout rôle administratif — cf. m6-m8-role-escalation.
    const repo = ds.getRepository(User);
    const admin: any = await repo.save(repo.create({
      phone: '+2250700000094', firstName: 'Admin', lastName: 'Agregat', genre: 'homme',
      role: 'super_admin', status: 'actif', passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    tokenAdmin = await jwt.signAsync(
      { sub: admin.id, phone: admin.phone, role: admin.role },
      { secret: process.env.JWT_SECRET },
    );

    // Une journée de marché : une vente, une vente annulée, une dépense.
    const venteOk = await request(app.getHttpServer())
      .post('/api/v1/caisse/vente')
      .set('Authorization', `Bearer ${tokenMarchande}`)
      .send({ montant: String(VENTE_VALIDE), produits: [{ nom: 'Riz', quantite: 1 }], idempotency_key: 'A2-V1' });
    expect([200, 201]).toContain(venteOk.status);

    const venteKo = await request(app.getHttpServer())
      .post('/api/v1/caisse/vente')
      .set('Authorization', `Bearer ${tokenMarchande}`)
      .send({ montant: String(VENTE_ANNULEE), produits: [{ nom: 'Riz', quantite: 1 }], idempotency_key: 'A2-V2' });
    expect([200, 201]).toContain(venteKo.status);
    const idAnnulee = venteKo.body?.transaction?.id;
    expect(idAnnulee).toBeTruthy();
    const annul = await request(app.getHttpServer())
      .patch(`/api/v1/caisse/transactions/${idAnnulee}/annuler`)
      .set('Authorization', `Bearer ${tokenMarchande}`)
      .send({});
    expect([200, 201]).toContain(annul.status);

    const dep = await request(app.getHttpServer())
      .post('/api/v1/caisse/depense')
      .set('Authorization', `Bearer ${tokenMarchande}`)
      .send({ montant: String(DEPENSE), description: 'Transport', idempotency_key: 'A2-D1' });
    expect([200, 201]).toContain(dep.status);
  }, 90000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('les trois écritures sont bien en base, avec leurs types et statuts', async () => {
    const [r] = await ds.query(`
      SELECT
        COALESCE(SUM(montant) FILTER (WHERE type='vente'   AND statut <> 'annulee'),0)::float AS recette,
        COALESCE(SUM(montant) FILTER (WHERE type='vente'   AND statut = 'annulee'),0)::float AS annulee,
        COALESCE(SUM(montant) FILTER (WHERE type='depense'),0)::float                        AS depense
      FROM caisse_transactions`);
    expect(r.recette).toBe(RECETTE_REELLE);
    expect(r.annulee).toBe(VENTE_ANNULEE);
    expect(r.depense).toBe(DEPENSE);
  });

  it('GET /dashboard/stats : « revenus » ne compte NI les dépenses NI les ventes annulées', async () => {
    const r = await request(app.getHttpServer())
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(r.status).toBe(200);
    // La dépense d'une marchande n'est pas un revenu ; une vente annulée non plus.
    expect(Number(r.body.revenus)).toBe(RECETTE_REELLE);
    expect(Number(r.body.revenus)).not.toBe(SOMME_AVEUGLE);
  });

  // CE TEST DIT UN FAIT, PAS UN SOUHAIT. L'audit signalait un troisième agrégat
  // fautif, `misc-rest.controller.ts` @Get('transactions'). En le testant, on
  // découvre qu'il n'est JAMAIS ATTEINT : `TransactionsRestController` déclare
  // @Controller('transactions') avec un @Get() qui gagne la route. Le handler de
  // misc-rest est une route MASQUÉE — du code qui a l'air vivant et ne l'est pas.
  //
  // Ce n'est donc pas un chiffre faux montré à quelqu'un ; c'est un piège pour
  // le prochain lecteur, qui corrigera une route que personne n'appelle. Son SQL
  // a quand même été aligné sur la règle, et le masquage est écrit à côté.
  it('GET /transactions est servi par TransactionsRestController, pas par misc-rest', async () => {
    const r = await request(app.getHttpServer())
      .get('/api/v1/transactions?limit=50')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(r.status).toBe(200);
    // La route vivante est une LISTE paginée par utilisateur : elle ne porte
    // aucun agrégat. Si `montant_total` apparaît un jour ici, c'est que le
    // masquage a changé — et il faudra revenir lire ce commentaire.
    expect(r.body.montant_total).toBeUndefined();
  });

  it('GET /admin/stats : le volume de caisse exclut les ventes annulées', async () => {
    const r = await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(r.status).toBe(200);
    // Aucune écriture de portefeuille dans cette base : le montant total se
    // réduit donc à la part caisse, qui doit exclure l'annulée.
    expect(Number(r.body.montant_total)).toBe(RECETTE_REELLE);
  });
});
