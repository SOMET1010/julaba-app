// Invariant — le toggle BO des cron jobs a un effet RÉEL.
//
// Trouvé par audit : `GET /cron` renvoyait 3 jobs entièrement inventés
// (sync_acteurs, rapport_hebdo, nettoyage_sessions), sans rapport avec les
// vrais `@Cron()` du backend (bpay.cron.ts, alertes.service.ts). `PATCH
// /cron/:id/toggle` écrivait bien dans `cron_jobs_config`, mais AUCUN job
// réel ne lisait cette table — le bouton "activer/désactiver" du back-office
// n'avait donc aucun effet sur l'exécution réelle.
//
// Ce test prouve, avec la vraie base et les vrais services `@Cron()` (pas
// des mocks) :
//  1) qu'un job JAMAIS togglé reste actif par défaut (aucune régression sur
//     le comportement de prod actuel, où rien n'est désactivé) ;
//  2) qu'un `PATCH /cron/:id/toggle` désactive réellement le job : son
//     prochain déclenchement (simulé — on appelle directement la méthode
//     `@Cron()`, sans attendre le vrai timer) devient un no-op ;
//  3) qu'un second toggle le réactive et qu'il s'exécute à nouveau.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { CronJobsConfigService } from '../../src/cron-jobs/cron-jobs-config.service';
import {
  CRON_JOB_ALERTES_VERIFICATION,
  CRON_JOB_BPAY_RECONCILIATION,
} from '../../src/cron-jobs/cron-jobs.registry';
import { AlertesService } from '../../src/notifications/alertes.service';
import { BpayCronService } from '../../src/bpay/bpay.cron';

