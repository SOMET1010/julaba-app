// DGE-04 + DGE-05 — LES 4 LISTES JOINTES DU DOCX, MAINTENANT REQUÊTABLES.
// (plan d'action audit workflow officiel §5 item 5, 20/10/2026)
//
// Le docx demande à la DGE : marchés / marchands / identificateurs /
// producteurs « par coopérative, zone et marché ». Aucune de ces listes
// n'était possible :
//  - pas de clé coopérative sur marches (users.market = texte libre) ;
//  - GET /cooperatives/membres ne résolvait que la coop de l'APPELANT ;
//  - la jointure producteur↔coopérative n'existait pas (addMembre réservé
//    aux marchands) ;
//  - aucun axe marché sur les identificateurs.
//
// Correctifs testés ici :
//  - marches.cooperative_id + users.marche_id (migration 1782300000020) ;
//  - addMembre ouverte aux PRODUCTEURS (jointure producteur↔coopérative) ;
//  - POST /users/backoffice/create accepte marcheId pour un identificateur ;
//  - GET /admin/groupes/{marches,membres,identificateurs,producteurs}.
//
// Propriétés vérifiées (🟢 attendu) :
//  - DGE-04-a : le président peut adhérer un PRODUCTEUR à sa coopérative
//    (la jointure producteur↔coopérative existe).
//  - DGE-04-b : marchés d'une coopérative listés via cooperative_id.
//  - DGE-04-c : membres d'une coopérative listés (marchands + producteur),
//    filtre role=producteur ne rend que le producteur.
//  - DGE-04-d : identificateurs listés par zone, puis affinés par marché.
//  - DGE-05-a : un identificateur créé par le BO AVEC marcheId porte la clé
//    structurée (users.marche_id), requêtable par marché.
//  - DGE-04-e : 403 pour un rôle non BO, 400 sans cooperative_id.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

const ZONE_A = '3a111111-4111-4111-8111-111111111111'; // uuid v4 valide (les DTO @IsUUID exigent la variante 4)
const ZONE_B = '3b222222-4222-4222-9222-222222222222'; // uuid v4 valide

