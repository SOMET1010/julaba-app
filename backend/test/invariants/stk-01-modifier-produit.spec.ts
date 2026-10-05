// STK-01 — MODIFIER UN PRODUIT NE DOIT PAS EFFACER LE RESTE.
//
// LE DÉFAUT, relevé par la recette terrain (matrice v1.0, MAR-STK-002) :
// « erreur lors de l'enregistrement du prix produit ». Reproduit ici, et la
// cause n'est pas celle qu'on croit : la route `PUT /caisse/produits/:id` est
// un REMPLACEMENT COMPLET déguisé en modification.
//
//   UPDATE produits SET nom=$1, prix=$2, prix_achat=$3, categorie=$4,
//                       stock=$5, unite=$6, ...
//
// Aucun COALESCE sur ces six colonnes (seuls `seuil_alerte` et
// `date_peremption` en ont un). Tout champ que le téléphone n'envoie PAS est
// donc écrit à NULL. Deux conséquences, et la seconde est la pire :
//
//   • `nom` est NOT NULL → une modification qui ne renvoie pas le nom fait
//     ÉCHOUER la requête. C'est l'erreur que Patrick a vue à l'écran.
//
//   • `prix` est NULLABLE → une modification qui ne renvoie pas le prix
//     l'EFFACE, sans la moindre erreur. Le produit reste en rayon, son prix
//     n'existe plus, et la caisse le vendra à ce que l'aval voudra bien
//     reconstruire. C'est exactement ce que ce dépôt interdit : une
//     information d'argent perdue en silence.
//
// TROISIÈME FAUTE, silencieuse elle aussi : `RETURNING *` puis `result[0]`.
// Quand l'id n'appartient pas à cette marchande (ou n'existe pas), la requête
// ne touche aucune ligne, `result[0]` vaut `undefined`, et la route répond
// 200 { produit: undefined }. L'écran affiche « Produit mis à jour » sur une
// modification qui n'a jamais eu lieu.
//
// CE QUE CET INVARIANT EXIGE. Une modification PARTIELLE ne change que ce
// qu'elle nomme ; ce qu'elle tait reste tel quel ; et une modification qui ne
// porte sur rien le DIT (404) au lieu de mentir avec un 200.
//
// Numéros réservés à cette suite : +22507990008xx.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

const TEL = '+2250799000801';
const TEL_AUTRE = '+2250799000802';

