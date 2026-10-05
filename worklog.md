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

---
Task ID: 2
Agent: Z.ai Code (orchestrateur) + agent Audit (Explore) 
Task: Audit de l'interface auth en respectant les normes du dossier .ai + fix blocage host Vite

Work Log:
- Fix vite.config.ts : ajout server.allowedHosts (le panneau de preview du sandbox accède via un domaine externe *.fcapp.run, Vite 6 bloquait le host) + redémarrage Vite (frontend-dev.log)
- Règle d'or .ai respectée : lecture de .ai/README.md, PROJECT_CONTEXT.md (vision voice-first, §8 règles critiques), ACCESSIBILITY_GUIDE.md (§4/5/6 = règles obligatoires), DESIGN_SYSTEM.md (§9 conventions), AUDIT-002 + AUDIT-ACTEUR-MARCHAND (formats de référence)
- Audit statique délégué à l'agent Audit : 8 fichiers auth (3 100 lignes) + supports (comptesMemorises.ts, entreeVoix.ts, paroleEntree.ts, login.css, voiceTrace/voiceDebug) — 17 constats AUTH-01..17 (5 P1, 12 P2), 12 points forts, checklist a11y, scores proposés
- Gardes CI auth exécutés : test:verrou-connexion ✅ VERT, test:comptes ✅ VERT, test:tokens ✅ VERT ; test-entree-unique ❌ ROUGE (4 échecs, orphelin hors verify, arbitré dans maillons-verify.json:147), test-nom-tantie-nanti-lou ❌ ROUGE (orphelin)
- Audit runtime Agent Browser (10 tests R1-R10) : parcours EntryGate→Onboarding→Numéro→PIN→/marchand OK ; verrou PIN : message serveur en role="alert" ✅ ; cibles tactiles MESURÉES : « Modifier » 44×16,5 px ❌, bascule images 149×30 px ❌, modale « Fermer » 32×32 px ❌ ; ESC sur modale custom inopérant (pas de focus trap) ❌ ; /non-enregistre : PII masquée « XXXXXX 6780 » ✅ ; clavier Tab/Enter ✅ ; zéro erreur console ✅
- Rapport d'audit rédigé au format .ai : .ai/AUDITS/AUDIT-UI-AUTH-2026-10-05.md (scores : a11y 68, sécurité 74, DS 58, qualité 66 → global 66/100)
- AUDIT_REPORT.md : section « Audits ciblés » ajoutée avec référence + synthèse (règle un fichier = un écrivain respectée)
- Note : commit f85057c constaté sur main (infrastructure sandbox .zscripts/skills auto-committée par le tooling, aucun fichier projet concerné)

