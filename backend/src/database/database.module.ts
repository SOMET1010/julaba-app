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
        synchronize: false,
        // Déploiement auto-sûr : les migrations en attente s'appliquent au
        // démarrage du backend (TypeORM ne rejoue jamais une migration déjà
        // enregistrée). Garantit que la colonne idempotency_key existe AVANT la
        // première vente, sans étape manuelle. Désactivable via DB_MIGRATIONS_RUN=false.
        migrationsRun: config.get<string>('DB_MIGRATIONS_RUN', 'true') !== 'false',
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
