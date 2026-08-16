// Invariant P0.0 — fin du takeover via le secret global `0000` (ADR-002).
//
// Propriété attendue : un compte fraîchement enrôlé est INERTE (en_attente_activation,
// non-loginable) même si son secret était `0000` ; il ne devient loginable QUE via un
// code d'activation à usage unique, où la marchande pose SON secret. Le code ne s'utilise
// qu'une fois (anti-rejeu). Testé au niveau SERVICE (les exceptions sont vérifiées
// directement, sans dépendre du mapping HTTP).
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';
import { AuthService } from '../../src/auth/auth.service';
import { ActivationService } from '../../src/auth/activation.service';

describe('Invariant P0.0 — enrôlement inerte + activation (fin du takeover 0000)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let authService: AuthService;
  let activation: ActivationService;
  const PHONE = '+2250799990000';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }) })
      .compile();
    app = mod.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    authService = app.get(AuthService);
    activation = app.get(ActivationService);
    await app.get(DbInitService, { strict: false }).runInit();
    // Schéma bâti par synchronize (DB_SYNCHRONIZE=true en test) → l'entité
    // ActivationCode et la valeur d'enum en_attente_activation existent déjà.
    // Compte fraîchement enrôlé, PIRE CAS : secret = '0000' mais statut inerte.
    await ds.getRepository(User).save(ds.getRepository(User).create({
      phone: PHONE, passwordHash: await bcrypt.hash('0000', 10),
      firstName: 'Awa', lastName: 'Test', role: UserRole.MARCHAND, genre: 'femme' as any,
      status: UserStatus.EN_ATTENTE_ACTIVATION, mustChangePassword: true,
    } as any));
  });

  afterAll(async () => {
    await ds.getRepository(User).delete({ phone: PHONE }).catch(() => undefined);
    await app.close();
  });

  it('login {numéro, 0000} sur compte inerte → REJETÉ (le takeover de masse est mort)', async () => {
    await expect(authService.login({ phone: PHONE, password: '0000' } as any)).rejects.toBeDefined();
  });

  it('activation : la marchande pose SON secret → compte loginable', async () => {
    const userId = (await ds.getRepository(User).findOne({ where: { phone: PHONE } }))!.id;
    const code = await activation.issueForUser(userId, null);
    await expect(activation.activate(code, '4321')).resolves.toMatchObject({ userId });

    const after = await ds.getRepository(User).findOne({ where: { phone: PHONE } });
    expect(after!.status).toBe(UserStatus.ACTIF);
    // Elle peut maintenant se connecter avec SON secret ; '0000' ne marche plus.
    await expect(authService.login({ phone: PHONE, password: '4321' } as any)).resolves.toBeDefined();
    await expect(authService.login({ phone: PHONE, password: '0000' } as any)).rejects.toBeDefined();
  });

  it('code à USAGE UNIQUE : rejeu du même code → REJETÉ', async () => {
    const userId = (await ds.getRepository(User).findOne({ where: { phone: PHONE } }))!.id;
    const code = await activation.issueForUser(userId, null);
    await activation.activate(code, '5678');
    await expect(activation.activate(code, '9999')).rejects.toBeDefined();
  });

  it('secret trop simple (0000/1234) refusé à l’activation', async () => {
    const userId = (await ds.getRepository(User).findOne({ where: { phone: PHONE } }))!.id;
    const code = await activation.issueForUser(userId, null);
    await expect(activation.activate(code, '0000')).rejects.toBeDefined();
  });
});
