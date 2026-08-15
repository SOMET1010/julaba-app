import { Controller, Get, Req } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// (Test déploiement automatique — commentaire sans effet.)

// Le contrôle de santé de Render frappe cet endpoint en boucle. Il ne doit
// JAMAIS être soumis au rate-limiter : sinon il finit par recevoir un 429,
// Render croit l'instance en panne, la redémarre -> fenêtre de 502 pour les
// utilisateurs, en boucle.
//
// Depuis l'inversion du modèle (un unique throttler `default`, cf.
// docs/AUDIT_THROTTLING.md), @SkipThrottle() sans argument suffit : il saute le
// seul limiteur existant.
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
      // Marqueur de version : permet de vérifier EXACTEMENT quel commit tourne en
      // production (Render injecte RENDER_GIT_COMMIT). Fini de deviner si le bon
      // code est déployé — il suffit d'ouvrir /api/v1/health.
      commit: (process.env.RENDER_GIT_COMMIT || 'dev').slice(0, 7),
    };
  }

  // Diagnostic réseau pour CALIBRER `trust proxy` (cf. docs/AUDIT_THROTTLING.md).
  // À frapper depuis un vrai appareil en prod : `ips` / `xForwardedFor` révèlent la
  // chaîne réelle (donc le nombre de sauts Render), et `ip` montre ce que le
  // rate-limiter utilise comme clé. Test anti-usurpation : rejouer avec un
  // `X-Forwarded-For` forgé et vérifier que `ip` ne le reflète PAS une fois le bon
  // nombre de sauts réglé. N'expose que la vue réseau de l'appelant (pas sensible).
  @Get('net')
  net(@Req() req: any) {
    return {
      ip: req.ip,
      ips: req.ips,
      xForwardedFor: req.headers?.['x-forwarded-for'] ?? null,
      remoteAddress: req.socket?.remoteAddress ?? null,
      trustProxy: req.app?.get?.('trust proxy') ?? false,
    };
  }
}
