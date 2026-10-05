// Harnais commun des invariants du lot BO-0 (portes de sécurité).
//
// Même montage que keiwa-paiement-commande.spec.ts : AppModule complet,
// DbInitService.runInit(), jetons JWT signés localement, appels HTTP réels
// via supertest sur le Postgres jetable. Aucun appel réseau externe.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { SmsService } from '../../src/sms/sms.service';
import { User, UserStatus } from '../../src/users/entities/user.entity';

export interface CompteTest {
  id: string;
  token: string;
  role: string;
}

export interface HarnaisBO0 {
  app: INestApplication;
  ds: DataSource;
  api: () => request.SuperTest<request.Test>;
  mk: (phone: string, role: string, extra?: Record<string, unknown>) => Promise<CompteTest>;
  close: () => Promise<void>;
}

export interface OptionsHarnais {
  // BO-1 : remplace l'envoi SMS réel (même interception que sec-2) pour lire
  // le seul exemplaire d'un code remis par SMS.
  sms?: { sendSms: (phone: string, message: string) => Promise<{ success: boolean; error?: string }> };
}

export async function monterHarnais(options: OptionsHarnais = {}): Promise<HarnaisBO0> {
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ThrottlerStorage)
    .useValue({
      increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }),
    });
  if (options.sms) builder = builder.overrideProvider(SmsService).useValue(options.sms);
  const mod = await builder.compile();
  const app = mod.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  const ds = app.get(DataSource);
  const jwt = app.get(JwtService);
  await app.get(DbInitService, { strict: false }).runInit();
  const hash = await bcrypt.hash('1234', 4);

  const mk = async (phone: string, role: string, extra: Record<string, unknown> = {}): Promise<CompteTest> => {
    const repo = ds.getRepository(User);
    // Idempotent : une suite rejouée sur la même base retrouve son compte.
    await ds.query(`DELETE FROM users WHERE phone = $1`, [phone]).catch(() => undefined);
    const u: any = await repo.save(repo.create({
      phone, firstName: 'BO0', lastName: role, genre: 'homme',
      role, status: UserStatus.ACTIF, passwordHash: hash, ...extra,
    } as any));
    const token = await jwt.signAsync({ sub: u.id, phone: u.phone, role: u.role }, { secret: process.env.JWT_SECRET });
    return { id: u.id, token, role };
  };

  return {
    app,
    ds,
    api: () => request(app.getHttpServer()),
    mk,
    close: async () => { await app.close(); },
  };
}