describe('STK-01 — modifier un produit ne doit rien effacer en silence', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let tokenAutre: string;
  let marchandId: string;
  const api = () => request(app.getHttpServer());

  const inscrire = async (phone: string, nom: string) => {
    const su = await api().post('/api/v1/auth/signup')
      .send({ phone, firstName: 'Awa', lastName: nom, role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    const token = su.body.accessToken as string;
    // Le mot de passe provisoire doit être changé avant que le jeton serve :
    // sans ça, tout appel caisse répond 401 et les assertions ci-dessous
    // passeraient (ou échoueraient) pour la mauvaise raison.
    await api().post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
    return { token, id: su.body.user.id as string };
  };

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

    const a = await inscrire(TEL, 'Stk01');
    token = a.token; marchandId = a.id;
    tokenAutre = (await inscrire(TEL_AUTRE, 'Stk01Bis')).token;
  }, 90000);

  afterAll(async () => { if (app) await app.close(); });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  /** La ligne relue EN BASE, bornée à CETTE marchande. */
  const produitEnBase = async (id: string) => {
    const [p] = await ds.query(
      `SELECT nom, prix, prix_achat, categorie, stock, unite, seuil_alerte
         FROM produits WHERE id = $1 AND marchand_id = $2 LIMIT 1`,
      [id, marchandId],
    );
    return p;
  };

  const creer = async (corps: Record<string, unknown>) => {
    const r = await auth(api().post('/api/v1/caisse/produits')).send(corps);
    expect([200, 201]).toContain(r.status);
    return r.body.produit.id as string;
  };

  const COMPLET = {
    nom: 'Tomate', prix: 500, prix_achat: 300, categorie: 'legumes',
    stock: 20, unite: 'kg', seuil_alerte: 5,
  };

  it('une modification PARTIELLE ne change que ce qu’elle nomme', async () => {
    const id = await creer(COMPLET);

    // Elle corrige SON PRIX, et rien d'autre. C'est le geste de la recette.
    const r = await auth(api().put(`/api/v1/caisse/produits/${id}`)).send({ prix: 650 });
    expect(r.status).toBeLessThan(300);
    // LA FORME DE LA RÉPONSE COMPTE AUSSI. `dataSource.query` rend
    // `[lignes, nombre]` sur un UPDATE et les lignes sur un INSERT ; l'ancien
    // code faisait `result[0]` dans les deux cas et répondait donc
    // `{ produit: [ {…} ] }` — un tableau là où l'écran attend un produit.
    expect(Array.isArray(r.body.produit)).toBe(false);
    expect(r.body.produit?.id).toBe(id);
    expect(Number(r.body.produit?.prix)).toBe(650);

    const p = await produitEnBase(id);
    expect(Number(p.prix)).toBe(650);
    // ── CE QUI NE DEVAIT PAS BOUGER ──────────────────────────────────────
    expect(p.nom).toBe('Tomate');
    expect(Number(p.prix_achat)).toBe(300);
    expect(p.categorie).toBe('legumes');
    expect(Number(p.stock)).toBe(20);
    expect(p.unite).toBe('kg');
    expect(Number(p.seuil_alerte)).toBe(5);
  }, 60000);

  it('modifier le STOCK n’efface pas le prix — la perte silencieuse', async () => {
    const id = await creer({ ...COMPLET, nom: 'Piment', prix: 150 });

    const r = await auth(api().put(`/api/v1/caisse/produits/${id}`)).send({ stock: 8 });
    expect(r.status).toBeLessThan(300);

    const p = await produitEnBase(id);
    expect(Number(p.stock)).toBe(8);
    // LE CŒUR DE L'INVARIANT. Un prix absent du corps n'est pas un prix à zéro,
    // et encore moins un prix effacé : c'est un prix dont on n'a pas parlé.
    expect(p.prix).not.toBeNull();
    expect(Number(p.prix)).toBe(150);
    expect(p.nom).toBe('Piment');
  }, 60000);

  it('modifier le prix d’un produit qui n’est pas à elle ne répond pas « c’est fait »', async () => {
    const id = await creer({ ...COMPLET, nom: 'Gombo' });

    // Une autre marchande tente la même modification.
    const r = await request(app.getHttpServer())
      .put(`/api/v1/caisse/produits/${id}`)
      .set('Authorization', `Bearer ${tokenAutre}`)
      .send({ prix: 1 });
    expect(r.status).toBeGreaterThanOrEqual(400);

    // Et le produit n'a pas bougé.
    expect(Number((await produitEnBase(id)).prix)).toBe(500);
  }, 60000);

  it('un identifiant inconnu est refusé, pas confirmé', async () => {
    const r = await auth(api().put('/api/v1/caisse/produits/00000000-0000-0000-0000-000000000000'))
      .send({ prix: 900 });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
  }, 60000);

  it('une modification COMPLÈTE écrit bien tout ce qu’elle nomme', async () => {
    // Non-régression : le chemin que l'écran emprunte aujourd'hui (il renvoie
    // tous les champs) doit continuer de fonctionner à l'identique.
    const id = await creer({ ...COMPLET, nom: 'Igname' });
    const r = await auth(api().put(`/api/v1/caisse/produits/${id}`)).send({
      nom: 'Igname blanche', prix: 900, prix_achat: 600, categorie: 'tubercules',
      stock: 12, unite: 'tas', seuil_alerte: 3,
    });
    expect(r.status).toBeLessThan(300);

    const p = await produitEnBase(id);
    expect(p.nom).toBe('Igname blanche');
    expect(Number(p.prix)).toBe(900);
    expect(Number(p.prix_achat)).toBe(600);
    expect(p.categorie).toBe('tubercules');
    expect(Number(p.stock)).toBe(12);
    expect(p.unite).toBe('tas');
    expect(Number(p.seuil_alerte)).toBe(3);
  }, 60000);

  it('vider la case du prix ne le met pas à zéro — le piège de Number("")', async () => {
    // L'écran remet le champ à `''` quand la marchande l'efface. `Number('')`
    // vaut zéro : sans garde, vider la case aurait écrit un prix de zéro, et
    // le produit serait parti en caisse à zéro franc.
    const id = await creer({ ...COMPLET, nom: 'Manioc', prix: 200 });
    const r = await auth(api().put(`/api/v1/caisse/produits/${id}`)).send({ prix: '', stock: 30 });
    expect(r.status).toBeLessThan(300);

    const p = await produitEnBase(id);
    expect(Number(p.stock)).toBe(30);       // ce qu'elle a saisi passe
    expect(Number(p.prix)).toBe(200);       // ce qu'elle a vidé ne devient pas zéro
  }, 60000);

  it('un prix explicitement remis à zéro est écrit — zéro est une réponse', async () => {
    // La contrepartie de tout ce qui précède, et elle compte autant : « absent »
    // veut dire « on n'en a pas parlé », PAS « zéro ». Mais un zéro ÉCRIT par la
    // marchande est un choix, et il doit passer.
    const id = await creer({ ...COMPLET, nom: 'Échantillon', prix: 500 });
    const r = await auth(api().put(`/api/v1/caisse/produits/${id}`)).send({ prix: 0 });
    expect(r.status).toBeLessThan(300);
    expect(Number((await produitEnBase(id)).prix)).toBe(0);
  }, 60000);
});
