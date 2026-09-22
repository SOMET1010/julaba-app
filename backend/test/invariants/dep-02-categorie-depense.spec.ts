// DEP-02 — LA CATÉGORIE TOUCHÉE TRAVERSE JUSQU'À LA BASE, ET EN REVIENT.
//
// LE DÉFAUT, relevé par la recette terrain (matrice v1.0, MAR-DEP-001) :
// « la catégorie de dépense n'est pas enregistrée ». Vérifié dans le code, et
// c'était une chaîne rompue en quatre endroits :
//
//   1. l'écran ne gardait que le LIBELLÉ du bouton touché, pas l'identifiant ;
//   2. `enregistrerDepense` ne transportait pas de catégorie ;
//   3. cette route ne lisait pas `body.categorie` — la colonne `category` de
//      `caisse_transactions` existait et restait vide sur CHAQUE dépense ;
//   4. l'écran des dépenses la RECONSTRUISAIT alors par mots-clés français
//      dans le motif, et se trompait sur deux des onze catégories que l'écran
//      propose lui-même (« Taxe mairie » → « Autre », « École » → « Famille »).
//
// C'est l'interdit central de ce dépôt : « toute information qui a une
// incidence sur l'argent doit être soit conservée, soit explicitement marquée
// comme perdue ; jamais reconstruite implicitement en aval. »
//
// LA PREUVE TRAVERSE. Vérifier que la route répond 201 ne prouve rien : c'est
// la LIGNE RELUE EN BASE qui doit porter l'identifiant touché, et la réponse de
// `GET /caisse/transactions` qui doit le rendre à l'écran. Les deux sont ici.
//
// CE QUE CET INVARIANT EXIGE AUSSI, ET QUI EST LA MOITIÉ DE LA RÈGLE : une
// dépense sans catégorie reste SANS catégorie. Pas de repli sur « autre » —
// « autre » est un choix que la marchande peut faire ; lui donner aussi le sens
// de « on ne sait pas » remettrait deux sens sur une même donnée. Et une
// catégorie inventée par le téléphone (identifiant hors liste, ou le libellé
// français à la place de l'identifiant) n'est pas écrite.
//
// Numéros réservés à cette suite : +22507990007xx.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

const TEL = '+2250799000701';

