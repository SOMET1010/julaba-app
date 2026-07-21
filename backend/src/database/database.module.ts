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
      }),
    }),
  ],
  // DbInitService AVANT SeedDemoService : les tables (caisse_sessions, produits,
  // index) doivent exister avant d'y insérer le jeu de démo.
  providers: [DbInitService, SeedDemoService],
  exports: [DbInitService],
})
export class DatabaseModule {}
