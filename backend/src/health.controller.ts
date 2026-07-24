import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// (Test déploiement automatique — commentaire sans effet.)

// Le contrôle de santé de Render frappe cet endpoint en boucle. Il ne doit
// JAMAIS être soumis au rate-limiter : sinon il finit par recevoir un 429,
// Render croit l'instance en panne, la redémarre -> fenêtre de 502 pour les
// utilisateurs, en boucle.
//
// ATTENTION @nestjs/throttler v5 : avec PLUSIEURS limiteurs nommés (default,
// auth, voice, recovery), ILS S'APPLIQUENT TOUS à chaque route. Or @SkipThrottle()
// sans argument ne saute QUE « default » — les limiteurs auth/recovery (5/min)
// continuaient de s'appliquer et renvoyaient 429 au health-check (frappé bien
// plus de 5×/min par Render). On saute donc EXPLICITEMENT tous les limiteurs.
@SkipThrottle({ default: true, auth: true, voice: true, recovery: true })
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'julaba-backend',
      version: '1.0.0',
      // Marqueur de version : permet de vérifier EXACTEMENT quel commit tourne en
      // production (Render injecte RENDER_GIT_COMMIT). Fini de deviner si le bon
      // code est déployé — il suffit d'ouvrir /api/v1/health.
      commit: (process.env.RENDER_GIT_COMMIT || 'dev').slice(0, 7),
    };
  }
}
