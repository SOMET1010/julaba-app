// Invariant P0.0 (SMS) — le SMS de validation de dossier ne ment plus sur le
// mot de passe (ADR-002).
//
// Contexte (audit) : identifications.controller.ts `update()` envoyait
// systématiquement, à l'approbation admin d'un dossier, le template
// DOSSIER_VALIDE ("Connectez-vous avec le mot de passe : 0000") — FAUX pour
// tout compte enrôlé via create-with-acteur ou le back-office (P0.0) : leur
// mot de passe n'est JAMAIS '0000' (secret aléatoire jeté à la création, puis
// remplacé par le secret choisi par l'acteur à l'activation). Ce lot distingue
// les deux templates honnêtes en cherchant une trace d'activation P0.0
// (table activation_codes) plutôt que de deviner depuis le chemin d'origine.
//
// PROPRIÉTÉS VÉRIFIÉES :
//  1) Dossier validé, compte P0.0 encore en_attente_activation → SMS ne
//     contient PAS '0000' et ne prétend PAS un accès immédiat.
//  2) Dossier validé, compte P0.0 déjà activé par l'acteur lui-même → SMS ne
//     contient PAS '0000' non plus (son vrai secret n'est pas '0000').
//  3) Chemin légitime inchangé : dossier référençant un acteur auto-inscrit
//     (jamais passé par l'activation P0.0, mot de passe réellement '0000')
//     → SMS original conservé, avec '0000'. Preuve que ce lot ne casse pas
//     ce chemin légitime.

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
import { Identification } from '../../src/identifications/identification.entity';
import { ActivationService } from '../../src/auth/activation.service';
import { SmsService } from '../../src/sms/sms.service';

describe('Invariant P0.0 (SMS) — DOSSIER_VALIDE honnête selon la vraie provenance du mot de passe', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let activation: ActivationService;
  const api = () => request(app.getHttpServer());
  const sentMessages: { phone: string; text: string }[] = [];

  const ADMIN_PHONE = '+2250750110001';
  const ACTEUR_INACTIVE_PHONE = '+2250750110002';
  const ACTEUR_ACTIVE_PHONE = '+2250750110003';
  const ACTEUR_LEGACY_0000_PHONE = '+2250750110004';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }),
      })
      .overrideProvider(SmsService)
      .useValue({
        // Capture ce qui aurait été réellement envoyé, sans réseau (comme le
        // service réel en test : pas de credentials ANSUT configurés).
        sendSms: async (phone: string, text: string) => {
          sentMessages.push({ phone, text });
          return { success: true, messageId: 'test' };
        },
      })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    activation = app.get(ActivationService);
    await app.get(DbInitService, { strict: false }).runInit();
  }, 60000);

  afterAll(async () => {
    await ds.query(`DELETE FROM users WHERE phone LIKE '+225075011%'`).catch(() => undefined);
    await ds.query(`DELETE FROM identifications WHERE acteur_nom LIKE 'P0SMSTest%'`).catch(() => undefined);
    if (app) await app.close();
  });

  async function seedAdmin(): Promise<string> {
    const repo = ds.getRepository(User);
    const existing = await repo.findOne({ where: { phone: ADMIN_PHONE } });
    const saved = existing ?? (await repo.save(repo.create({
      phone: ADMIN_PHONE, firstName: 'Admin', lastName: 'Test', genre: 'femme',
      role: UserRole.ADMIN_GENERAL, status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('123456', 10),
    } as any)));
    return jwt.signAsync({ sub: saved.id, phone: saved.phone, role: saved.role }, { secret: process.env.JWT_SECRET });
  }

  async function approuverDossier(token: string, identificationId: string) {
    sentMessages.length = 0;
    const res = await api()
      .patch(`/api/v1/identifications/${identificationId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ statut: 'approuve' });
    expect(res.status).toBe(200);
  }

  it("compte P0.0 encore en_attente_activation : le SMS n'affirme PAS '0000' ni un accès immédiat", async () => {
    const token = await seedAdmin();
    const userRepo = ds.getRepository(User);
    const acteur = await userRepo.save(userRepo.create({
      phone: ACTEUR_INACTIVE_PHONE, firstName: 'Inactive', lastName: 'Test', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.EN_ATTENTE_ACTIVATION,
      passwordHash: await bcrypt.hash(require('crypto').randomBytes(24).toString('hex'), 10),
    } as any));
    // Trace P0.0 : un code a bien été émis pour ce compte (qu'il soit consommé
    // ou non n'importe pas ici — seule l'ÉMISSION prouve que le mot de passe
    // n'est pas la constante '0000').
    await activation.issueForUser(acteur.id, null);

    const identRepo = ds.getRepository(Identification);
    const ident = await identRepo.save(identRepo.create({
      acteur_id: acteur.id, type_acteur: 'marchand', statut: 'en_attente',
      acteur_nom: 'P0SMSTest Inactive',
    } as any));

    await approuverDossier(token, ident.id);

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].phone).toBe(ACTEUR_INACTIVE_PHONE);
    expect(sentMessages[0].text).not.toContain('0000');
    expect(sentMessages[0].text.toLowerCase()).toContain('activ');
  });

  it('compte P0.0 déjà activé par l’acteur lui-même : le SMS n’affirme pas non plus \'0000\'', async () => {
    const token = await seedAdmin();
    const userRepo = ds.getRepository(User);
    const acteur = await userRepo.save(userRepo.create({
      phone: ACTEUR_ACTIVE_PHONE, firstName: 'Active', lastName: 'Test', genre: 'femme',
      role: UserRole.PRODUCTEUR, status: UserStatus.EN_ATTENTE_ACTIVATION,
      passwordHash: await bcrypt.hash(require('crypto').randomBytes(24).toString('hex'), 10),
    } as any));
    const code = await activation.issueForUser(acteur.id, null);
    await activation.activate(code, '8642'); // l'acteur pose SON secret, jamais 0000/1234

    const identRepo = ds.getRepository(Identification);
    const ident = await identRepo.save(identRepo.create({
      acteur_id: acteur.id, type_acteur: 'producteur', statut: 'en_attente',
      acteur_nom: 'P0SMSTest Active',
    } as any));

    await approuverDossier(token, ident.id);

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].text).not.toContain('0000');
  });

  it('chemin légitime NON cassé : acteur jamais passé par P0.0 (mot de passe réellement 0000) → SMS original conservé', async () => {
    const token = await seedAdmin();
    const userRepo = ds.getRepository(User);
    // Simule l'auto-inscription publique (AuthService.signup) : ACTIF direct,
    // mot de passe réellement '0000', AUCUNE ligne activation_codes émise.
    const acteur = await userRepo.save(userRepo.create({
      phone: ACTEUR_LEGACY_0000_PHONE, firstName: 'Legacy', lastName: 'Test', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('0000', 10), mustChangePassword: true,
    } as any));

    const identRepo = ds.getRepository(Identification);
    const ident = await identRepo.save(identRepo.create({
      acteur_id: acteur.id, type_acteur: 'marchand', statut: 'en_attente',
      acteur_nom: 'P0SMSTest Legacy',
    } as any));

    await approuverDossier(token, ident.id);

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].text).toContain('0000');
  });
});
