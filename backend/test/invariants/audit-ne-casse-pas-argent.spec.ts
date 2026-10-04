// Invariant — un audit en PANNE ne casse jamais le chemin de l'argent.
//
// La regle est explicite : l'audit apporte une information, il n'est pas une
// condition de la vente. On la PROUVE en remplacant `AuditService` par un
// double qui leve SYNCHRONEMENT — le pire cas, celui qu'un simple
// `try/catch` interne au service ne couvre pas.
//
// Si ce test tombe, c'est que la journalisation est devenue un prerequis de
// l'encaissement. C'est exactement ce qu'on refuse.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { AuditService } from '../../src/audit/audit.service';

describe('Invariant — un audit casse ne casse pas l’argent', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }) })
      // Double HOSTILE : leve a chaque appel, et de façon synchrone.
      .overrideProvider(AuditService)
      .useValue({ log: () => { throw new Error('audit indisponible (volontaire)'); } })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone: '+2250700000894', firstName: 'Awa', lastName: 'AuditKo', role: 'marchand', genre: 'femme' });
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

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
  const exige2xx = (r: request.Response, quoi: string) => {
    if (r.status >= 400) throw new Error(`${quoi} → HTTP ${r.status} ${JSON.stringify(r.body)}`);
    return r;
  };

  it('les trois mutations auditees aboutissent quand meme, et leurs effets metier sont intacts', async () => {
    const id = exige2xx(
      await auth(request(app.getHttpServer()).post('/api/v1/caisse/produits'))
        .send({ nom: 'Sorgho-KO', stock: 30, prix: 400, prix_achat: 250, unite: 'kg' }), 'creation').body.produit.id;

    // 1. annulation
    const v = exige2xx(await auth(request(app.getHttpServer()).post('/api/v1/caisse/vente'))
      .send({ montant: '800', produits: [{ nom: 'Sorgho-KO', quantite: 2 }], idempotency_key: 'KO-1' }), 'vente');
    const a = await auth(request(app.getHttpServer()).patch(`/api/v1/caisse/transactions/${v.body.transaction.id}/annuler`)).send();
    expect(a.status).toBe(200);
    const tx = await ds.query('SELECT statut FROM caisse_transactions WHERE id = $1', [v.body.transaction.id]);
    expect(tx[0].statut).toBe('annulee');            // l'effet metier a bien eu lieu

    // 2. edition du prix
    const p = await auth(request(app.getHttpServer()).put(`/api/v1/caisse/produits/${id}`)).send({
      nom: 'Sorgho-KO', prix: 650, prix_achat: 300, categorie: 'Général', stock: 30, unite: 'kg',
    });
    expect(p.status).toBe(200);
    const apres = await ds.query('SELECT prix, prix_achat FROM produits WHERE id = $1', [id]);
    expect(Number(apres[0].prix)).toBe(650);
    expect(Number(apres[0].prix_achat)).toBe(300);

    // 3. desactivation
    const d = await auth(request(app.getHttpServer()).delete(`/api/v1/caisse/produits/${id}`)).send();
    expect(d.status).toBe(200);
    const fin = await ds.query('SELECT actif FROM produits WHERE id = $1', [id]);
    expect(fin[0].actif).toBe(false);

    // Et AUCUNE ligne d'audit, evidemment : le service est casse.
    const lignes = await ds.query('SELECT count(*)::int n FROM audit_logs WHERE user_id = $1::text', [marchandId]);
    expect(lignes[0].n).toBe(0);
  }, 60000);
});
