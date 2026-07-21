import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbInitService } from './db-init.service';

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
        // synchronize : construit le schéma directement depuis les entités.
        // Utile pour une base VIERGE (ex. nouvelle instance) car l'historique de
        // migrations est incomplet (il suppose des tables déjà présentes). Réglé
        // via DB_SYNCHRONIZE=true. Défaut false (jamais sur une base existante).
        synchronize: config.get<string>('DB_SYNCHRONIZE') === 'true',
        // Déploiement auto-sûr : les migrations en attente s'appliquent au
        // démarrage. Désactivé quand synchronize est actif (les deux ensemble
        // se marcheraient dessus : synchronize crée déjà les colonnes). Réglable
        // via DB_MIGRATIONS_RUN=false.
        migrationsRun:
          config.get<string>('DB_SYNCHRONIZE') !== 'true' &&
          config.get<string>('DB_MIGRATIONS_RUN', 'true') !== 'false',
        logging: config.get<boolean>('DB_LOGGING', false),
        ssl:
          config.get<string>('DB_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
    }),
  ],
  providers: [DbInitService],
  exports: [DbInitService],
})
export class DatabaseModule {}
