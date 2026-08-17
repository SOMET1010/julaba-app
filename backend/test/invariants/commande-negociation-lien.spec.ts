// Lien Commande ↔ Négociation — la commande née d'une négociation porte le lien.
//
// Propriété attendue (🟢 après ce lot) : quand un vendeur ACCEPTE une
// négociation, la commande créée porte `negociation_id` = l'id de la
// négociation, et GET /commandes l'expose (le front s'en sert pour relier une
// commande à son prix négocié — jusqu'ici le lien ne vivait que dans `notes`,
// informel). On vérifie aussi le BACKFILL de la migration : l'historique
// (lien dans les notes) est reclassé, et un id inconnu n'est PAS posé.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { CommandeNegociationLink1780600000000 } from '../../src/database/migrations/1780600000000-CommandeNegociationLink';

describe('Lien Commande ↔ Négociation (🟢)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let marchandToken: string;
  let producteurToken: string;
  let producteurId: string;

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
    await app.get(DbInitService, { strict: false }).runInit();

    // Schéma de test bâti par synchronize+DbInit ; on exécute la migration
    // ADDITIVE (source unique du DDL) — idempotente (IF NOT EXISTS).
    {
      const qr = ds.createQueryRunner();
      await new CommandeNegociationLink1780600000000().up(qr);
      await qr.release();
    }

    // La garde JWT refuse tout accès tant que le mot de passe provisoire (0000)
    // n'a pas été changé (« Changement de mot de passe requis ») — même rituel
    // signup → change-password que la suite R7.
    const creer = async (phone: string, firstName: string, role: string, genre: string) => {
      const su = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({ phone, firstName, lastName: 'Lien', role, genre });
      expect([200, 201]).toContain(su.status);
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${su.body.accessToken}`)
        .send({ oldPassword: '0000', newPassword: '1234' });
      return { token: su.body.accessToken as string, id: su.body.user.id as string };
    };
    const m = await creer('+2250700000091', 'Mariam', 'marchand', 'femme');
    marchandToken = m.token;
    const p = await creer('+2250700000092', 'Benito', 'producteur', 'homme');
    producteurToken = p.token;
    producteurId = p.id;
  }, 60000);

  afterAll(async () => {
    if (ds?.isInitialized) {
      // Base partagée entre suites : on retire nos données pour ne pas polluer.
      await ds.query(`DELETE FROM commandes WHERE produit LIKE 'IgnameLien%'`);
      await ds.query(`DELETE FROM negociations WHERE produit LIKE 'IgnameLien%'`);
    }
    if (app) await app.close();
  });

  it('accepter une négociation crée une commande portant negociation_id, exposé par GET /commandes', async () => {
    // Le marchand propose un prix au producteur.
    const prop = await request(app.getHttpServer())
      .post('/api/v1/commandes/negociation')
      .set('Authorization', `Bearer ${marchandToken}`)
      .send({ vendeurId: producteurId, produit: 'IgnameLien', quantite: 50, prixOriginal: 400, prixPropose: 300, unite: 'kg' });
    expect([200, 201]).toContain(prop.status);
    const negId: string = prop.body.negociation.id;
    expect(negId).toBeTruthy();

    // Le producteur accepte → commande CONFIRMEE liée.
    const rep = await request(app.getHttpServer())
      .patch(`/api/v1/commandes/negociation/${negId}/repondre`)
      .set('Authorization', `Bearer ${producteurToken}`)
      .send({ statut: 'accepte' });
    expect(rep.status).toBe(200);
    expect(rep.body.commande).toBeTruthy();
    expect(rep.body.commande.negociationId).toBe(negId);

    // Le lien est en base…
    const rows = await ds.query(`SELECT negociation_id FROM commandes WHERE id = $1`, [rep.body.commande.id]);
    expect(rows[0].negociation_id).toBe(negId);

    // …et exposé par l'API liste, côté marchand comme côté vendeur.
    for (const token of [marchandToken, producteurToken]) {
      const liste = await request(app.getHttpServer())
        .get('/api/v1/commandes')
        .set('Authorization', `Bearer ${token}`);
      expect(liste.status).toBe(200);
      const cmd = (liste.body.commandes as any[]).find(c => c.id === rep.body.commande.id);
      expect(cmd).toBeTruthy();
      expect(cmd.negociationId).toBe(negId);
    }
  });

  it('backfill : le lien historique dans les notes est reclassé, un id inconnu ne l\'est pas', async () => {
    // Négociation réelle (cible du backfill).
    const prop = await request(app.getHttpServer())
      .post('/api/v1/commandes/negociation')
      .set('Authorization', `Bearer ${marchandToken}`)
      .send({ vendeurId: producteurId, produit: 'IgnameLienHisto', quantite: 10, prixOriginal: 400, prixPropose: 350, unite: 'kg' });
    const negId: string = prop.body.negociation.id;

    // Deux commandes « historiques » sans lien : l'une pointe une négociation
    // réelle via ses notes, l'autre un uuid inconnu.
    const [histo] = await ds.query(
      `INSERT INTO commandes (vendeur_id, type, produit, quantite, prix_unitaire, total, statut, date_commande, notes)
       VALUES ($1, 'achat', 'IgnameLienHisto', 10, 350, 3500, 'confirmee', now(), $2) RETURNING id`,
      [producteurId, 'Issu de negociation ' + negId],
    );
    const [orphelin] = await ds.query(
      `INSERT INTO commandes (vendeur_id, type, produit, quantite, prix_unitaire, total, statut, date_commande, notes)
       VALUES ($1, 'achat', 'IgnameLienOrphelin', 5, 300, 1500, 'confirmee', now(), $2) RETURNING id`,
      [producteurId, 'Issu de negociation 00000000-0000-4000-8000-000000000000'],
    );

    // Rejouer la migration (idempotente) → backfill.
    {
      const qr = ds.createQueryRunner();
      await new CommandeNegociationLink1780600000000().up(qr);
      await qr.release();
    }

    const [h] = await ds.query(`SELECT negociation_id FROM commandes WHERE id = $1`, [histo.id]);
    expect(h.negociation_id).toBe(negId);
    const [o] = await ds.query(`SELECT negociation_id FROM commandes WHERE id = $1`, [orphelin.id]);
    expect(o.negociation_id).toBeNull();

    await ds.query(`DELETE FROM commandes WHERE id IN ($1, $2)`, [histo.id, orphelin.id]);
  });
});
