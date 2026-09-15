// Invariant ARGENT — le fond de caisse declare par une marchande arrive
// jusqu'a la base, et toute correction laisse une trace.
//
// Defaut repare : une marchande qui vend AVANT d'ouvrir sa journee declenche
// ensureSessionOuverte, qui cree la journee a fond_initial = 0 (doctrine "on
// ne bloque jamais la vendeuse"). Quand elle declarait ensuite son vrai fond,
// session/ouvrir voyait une ligne existante et la renvoyait TELLE QUELLE :
// les 5 000 F saisis n'etaient jamais ecrits. Son telephone affichait 5 000,
// la base gardait 0, et la caisse theorique etait fausse d'autant.
//
// Regle metier (decision Patrick, 15/09/2026) : une journee creee
// automatiquement a 0 est "fond non encore declare" ; la premiere saisie
// manuelle remplace ce 0 ; ensuite toute correction passe par "Modifier le
// fond" et est journalisee.
//
// Pourquoi un invariant en base REELLE et pas seulement un test unitaire :
// le test unitaire observe le SQL emis, donc l'intention. Seule une vraie
// base prouve que la colonne fond_declare_at existe (migration + DbInit
// alignes, ADR-0002), que le journal s'ecrit, et surtout que le montant
// SURVIT a une relecture - c'est exactement l'ecart ecran/base qui faisait
// le defaut.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

