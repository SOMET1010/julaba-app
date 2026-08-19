// Registre STATIQUE des vrais jobs `@Cron()` (NestJS Schedule) de l'app.
//
// Trouvé par audit : GET /cron renvoyait une liste de 3 jobs entièrement
// inventés (sync_acteurs, rapport_hebdo, nettoyage_sessions) sans rapport
// avec le code — ce fichier est la SOURCE UNIQUE DE VÉRITÉ, alimentée à la
// main depuis les `@Cron(...)` réels du backend. Si tu ajoutes un nouveau
// `@Cron()`, ajoute-le ICI et branche-le sur `CronJobsConfigService`
// (isEnabled/recordExecution) dans le service qui le porte, sinon le
// dashboard BO redeviendra mensonger.
//
// NB — la « sauvegarde quotidienne DB » et les autres jobs pilotés par
// GitHub Actions (.github/workflows/sauvegarde-db.yml) ne sont PAS ici :
// ce sont des workflows CI externes, hors process Node, que ce
// mécanisme (table Postgres lue par le process) ne peut pas activer/couper.
// Les lister ici laisserait croire au bouton toggle un pouvoir qu'il n'a pas.

export interface CronJobDefinition {
  /** Identifiant stable — clé primaire dans `cron_jobs_config`, utilisé dans l'URL /cron/:id/toggle. */
  id: string;
  nom: string;
  description: string;
  cron: string;
  cronHumain: string;
}

export const CRON_JOB_BPAY_RECONCILIATION = 'bpay_reconciliation';
export const CRON_JOB_ALERTES_VERIFICATION = 'alertes_verification';

export const CRON_JOBS_REGISTRY: CronJobDefinition[] = [
  {
    id: CRON_JOB_BPAY_RECONCILIATION,
    nom: 'Réconciliation BPay',
    description:
      "Réconcilie les transactions BPay en attente depuis plus de 15 minutes : vérifie le statut auprès de BPay et crédite le portefeuille en cas de succès.",
    cron: '*/5 * * * *',
    cronHumain: 'Toutes les 5 minutes',
  },
  {
    id: CRON_JOB_ALERTES_VERIFICATION,
    nom: 'Vérification des alertes',
    description:
      "Vérifie stocks faibles, journées non ouvertes, récoltes proches et publications expirées pour tous les acteurs actifs.",
    cron: '0 * * * *',
    cronHumain: 'Toutes les heures',
  },
];
