import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HealthController } from './health.controller';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { BpayModule } from './bpay/bpay.module';
import { ScheduleModule } from "@nestjs/schedule";
import { EscrowModule } from './escrow/escrow.module';
import { RecoltesRestModule } from './recoltes-rest/recoltes-rest.module';
import { PublicationsModule } from './producteur/publications/publications.module';
import { ActeursRestModule } from './acteurs-rest/acteurs-rest.module';
import { DossiersRestModule } from './dossiers-rest/dossiers-rest.module';
import { TransactionsRestModule } from './transactions-rest/transactions-rest.module';
import { AcademyModule } from './academy/academy.module';
import { CooperativesRestModule } from './cooperatives-rest/cooperatives-rest.module';
import { StocksRestModule } from './stocks-rest/stocks-rest.module';
import { CaisseRestModule } from './caisse-rest/caisse-rest.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { IdentificationsModule } from './identifications/identifications.module';
import { MissionsModule } from './missions/missions.module';
import { MutationsModule } from './mutations/mutations.module';
import { AuditRestModule } from './audit-rest/audit-rest.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ZonesModule } from './zones/zones.module';
import { MarchesModule } from './marches/marches.module';
import { CommandesModule } from './commandes/commandes.module';
import { AdminModule } from './admin/admin.module';


import { CyclesRestModule } from './cycles-rest/cycles-rest.module';
import { TicketsRestModule } from './tickets-rest/tickets-rest.module';
import { PublicationsRestModule } from './publications-rest/publications-rest.module';
import { CommandesRestModule } from './commandes-rest/commandes-rest.module';
import { TicketsModule } from './tickets/tickets.module';
import { ScoresModule } from './scores/scores.module';
import { AuditModule } from './audit/audit.module';
import { SmsModule } from './sms/sms.module';
import { FeedbakSmsModule } from './feedbak-sms/feedbak-sms.module';
import { EventsModule } from './events/events.module';
import { OneciModule } from './oneci/oneci.module';
import { VoiceModule } from './voice/voice.module';
import { RevenusModule } from './revenus/revenus.module';
import { MiscRestModule } from './misc-rest/misc-rest.module';
import { FinancialScoreModule } from './financial-score/financial-score.module';
import { PartnerModule } from './partner/partner.module';
import { AdminDivisionsModule } from './admin-divisions/admin-divisions.module';
import { UserFlagsModule } from './user-flags/user-flags.module';
import { ProducteursRestModule } from './producteurs-rest/producteurs-rest.module';

@Module({
  imports: [
    // Configuration globale
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),

    // Rate limiting global
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60000, limit: 1000 },
      { name: 'auth', ttl: 60000, limit: 5 },
      { name: 'voice', ttl: 60000, limit: 10 },
      { name: 'recovery', ttl: 60000, limit: 5 },
    ]),

    // Database
    DatabaseModule,

    // Modules métier (Priorité 1 & 2)
    AuthModule,
    UserFlagsModule,
    UsersModule,
    WalletsModule,
    BpayModule,
    ScheduleModule.forRoot(),
    EscrowModule,
    AdminModule,
    NotificationsModule,
    TicketsModule,
    ScoresModule,
    AuditModule,

    // Producteur

    // Commandes (multi-rôles)
    CommandesModule,
    ZonesModule,
    MarchesModule,
    CyclesRestModule,
    RecoltesRestModule,
    TicketsRestModule,
    PublicationsRestModule,
    ProducteursRestModule,
    CommandesRestModule,
    ActeursRestModule,
    DossiersRestModule,
    TransactionsRestModule,
    AcademyModule,
    CooperativesRestModule,
    StocksRestModule,
    CaisseRestModule,
    InstitutionsModule,
    IdentificationsModule,
    MissionsModule,
    MutationsModule,
    AuditRestModule,


    // SMS & OTP — CI ANSUT
    SmsModule,
    FeedbakSmsModule,
    EventsModule,

    // ONECI — Vérification identité
    OneciModule,
    VoiceModule,
    RevenusModule,
    MiscRestModule,
    FinancialScoreModule,
    PartnerModule,
    AdminDivisionsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Rate limiting global — active les décorateurs @Throttle/@SkipThrottle
    // (login limit 3, recovery limit 5, voice…). Sans ce guard, ThrottlerModule
    // est configuré mais AUCUN throttle n'est appliqué (brute-force possible).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