describe('DEP-02 — la catégorie touchée est conservée, jamais devinée', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;
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
      .send({ phone: TEL, firstName: 'Awa', lastName: 'Dep02', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    await api().post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
    await api().post('/api/v1/caisse/session/ouvrir')
      .set('Authorization', `Bearer ${token}`).send({ fond_initial: 10000 });
  }, 90000);

  afterAll(async () => { if (app) await app.close(); });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  /** La ligne relue EN BASE, bornée à CETTE marchande : les suites partagent
   *  une base, et une lecture non bornée mesure le travail des autres. */
  const ligneEnBase = async (id: string) => {
    const [l] = await ds.query(
      `SELECT category, description, montant FROM caisse_transactions
        WHERE id = $1 AND marchand_id = $2 LIMIT 1`,
      [id, marchandId],
    );
    return l;
  };

  const noterDepense = async (corps: Record<string, unknown>) => {
    const r = await auth(api().post('/api/v1/caisse/depense')).send({
      montant: 1500, mode_paiement: 'especes', ...corps,
    });
    expect([200, 201]).toContain(r.status);
    const id = r.body.transaction?.id ?? r.body.id;
    expect(id).toBeTruthy();
    return id as string;
  };

  // LES ONZE, telles que l'écran les propose. Si cette liste et celle du
  // téléphone divergent, c'est ici qu'on le voit.
  const LES_ONZE = [
    'transport', 'repas', 'taxe_mairie', 'loyer', 'famille', 'tontine',
    'sante', 'telephone', 'marchandise', 'ecole', 'autre',
  ];

  it('chacune des onze catégories touchées arrive en base, et revient à l’écran', async () => {
    const ids: Record<string, string> = {};
    for (const categorie of LES_ONZE) {
      ids[categorie] = await noterDepense({
        description: 'Dépense ' + categorie, categorie,
        idempotency_key: 'dep02-' + categorie,
      });
    }

    // ── EN BASE ──────────────────────────────────────────────────────────
    for (const categorie of LES_ONZE) {
      const ligne = await ligneEnBase(ids[categorie]);
      expect(ligne).toBeTruthy();
      expect(ligne.category).toBe(categorie);
    }

    // ── ET JUSQU'À L'ÉCRAN ───────────────────────────────────────────────
    // La colonne peut être juste et la réponse l'omettre : c'est exactement ce
    // qui se passait côté téléphone, où une projection sur deux la perdait.
    const liste = await auth(api().get('/api/v1/caisse/transactions'));
    expect(liste.status).toBe(200);
    const parId = new Map<string, any>((liste.body as any[]).map(t => [t.id, t]));
    for (const categorie of LES_ONZE) {
      expect(parId.get(ids[categorie])?.category).toBe(categorie);
    }

    // ── LES DEUX QUE L'ANCIEN AFFICHAGE NE SAVAIT PAS RENDRE ─────────────
    // « Taxe mairie » n'avait aucun mot-clé (→ « Autre ») et « École » tombait
    // sur le mot-clé de FAMILLE. Elles reviennent maintenant telles quelles.
    expect((await ligneEnBase(ids['taxe_mairie'])).category).toBe('taxe_mairie');
    expect((await ligneEnBase(ids['ecole'])).category).toBe('ecole');
    expect((await ligneEnBase(ids['ecole'])).category).not.toBe('famille');
  }, 120000);

  it('sans catégorie, la dépense reste SANS catégorie — pas de repli sur « autre »', async () => {
    const id = await noterDepense({
      description: 'Médicaments', idempotency_key: 'dep02-sans-categorie',
    });
    const ligne = await ligneEnBase(id);
    expect(ligne.category).toBeNull();
    // Le motif, lui, est bien là : DEP-01 tient toujours.
    expect(ligne.description).toBe('Médicaments');
  }, 60000);

  it('une catégorie que l’écran ne propose pas n’est pas écrite', async () => {
    // Un téléphone plus ancien, une file hors ligne mal formée, un client tiers :
    // la liste est FERMÉE et elle est vérifiée côté serveur. Mieux vaut une
    // dépense sans catégorie — cas que l'écran sait nommer — qu'une catégorie
    // inventée qui pèserait sur un camembert de dépenses.
    const inventee = await noterDepense({
      description: 'Essence', categorie: 'carburant', idempotency_key: 'dep02-hors-liste',
    });
    expect((await ligneEnBase(inventee)).category).toBeNull();

    // LE LIBELLÉ N'EST PAS UN IDENTIFIANT. C'est la confusion d'origine :
    // l'écran envoyait « Taxe mairie » là où l'identifiant est `taxe_mairie`.
    const libelle = await noterDepense({
      description: 'Taxe mairie', categorie: 'Taxe mairie', idempotency_key: 'dep02-libelle',
    });
    expect((await ligneEnBase(libelle)).category).toBeNull();

    // Et rien d'autre n'a bougé : le motif reste celui qu'elle a saisi.
    expect((await ligneEnBase(libelle)).description).toBe('Taxe mairie');
  }, 60000);

  it('la catégorie ne change pas la comptabilité de la journée', async () => {
    // Garde-fou de non-régression : DEP-02 touche au SENS d'une dépense, pas à
    // son montant. La somme des dépenses de cette marchande doit valoir
    // exactement ce qui a été noté ci-dessus — onze + une + deux, à 1 500 F.
    const [somme] = await ds.query(
      `SELECT COALESCE(SUM(montant), 0) AS total, COUNT(*)::int AS lignes
         FROM caisse_transactions
        WHERE marchand_id = $1 AND type = 'depense' AND statut = 'validee'`,
      [marchandId],
    );
    expect(Number(somme.lignes)).toBe(14);
    expect(Number(somme.total)).toBe(14 * 1500);
  }, 60000);
});
