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

---
Task ID: 4
Agent: Z.ai Code (orchestrateur)
Task: Vérification finale d'intégrité post-correction P1 (reprise après coupure de contexte)

Work Log:
- État git : arbre propre, 2 commits de correction P1 présents sur main (745c730, 4bef809)
- Artefacts AUTH-02 en place : services/codeActuelMemoire.ts + scripts/test-canal-code.mjs
- routes.tsx:53-54 : /welcome et /login → <Navigate to="/" replace /> (AUTH-01 tranché)
- Gardes re-exécutées : test:entree-unique ✅ VERT, test:canal-code ✅ VERT (7/7), test:verrou-connexion ✅ VERT (texte→clip + fichiers embarqués)
- API : login POST /api/v1/auth/login (+2250726262626/1234) → 200 Michelle Walebo (marchand) via proxy Vite
- Recette agent-browser (390×844) : EntryGate → onboarding → écran numéro (pavé complet) → « Revoir mon numéro » présent
- AUTH-04 re-vérifié live : balayage = 1 chiffre illuminé (computedStyle boxShadow ≠ none) puis 0 après fin
- AUTH-05 re-vérifié live : role=dialog, aria-modal="true", focus initial « Oui, je veux », Fermer 44×44 px, ESC ferme (le check à 1,2 s captait l'animation Radix — fermée à 2 s), reload → modale revient = refus non noté
- history.state propre (aucun codeActuel) (AUTH-02)
- Console : zéro erreur page ; seuls warnings attendus en dev (wallet keiwa absent, WS timeout)
- Navigateur fermé proprement

Stage Summary:
- Les 5 P1 (AUTH-01..05) restent fermés et re-vérifiés de bout en bout après la coupure de contexte : gardes vertes + runtime conforme
- App fonctionnelle : parcours complet Entrée → Numéro → PIN → /marchand sans erreur
- P2 restants (AUTH-06..17) hors périmètre — prochain lot suggéré : AUTH-08/09 (gardes charte/cible) puis AUTH-10 (découpage LoginPassword)

---
Task ID: 5
Agent: Z.ai Code (orchestrateur)
Task: Corriger les P2 actionnables de l'audit UI auth (AUTH-08..11, 13, 15..17) + inscrire AUTH-06/07/12/14 au registre de dette

Work Log:
- Lecture des normes .ai (ACCESSIBILITY_GUIDE §4/5/6, DESIGN_SYSTEM §9, DEBT_REPORT) + des gardes de référence (caisseCharte.test.mts, test-cible-tactile.mjs, tokens.test.mts) avant toute édition
- AUTH-16 : 5 surfaces LoginPassword migrées sur jetons (--commerce-surface ×4, --commerce-paper pour le plateau pavé) ; feuille modale restée #fff littéral AVEC justification (textes bruns littéraux → illisibles en sombre)
- AUTH-15 : 4 SVG dessinés main → icônes lucide (Keyboard, Delete ×2, Check, Play)
- AUTH-17 : « Vérification... » → role="status" + aria-live="polite"
- AUTH-09 : « Modifier » 44×16,5→85×44 px, bascule images ≥44 px, + minHeight 44 sur 4 autres cibles ; garde test-cible-tactile ÉTENDU à l'auth (4 cibles : Modifier, bascule, Revoir mon numéro, Fermer modale)
- AUTH-11 : ChangePasswordScreen (autoComplete current/new-password ×3 + aria-invalid + aria-describedby) ; ActivationScreen (idem + one-time-code sur le code reçu)
- AUTH-13 : voiceTrace.masquerChiffresSensibles() (≥7 chiffres → 4 gardés + 6 « • ») appliqué à la source (sttFin/intention → localStorage) ET défensivement dans vlogDump (anneau + dictée, idempotent) ; test tsx direct : 0726262626→0726••••••, format espacé géré, mots intacts
- AUTH-08 : garde authCharte.test.mts (tsx, modèle caisseCharte) — charte FERMÉE de 31 valeurs nommées avec rôle, budgets hex FIGÉS par fichier (26/13/9/0/7/0/1/0/4/0), jetons consommés vérifiés déclarés, migrations exigées ; migrations réalisées au passage : #B74725→var(--commerce-action) ×9 (LoginPassword ×4, ChangePwd ROLE_COLORS, PropoReco ×2+gradient, Activation P), #F5D6BD→var(--commerce-apricot) ×2 ; garde inscrit dans maillons-verify.json (après test:canal-code) + package.json (test:auth-charte)
- AUTH-10 : LoginPassword 1759→1525 l. — 4 modules extraits : hooks/useDicteeLive.ts (rouage STT complet, cfg.onCanalVoix pour le canal « voix »), hooks/useDevMode.ts, components/auth/BanniereErreur.tsx (bannière ×3→×1, margeBas paramétrée), components/auth/PaveSaisie.tsx (pavé ×2→×1, empreinteDisabled SÉPARÉE pour préserver la logique d'activation `phone.length===0`)
- Contrat vocal vérifié MÉCANIQUEMENT : inventaire des appels parle/parleSuite de LoginPassword = 15/15 identique à la référence parole-3917bb7 (même script que la garde)
- Correction en chemin : fenêtre de recherche du garde cible-tactile élargie (style AVANT le marqueur) ; coquille `mavais` corrigée ; import vlogStart déplacé en tête du hook
- Gardes finales (exit 0) : typecheck, auth-charte, cible-tactile, comptes, tokens, verrou-connexion, entree-unique, canal-code, parole-entree, entree-numero-voix, clips-embarques, route-access, maillons-orphelins ; voix-trace-source = mêmes 4 rouges VOICE-01 (Patrick), zéro nouveau
- Recette agent-browser (390×844) : EntryGate → onboarding → écran numéro (pavé PaveSaisie) → numéro Michelle → Revoir mon numéro mesuré 44×44 → PIN → « Modifier » mesuré 85×44 → login → /marchand → modale Radix (aria-modal, focus « Oui, je veux », ESC ferme) → zéro erreur console
- Documentation : AUDIT-UI-AUTH §12 (tableau de clôture P2 + état des gardes + recette), AUDIT_REPORT.md (synthèse clôture P1+P2), DEBT_REPORT.md (section AUTH : AUTH-06/07/12/14 + AUTH-ERR)

Stage Summary:
- 9 P2 actionnables fermés avec preuve de garde ET preuve runtime ; 4 dettes assumées + AUTH-ERR tracées au registre (DEBT_REPORT.md)
- Nouveaux artefacts : authCharte.test.mts (charte fermée + budgets), useDicteeLive.ts, useDevMode.ts, BanniereErreur.tsx, PaveSaisie.tsx ; test-cible-tactile étendu à l'auth ; test:auth-charte dans verify
- Décisions : charte auth FERMÉE avec budgets figés (une couleur nouvelle = échec, baisser un budget = progrès) ; feuille modale #fff documentée exception ; empreinteDisabled séparée dans PaveSaisie (régression d'activation évitée)
- P2 restants hors code : AUTH-06/07/12/14 (registre) — auth frontend prête pour un prochain lot : AUTH-07 côté backend

---
Task ID: 6
Agent: Z.ai Code (orchestrateur)
Task: Enchaîner sur les dettes P2 restantes de l'audit UI auth (AUTH-07 côté serveur + AUTH-14)

Work Log:
- Reprise post-coupure : vérifié l'intégrité du lot Task 5 (artefacts présents, LoginPassword 1525 l., arbre git propre, 2 commits P2) ; relancé les gardes existantes vertes
- Lu le registre de dette (DEBT_REPORT §AUTH) : restent AUTH-06 (L, décision d'architecture cookie httpOnly — laissé au registre), AUTH-07 (M, serveur), AUTH-12 (XL, i18n repo — laissé), AUTH-14 (S) ; AUTH-07 explicitement désigné comme prochain lot par Task 5
- AUTH-07 : nouveau module backend/src/auth/anti-enumeration.ts — liste miroir TEST_PHONES ANSUT (6 numéros, estTelephoneTest) + repondreAEcheanceUniforme (plancher 300 ms + gigue 80 ms tirée indépendamment du résultat)
- AUTH-07 : auth.service.ts — checkPhone retient son début, interroge, logue les accès TEST_PHONE (masqué via masquerTelephone de remise-code-bo), répond à l'échéance uniforme ; login() logue aussi les accès TEST_PHONE (masqué + IP)
- AUTH-07 : auth.controller.ts — plus de voie rapide `return {exists:false}` sur appel malformé : tout passe par le service (une voie rapide serait une fuite de timing)
- AUTH-14 : nouveau robinet src/app/utils/warnDev.ts (console.warn en DEV via import.meta.env.DEV résolu au build, no-op dans le bundle livré) ; 13 console.warn convertis (EntryGate ×5, LoginPassword ×5, ChangePasswordScreen ×2, UnregisteredPhone ×1)
- Bloc « BACKLOG ESCALATION P0 BACKEND » de LoginPassword mis à jour : items 1 et 3 → FAIT côté serveur le 05/10/2026 avec pointeur vers anti-enumeration.ts ; sous-dette « liste serveur autoritaire » documentée
- Nouvelle garde test:enum-check-phone.mjs (10 vérifs : module, échéance, listes MIROIRS exactes frontend↔backend, logs masqués, pas de voie rapide contrôleur, escalation à jour) + test:warn-dev.mjs (robinet DEV-gated + zéro console.warn brut sur 12 fichiers auth) ; inscrites dans package.json + maillons-verify.json (après test:auth-charte)
- Corrections en chemin : orthographe GIGUE_MS (garde cherchait GIGE_MS) ; extraction des numéros restreinte au bloc de DÉCLARATION du Set (le 0501604040 support polluait le miroir)
- Incident infra : nest --watch n'a pas détecté les fichiers (plafond inotify sandbox) ET un ancien enfant node dist/main (18561) survivait au pkill en tenant :3001 → double backend éphémère ; normalisé (tout tué, un unique watcher, app 19365 sur :3001, code frais)
- Preuves runtime curl (backend propre) : check-phone 0726262626→200 en 396 ms / 0999999999→200 en 375 ms / malformé→200 en 331 ms (avant : retour instantané) ; log backend WARN `check-phone: accès TEST_PHONE 08 •• •• 40 40` + `login: accès TEST_PHONE 08 •• •• 40 40 depuis 127.0.0.1` ; login Michelle 200 (zéro régression)
- Gardes finales (exit 0) : verrou-connexion, entree-unique, canal-code, auth-charte, cible-tactile, comptes, tokens, maillons-orphelins, enum-check-phone, warn-dev ; typecheck frontend + tsc backend 0 erreur
- Recette agent-browser (390×844) : EntryGate → onboarding → écran numéro (PaveSaisie) → 0726262626 → check-phone uniforme (~350 ms invisible) → PIN 1234 → /marchand → modale Radix (role=dialog, aria-modal, focus « Oui, je veux », ESC ferme après animation) → logout cookies+storage → 0412345678 → /non-enregistre avec PII masquée « XXXXXX 5678 » → zéro erreur page (découverte : 0799999999 est Awa, actrice démo en attente — premier essai de numéro inconnu mal choisi, routage correct)
- Documentation : audit §13 (tableau de clôture AUTH-07/AUTH-14 + gouvernance + recette), DEBT_REPORT (AUTH-07/AUTH-14 fermées ; restent AUTH-06, AUTH-12 ; nouvelles sous-dettes AUTH-07-sous-dette liste autoritaire + AUTH-14b écoute ops), AUDIT_REPORT (synthèse clôturée)

Stage Summary:
- AUTH-07 fermé avec preuve de garde ET preuves runtime : le TEMPS de check-phone ne dit plus rien (343-396 ms uniformes, appel malformé inclus), les accès recette ANSUT se comptent côté serveur, numéro masqué dans les journaux
- AUTH-14 fermé : 13 diagnostics auth passent par warnDev — visibles en dev, absents du build livré ; §8.7 préservé
- Nouveaux artefacts : backend/src/auth/anti-enumeration.ts, frontend_src/src/app/utils/warnDev.ts, scripts/test-enum-check-phone.mjs, scripts/test-warn-dev.mjs
- Décision : le corps de réponse check-phone reste distinct (exists) — c'est le parcours produit /non-enregistre ; seul le TEMPS est uniformisé ; les protections frontend restent tant que la liste serveur n'est pas autoritaire par environnement
- Il reste au registre : AUTH-06 (architecture cookie httpOnly), AUTH-12 (i18n visuel XL), AUTH-07-sous-dette (liste autoritaire), AUTH-14b (écoute ops), AUTH-ERR (clip voix, Patrick)

---
Task ID: 7
Agent: Z.ai Code (orchestrateur)
Task: Pousser les commits vers GitHub avec le nom d'utilisateur SOMET1010

Work Log:
- Diagnostic : remote origin était configuré avec le token comme nom d'utilisateur (https://TOKEN@github.com/...) — format refusé par GitHub pour les push
- 2052 fichiers « modifiés » identifiés comme purs changements de mode (100644→100755, artefact sandbox) → core.fileMode=false pour éliminer le bruit
- Remote réécrit : https://SOMET1010:TOKEN@github.com/SOMET1010/julaba-app.git
- git push origin main : ea499ab..be584af ✅ — main synchronisé avec origin/main

Stage Summary:
- 6 commits poussés (P1 745c730/4bef809, P2 lot 1 fa5386b/bd08f39, P2 lot 2 AUTH-07/14 be584af, + 1 commit tooling f85057c)
- main == origin/main ; seuls restent locaux : .zscripts/dev.pid (runtime sandbox) et fichiers non versionnés sandbox

---
Task ID: 8
Agent: Z.ai Code (orchestrateur)
Task: Dernier lot audit auth — AUTH-06 tranchée (ADR-002) + AUTH-07-sous-dette + AUTH-14b + reconstitution runtime sandbox

Work Log:
- DÉCOUVERTE : sandbox reconstruit (15:27) — PostgreSQL, backend/.env, node_modules workspace et serveurs perdus ; code intact
- Runtime reconstitué : binaires zonky 16.4 retéléchargés (/home/z/pg, bin/bin après extraction imbriquée), cluster réinitialisé (julaba/trust/socket /tmp), base julaba_dev recréée via client pg, backend/.env régénéré (secrets dev NEUFS, AUTH_TELEPHONES_TEST incluse), npm install racine (hoisting workspaces OK), backend + Vite relancés (double-fork setsid — le premier essai sans sous-shell a été fauché entre deux commandes)
- AUTH-06 TRANCHÉE : ADR-002 (.ai/ADR/ADR-002-jetons-auth-web-cookie-mobile-stockage.md, statut accepté) — voie DUELLE : WEB = cookies httpOnly seuls (le backend les posait déjà, stratégie cookieOrBearer, checkSession déjà cookie-first) ; APK natif = localStorage + Bearer inchangés (rotation avec successeur)
- Implémentation : nouveau coffre utils/stockerJetonsSiMobile.ts (SEUL écrivain des clés, no-op web via estMobileNatif/Capacitor.isNativePlatform) ; LoginPassword ×2 migrés (setItem directs supprimés) ; lectures/purges conservées (chemin APK + tolérance jetons hérités lus SANS réécriture)
- Nouvelle garde test:coffre-web (9 vérifs) inscrite package.json + maillons-verify.json (après test:warn-dev) ; bloc BACKLOG ESCALATION LoginPassword mis à jour (item 3 liste autoritaire FAITE + item 4 ADR-002)
- AUTH-07-sous-dette : anti-enumeration.ts — AUTH_TELEPHONES_TEST fait foi (chargerTelephonesTest, filtre 10 chiffres), Set en dur renommé TELEPHONES_TEST_CODE (repli dev), lecture PARESSEUSE au premier usage (le dotenv de ConfigModule tourne APRÈS l'import du module — 1er boot montrait source=code, corrigé) ; AuthService.onModuleInit journalise source+taille sans citer les numéros ; backend/.env dev aligné (6 numéros)
- Garde test:enum-check-phone ÉTENDUE (15 vérifs : env + filtre + accesseur CHARGÉ + journal boot sans PII + alignement .env↔miroir + miroir code↔frontend) — 1 auto-correction (regex accesseur après refactor paresseux)
- AUTH-14b : runbook « Écoute ops — accès recette ANSUT » inséré dans HANDOFF/SECURITY_TO_TEAM.md (patterns, commandes comptage, seuil alerte, alerte source=code en prod)
- Documentation : audit §14 (tableau de clôture + gouvernance + recette + découverte sandbox), DEBT_REPORT (AUTH-06/07-sous-dette/14b FERMÉES ; sous-dette CSRF Origin inscrite dans ADR-002), AUDIT_REPORT (synthèse)
- Gardes finales exit 0 : typecheck, lint, tsc backend, coffre-web, enum-check-phone, warn-dev, entree-unique, canal-code, verrou-connexion, cible-tactile, comptes, tokens, auth-charte, maillons-orphelins, api-authorization, parole-entree, clips-embarques
- Recette agent-browser (390×844) : EntryGate → tutoriel → numéro 0700000009 (base fraîche : Awa Koné, mot de passe 1234 — le jeu démo diffère de l'ancien .env) → check-phone uniforme invisible → PIN → /marchand → modale Radix fermée sans refus → localStorage access:null/refresh:null + cookies access_token/refresh_token présents → RELOAD → session restaurée par cookie, localStorage toujours vide → console zéro erreur → logout → EntryGate, 0 cookie auth
- Preuves runtime AUTH-07-sous-dette : boot `TEST_PHONES actifs : source=env, 6 numéros (masqués)` ; check-phone recette 0840404040→200 en 386 ms / réel 0726262626→200 en 325 ms ; WARN `accès TEST_PHONE 08 •• •• 40 40` pour l'un, rien pour l'autre

Stage Summary:
- AUTH-06 FERMÉE : décision ADR-002 acceptée et IMPLÉMENTÉE côté web (plus aucun jeton JS en localStorage web ; recette reload-par-cookie prouvée) ; APK inchangé par design
- AUTH-07-sous-dette FERMÉE : liste autoritaire par env + journal de boot + garde alignement ; AUTH-14b FERMÉE : runbook livré
- Restent au registre : AUTH-12 (i18n visuel XL), AUTH-ERR (clip voix, Patrick), + sous-dette CSRF (vérification serveur Origin sur mutations auth, ADR-002)
- Runtime sandbox reconstitué de bout en bout ; base démo fraîche : Awa Koné +2250700000009 (marchande, 1234)

---
Task ID: 8-bis (incident push)
Agent: Z.ai Code (orchestrateur)
Task: Résoudre le refus de push GitHub Push Protection

Work Log:
- Push du lot 8 refusé (GH013) : le commit AUTO du tooling sandbox fd9c0ac (15:31, message UUID) avait versionné tool-results/bash_*.txt — sortie brute persistée de git remote -v contenant le token GitHub en clair (lignes 2071-2072)
- Résolution : rebase --onto be584af fd9c0ac (commit auto retiré de l'historique, mon lot rejoué proprement → 01634fe) ; le fichier porteur du secret a disparu de l'arbre avec lui
- Hygiène : .gitignore += tool-results/ et /bun.lock (le repo référence package-lock.json, npm est le gestionnaire ; commit 20f1a3b) — le tooling ne re-committera plus ces sorties
- Push final OK : be584af..20f1a3b main → main ; AUCUN token n'a atteint GitHub (protection active et efficace) ; le token lui-même reste valide et n'a pas fuité

Stage Summary:
- Leçon consignée : les sorties brutes des outils qui echo des URLs authentifiées ne doivent JAMAIS être versionnées — .gitignore verrouillé au nom du répertoire (tool-results/)
- main == origin/main à 20f1a3b

---
Task ID: 9 (9-a..9-k en parallèle)
Agent: Z.ai Code (orchestrateur) + 11 agents AUDIT (Explore) en parallèle
Task: Audit complet suivant les normes .ai — 10 acteurs + système auth — constats/risques/vulnérabilités/criticité/recommandations + génération de 11 fichiers .docx distincts

Work Log:
- Normes lues avant toute chose : .ai/README.md (règle d'or), PROJECT_CONTEXT.md (§1 vision + §8 règles critiques), ACCESSIBILITY_GUIDE.md (§4/5/6), DESIGN_SYSTEM.md (§9), format de référence AUDIT-002 + AUDIT-ACTEUR-MARCHAND-2026-09-28
- Cartographie : routes.tsx (233 l.), pages/espaces acteurs, 60+ modules backend, comptage des 10 rôles dans le code (marchand 518, identificateur 240, super_admin 169…)
- 11 agents d'audit Explore lancés EN PARALLÈLE (9-a AUTH-SYS, 9-b MARCHAND, 9-c PRODUCTEUR, 9-d COOPERATEUR, 9-e INSTITUTION, 9-f IDENTIFICATEUR, 9-g OPERATEUR-TERRAIN, 9-h GESTIONNAIRE-ZONE, 9-i ADMIN-NATIONAL, 9-j ADMIN-GENERAL, 9-k SUPER-ADMIN) — chaque agent : lecture worklog + normes + audit statique ligne à ligne avec preuves fichier:ligne + max 5 sondes curl runtime LECTURE SEULE sur :3001 (401 sans token, 403 mauvais rôle, 429 throttle constatés partout) + 1 test d'élévation signup super_admin → 403 sans création (système sain)
- 11 rapports persistés : .ai/AUDITS/AUDIT-SYSTEME-AUTH-2026-10-05.md + .ai/AUDITS/ACTEURS/AUDIT-ACTEUR-{MARCHAND,PRODUCTEUR,COOPERATEUR,INSTITUTION,IDENTIFICATEUR,OPERATEUR-TERRAIN,GESTIONNAIRE-ZONE,ADMIN-NATIONAL,ADMIN-GENERAL,SUPER-ADMIN}-2026-10-05.md
- Scores : AUTH 76, MARCHAND 80, PRODUCTEUR 54 🔴, COOPERATEUR 54 🔴, INSTITUTION 42 🔴, IDENTIFICATEUR 61, OPERATEUR-TERRAIN 61, GESTIONNAIRE-ZONE 59, ADMIN-NATIONAL 71, ADMIN-GENERAL 60, SUPER-ADMIN 72
- P0 nouveaux : PRODUCTEUR-01 (speak() muet hors rôle marchand — AppContext.tsx:729 → tout le feedback vocal producteur inopérant), INSTITUTION-01 (/oneci/lookup RNPP ouvert à tout compte authentifié, sans log — violation 2013-450)
- P1 marquants : AUTH-SYS-01 (la rotation réécrit access+refresh en localStorage WEB via wrapper sans porte estMobileNatif — ADR-002 inopérante en runtime, garde coffre aveugle aux clés variables), COOPERATEUR-01/02 (IDOR inter-coop, membre suspendu garde ses droits), PRODUCTEUR-02/03 (vendeur_id + total client acceptés sur /commandes), GESTZONE-01..05 (isolation territoriale non tenue côté serveur), ADMINNAT-02 (annuaire BO lisible par URL), ADMINGEN-04/05/08 (clés API en clair, broadcast WS des transactions, Paramètres PUT 404), SUPERADMIN-01 (EventMonitor : donnée WS diffusée à tous avant le gate UI)
- 3 constats TRANSVERSAUX récurrents : broadcast WS room « all » ; POST /audit inscriptible par tout rôle BO ; 3 registres de permissions divergents (bo-permissions.ts mort)
- Génération .docx : compétence docx chargée (routes/create.md + design-system R1 + common-rules + toc.md + docx-js-core), docx@9.8.1 installé ; générateur .zscripts/audit-docx/gen-audit-docx.mjs (parseur Markdown → docx, couverture recette R1 palette marché JULABA bg 2B1F16/accent B74725, calcTitleLayout adapté latin, calcCoverSpacing, allNoBorders, 3 sections : couverture sans numéro / sommaire en romains / corps en arabes repartant à 1, TableOfContents + nota de mise à jour, tableaux tableHeader+cantSplit+marges+ShadingType.CLEAR, largeurs PERCENTAGE, criticité P0-P3 colorée) + patch-docx.py (suppression pgNumType vides + patch instrText PAGE \* ROMAN / \* arabic via résolution footerReference des sectPr)
- Pipeline complet ×11 : bun gen → add_toc_placeholders.py --auto (exit 0 ×11) → patch-docx.py (footers ['-',ROMAN,arabic] ×11) → postcheck.py : 0 erreur ×11 (2 corrections en chemin : Consolas→Courier New ; suppression du PageBreak final du sommaire qui créait une page blanche avec le NEXT_PAGE du corps — règle anti-page-vide du skill)
- Vérification visuelle LibreOffice→PDF→PNG : couverture conforme R1, sommaire indexé avec numéros, corps stylé (en-tête, H1/H2, tableaux à filet terracotta), page blanche éliminée
- Hygiène repo : package.json restauré après bun add docx (docx reste en node_modules, non versionné) ; livrables dans download/audit-julaba-2026-10-05/ (hors versionnement)
- AUDIT_REPORT.md : section « AUDIT COMPLET 11 PÉRIMÈTRES — 2026-10-05 » ajoutée (tableau des 11 scores/statuts/top actions + lot transversal recommandé)

Stage Summary:
- 11 audits complets livrés (.md dans .ai/AUDITS + 11 .docx dans download/audit-julaba-2026-10-05/ : 01_Système_Authentification, 02_Marchand, 03_Producteur, 04_Coopérateur, 05_Institution, 06_Identificateur, 07_Opérateur_Terrain, 08_Gestionnaire_Zone, 09_Admin_National, 10_Admin_Général, 11_Super_Admin) — chaque docx : couverture, sommaire, constats avec preuves fichier:ligne, tableau risques/vulnérabilités/criticité, points forts, recommandations, matrice de recette, tests critiques, SYNTHÈSE DES ACTIONS PRIORITAIRES, scores, conclusion/statut
- 3 acteurs sous le seuil PROD 60 : Producteur 54 (P0 voix), Coopérateur 54 (IDOR/statuts/cotisation), Institution 42 (ONECI ouvert) — 1 au seuil pile : Admin général 60 — le reste au-dessus
- Verdict auth : socle serveur mûr (14/17 constats précédents closes vérifiées) MAIS AUTH-SYS-01 P1 à fermer avant livraison web (le coffre ADR-002 fuit à la première rotation via api-client.ts:128/132)
- Prochain lot de corrections recommandé : AUTH-SYS-01 + PRODUCTEUR-01 + INSTITUTION-01 (P0) puis lot transversal (WS room all, POST /audit, unification matrice permissions)

---
Task ID: 10
Agent: Z.ai Code (orchestrateur)
Task: Alignement forcé dev←main + exécution du plan de réorganisation (Phases 0-3) — commits et pushs sur dev

Work Log:
- Demande utilisateur : « passe au plan mais fais les push et commit sur dev » puis « je veux que tu recupere main sur dev directement en force »
- Nettoyage du commit main non poussé 1ab5514 (mélange audits + artefacts sandbox) : reset --soft, retrait de download/*.docx, upload/, .zscripts/ du staging, recommit propre → aa780ae (11 audits .md + AUDIT_REPORT + worklog)
- Fusion main→dev abandonnée en cours de route (conflits 12 fichiers) sur demande de forçage : backup du travail INIT-016..021 de dev sur branche backup/dev-init-016-021 (poussée sur origin), puis git reset --hard main + git push --force origin dev (45eaaef → aa780ae)
- Interférence sandbox notée : HEAD rebasculait seul sur main (3 fois) — contre-mesure : checkout dev + vérification HEAD avant chaque commit
- Phase 0 (c4e63ee) : untrack skills/ (1076 f.), .zscripts/ (9), tool-results/ (2), download/ (1) + .gitignore verrouillé ; suppression .audit_ui_* ×4 ; archivage azure-pipelines.yml + docker-compose.prod.yml → docs/archive/ ; suppression tests/ (Playwright orphelin, identifiants en dur dans api.spec.ts → ROTATION requise, cf. historique) ; rédaction docs/audit/PLAN-REORGANISATION-2026-10-06.md
- Phase 1 (ee0b4a0) : suppression coquilles vides backend/src/tickets/ + escrow/ (app.module.ts mis à jour) ; renommage audit/ → audit-log/ (dossier + fichiers + 12 références) ; retrait jspdf de backend/package.json ; correction du diagnostic : ansut/ VIVANT (service vocal ANSUT/Lafricamobile + ffmpeg, référencé par sms.service) → conservé
- Phase 2 (7467da3) : suppression 6 composants Universal*BO sans importeur + leurs 6 exports du barrel (1786 lignes) — UniversalCardBO/UniversalCardBOZone VIVANTS → conservés ; retrait 10 deps jamais importées (react-hook-form, cmdk, papaparse+types, qrcode, react-day-picker, react-resizable-panels, jsqr, @nestjs/core, playwright-core) — @capacitor/* et tsx gardés (android/ + scripts npm) ; suppression 12 images sans référence (~558 Ko) — icônes PWA tantie-sagesse-* gardées (manifest.json/sw.js)
- Vérifications : tsc backend --noEmit exit 0 (cache purgé) ; tsc -b frontend exit 0 ; vite build exit 0 (20,7 s, stamp-sw 202 chunks + 220 clips) ; npm install racine régénère package-lock.json (−140 paquets)
- Décisions reportées consignées dans le plan : R18 (git-lfs ~38 Mo d'images), F14 (5 chaînes horsVerify), rotation des identifiants tests/, réintroduction éventuelle de gardes Playwright

Stage Summary:
- dev == origin/dev == 7467da3 (Phase 0+1+2 poussées) ; main local = c4e63ee (non poussé — les pushs demandés étaient pour dev)
- Dépôt allégé : ~62 000 lignes désalignées (skills/ etc.), 1786 lignes TS mortes, 16 lignes backend mortes, 10 deps, 12 images (~558 Ko) en moins
- backup/dev-init-016-021 = le travail INIT-016..021 (vitest, i18next, strictNull, fetch) récupérable à tout moment
- Registre sécurité : rotation des identifiants ayant figuré dans tests/specs/api.spec.ts (historique) à programmer côté équipe

---
Task ID: 10-bis (vérification indépendante)
Agent: Z.ai Code (orchestrateur)
Task: Reprise post-résumé — vérification indépendante de l'état livré (Task 10)

Work Log:
- Reprise de session : HEAD retrouvé sur main (tooling sandbox — reflog HEAD@{0..6} = allers-retours main↔dev) ; le disque reflétait main (c4e63ee), d'où une fausse alerte (cmdk/escrow « encore présents ») levée puis invalidée : l'état commité sur dev est correct
- Vérifications d'état sur dev : skills/, .zscripts/, tool-results/, download/, tests/ — 0 fichier tracké ; backend tickets/ + escrow/ absents, audit-log/ présent ; package.json (front + back) sans les 10 deps retirées ; 6 Universal*BO absents, UniversalCardBO/UniversalCardBOZone conservés ; 0 marqueur de conflit dans frontend_src/src et backend/src
- Vérifications de compilation sur dev (branche vérifiée avant/après chaque run ; checkout+build chaînés dans la même commande pour contrer l'interférence sandbox) : frontend `tsc -b` exit 0 ; backend `tsc --noEmit` exit 0
- État branches : main local = c4e63ee (ahead 2 de origin/main, NON poussé — les pushs demandés étaient pour dev) ; backup/dev-init-016-021 = 45eaaef (travail INIT-016..021 récupérable à tout moment)

Stage Summary:
- État livré VÉRIFIÉ indépendamment : dev == origin/dev == b89b988, Phases 0-3 du plan closes, deux typechecks verts sur dev
- Le dépôt est laissé sur dev ; le tooling sandbox rebasculant régulièrement HEAD sur main, vérifier `git branch --show-current` avant toute opération git
---
Task ID: 11-a
Agent: Explore (scan mort frontend)
Task: Scan code mort frontend — candidats avec preuves

Work Log:
- Contexte lu : worklog.md Task 9 (3 registres permissions divergents) + Task 10 (Phases 0-2 : 6 Universal*BO, 10 deps, 12 images supprimés)
- Pages : les 10 .tsx de pages/ vérifiés un à un contre routes.tsx + imports croisés → 10/10 VIVANTS (lazy imports routes.tsx:30-64,81,230 ; StudioVoixClonage ← StudioVoix.tsx:32 ; DevModeHome route isDev-only routes.tsx:64)
- Contexts : tour complet — les 7 candidats (RapportHebdo, Audit, Modal, SupportConfig, Raccourcis, Shortcuts, objectifAlerts) tous importés ; ShortcutsContext N'EST PAS un doublon de RaccourcisContext (undo/actions BO, provider App.tsx:31, consommateurs BOEnrolement/BOActeurs/BOUtilisateurs vs raccourcis caisse vocale marchande) ; AuditContext vivant (App.tsx:19 + InstitutionSupervision:29 + AuditTrail:21)
- Hooks : tour complet — 8 candidats tous importés (useCountUp←ProducteurProduction:19 ; useScoreJULABA←ScoreResumeCard/ScoreOnboardingModal/ActionsGuideesCard ; useMarchesByCommune←MarcheSelect:3 ; useDevMode+useDicteeLive←LoginPassword:100-102 ; useIdleTimer←BOLayout:21 ; useLangPref←UniversalParametres+speakMessage+4 écrans ; useCatalogueMaitre←POSCaisse:24) ; useOfflineVoiceQueue←useVoiceCore.ts:26
- Services : scan exhaustif des 105 .ts (2 passes : chemin cité entre quotes, puis lignes d'import réelles uniquement, auto-réf et *.test.* exclus) → 7 candidats nommés tous VIVANTS (meteo←ProducteurAlertes:31 routé ; evaluations←NoterCommande+MarcheVirtuel routés ; protectionSociale←ProtectionSociale:25 routé ; fidelite←Fidelite:17 routé ; elevenlabs←12 importeurs ; mp3Encoder←StudioVoix:29 ; supportLu←SupportCardProfil:20+SupportContact:14 usage réel hors test) ; 1 seul orphelin réel = voicePacks.ts ; routageAudio/index.ts vivant via import dynamique main.tsx:76
- voicePacks.ts (102 l.) : 0 import hors tests (voicePacks.test.mts + studioWav.test.mts:5) ; voicePacksRuntime.ts est un STUB volontaire (packClipUrl→null) vivant via onboardingVoix.ts:15 et ne l'importe pas ; package.json:90 script « test:packs » ne lance que le test du module mort ; studioWav.ts:8 n'y fait qu'une mention en commentaire ; studioWav.ts vivant (encoderWav ← StudioVoix.tsx:30)
- Data/Types/design-tokens : mockUsers←ProfileSwitcher:15 (DEV_MOCK_USERS, rendu DEV dans LoginPassword/BOLayout/IdentificateurLayout/InstitutionLayout/Dashboard/AppLayout) ; civ-geography←6 BO + utils/civ-gadm-district-mapping ; activites-vivriers←FicheIdentificationDynamique:18 ; catalogue-produits←CaisseContext:7+emojiTile ; payment←CommandeContext:6-7+HistoriqueList:13 ; document←DocumentsCertificationsModalUniversal:12 (←UniversalProfil:37) ; statutEnregistrement←CaisseContext:111-112 ; sousProfilMarchand←backoffice-api:3+AppContext:55+UniversalProfil:33+FicheIdentificationDynamique:29 ; design-tokens←Card:10+Modal:11+ProfilUnifieModal:8
- Assets : 0 image orpheline (38 src/assets/images + 3 redesign + riz.jpg + 3 icônes PWA public/images vivantes par manifest/sw) ; registre app/assets/images.ts importé ×15 ; tabler-subset.woff2 VIVANT (styles/icons-tabler.css:14 ← main.tsx:13 ; régénéré par scripts/generer-icones.mjs)
- bo-permissions : config/bo-permissions.ts VIVANT — importé ET utilisé par BOUtilisateurs.tsx:11-17 (BO_PERMISSION_TREE:156, allPermissionKeys/roleCanHave/buildDefaultPermissions :170-527) ; le constat d'audit Task 9 « bo-permissions.ts mort » est PÉRIMÉ ; les 3 registres (config/bo-permissions.ts, PERMISSIONS/DEFAULT_INSTITUTION_PERMISSIONS dans BackOfficeContext, buildFullBoPermissions local FicheIdentificationDynamiqueBO.tsx:123) sont tous référencés → sujet d'UNIFICATION, pas de code mort
- README-MOCK-SERVICE.md : décrit services/mock/producteur-mock.service.ts + hooks/useProducteurMockInit.ts qui N'EXISTENT PLUS (seule mention du repo = ce README) → doc morte
- READ-ONLY respecté : aucun fichier de code modifié ; seul append de cette section

Stage Summary:
- DELETE (4) : services/voicePacks.ts + services/voicePacks.test.mts (paire morte, 0 import hors tests) + script package.json « test:packs » (frontend) + services/README-MOCK-SERVICE.md (décrit un service/hook supprimés) ; coupler : adapter studioWav.test.mts:5,39-40 (import validerManifeste) ; arbitrer docs/PACKS_VOIX.md + public/voix/manifeste.exemple.json (doc/data d'exemple du module mort, hors code)
- KEEP : 10/10 pages, 24 contexts, 29 hooks, 104/105 services, 4/4 data, 4/4 types, design-tokens.ts, images.ts, tabler-subset.woff2, config/bo-permissions.ts — tout prouvé utilisé
- INCERTAIN : aucun fichier code incertain ; correction au dossier d'audit : « bo-permissions.ts mort » à invalider (il est branché sur BOUtilisateurs), la divergence des 3 registres reste un chantier d'unification
