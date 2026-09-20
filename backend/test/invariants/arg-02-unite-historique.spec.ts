// ARG-02 — L'HISTORIQUE NE DÉPEND PLUS DU CATALOGUE D'AUJOURD'HUI.
//
// LA RÈGLE, telle que Patrick l'a écrite le 19/09/2026 : « ne jamais faire
// dépendre l'historique de l'état actuel du catalogue ». Une marchande qui
// repasse son piment du tas au kilo ne doit pas voir ses ventes passées
// « −5 tas » devenir « −5 kg ». Aucune vente n'a bougé ; c'est le sens de son
// historique qui changerait sous elle.
//
// CE QUI RESTAIT OUVERT après B2. L'unité était bien figée au mouvement, mais
// la lecture écrivait `COALESCE(sm.unite, p.unite)` : pour les mouvements
// antérieurs, sans unité figée, elle allait la chercher dans le catalogue
// courant. C'était conserver le défaut sous couvert de le corriger. « Au
// mieux, faute de pouvoir l'inventer rétroactivement » était un mauvais
// raisonnement : une unité fausse n'est pas mieux qu'une unité absente, elle
// est pire — parce qu'elle a l'air juste.
//
// CE TEST TRAVERSE : écriture du ledger → modification du catalogue APRÈS →
// lecture HTTP réelle. Un test de fonction n'aurait rien prouvé, puisque le
// défaut vivait dans le SQL de lecture.
//
// Numéros réservés à cette suite : +22507990002xx.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

const TEL = '+2250799000201';

describe('ARG-02 — l’unité d’un mouvement vient du mouvement, ou de nulle part', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;
  let produitId: string;
  const api = () => request(app.getHttpServer());

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

    const su = await api().post('/api/v1/auth/signup')
      .send({ phone: TEL, firstName: 'Awa', lastName: 'Arg02', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    // Un compte neuf naît avec `mustChangePassword` : sans ça, tout appel
    // authentifié repart en 401 et on croirait à un défaut d'autorisation.
    await api().post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });

    // Le piment, vendu AU TAS. C'est l'unité du jour de la vente.
    const [p] = await ds.query(
      `INSERT INTO produits (marchand_id, nom, stock, prix, unite, categorie, actif)
       VALUES ($1, 'Piment', 20, 500, 'tas', 'Legumes', true) RETURNING id`,
      [marchandId]);
    produitId = p.id;
  }, 90000);

  afterAll(async () => { if (app) await app.close(); });

  const lire = async () => {
    const r = await api().get(`/api/v1/stocks/${produitId}/mouvements`)
      .set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    return r.body.mouvements as { id: string; unite: string | null; quantite_affichee: number }[];
  };

  /** Une sortie écrite comme la caisse l'écrit, avec ou sans unité figée. */
  const ecrireMouvement = async (unite: string | null, quantite: number) => {
    const [m] = await ds.query(
      // Mêmes colonnes que l'écriture réelle de la caisse
      // (`caisse-rest.controller.ts`), `stock_avant` compris : un mouvement
      // fabriqué autrement ne prouverait rien sur le mouvement réel.
      `INSERT INTO stock_mouvements
         (marchand_id, produit_id, produit_nom, stock_avant, quantite_demandee,
          quantite_retranchee, manquant, type, unite)
       VALUES ($1, $2, 'Piment', 20, $3, $3, 0, 'vente', $4) RETURNING id`,
      [marchandId, produitId, quantite, unite]);
    return m.id as string;
  };

  it('une sortie faite AU TAS reste au tas après passage du catalogue au kilo', async () => {
    const id = await ecrireMouvement('tas', 5);

    // La marchande change d'unité APRÈS la vente. C'est son droit le plus strict.
    await ds.query(`UPDATE produits SET unite = 'kg' WHERE id = $1`, [produitId]);

    const mouvement = (await lire()).find((m) => m.id === id);
    expect(mouvement).toBeDefined();
    expect(mouvement!.unite).toBe('tas');
    // …et surtout PAS l'unité d'aujourd'hui.
    expect(mouvement!.unite).not.toBe('kg');
    expect(mouvement!.quantite_affichee).toBe(5);
  }, 60000);

  it('une sortie SANS unité figée renvoie null — jamais l’unité du catalogue', async () => {
    // Le cas des lignes écrites avant que l'unité soit figée (B2). Le catalogue
    // dit « kg » aujourd'hui ; personne ne sait dans quelle unité cette sortie
    // a été faite. La seule réponse honnête est « je ne sais pas ».
    const id = await ecrireMouvement(null, 3);
    const [cat] = await ds.query(`SELECT unite FROM produits WHERE id = $1`, [produitId]);
    expect(cat.unite).toBe('kg'); // le repli, s'il existait encore, donnerait ceci

    const mouvement = (await lire()).find((m) => m.id === id);
    expect(mouvement).toBeDefined();
    expect(mouvement!.unite).toBeNull();
  }, 60000);

  it('changer encore le catalogue ne change AUCUN mouvement passé', async () => {
    const avant = await lire();
    await ds.query(`UPDATE produits SET unite = 'sac' WHERE id = $1`, [produitId]);
    const apres = await lire();
    // L'historique complet est identique, ligne à ligne.
    expect(apres).toEqual(avant);
    // Et aucune ligne ne porte l'unité qu'on vient d'écrire au catalogue.
    expect(apres.map((m) => m.unite)).not.toContain('sac');
  }, 60000);

  it('la lecture du ledger ne joint plus le catalogue du tout', async () => {
    // Preuve structurelle, en plus des preuves de comportement : si la
    // jointure revenait, le repli pourrait revenir avec elle sans bruit.
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const src = readFileSync(
      join(__dirname, '..', '..', 'src', 'stocks-rest', 'stocks-rest.controller.ts'), 'utf8');
    // On analyse le CODE, pas les commentaires — ceux-ci expliquent justement
    // ce qu'on a retiré et citent l'ancienne requête.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
    expect(code).not.toMatch(/LEFT\s+JOIN\s+produits/i);
    expect(code).not.toMatch(/COALESCE\s*\(\s*sm\.unite/i);
  });
});
