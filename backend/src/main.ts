import "./instrument";
import { NestFactory } from '@nestjs/core';
import { Sentry } from "./instrument";
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    bodyParser: false,  // Désactivé — on gère manuellement ci-dessous
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

  // Rate limiting specifique endpoints sensibles
  const { ThrottlerGuard } = require('@nestjs/throttler');

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'https://julaba.online',
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
