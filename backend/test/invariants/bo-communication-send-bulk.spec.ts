// Invariant — Communication BackOffice : envoi groupé réel (POST /notifications/send-bulk).
//
// Contexte (audit) : l'écran BOCommunication.tsx appelait un stub GET /communication
// codé en dur ({messages:[], campagnes:[], total:0}) et son bouton d'envoi
// n'appelait AUCUNE API ("Envoi non disponible — endpoint backend manquant").
// Le vrai mécanisme d'envoi groupé existait déjà : POST /notifications/send-bulk
// (notifications.controller.ts). Ce lot câble l'écran dessus (une seule
// implémentation, pas de second mécanisme d'envoi) et fait dériver
// GET /communication (misc-rest.controller.ts) du même journal `notifications`
// plutôt que d'un stub à liste vide.
//
// PROPRIÉTÉS VÉRIFIÉES :
//  1) Un envoi groupé réel vers une liste de destinataires crée bien UNE ligne
//     `notifications` PAR destinataire ciblé (aucune ligne fantôme, aucune perte).
//  2) Un utilisateur hors de la liste ciblée ne reçoit RIEN (isolation du ciblage :
//     send-bulk n'envoie qu'aux userIds explicitement fournis, jamais "à tous").
//  3) GET /communication restitue ensuite cette campagne à partir de ce même
//     journal (une seule source de vérité) : bon titre, bon nombre de
//     destinataires, statut "envoyee".
//  4) Un rôle non autorisé par send-bulk (ex. marchand) est refusé (403) et
//     n'écrit aucune ligne — la garde d'autorisation existante n'est pas
//     contournée par le nouveau câblage BO → send-bulk.

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

describe('Invariant — Communication BO : envoi groupé réel via /notifications/send-bulk', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    // Throttler neutralisé : ce lot teste l'écriture en base et l'autorisation,
    // pas la limitation de débit (sinon un refus pourrait être masqué par 429).
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
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  async function seed(role: UserRole, phone: string): Promise<{ token: string; id: string }> {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone,
      firstName: 'Test',
      lastName: role,
      genre: 'femme',
      role,
      status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('1234', 10),
    } as any);
    const saved: any = await repo.save(u as any);
    const token = await jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
    return { token, id: saved.id };
  }

  const notifsDe = async (userId: string): Promise<any[]> =>
    ds.query(
      `SELECT titre, message, metadata FROM notifications WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId],
    );

  it('admin_general : envoi groupé réel crée une notification par destinataire ciblé, aucune pour les tiers', async () => {
    const admin = await seed(UserRole.ADMIN_GENERAL, '+2250799990101');
    const cible1 = await seed(UserRole.PRODUCTEUR, '+2250799990102');
    const cible2 = await seed(UserRole.PRODUCTEUR, '+2250799990103');
    // Producteur existant mais volontairement HORS de la liste envoyée : sert de
    // témoin d'isolation (send-bulk ne doit jamais notifier au-delà de userIds).
    const horsCible = await seed(UserRole.PRODUCTEUR, '+2250799990104');

    const campaignId = 'test-campagne-b0com-001';
    const res = await api()
      .post('/api/v1/notifications/send-bulk')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        userIds: [cible1.id, cible2.id],
        type: 'communication',
        titre: 'Campagne test récolte',
        message: 'La collecte débute lundi dans votre zone.',
        category: 'communication',
        icon: '🔔',
        metadata: { canal: 'push', cible: 'Producteurs — Test', campaignId },
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, total: 2, sent: 2, failed: 0 });

    // 1) Une ligne notifications par destinataire ciblé, avec le bon contenu.
    const notifsCible1 = await notifsDe(cible1.id);
    const notifsCible2 = await notifsDe(cible2.id);
    expect(notifsCible1).toHaveLength(1);
    expect(notifsCible2).toHaveLength(1);
    expect(notifsCible1[0].titre).toBe('Campagne test récolte');
    expect(notifsCible1[0].message).toBe('La collecte débute lundi dans votre zone.');
    expect(notifsCible1[0].metadata).toMatchObject({
      bulk: true,
      campaignId,
      canal: 'push',
      sentBy: admin.id,
    });

    // 2) Isolation du ciblage : le tiers hors-liste ne reçoit rien.
    const notifsHorsCible = await notifsDe(horsCible.id);
    expect(notifsHorsCible).toHaveLength(0);

    // 3) GET /communication dérive la même campagne du journal notifications.
    const histoRes = await api()
      .get('/api/v1/communication')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(histoRes.status).toBe(200);
    const campagne = histoRes.body.campagnes.find((c: any) => c.id === campaignId);
    expect(campagne).toBeDefined();
    expect(campagne.titre).toBe('Campagne test récolte');
    expect(campagne.nbDestinataires).toBe(2);
    expect(campagne.statut).toBe('envoyee');
    expect(campagne.cible).toBe('Producteurs — Test');
  });

  it('marchand : envoi groupé refusé (403), aucune ligne notifications écrite', async () => {
    const marchand = await seed(UserRole.MARCHAND, '+2250799990105');
    const cible = await seed(UserRole.PRODUCTEUR, '+2250799990106');

    const res = await api()
      .post('/api/v1/notifications/send-bulk')
      .set('Authorization', `Bearer ${marchand.token}`)
      .send({
        userIds: [cible.id],
        type: 'communication',
        titre: 'Campagne non autorisée',
        message: 'Ne doit jamais être envoyée.',
      });

    expect(res.status).toBe(403);
    expect(await notifsDe(cible.id)).toHaveLength(0);
  });
});
