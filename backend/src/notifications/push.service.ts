import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushToken } from './push-token.entity';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);

  constructor(
    @InjectRepository(PushToken)
    private readonly tokenRepo: Repository<PushToken>,
  ) {}

  onModuleInit() {
    const publicKey  = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject    = process.env.VAPID_SUBJECT || 'mailto:contact@julaba.online';

    if (!publicKey || !privateKey) {
      this.logger.warn('[PUSH] Clés VAPID manquantes — push désactivé');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.logger.log('[PUSH] Service Web Push initialisé');
  }

  // Enregistrer ou mettre à jour un token push
  async saveToken(userId: string, token: object): Promise<void> {
    const tokenStr = JSON.stringify(token);
    await this.tokenRepo.query(
      `INSERT INTO push_tokens (user_id, token)
       VALUES ($1, $2)
       ON CONFLICT (user_id, token) DO UPDATE SET updated_at = NOW()`,
      [userId, tokenStr],
    );
    this.logger.log(`[PUSH] Token enregistré pour user ${userId}`);
  }

  // Supprimer un token (déconnexion)
  async removeToken(userId: string, token: object): Promise<void> {
    const tokenStr = JSON.stringify(token);
    await this.tokenRepo.query(
      `DELETE FROM push_tokens WHERE user_id = $1 AND token = $2`,
      [userId, tokenStr],
    );
  }

  // Envoyer une push à un utilisateur
  async sendToUser(userId: string, payload: {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    tag?: string;
    notifId?: string;
  }): Promise<void> {
    if (!process.env.VAPID_PUBLIC_KEY) return;

    const rows = await this.tokenRepo.query(
      `SELECT token FROM push_tokens WHERE user_id = $1`,
      [userId],
    );

    if (!rows.length) return;

    const payloadStr = JSON.stringify(payload);
    const expired: string[] = [];

    await Promise.allSettled(
      rows.map(async (row: { token: string }) => {
        try {
          const subscription = JSON.parse(row.token);
          await webpush.sendNotification(subscription, payloadStr);
        } catch (err: any) {
          // Token expiré ou invalide → on le supprime
          if (err.statusCode === 410 || err.statusCode === 404) {
            expired.push(row.token);
          } else {
            this.logger.warn(`[PUSH] Erreur envoi: ${err.message}`);
          }
        }
      }),
    );

    // Nettoyage des tokens expirés
    if (expired.length) {
      await Promise.all(
        expired.map(token =>
          this.tokenRepo.query(
            `DELETE FROM push_tokens WHERE user_id = $1 AND token = $2`,
            [userId, token],
          ),
        ),
      );
    }
  }
}
