import { Module } from '@nestjs/common';
import { CronJobsConfigService } from './cron-jobs-config.service';

/**
 * Fournit `CronJobsConfigService` : lu par chaque job `@Cron()` réel avant de
 * s'exécuter (toggle effectif), et par `GET /cron` (statut réel). Voir
 * `cron-jobs.registry.ts` pour la liste des jobs réels.
 */
@Module({
  providers: [CronJobsConfigService],
  exports: [CronJobsConfigService],
})
export class CronJobsModule {}