describe('Invariant DGE-04/05 — les 4 listes jointes requêtables', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let tokenAdmin: string;
  let tokenPresident: string;
  let tokenMarchandSimple: string;
  let presidentId: string;
  let coopId: string;
  let marcheId: string;
  let producteurMembreId: string;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    const repo = ds.getRepository(User);

    // Le président : signup cooperateur (la coopérative est créée par le flux).
    const su = await api().post('/api/v1/auth/signup').send({
      phone: '+2250700020501', firstName: 'Président', lastName: 'DGE04', role: 'cooperateur', genre: 'homme',
    });
    expect([200, 201]).toContain(su.status);
    tokenPresident = su.body.accessToken;
    presidentId = su.body.user.id;
    // mustChangePassword : la garde JWT bloque tout sauf change-password.
    await api()
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${tokenPresident}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
    const coopRows = await ds.query('SELECT id FROM cooperatives WHERE responsable_id = $1 LIMIT 1', [presidentId]);
    coopId = coopRows[0].id;

    // Deux marchands + un producteur candidats à l'adhésion.
    const seed = async (role: UserRole, phone: string) => {
      const u: any = await repo.save(repo.create({
        phone, firstName: 'Membre', lastName: role, genre: 'homme',
        role, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
      } as any));
      return u.id;
    };
    const marchand1 = await seed(UserRole.MARCHAND, '+2250700020502');
    await seed(UserRole.MARCHAND, '+2250700020503');
    producteurMembreId = await seed(UserRole.PRODUCTEUR, '+2250700020504');
    void marchand1;

    const simple: any = await repo.save(repo.create({
      phone: '+2250700020505', firstName: 'Simple', lastName: 'Marchand', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    tokenMarchandSimple = await jwt.signAsync(
      { sub: simple.id, phone: simple.phone, role: simple.role },
      { secret: process.env.JWT_SECRET },
    );

    // Admin BO.
    const admin: any = await repo.save(repo.create({
      phone: '+2250700020506', firstName: 'Admin', lastName: 'DGE04', genre: 'homme',
      role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    tokenAdmin = await jwt.signAsync(
      { sub: admin.id, phone: admin.phone, role: admin.role },
      { secret: process.env.JWT_SECRET },
    );

    // Zones + marches (FK marches.zone_id → zones : créer les zones d'abord).
    await ds.query(
      `INSERT INTO zones (id, nom, ville, actif) VALUES ($1,'Zone DGE04 A','Yamoussoukro',true),($2,'Zone DGE04 B','Bouaké',true)`,
      [ZONE_A, ZONE_B],
    );
    const m = await ds.query(
      `INSERT INTO marches (nom, zone_id, actif) VALUES ('Marché DGE04', $1, true) RETURNING id`,
      [ZONE_A],
    );
    marcheId = m[0].id;
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('DGE-04-a : le président adhère un PRODUCTEUR (la jointure existe)', async () => {
    const r = await api()
      .post('/api/v1/cooperatives/membres')
      .set('Authorization', `Bearer ${tokenPresident}`)
      .send({ marchand_id: producteurMembreId, date_adhesion: '2026-10-20' });
    expect([200, 201]).toContain(r.status);
    expect(r.body.success).toBe(true);

    // Le membre est bien un producteur.
    const row = await ds.query(
      `SELECT u.role FROM cooperative_membres cm JOIN users u ON u.id::text = cm.membre_id::text WHERE cm.id::text = $1`,
      [r.body.membre.id],
    );
    expect(row[0].role).toBe('producteur');
  });

  it('DGE-04-b : les marchés d\u2019une coopérative sont listés', async () => {
    await ds.query(`UPDATE marches SET cooperative_id = $1 WHERE id = $2`, [coopId, marcheId]);
    const r = await api()
      .get(`/api/v1/admin/groupes/marches?cooperative_id=${coopId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(r.status).toBe(200);
    const ids = (r.body.data || []).map((x: any) => x.id);
    expect(ids).toContain(marcheId);
    expect(r.body.data[0].cooperative_nom).toBeTruthy();
  });

  it('DGE-04-c : les membres d\u2019une coopérative — marchands ET producteur, filtre par rôle', async () => {
    // Adhérer aussi les deux marchands (le test précédent a posé le producteur).
    const rows = await ds.query(
      `SELECT id FROM users WHERE phone IN ('+2250700020502','+2250700020503')`,
    );
    for (const row of rows) {
      await api()
        .post('/api/v1/cooperatives/membres')
        .set('Authorization', `Bearer ${tokenPresident}`)
        .send({ marchand_id: row.id });
    }
    const tous = await api()
      .get(`/api/v1/admin/groupes/membres?cooperative_id=${coopId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(tous.status).toBe(200);
    const roles = (tous.body.data || []).map((x: any) => x.role).sort();
    expect(roles).toEqual(['marchand', 'marchand', 'producteur']);

    const prods = await api()
      .get(`/api/v1/admin/groupes/producteurs?cooperative_id=${coopId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(prods.status).toBe(200);
    expect((prods.body.data || []).map((x: any) => x.membre_id)).toEqual([producteurMembreId]);
  });

  it('DGE-05-a : identificateur créé par le BO avec marcheId — requêtable par marché', async () => {
    const r = await api()
      .post('/api/v1/users/backoffice/create')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        phone: '+2250700020507', firstName: 'Identif', lastName: 'DGE05', genre: 'homme',
        role: 'identificateur', email: 'identif.dge05@julaba.ci', zoneId: ZONE_A, marcheId,
      });
    expect([200, 201]).toContain(r.status);

    const parZone = await api()
      .get(`/api/v1/admin/groupes/identificateurs?zone_id=${ZONE_A}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(parZone.status).toBe(200);
    expect((parZone.body.data || []).map((x: any) => x.marche_id)).toContain(marcheId);

    const parMarche = await api()
      .get(`/api/v1/admin/groupes/identificateurs?marche_id=${marcheId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(parMarche.status).toBe(200);
    expect(parMarche.body.data.length).toBe(1);
    expect(parMarche.body.data[0].marche_nom).toBe('Marché DGE04');

    // L'autre zone ne contient personne.
    const autre = await api()
      .get(`/api/v1/admin/groupes/identificateurs?zone_id=${ZONE_B}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(autre.status).toBe(200);
    expect(autre.body.data.length).toBe(0);
  });

  it('DGE-04-e : garde — 403 hors BO, 400 sans cooperative_id', async () => {
    const ko403 = await api()
      .get(`/api/v1/admin/groupes/membres?cooperative_id=${coopId}`)
      .set('Authorization', `Bearer ${tokenMarchandSimple}`);
    expect(ko403.status).toBe(403);

    const ko400 = await api()
      .get('/api/v1/admin/groupes/marches')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(ko400.status).toBe(400);
  });
});