describe('Invariant ARGENT — fond de caisse declare', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let jeton: string;
  let marchandId: string;
  const api = () => request(app.getHttpServer());
  const aujourdhui = () => new Date().toISOString().split('T')[0];

  // Base partagee par toutes les suites d'invariants : donnees propres a
  // celle-ci (voir cooperatives-liste-colonnes.spec.ts, deux collisions payees).
  const TEL = '+2250700009741';

  const session = async () =>
    (await ds.query(
      `SELECT fond_initial, fond_declare_at, ouvert FROM caisse_sessions
        WHERE marchand_id = $1 AND date = $2 LIMIT 1`,
      [marchandId, aujourdhui()],
    ))[0];

  const journal = async () =>
    ds.query(
      `SELECT ancien_fond, nouveau_fond, origine FROM caisse_fond_journal
        WHERE marchand_id = $1 ORDER BY created_at ASC`,
      [marchandId],
    );

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }),
      })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    const repo = ds.getRepository(User);
    const marchande: any = await repo.save(repo.create({
      phone: TEL, firstName: 'Mariam', lastName: 'Bamba', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('1234', 10),
    } as any) as any);
    marchandId = marchande.id;
    jeton = await jwt.signAsync(
      { sub: marchande.id, phone: marchande.phone, role: marchande.role },
      { secret: process.env.JWT_SECRET },
    );
  }, 90000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('la colonne fond_declare_at et le journal existent sur une base migree', async () => {
    // ADR-0002 : migration et DbInit doivent etre alignes. Si l'un des deux
    // manque, tout le reste de cette suite est un mensonge.
    const colonne = await ds.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_name = 'caisse_sessions' AND column_name = 'fond_declare_at'`,
    );
    const table = await ds.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'caisse_fond_journal'`,
    );
    expect(colonne).toHaveLength(1);
    expect(table).toHaveLength(1);
  });

  it('declarer son fond AVANT toute vente cree la journee (le seul chemin reel)', async () => {
    // L'accueil d'une marchande (MarchandAccueilVoice) n'a pas de bouton
    // « Ouvrir ma journee » : elle passe par le resume du jour puis
    // « Modifier le fond ». Sans journee, ce chemin repondait 404 et son
    // montant etait perdu au rechargement.
    const r = await api()
      .patch('/api/v1/caisse/session/fond')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ fond_initial: 7500 });
    expect(r.status).toBeLessThan(400);

    const s = await session();
    expect(Number(s.fond_initial)).toBe(7500);
    expect(s.ouvert).toBe(true);
    expect(s.fond_declare_at).not.toBeNull();
    expect((await journal())[0]).toEqual(
      expect.objectContaining({ ancien_fond: null, nouveau_fond: '7500', origine: 'declaration' }),
    );

    // On remet a zero pour les scenarios suivants, qui partent d'une marchande
    // sans journee du tout.
    await ds.query(`DELETE FROM caisse_fond_journal WHERE marchand_id = $1`, [marchandId]);
    await ds.query(`DELETE FROM caisse_sessions WHERE marchand_id::text = $1`, [marchandId]);
  });

  it('vendre avant d’ouvrir cree la journee a 0, fond NON declare', async () => {
    const vente = await api()
      .post('/api/v1/caisse/vente')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ montant: 1000, produit: 'Tomate', quantite: 1 });
    expect(vente.status).toBeLessThan(400); // on ne bloque jamais la vendeuse

    const s = await session();
    expect(s).toBeDefined();
    expect(Number(s.fond_initial)).toBe(0);
    expect(s.fond_declare_at).toBeNull(); // "pas encore declare", pas "zero declare"
  });

  it('REGRESSION — le fond saisi ensuite REMPLACE le 0 et survit a une relecture', async () => {
    const r = await api()
      .post('/api/v1/caisse/session/ouvrir')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ fond_initial: 5000 });
    expect(r.status).toBeLessThan(400);
    // La reponse fait foi cote ecran : elle doit deja porter le vrai montant.
    expect(Number(r.body.session.fond_initial)).toBe(5000);

    // LE point du defaut : ce que la BASE a retenu, pas ce que l'ecran affiche.
    const s = await session();
    expect(Number(s.fond_initial)).toBe(5000);
    expect(s.fond_declare_at).not.toBeNull();

    expect(await journal()).toEqual([
      expect.objectContaining({ ancien_fond: '0', nouveau_fond: '5000', origine: 'declaration' }),
    ]);
  });

  it('rouvrir ne touche JAMAIS un fond deja declare, et le dit', async () => {
    const r = await api()
      .post('/api/v1/caisse/session/ouvrir')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ fond_initial: 9999 });
    expect(r.body.fond_conserve).toBe(true);

    expect(Number((await session()).fond_initial)).toBe(5000);
    expect(await journal()).toHaveLength(1); // aucune ecriture de plus
  });

  it('« Modifier le fond » ecrit le nouveau montant ET le journalise', async () => {
    const r = await api()
      .patch('/api/v1/caisse/session/fond')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ fond_initial: 3500 });
    expect(r.status).toBeLessThan(400);

    expect(Number((await session()).fond_initial)).toBe(3500);
    const lignes = await journal();
    expect(lignes).toHaveLength(2);
    expect(lignes[1]).toEqual(
      expect.objectContaining({ ancien_fond: '5000', nouveau_fond: '3500', origine: 'correction' }),
    );
  });

  it('refuse un montant negatif, sans rien ecrire', async () => {
    const avant = await journal();
    const r = await api()
      .patch('/api/v1/caisse/session/fond')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ fond_initial: -1 });
    expect(r.status).toBe(400);

    expect(Number((await session()).fond_initial)).toBe(3500);
    expect(await journal()).toHaveLength(avant.length);
  });

  it('fermer puis rouvrir la journee laisse le fond du jour intact', async () => {
    await api()
      .post('/api/v1/caisse/session/fermer')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ fond_final: 4200 });
    expect((await session()).ouvert).toBe(false);

    const r = await api()
      .post('/api/v1/caisse/session/ouvrir')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ fond_initial: 8888 });
    expect(r.body.fond_conserve).toBe(true);

    const s = await session();
    expect(s.ouvert).toBe(true);             // on ne bloque jamais la vendeuse
    expect(Number(s.fond_initial)).toBe(3500); // son fond du jour est intouchable
  });
});
