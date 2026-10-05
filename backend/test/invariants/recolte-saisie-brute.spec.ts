// Invariant — une récolte conserve CE QUI A ÉTÉ SAISI, pas seulement un poids
// dérivé.
//
// LE DÉFAUT. Un producteur déclare « 3 paniers de gombo ». L'écran applique un
// facteur GLOBAL (panier = 10 kg, quel que soit le produit) et envoyait
// `quantite = 30, unite = 'kg'`. La saisie réelle n'était enregistrée NULLE
// PART : le poids était inventé, et aucune correction future ne pouvait
// retrouver ce qui avait été dit. À chaque récolte, une donnée fausse de plus.
//
// CE LOT NE RÉINTERPRÈTE RIEN. `quantite` reste en kilos — toucher à une
// colonne déjà peuplée serait pire que le défaut. On persiste la saisie brute
// À CÔTÉ, ce qui rend la conversion réversible : le jour où le facteur devient
// propre au produit, ces lignes sont recalculables.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import {
  NOM_CONTRAINTE_SAISIE_BRUTE,
  CHECK_SAISIE_BRUTE,
  valideSaisieBrute,
  normaliseSaisieBrute,
} from '../../src/database/contrainte-saisie-recolte';
import { CAS_SAISIE_BRUTE } from '../cas-saisie-brute';

