import "./instrument";
import { NestFactory } from '@nestjs/core';
import { Sentry } from "./instrument";
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

// Préparation automatique de la base — AUCUN réglage manuel requis.
// Si la base est VIERGE (pas de table "users"), on construit le schéma depuis les
// entités (synchronize) car l'historique de migrations est incomplet et échoue sur
// une base neuve. On crée aussi l'extension uuid-ossp (requise par les colonnes
// uuid). Sur une base déjà peuplée : on ne touche à rien.
async function prepareDatabase(logger: Logger) {
  if (!process.env.DB_HOST) return; // pas de base distante configurée
  const { Client } = require('pg');
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  try {
    await client.connect();
    const res = await client.query("SELECT to_regclass('public.users') AS t");
    const vierge = !res.rows[0].t;
    if (vierge) await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    // AUTORITAIRE : on impose l'état, en ignorant toute variable d'env résiduelle.
    // Base vierge -> on construit le schéma ; base déjà remplie -> surtout PAS de
    // reconstruction (sinon "relation ... already exists"). Migrations jamais
    // auto (historique incomplet).
    process.env.DB_SYNCHRONIZE = vierge ? 'true' : 'false';
    process.env.DB_MIGRATIONS_RUN = 'false';
    logger.log(vierge
      ? '[DB] Base vierge -> construction automatique du schéma.'
      : '[DB] Base existante -> schéma conservé (pas de reconstruction).');
  } catch (e: unknown) {
    // Non bloquant : si l'inspection échoue, on laisse TypeORM tenter sa connexion.
    logger.warn('[DB] Inspection base ignorée: ' + (e instanceof Error ? e.message : String(e)));
  } finally {
    try { await client.end(); } catch { /* ignore */ }
  }
}

// ── Filet de survie du processus ────────────────────────────────────────────
// Sur un lien transatlantique (backend Oregon ↔ base Supabase Paris), Supabase
// ferme parfois une connexion inactive du pool. node-postgres émet alors un
// événement 'error' sur le pool ; SANS écouteur, Node considère cela comme une
// exception non gérée et TUE le processus -> le service tombe (502) juste après
// être passé « live », jusqu'au redémarrage Render. On journalise et on CONTINUE :
// une connexion perdue est ré-ouverte automatiquement par le pool à la requête
// suivante ; il n'y a aucune raison d'abattre tout le serveur.
function installProcessGuards(logger: Logger) {
  process.on('unhandledRejection', (reason) => {
    logger.error(
      '[GUARD] Promesse rejetée non gérée (serveur maintenu en vie): ' +
        (reason instanceof Error ? reason.stack || reason.message : String(reason)),
    );
  });
  process.on('uncaughtException', (err) => {
    logger.error(
      '[GUARD] Exception non gérée (serveur maintenu en vie): ' +
        (err instanceof Error ? err.stack || err.message : String(err)),
    );
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  installProcessGuards(logger);
  await prepareDatabase(logger);
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    bodyParser: false,  // Désactivé — on gère manuellement ci-dessous
  });

  // ── Confiance au proxy Render ─────────────────────────────────────────────
  // Derrière Render, toutes les requêtes arrivent via un proxy : sans ceci,
  // req.ip = l'IP du proxy pour TOUT LE MONDE, donc le rate-limiter compte tous
  // les utilisateurs dans un SEUL compteur (le quota login de 5/min était partagé
  // par tous → connexions bloquées, et le health-check finissait en 429). En
  // faisant confiance au 1er hop, req.ip redevient l'IP réelle du client (via
  // X-Forwarded-For) : chacun a son propre quota.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // ── CORS infaillible (préflight garanti) ──────────────────────────────────
  // Symptôme observé : les GET passaient mais tout POST (login, check-phone)
  // était bloqué « No 'Access-Control-Allow-Origin' » sur la requête PRÉPARATOIRE
  // (OPTIONS, envoyée automatiquement par le navigateur avant un POST). Selon
  // l'ordre interne des middlewares (helmet, body-parser…), le paquet `cors`
  // pouvait ne pas répondre correctement au préflight. On règle ça une bonne
  // fois : on répond NOUS-MÊMES, en TOUT PREMIER, avant helmet et le reste.
  const allowedOrigins = [
    process.env.CORS_ORIGIN,
    'https://julaba-web.onrender.com',
    'https://julaba.online',
  ].filter((o): o is string => Boolean(o));
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.setHeader('Vary', 'Origin');
    }
    // Requête préparatoire : on répond 204 immédiatement, sans passer par la
    // suite (helmet, guards, routeur) — c'est exactement ce que le navigateur
    // attend pour autoriser le POST qui suit.
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      return res.end();
    }
    return next();
  });

  // Body parser UNIQUE — avant tous les middlewares
  const express = require('express');
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:', 'https://*.tile.openstreetmap.org'],
        connectSrc: [
          "'self'",
          'https:',
          'https://nominatim.openstreetmap.org',
          'https://api.openai.com',
          'https://api.elevenlabs.io',
          'https://api.cloudinary.com',
          'https://res.cloudinary.com',
          'https://v2.b-pay.co',
          'https://b-pay.co',
          'https://ansut-test.lafricamobile.com',
          'https://api-rnpp.verif.ci',
          'https://*.ingest.de.sentry.io',
          'wss://julaba.online',
        ],
      },
    },
  }));

  // Préfixe global
  const prefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(prefix);

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Permissif pour les endpoints voice/context
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Limite taille requêtes (photos base64) — via NestFactory options

  // Rate limiting : le ThrottlerGuard est enregistré globalement via APP_GUARD
  // dans AppModule (voir providers), ce qui active les décorateurs @Throttle.

  // CORS — frontend et backend V2 sont sur des domaines DIFFÉRENTS. On autorise
  // explicitement le frontend V2 en plus de CORS_ORIGIN, pour rester fonctionnel
  // même si la variable d'env n'a pas été appliquée par l'hébergeur.
  const corsOrigins = [
    process.env.CORS_ORIGIN,
    'https://julaba-web.onrender.com',
    'https://julaba.online',
  ].filter((o): o is string => Boolean(o));
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Swagger (désactivé en production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('JÙLABA API')
      .setDescription('API Backend de la plateforme JÙLABA')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = process.env.PORT || 3000;
    logger.log(`Swagger disponible sur : http://localhost:${port}/api/docs`);
  }

  // Sentry — error handler désactivé (conflit stream body-parser)
  // app.use(Sentry.expressErrorHandler());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application démarrée sur : http://localhost:${port}/${prefix}`);
}

bootstrap();