describe('Invariant — toggle BO cron ⇒ effet réel sur les jobs @Cron()', () => {
  let app: INestApplication;
  let cronJobsConfig: CronJobsConfigService;
  let alertesService: AlertesService;
  let bpayCronService: BpayCronService;
  let adminToken: string;

  // Numéro dédié à ce spec (distinct de tout autre fichier d'invariants —
  // vérifié via `grep -rhoE "\+2250[0-9]{9}" backend/test/invariants/*.spec.ts`).
  const ADMIN_PHONE = '+2250700099300';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.get(DbInitService, { strict: false }).runInit();

    cronJobsConfig = mod.get(CronJobsConfigService);
    alertesService = mod.get(AlertesService);
    bpayCronService = mod.get(BpayCronService);

    // Compte admin_general : signup normal (rôle marchand, jamais admin en
    // self-service) puis élévation directe en base — RolesGuard relit le
    // rôle depuis la base à chaque requête (JwtStrategy.validate), donc le
    // token émis avant l'élévation reste valide pour les routes admin.
    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone: ADMIN_PHONE, firstName: 'Admin', lastName: 'CronTest', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    adminToken = su.body.accessToken;
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ oldPassword: '0000', newPassword: '1234' });

    const ds = app.get(DataSource);
    await ds.query(`UPDATE users SET role = 'admin_general' WHERE id = $1`, [su.body.user.id]);
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('GET /cron reflète les VRAIS jobs (pas la liste inventée sync_acteurs/rapport_hebdo/nettoyage_sessions)', async () => {
    const res = await auth(request(app.getHttpServer()).get('/api/v1/cron'));
    expect(res.status).toBe(200);
    const ids = res.body.jobs.map((j: any) => j.id);
    expect(ids).toEqual(
      expect.arrayContaining([CRON_JOB_BPAY_RECONCILIATION, CRON_JOB_ALERTES_VERIFICATION]),
    );
    expect(ids).not.toContain('sync_acteurs');
    expect(ids).not.toContain('rapport_hebdo');
    expect(ids).not.toContain('nettoyage_sessions');
  });

  it("comportement par défaut : un job jamais togglé reste actif (pas de régression sur la prod actuelle)", async () => {
    expect(await cronJobsConfig.isEnabled(CRON_JOB_ALERTES_VERIFICATION)).toBe(true);
    expect(await cronJobsConfig.isEnabled(CRON_JOB_BPAY_RECONCILIATION)).toBe(true);
  });

  it('toggle → désactivé ⇒ le prochain déclenchement (simulé) du job alertes ne fait RIEN', async () => {
    const before = (await cronJobsConfig.getAllStatuses())[CRON_JOB_ALERTES_VERIFICATION];
    const runCountBefore = before?.runCount ?? 0;

    const toggleOff = await auth(
      request(app.getHttpServer()).patch(`/api/v1/cron/${CRON_JOB_ALERTES_VERIFICATION}/toggle`),
    );
    expect(toggleOff.status).toBe(200);
    expect(toggleOff.body.actif).toBe(false);
    expect(await cronJobsConfig.isEnabled(CRON_JOB_ALERTES_VERIFICATION)).toBe(false);

    // Déclenchement simulé : on appelle directement la méthode `@Cron()`,
    // exactement ce que ferait le scheduler NestJS au prochain tick.
    await alertesService.runCronAlertes();

    const after = (await cronJobsConfig.getAllStatuses())[CRON_JOB_ALERTES_VERIFICATION];
    expect(after.runCount).toBe(runCountBefore); // inchangé : le job n'a pas tourné
    expect(after.lastRunAt).toEqual(before?.lastRunAt ?? null);
  });

  it('toggle → réactivé ⇒ le job alertes s’exécute de nouveau et enregistre son passage', async () => {
    const before = (await cronJobsConfig.getAllStatuses())[CRON_JOB_ALERTES_VERIFICATION];
    const runCountBefore = before?.runCount ?? 0;

    const toggleOn = await auth(
      request(app.getHttpServer()).patch(`/api/v1/cron/${CRON_JOB_ALERTES_VERIFICATION}/toggle`),
    );
    expect(toggleOn.status).toBe(200);
    expect(toggleOn.body.actif).toBe(true);
    expect(await cronJobsConfig.isEnabled(CRON_JOB_ALERTES_VERIFICATION)).toBe(true);

    await alertesService.runCronAlertes();

    const after = (await cronJobsConfig.getAllStatuses())[CRON_JOB_ALERTES_VERIFICATION];
    expect(after.runCount).toBe(runCountBefore + 1);
    expect(after.lastStatus).toBe('success');
    expect(after.lastRunAt).not.toBeNull();
  });

  it('même mécanique côté job BPay : désactivé ⇒ no-op, réactivé ⇒ s’exécute', async () => {
    await auth(request(app.getHttpServer()).patch(`/api/v1/cron/${CRON_JOB_BPAY_RECONCILIATION}/toggle`)); // off
    expect(await cronJobsConfig.isEnabled(CRON_JOB_BPAY_RECONCILIATION)).toBe(false);

    const before = (await cronJobsConfig.getAllStatuses())[CRON_JOB_BPAY_RECONCILIATION];
    await bpayCronService.reconcilierTransactionsPending();
    const stillOff = (await cronJobsConfig.getAllStatuses())[CRON_JOB_BPAY_RECONCILIATION];
    expect(stillOff.runCount).toBe(before?.runCount ?? 0);

    await auth(request(app.getHttpServer()).patch(`/api/v1/cron/${CRON_JOB_BPAY_RECONCILIATION}/toggle`)); // on
    expect(await cronJobsConfig.isEnabled(CRON_JOB_BPAY_RECONCILIATION)).toBe(true);

    await bpayCronService.reconcilierTransactionsPending();
    const afterOn = (await cronJobsConfig.getAllStatuses())[CRON_JOB_BPAY_RECONCILIATION];
    expect(afterOn.runCount).toBe((stillOff.runCount ?? 0) + 1);
    expect(afterOn.lastStatus).toBe('success');
  });
});
