// ============================================================
// PM2 — backend Jùlaba sur l'hôte (variante sans Docker)
// Infra cible (nginx hôte — sites-available/julaba-dev.ansut.ci) :
//   https://julaba-dev.ansut.ci
//     /api/ et /socket.io/  → 127.0.0.1:3004  (CE process, PORT dans
//                              backend/.env.production — PORT=3004)
//     / et assets statiques → 127.0.0.1:8080  (pm2 serve, voir
//                              docs/DEPLOIEMENT-PM2.md)
//
// Le .env.production est chargé ICI via dotenv AVANT le démarrage :
// les vraies variables d'environnement priment sur le .env lu par
// ConfigModule — même comportement qu'avec env_file du docker-compose.yml.
// Ce fichier est commité ; backend/.env.production ne l'est JAMAIS.
// ============================================================
require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env.production') });

module.exports = {
  apps: [
    {
      name: 'julaba-backend',
      cwd: './backend',
      script: 'dist/main.js',
      // FORK obligatoire (jamais cluster/instances>1) : le cron B-PAY de
      // réconciliation, les webhooks et socket.io supposent un process unique.
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '600M',
      time: true, // timestamps dans les logs pm2
      env: { NODE_ENV: 'production' },
    },
  ],
};