describe('Invariant — la saisie brute d’une récolte survit', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
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

    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone: '+2250700000895', firstName: 'Kone', lastName: 'Recolte', role: 'producteur', genre: 'homme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    producteurId = su.body.user.id;
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
  const declarer = (corps: Record<string, unknown>) =>
    auth(request(app.getHttpServer()).post('/api/v1/recoltes')).send(corps);
  const enBase = async (id: string) =>
    (await ds.query(
      `SELECT quantite, unite, prix_unitaire, quantite_saisie, unite_saisie, facteur_saisie
         FROM recoltes WHERE id = $1`, [id],
    ))[0];

  it('les trois colonnes de saisie brute existent, et sont NULLABLES', async () => {
    const cols = await ds.query(
      `SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_name = 'recoltes' AND column_name = ANY($1::text[]) ORDER BY column_name`,
      [['quantite_saisie', 'unite_saisie', 'facteur_saisie']],
    );
    expect(cols.map((c: { column_name: string }) => c.column_name)).toEqual(
      ['facteur_saisie', 'quantite_saisie', 'unite_saisie'],
    );
    // NULLABLES : les recoltes anterieures restent valides, et leur vide est
    // une information juste — on ne sait pas ce qui a ete tape.
    for (const c of cols) expect(c.is_nullable).toBe('YES');
  }, 60000);

  it('DbInit SEUL pose ces colonnes — le chemin de production, isolé', async () => {
    // POURQUOI CE TEST EXISTE, ET IL EST LE PLUS IMPORTANT DU LOT.
    // La suite d'invariants tourne avec `DB_SYNCHRONIZE=true` (env.ts) : sur une
    // base vierge, TypeORM cree le schema depuis les ENTITES. Les trois colonnes
    // apparaissent donc meme si `db-init` ne les posait pas — le test « elles
    // existent » passait en neutralisant db-init (mesure).
    //
    // Or en PRODUCTION, sur une base EXISTANTE, `computeBootDbFlags` renvoie
    // `synchronize: 'false'` (schema-flags.ts) et `DB_MIGRATIONS_RUN` vaut
    // explicitement "false" (render.yaml:154) : `db-init` est le SEUL mecanisme
    // qui ajoute une colonne a une table deja creee.
    //
    // On isole donc sa contribution : on RETIRE les colonnes, on rappelle
    // `runInit()`, et on constate qu'elles reviennent. Meme discipline que
    // `schema-ledger-sans-migration.spec.ts`, adaptee a une table qui, elle,
    // POSSEDE une entite — c'est ce qui rendait le piege invisible.
    for (const c of ['quantite_saisie', 'unite_saisie', 'facteur_saisie']) {
      await ds.query(`ALTER TABLE recoltes DROP COLUMN IF EXISTS ${c}`);
    }
    const apresRetrait = await ds.query(
      `SELECT count(*)::int n FROM information_schema.columns
        WHERE table_name = 'recoltes' AND column_name = ANY($1::text[])`,
      [['quantite_saisie', 'unite_saisie', 'facteur_saisie']],
    );
    expect(apresRetrait[0].n).toBe(0);

    await app.get(DbInitService, { strict: false }).runInit();

    const apresInit = await ds.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'recoltes' AND column_name = ANY($1::text[]) ORDER BY column_name`,
      [['quantite_saisie', 'unite_saisie', 'facteur_saisie']],
    );
    expect(apresInit.map((c: { column_name: string }) => c.column_name)).toEqual(
      ['facteur_saisie', 'quantite_saisie', 'unite_saisie'],
    );

    // ET LE TYPE, PAS SEULEMENT LE NOM. Mesure : db-init ecrivait `numeric` nu
    // la ou l'entite declare numeric(12,3)/(12,4). Resultat, une base de
    // production et une base neuve n'avaient PAS le meme type — et aucun gate
    // ne le voyait : `verify:dbinit-subsumed` compare migration <-> db-init
    // (tous deux nus) et l'empreinte du pilote ne retient que les NOMS.
    // Deux chemins de construction doivent donner la meme colonne, sinon
    // « ca marche en test » ne dit rien de la production.
    const types = await ds.query(
      `SELECT column_name, data_type, numeric_precision, numeric_scale,
              character_maximum_length
         FROM information_schema.columns
        WHERE table_name = 'recoltes' AND column_name = ANY($1::text[])`,
      [['quantite_saisie', 'unite_saisie', 'facteur_saisie']],
    );
    const parNom = Object.fromEntries(types.map((c: Record<string, unknown>) => [c.column_name, c]));
    expect([parNom.quantite_saisie.numeric_precision, parNom.quantite_saisie.numeric_scale]).toEqual([12, 3]);
    expect([parNom.facteur_saisie.numeric_precision, parNom.facteur_saisie.numeric_scale]).toEqual([12, 4]);
    expect(parNom.unite_saisie.character_maximum_length).toBe(50);
  }, 60000);

  it('« 3 paniers » : le poids reste en kg, ET la saisie est conservée', async () => {
    const r = await declarer({
      produit: 'Gombo', quantite: 30, unite: 'kg', qualite: 'standard',
      date_recolte: '2026-10-04', prix_unitaire: 200,
      quantite_saisie: 3, unite_saisie: 'panier', facteur_saisie: 10,
    });
    expect([200, 201]).toContain(r.status);
    const ligne = await enBase(r.body.recolte.id);

    expect(Number(ligne.quantite)).toBe(30);              // colonne INCHANGEE
    expect(ligne.unite).toBe('kg');
    expect(Number(ligne.quantite_saisie)).toBe(3);        // ce qu'il a VRAIMENT dit
    expect(ligne.unite_saisie).toBe('panier');
    expect(Number(ligne.facteur_saisie)).toBe(10);

    // L'INVARIANT DU LOT : la conversion est reversible.
    expect(Number(ligne.quantite_saisie) * Number(ligne.facteur_saisie)).toBeCloseTo(Number(ligne.quantite), 1);
  }, 60000);

  it('l’argent reste exact : quantité × prix est identique des deux côtés', async () => {
    // 5 sacs a 45 000 F le sac = 225 000 F. Stocke : 500 kg a 450 F/kg.
    const r = await declarer({
      produit: 'Riz', quantite: 500, unite: 'kg', qualite: 'standard',
      date_recolte: '2026-10-04', prix_unitaire: 450,
      quantite_saisie: 5, unite_saisie: 'sac', facteur_saisie: 100,
    });
    const l = await enBase(r.body.recolte.id);
    const valeurSaisie = Number(l.quantite_saisie) * (Number(l.prix_unitaire) * Number(l.facteur_saisie));
    const valeurStockee = Number(l.quantite) * Number(l.prix_unitaire);
    expect(valeurStockee).toBeCloseTo(valeurSaisie, 2);
    expect(valeurStockee).toBe(225000);
  }, 60000);

  it('un ancien client qui n’envoie rien : NULL, jamais une valeur inventée', async () => {
    const r = await declarer({
      produit: 'Mais', quantite: 120, unite: 'kg', qualite: 'standard',
      date_recolte: '2026-10-04', prix_unitaire: 300,
    });
    expect([200, 201]).toContain(r.status);
    const l = await enBase(r.body.recolte.id);
    expect(Number(l.quantite)).toBe(120);
    expect(l.quantite_saisie).toBeNull();
    expect(l.unite_saisie).toBeNull();
    expect(l.facteur_saisie).toBeNull();
  }, 60000);

  // ── COMPATIBILITE ARRIERE : une ligne d'AVANT ce lot ────────────────────
  //
  // Toutes les recoltes deja en production portent trois NULL. Le lot serait
  // inutile s'il les rendait fragiles. On en fabrique une par SQL direct —
  // exactement la forme que la production contient — et on exige qu'elle reste
  // LISIBLE, MODIFIABLE et PUBLIABLE, sans qu'aucun chemin n'invente la saisie
  // manquante.
  describe('une recolte historique (trois NULL) reste pleinement utilisable', () => {
    let idAncien: string;

    beforeAll(async () => {
      const [l] = await ds.query(
        `INSERT INTO recoltes
           (user_id, produit, quantite, unite, qualite, date_recolte, statut,
            prix_unitaire, stock_disponible, stock_vendu)
         VALUES ($1, 'Igname historique', 300, 'kg', 'standard', CURRENT_DATE,
                 'declaree', 60, 300, 0)
         RETURNING id`,
        [producteurId],
      );
      idAncien = l.id;
      // La prémisse du test : la ligne porte bien trois NULL.
      const avant = await enBase(idAncien);
      expect(avant.quantite_saisie).toBeNull();
      expect(avant.unite_saisie).toBeNull();
      expect(avant.facteur_saisie).toBeNull();
    });

    it('LISIBLE — la liste la renvoie, et ne comble pas les trous', async () => {
      const r = await auth(request(app.getHttpServer()).get('/api/v1/recoltes'));
      expect(r.status).toBe(200);
      const trouvee = r.body.recoltes.find((x: { id: string }) => x.id === idAncien);
      expect(trouvee).toBeDefined();
      // AUCUNE INVENTION : les champs absents restent absents.
      expect(trouvee.quantiteSaisie ?? null).toBeNull();
      expect(trouvee.uniteSaisie ?? null).toBeNull();
      expect(trouvee.facteurSaisie ?? null).toBeNull();
      // Et le poids historique est rendu tel quel.
      expect(Number(trouvee.quantite)).toBe(300);
      expect(trouvee.unite).toBe('kg');
    });

    it('AFFICHABLE — la fiche unitaire repond', async () => {
      const r = await auth(request(app.getHttpServer()).get(`/api/v1/recoltes/${idAncien}`));
      expect(r.status).toBe(200);
      expect(r.body.recolte.id).toBe(idAncien);
      expect(r.body.recolte.uniteSaisie ?? null).toBeNull();
    });

    it('EXPLOITABLE — elle se modifie encore, et les NULL ne se remplissent pas tout seuls', async () => {
      const r = await auth(request(app.getHttpServer()).patch(`/api/v1/recoltes/${idAncien}`))
        .send({ statut: 'validee', notes: 'controle terrain' });
      expect(r.status).toBe(200);
      const apres = await enBase(idAncien);
      expect(apres.quantite_saisie).toBeNull();
      expect(apres.unite_saisie).toBeNull();
      expect(apres.facteur_saisie).toBeNull();
      expect(Number(apres.quantite)).toBe(300);
    });

    it('PUBLIABLE — elle part au marche comme avant', async () => {
      const ligne = await enBase(idAncien);
      const r = await auth(request(app.getHttpServer()).post('/api/v1/publications'))
        .send({
          produit: 'Igname historique', culture: 'Igname',
          quantite_disponible: Number(ligne.quantite),
          unite: ligne.unite,
          prix_unitaire: Number(ligne.prix_unitaire),
          qualite: 'standard', localisation: 'Korhogo',
          date_recolte: '2026-10-01', description: 'ligne anterieure au lot',
        });
      expect([200, 201]).toContain(r.status);
      // La publication porte le poids historique, pas une estimation refaite.
      const [pub] = await ds.query(
        `SELECT quantite_disponible, unite FROM publications
          WHERE user_id = $1 AND produit = 'Igname historique'`,
        [producteurId],
      );
      expect(Number(pub.quantite_disponible)).toBe(300);
      expect(pub.unite).toBe('kg');
    });
  });

  it('une saisie illisible ne devient pas un chiffre', async () => {
    const r = await declarer({
      produit: 'Igname', quantite: 50, unite: 'kg', qualite: 'standard',
      date_recolte: '2026-10-04', prix_unitaire: 400,
      quantite_saisie: 'beaucoup', unite_saisie: '   ', facteur_saisie: null,
    });
    expect([200, 201]).toContain(r.status);
    const l = await enBase(r.body.recolte.id);
    expect(l.quantite_saisie).toBeNull();
    expect(l.unite_saisie).toBeNull();
    expect(l.facteur_saisie).toBeNull();
  }, 60000);

  // ── L'INTEGRITE DU TRIPLET ──────────────────────────────────────────────
  //
  // Nee de la revue contradictoire : six attaques par l'API reelle passaient
  // toutes en 201. Avant ce lot la saisie etait PERDUE ; sans ces gardes elle
  // pouvait MENTIR — « 3 paniers de 10 kg » pour 999 kg, ou « -3 paniers ».
  describe('la saisie structuree est atomique, positive et coherente', () => {
    // On n'affirme ICI que l'existence et le PREDICAT. L'etat de validation
    // (NOT VALID) depend du chemin qui a bati la base — `synchronize` la cree
    // validee sur une base neuve, `db-init` la pose NOT VALID en mise a
    // niveau. L'affirmer ici rendrait ce test dependant de l'ORDRE des suites,
    // qui partagent la meme base. Il est donc verifie la ou il est
    // deterministe : recoltes-upgrade-egale-neuve.spec.ts.
    it('la contrainte existe sur la table, avec le predicat attendu', async () => {
      const [c] = await ds.query(
        `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
          WHERE conrelid = 'recoltes'::regclass AND conname = $1`,
        [NOM_CONTRAINTE_SAISIE_BRUTE],
      );
      expect(c).toBeDefined();
      expect(c.def).toContain('btrim');
      expect(c.def).toContain('round');
    });

    // LA GARDE CONTRE LA DERIVE. La regle est ecrite DEUX fois : en SQL pour
    // que la base la tienne, en TypeScript pour que l'erreur soit lisible. Ce
    // test execute le predicat SQL en base sur la MEME table de cas que le
    // test unitaire du validateur, et exige le meme verdict partout.
    it('le predicat SQL et le validateur API rendent le MEME verdict', async () => {
      for (const cas of CAS_SAISIE_BRUTE) {
        // On evalue le SQL sur les valeurs NORMALISEES : ce sont celles que
        // l'API ecrit reellement.
        const n = normaliseSaisieBrute(cas);
        const [r] = await ds.query(
          `SELECT (${CHECK_SAISIE_BRUTE}) AS ok
             FROM (SELECT $1::numeric AS quantite, $2::numeric AS quantite_saisie,
                          $3::varchar AS unite_saisie, $4::numeric AS facteur_saisie) t`,
          [n.quantite, n.quantiteSaisie, n.uniteSaisie, n.facteurSaisie],
        );
        const sqlAccepte = r.ok === true;
        const apiAccepte = valideSaisieBrute(cas) === null;
        expect({ cas: cas.libelle, sql: sqlAccepte, api: apiAccepte })
          .toEqual({ cas: cas.libelle, sql: cas.accepte, api: cas.accepte });
      }
    }, 60000);

    // Les QUATRE familles, par la vraie route, avec un message comprehensible.
    const PRODUIT_REFUS = 'GomboRefuse';
    const refuse = (corps: Record<string, unknown>) => declarer({
      produit: PRODUIT_REFUS, quantite: 30, unite: 'kg', qualite: 'standard',
      date_recolte: '2026-10-05', prix_unitaire: 200, ...corps,
    });

    it('FAMILLE 1 — triplet partiel : refuse en 400, pas en 23514', async () => {
      const r = await refuse({ quantite_saisie: 3, unite_saisie: 'panier' });
      expect(r.status).toBe(400);
      expect(String(r.body.message)).toMatch(/incomplète/i);
      expect(String(r.body.message)).not.toMatch(/23514|constraint/i);
    }, 60000);

    it('FAMILLE 2 — negatif : refuse, meme quand -3 × -10 = 30', async () => {
      const r = await refuse({ quantite_saisie: -3, unite_saisie: 'panier', facteur_saisie: -10 });
      expect(r.status).toBe(400);
      expect(String(r.body.message)).toMatch(/positive/i);
    }, 60000);

    it('FAMILLE 3 — unite vide : refusee', async () => {
      const r = await refuse({ quantite_saisie: 3, unite_saisie: '  ', facteur_saisie: 10 });
      expect(r.status).toBe(400);
    }, 60000);

    it('FAMILLE 4 — quantite contradictoire : refusee, et le message CHIFFRE l’ecart', async () => {
      const r = await refuse({ quantite: 999, quantite_saisie: 3, unite_saisie: 'panier', facteur_saisie: 10 });
      expect(r.status).toBe(400);
      expect(String(r.body.message)).toMatch(/Incohérence/);
      expect(String(r.body.message)).toContain('30');   // ce que le triplet donne
      expect(String(r.body.message)).toContain('999');  // ce qui etait annonce
    }, 60000);

    it('et rien de tout cela n’a ete ecrit en base', async () => {
      const [r] = await ds.query(
        `SELECT count(*)::int n FROM recoltes
          WHERE user_id = $1 AND produit = $2`, [producteurId, PRODUIT_REFUS],
      );
      expect(r.n).toBe(0);
    }, 60000);

    // Modifier le poids d'une ligne qui porte sa saisie casserait la coherence.
    // Mesure : aucun ecran n'appelle cette route — on la protege quand meme.
    it('PATCH du poids sur une ligne qui porte sa saisie : refuse en 400', async () => {
      const cree = await declarer({
        produit: 'Patch', quantite: 30, unite: 'kg', qualite: 'standard',
        date_recolte: '2026-10-05', prix_unitaire: 200,
        quantite_saisie: 3, unite_saisie: 'panier', facteur_saisie: 10,
      });
      expect([200, 201]).toContain(cree.status);
      const r = await auth(request(app.getHttpServer()).patch(`/api/v1/recoltes/${cree.body.recolte.id}`))
        .send({ quantite: 999 });
      expect(r.status).toBe(400);
      expect(String(r.body.message)).toMatch(/redeclarer cette saisie/i);
      // Et le poids n'a pas bouge.
      const l = await enBase(cree.body.recolte.id);
      expect(Number(l.quantite)).toBe(30);
    }, 60000);

    // Une ligne SANS saisie reste librement modifiable : la garde ne gene que
    // ce qu'elle doit garder.
    it('PATCH du poids sur une ligne SANS saisie : toujours accepte', async () => {
      const cree = await declarer({
        produit: 'PatchNu', quantite: 40, unite: 'kg', qualite: 'standard',
        date_recolte: '2026-10-05', prix_unitaire: 200,
      });
      const r = await auth(request(app.getHttpServer()).patch(`/api/v1/recoltes/${cree.body.recolte.id}`))
        .send({ quantite: 999 });
      expect(r.status).toBe(200);
      expect(Number((await enBase(cree.body.recolte.id)).quantite)).toBe(999);
    }, 60000);
  });
});
