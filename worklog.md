# Worklog — Projet julaba-app (sandbox)

---
Task ID: 1
Agent: Z.ai Code (orchestrateur principal)
Task: Récupérer le repo https://github.com/SOMET1010/julaba-app et remplacer la codebase du sandbox

Work Log:
- Examiné la structure sandbox d'origine (Next.js 16 + Prisma) et sauvegardé les fichiers critiques sandbox : Caddyfile, examples/, download/, mini-services/, .zscripts/, upload/
- Cloné https://github.com/SOMET1010/julaba-app (branche main, commit ea499ab) via token GitHub fourni dans /tmp/julaba-app
- Arrêté le serveur Next.js (port 3000), supprimé l'ancienne codebase, copié le contenu complet du repo (avec .git préservé pour historique/pull)
- Remote git configuré avec le token : origin → https://github.com/SOMET1010/julaba-app.git
- Restauré le Caddyfile sandbox (gateway :81 → :3000)
- Architecture du repo : monorepo npm workspaces — frontend_src (Vite 6 + React 18 + Tailwind 4 + react-router 7) + backend (NestJS 11 + TypeORM + PostgreSQL) + android (Capacitor)
- npm install racine réussi (1254 packages, 20s) + postinstall esbuild approuvés via npm install-scripts approve
- PostgreSQL 16.4 : binaires portables zonky téléchargés dans /home/z/pg (pas de psql système, pas de droits sudo dans le sandbox), cluster initialisé dans /home/z/pg/data (user julaba, trust, socket /tmp), serveur démarré sur port 5432 (daemon pg_ctl, survit aux sessions shell)
- Base julaba_dev créée via client pg (bun) — zonky n'embarque pas psql
- backend/.env créé : PORT=3001, DB localhost:5432/julaba_dev (julaba/julaba), JWT_SECRET + PIN_ENCRYPTION_KEY + REFRESH_TOKEN_SALT générés (openssl rand -hex 32), SEED_DEMO=true (mot de passe démo 1234), WEBAUTHN_RP_ID=localhost, Sentry/Odoo désactivés
- frontend_src/vite.config.ts : ajout bloc server (host, port 3000, strictPort, watch.usePolling:true car fs.inotify.max_user_watches=8192 non modifiable → ENOSPC, proxy /api → http://localhost:3001)
- Backend lancé : npx nest start --watch (détaché via double-fork setsid), log : /home/z/my-project/backend-dev.log
- Frontend lancé : npx vite --host (détaché via double-fork setsid), log : /home/z/my-project/frontend-dev.log
- Backend booté : schema synchronize auto (base vierge détectée) + seed démo complet (comptes marchands/producteur/coopérative/institution/admin, scénario Hervé → Bénito → COOP → Michelle → DG)
- Tests curl OK : login POST /api/v1/auth/login via proxy Vite retourne l'utilisateur Michelle Walebo (marchand)

Stage Summary:
- Codebase remplacée : julaba-app v5.0.0 (commit ea499ab) est maintenant la racine de /home/z/my-project
- Stack runtime sandbox : PostgreSQL 16.4 embarqué (:5432, data dans /home/z/pg/data) ← NestJS backend (:3001) ← proxy Vite /api ← Vite dev server (:3000) ← gateway Caddy (:81)
- Fichiers sandbox préservés : Caddyfile, examples/, mini-services/, .zscripts/, download/, upload/
- Comptes démo disponibles (SEED_DEMO=true) : téléphone +225XXXXXXXXXX / mot de passe 1234 (ex: +2250726262626 Michelle Walebo marchand)
- Modifications code : frontend_src/vite.config.ts (bloc server pour sandbox), backend/.env (créé, non versionné), Caddyfile sandbox inchangé
- Logs serveurs : backend-dev.log, frontend-dev.log à la racine du projet