Stage Summary:
- Rapport d'audit auth complet : .ai/AUDITS/AUDIT-UI-AUTH-2026-10-05.md — score 66/100 🟠 (au-dessus du seuil PROD 60)
- Top 5 actions : AUTH-02 (PIN hors history.state), AUTH-03/04 (rendre audibles verrou + réécouter — cœur voice-first), AUTH-05 (Radix Dialog + backdrop non-refusant), AUTH-01 (trancher garde entrée unique), AUTH-08/09 (gardes couleurs/cibles étendus à l'auth)
- Sécurité auth confirmée solide : PIN jamais journalisé, verrou serveur-driven, fail-closed, PII masquée
- Aucun code projet modifié par l'audit (lecture seule) ; seul vite.config.ts a été retouché pour le fix allowedHosts (déjà modifié en Task 1 pour le sandbox)

---
Task ID: 3
Agent: Z.ai Code (orchestrateur)
Task: Corriger les 5 constats P1 de l'audit UI auth (AUTH-01..05)

Work Log:
- Lecture des normes .ai (ACCESSIBILITY_GUIDE §4/5/6, DESIGN_SYSTEM §9, verify-tout.mjs) + des fichiers concernés (LoginPassword 1653 l., entreeVoix.ts, paroleEntree.ts, PropositionReconnaissance, ChangePasswordScreen, routes.tsx, gardes CI, registre voix 212 clips)
- AUTH-01 (tranché) : /welcome et /login redeviennent <Navigate to="/" replace/> dans routes.tsx (les imports directs Welcome/LoginPassword venaient du snapshot d'origine 3a3b77e, la garde a été écrite APRÈS) ; EntryGate redevient le seul juge ; garde test:entree-unique réinscrite dans maillons-verify.json (verify) et retirée de horsVerify ; en-tête de la garde documente le tranché
- AUTH-02 : nouveau canal mémoire one-shot services/codeActuelMemoire.ts (deposerCodeActuel/lireCodeActuel, 60 s, zéro stockage) ; LoginPassword dépose avant navigate('/change-password') ; ChangePasswordScreen lit le canal (useLocation retiré) ; nouvelle garde test-canal-code.mjs inscrite dans verify
- AUTH-03 : grammaire par clips EXISTANTS (jamais de durée inventée) — verrouCinqMinutes (ui-125, VRAIE voix, palier 5 min pile), dernierEssai (login-29, lot A), mauvaisCodeAttention (login-28, lot A — découverte : codeErreur générique est un clip prototype muet en prod) ; CLE_CATALOGUE complété (AUTH_30/AUTH_29/AUTH_28) ; test-verrou-connexion RENFORCÉ : interdit parle(message), exige parle(ENTREE_VOICE_CLIPS.*) ×2, vérifie clé + fichier audio embarqué
- AUTH-04 : relecture du numéro → feedback NON audio (reco audit n°1) : surbrillance chiffre par chiffre + tick haptique (relireNumero, 450 ms/chiffre), bouton renommé « Revoir mon numéro » (icône œil lucide, 44×44), balayage étendu à la fin de dictée, annulation sur frappe/démontage ; chiffresEpeles retiré ; parleSuite ne reçoit plus de segment sans clip
- AUTH-05 : PropositionReconnaissance réécrite sur Radix Dialog 1.1.23 (focus trap, ESC, retour focus, aria-modal="true" explicite, Title réel) ; fond/ESC/Fermer = fermeture SANS refus (seul « Non » note le refus) ; Fermer 32→44 px ; focus initial sur « Oui, je veux »
- Référence voix-trace mise à jour CHIRURGICALEMENT (script one-shot scripts/maj-reference-parole-login.mjs) : seule appels['LoginPassword.tsx'] recalculée (17→15) ; les 4 empreintes rouges VOICE-01 de Patrick NON re-figées (même état qu'avant, zéro nouveau rouge)
- package.json : +test:canal-code ; maillons-verify.json : +test:entree-unique, +test:canal-code, -test:entree-unique horsVerify
- Gardes exécutés : verrou-connexion ✅, entree-unique ✅ (7/7), canal-code ✅ (7/7), comptes ✅, tokens ✅, parole-entree ✅, akwaba-voix ✅, entree-numero-voix ✅, voix-connexion-lot-a ✅, clips-embarques ✅, route-access ✅, maillons-orphelins ✅, voix-trace-source = mêmes 4 rouges connus (0 nouveau), tsc -b ✅, lint ✅
- Recette agent-browser (390×844) : /login→/ (AUTH-01 ✅) ; pavé→numéro→bouton Revoir 44×44 + balayage 1 chiffre illuminé puis 0 (AUTH-04 ✅) ; PIN faux ×2 → bannière + GET login-28.mp3 206 (AUTH-03 ✅) ; verrou Bénito 3 échecs → « Attends 5 minutes » + GET ui-125.mp3 206 (AUTH-03 ✅, verrou levé seul depuis) ; login Michelle → modale Radix : role=dialog, aria-modal, Fermer 44×44, focus « Oui, je veux », ESC ferme, reload→modale revient après ESC et après tap fond = refus non noté, Tab reste dans la modale (AUTH-05 ✅) ; history.state sans codeActuel (AUTH-02 ✅) ; zéro erreur console
- Audit mis à jour : .ai/AUDITS/AUDIT-UI-AUTH-2026-10-05.md §11 « Corrections P1 appliquées » (tableau de clôture + preuves)

Stage Summary:
- Les 5 P1 d'audit auth sont fermés avec preuve de garde ET preuve runtime ; score audit projeté en forte hausse (a11y, voice-first, gouvernance)
- Nouveaux artefacts : services/codeActuelMemoire.ts, scripts/test-canal-code.mjs, scripts/maj-reference-parole-login.mjs ; 3 clés voix (verrouCinqMinutes/dernierEssai/mauvaisCodeAttention) branchées sur des clips toujours disponibles
- Décision AUTH-01 tranchée vers « une seule porte d'entrée » (Navigate) — cohérent avec l'intention de la garde et l'en-tête d'EntryGate ; la garde est redevenue VIVANTE dans verify
- Découverte utile : le clip codeErreur est « prototype » (muet en build livré) — documenté dans entreeVoix.ts ; le trou AUTH-ERR générique (restants>2) reste OUVERT hors périmètre P1
- P2 restants : AUTH-06..17 (prochain lot suggéré : AUTH-08/09 gardes charte/cible, puis AUTH-10 découpage LoginPassword ~1700 l.)
