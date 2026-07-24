import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// Le contrôle de santé de Render frappe cet endpoint en boucle. Il ne doit
// JAMAIS être soumis au rate-limiter : sinon il finit par recevoir un 429,
// Render croit l'instance en panne, la redémarre -> fenêtre de 502 pour les
// utilisateurs, en boucle. @SkipThrottle garantit une réponse 200 constante.
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'julaba-backend',
      version: '1.0.0',
    };
  }
}
