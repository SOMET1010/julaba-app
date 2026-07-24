import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbInitService } from './db-init.service';
import { SeedDemoService } from './seed-demo.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'julaba_user'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'julaba_db'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        // synchronize : construit le schéma depuis les entités (base VIERGE).
        // Activé AUTOMATIQUEMENT par prepareDatabase() dans main.ts quand la base
        // est vide — aucun réglage manuel requis. Jamais sur une base peuplée.
        synchronize: process.env.DB_SYNCHRONIZE === 'true',
        // Migrations : uniquement si explicitement demandé (l'historique est
        // incomplet et échouerait sur une base neuve). Jamais en même temps que
        // synchronize. Défaut : off.
        migrationsRun:
          process.env.DB_SYNCHRONIZE !== 'true' &&
          process.env.DB_MIGRATIONS_RUN === 'true',
        logging: config.get<boolean>('DB_LOGGING', false),
        ssl:
          config.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
        // Résilience du lien transatlantique (backend Oregon ↔ base Paris).
        // Sans reconnexion, une coupure réseau au démarrage tue le boot ; on
        // laisse TypeORM réessayer plusieurs fois avant d'abandonner.
        retryAttempts: 10,
        retryDelay: 3000,
        // keepConnectionAlive : ne ferme pas le pool entre les cycles de vie Nest.
        keepConnectionAlive: true,
        // Options passées directement au pool node-postgres.
        extra: {
          // TCP keep-alive : empêche les intermédiaires (Supabase pooler, NAT)
          // de couper une connexion « inactive » qui, en tombant, émettait un
          // 'error' non géré et faisait crasher le processus.
          keepAlive: true,
          keepAliveInitialDelayMillis: 10000,
          // Un client inactif est recyclé au bout de 30 s : on préfère ré-ouvrir
          // une connexion fraîche plutôt que de traîner une socket morte.
          idleTimeoutMillis: 30000,
          // Plafond d'attente d'une connexion libre (évite les requêtes qui
          // pendent indéfiniment si le pool est saturé).
          connectionTimeoutMillis: 15000,
          max: 10,
        },
      }),
    }),
  ],
  // DbInitService AVANT SeedDemoService : les tables (caisse_sessions, produits,
  // index) doivent exister avant d'y insérer le jeu de démo.
  providers: [DbInitService, SeedDemoService],
  exports: [DbInitService],
})
export class DatabaseModule {}
