# Ménage des branches — 15/08/2026

Trace de suppression (récupérable : recréer via `git branch <nom> <sha>`).
**Épargnées** (revue séparée) : `dev`, `chore/sherpa-fr-model-fetch`, `claude/session-ticgbm`, `claude/julaba-conversation-6zfdaz`.

| Branche | loc/rem | SHA | ahead | behind | Sujet |
|---|---|---|---|---|---|
| audit-main | local | 8d9a0c6 | 0 | 160 | Merge pull request #50 from SOMET1010/fix/reac |
| audit-work | local | daf8c90 | 0 | 28 | docs(schema): #10 Étape 4 — runbook de basc |
| chore/baseline-fidele-prod | local | 74d9cc2 | 0 | 26 | chore(schema): #10 Étape 1 — baseline FIDÈ |
| chore/ci-filet-integration | local | 23c0133 | 3 | 71 | ci(fix): baseline TS = 0 (install à froid) +  |
| chore/dbinit-folder | local | 2b4372d | 1 | 30 | chore(schema): #10 Étape 2 — prouver DbInit |
| chore/etape4-bascule-executee | local | f1ed1e0 | 0 | 24 | docs(schema): #10 Étape 4 — bascule prod EX |
| chore/ledger-mouvement-type | local | c7c8cf8 | 0 | 12 | feat(ledger): #19 — colonne type sur stock_m |
| chore/nestjs-http-contract | local | 7f881e7 | 0 | 65 | chore(deps): aligner @nestjs/common,jwt,passpo |
| chore/schema-baseline | local | f8d97f4 | 1 | 32 | chore(schema): #10 Étape 1 — baseline repro |
| chore/schema-convergence-adr | local | b93f21d | 1 | 33 | docs(adr): #10 — plan de convergence schéma |
| claude/accents-ui | local | c31d467 | 0 | 296 | fix(ui): corrige 128 accents dans les chaines  |
| claude/b1-marche-cascade | local | 71657ef | 0 | 63 | feat(marche): durcir la cascade de visibilite  |
| claude/b2-reservation-stock | local | 8c302dc | 0 | 58 | test(invariants): argent gele sur le cycle de  |
| claude/boutique-sync | local | 4b13641 | 0 | 296 | feat(boutique): endpoint de synchro offline-fi |
| claude/db-authoritative | local | 12e4c54 | 1 | 275 | fix(db): prepareDatabase autoritaire (ignore l |
| claude/db-auto | local | 5ded91e | 1 | 277 | fix(db): construction auto du schema sur base  |
| claude/deploy-manuel | local | 66cfc71 | 0 | 281 | ci(deploy): ajoute workflow_dispatch (bouton " |
| claude/deploy-migration-step | local | 0108748 | 0 | 56 | ci(deploy): étape migration TypeORM contrôl� |
| claude/fix-caisse-bugs | local | bd9a9d8 | 1 | 269 | fix(caisse): 5 bugs remontés par le test QA ( |
| claude/fix-cron-schema | local | 072abd5 | 1 | 259 | fix(db): compléter colonnes/tables manquantes |
| claude/fix-deploy-frontend-build | local | a114636 | 0 | 54 | fix(deploy): corriger le build frontend pour l |
| claude/fix-login-wiring | local | 086d49e | 1 | 271 | fix(v2): réparer la connexion cross-domaine ( |
| claude/garde-fou-nest-versions | local | 4e9b1c2 | 1 | 2 | chore(dev): garde-fou anti-500 sur incohérenc |
| claude/hors-ligne-solide | local | 4bf89ba | 1 | 263 | feat(offline): rester connectée hors-ligne +  |
| claude/kpi-exclut-annulees | local | 1574fe9 | 0 | 5 | fix(caisse): une vente annulée ne compte dans |
| claude/no-cloud-tts | local | c7554ef | 1 | 258 | feat(voix): ElevenLabs coupé PAR DÉFAUT dans |
| claude/offline-lectures | local | 4eef744 | 1 | 262 | feat(offline): historique, stock et produits c |
| claude/pin-key | local | 516b22d | 1 | 276 | fix(auth): accepter tout secret PIN_ENCRYPTION |
| claude/piper-deploy | local | 7666ba8 | 1 | 261 | feat(voix): déployer Piper sur le serveur (vo |
| claude/recette-ui-annulation | local | 7c5cd85 | 1 | 7 | test(recette): annulation self-service via l'U |
| claude/rename-tata-nanti-lou | local | 1bce70e | 1 | 265 | chore(branding): renommer l'assistante « Tata |
| claude/render-db-fix | local | f82dc47 | 1 | 278 | fix(db): schema par synchronize sur base vierg |
| claude/render-deploy | local | 0826154 | 1 | 280 | feat(deploy): blueprint Render pour un Julaba  |
| claude/render-fix | local | b64c787 | 1 | 279 | fix(render): retirer plan sur le site statique |
| claude/render-stock-reservations-table | local | 27bc9d8 | 0 | 52 | fix(render): créer stock_reservations au boot |
| claude/render-wire | local | e67fe3f | 2 | 274 | fix(caisse): créer caisse_sessions/produits s |
| claude/s1-fix-ca-quantites | local | e080071 | 0 | 50 | fix(stats): chiffre d'affaires et quantités j |
| claude/s1-fix8-rejeu-offline | local | cc2e367 | 0 | 44 | fix(voix): rejeu hors-ligne honnête — ne ja |
| claude/s1-onboarding-libelle-voix | local | 08d7f1e | 0 | 46 | fix(onboarding): libellé voix truthful — v� |
| claude/s1-vente-sup-stock | local | 0beaccb | 0 | 48 | feat(vente): avertir à la voix quand la vente |
| claude/seed-demo | local | c2e1cd7 | 1 | 272 | feat(seed): comptes de démo prêts à l'emplo |
| claude/seed-roles | local | a1e7627 | 1 | 270 | feat(seed): un compte de démo par rôle (prod |
| claude/socle-schema-hygiene-codeonly | local | 3fa938b | 1 | 43 | refactor(schema): hygiène de schéma code-onl |
| claude/throttling-modele-unique | local | 864466f | 0 | 3 | fix(throttling): un seul limiteur `default` g� |
| claude/trust-proxy-env-gated | local | a1ba5a9 | 1 | 1 | feat(net): trust proxy piloté par env (défau |
| claude/tts-souverain | local | 4a86c56 | 1 | 264 | feat(voix): TTS souverain — Piper d'abord, c |
| claude/tts-status | local | c9fb2f2 | 1 | 260 | feat(voix): point de contrôle public /tts/sta |
| claude/ux-catalogue-images | local | c7fd412 | 1 | 268 | feat(ux): ajouter un produit en touchant une p |
| claude/ux-mains-libres | local | 4f56122 | 1 | 266 | feat(ux): vente mains libres — mot-réveil � |
| claude/ux-quickwins | local | e3f720a | 1 | 267 | feat(ux): quick wins audit non-lectrice (#1 po |
| claude/voix-locale-autoritaire | local | 829d0da | 1 | 257 | fix(voix): reconnaissance sur l'appareil AUTOR |
| claude/voix-offline | local | 7d1a91e | 0 | 284 | feat(db): migrations auto au demarrage du back |
| claude/voix-offline-intent | local | 486993c | 0 | 291 | feat(voice): enrichit la comprehension hors-li |
| consolidate/lot1-entree-ux | local | 63c83c7 | 0 | 42 | feat(entree): parcours d'entrée v0.3 — écr |
| consolidate/repeigne-profil-parametres | local | 39dc13c | 0 | 40 | chore(ux): repeigne Profil & Paramètres — t |
| docs/adr-12-decrement-stock | local | 52188ca | 0 | 35 | docs(adr): cadrage #12 — décrément de stoc |
| docs/etape4-plan | local | 480fc4f | 2 | 29 | docs(schema): #10 Étape 4 — renforcer la po |
| docs/recette-espaces-e2e | local | e683fe3 | 0 | 16 | docs(recette): boucle espèces marchand — PV |
| feat/annulation-self-service-marchand | local | 46e23f7 | 0 | 8 | feat(caisse): #20 — annulation self-service  |
| feat/caisse-phase1 | local | 349356d | 0 | 144 | fix(caisse): déconnexion robuste si appLogout |
| feat/caisse-phase2-accueil-unique | local | d21d98d | 0 | 139 | fix(caisse): retire l'alerte obsolète « ouvr |
| feat/caisse-phase3-vente-simple | local | e754457 | 0 | 136 | feat(caisse): encaissement — montant sur le  |
| feat/caisse-phase4-mobile-money-declare | local | e33db24 | 1 | 135 | feat(caisse): mobile money déclaré à l'enca |
| feat/producteur-stats-endpoint | local | a97e63d | 1 | 39 | feat(producteur): endpoint stats autoritatif � |
| feat/stock-vente-directe | local | a3c7c5b | 2 | 34 | test(invariants): nettoyer les récoltes en af |
| feat/studio-voix-lot1-manifeste | local | 91bf069 | 1 | 71 | feat(voix): Studio Voix Lot 1 — manifeste un |
| fix/admin-datasource | local | 90c41f6 | 0 | 159 | fix(backend): dédoublonne typeorm (override 0 |
| fix/annulation-remise-stock | local | 1415bdb | 0 | 18 | feat(caisse): annulation vente → remise en s |
| fix/boutique-mouvements-prod | local | 4a585ef | 1 | 28 | fix(boutique): créer boutique_mouvements en p |
| fix/c0-1-role-authority | local | 0d55e44 | 1 | 67 | fix(auth): C0.1 M6+M8 — barrière d'autorit� |
| fix/caisse-credit-desactive-pilote | local | c5911d5 | 0 | 20 | fix(caisse): désactiver la vente à crédit � |
| fix/caisse-mobile-money-masque | local | 6b32f36 | 0 | 16 | fix(caisse): masquer le mobile money déclarat |
| fix/caisse-panier-ancien | local | 0278920 | 0 | 142 | fix(caisse): ne plus effacer silencieusement u |
| fix/caisse-stock-autorite-backend | local | a5f2fe6 | 0 | 22 | fix(caisse): stock — backend seul maître su |
| fix/m6-m8-role-escalation | local | f945109 | 2 | 67 | fix(auth): R1 — allow-list stricte fail-clos |
| fix/offline-queue-4xx | local | cac32f5 | 0 | 63 | fix(caisse offline): dead-letter les rejets 4x |
| fix/pos-stock-backend-autoritaire | local | fbbf35a | 1 | 67 | fix(caisse): backend seul maître du stock à  |
| fix/prod-migrationsrun-respecte-env | local | 7f34e1b | 0 | 10 | fix(prod): boot — respecter DB_MIGRATIONS_RU |
| fix/publications-onconflict-index-500 | local | cfd1bce | 0 | 38 | fix(marché): poser ux_publications_user_produ |
| fix/react-router-react18-compat | local | 44746ea | 0 | 161 | fix(deps): react-router 7.13.0 (compat React 1 |
| fix/schema-drifts | local | d8fde1a | 1 | 31 | fix(schema): #10 Étape 3 — corriger les dri |
| fix/vente-atomique-stock-ledger | local | 7ac65d4 | 1 | 68 | fix(caisse): vente atomique + ledger stock (I1 |
| fix/voix-chef-orchestre | local | 6665aca | 0 | 159 | fix(voix): chef d'orchestre audio robuste —  |
| main-fix | local | 94de7a1 | 0 | 162 | fix(build): exclure les fichiers de test du bu |
| spike/sherpa-wasm-web | local | 7f30d11 | 1 | 160 | docs(spike): étude Sherpa-WASM côté web (re |
| test/invariants-financiers | local | 05ce71f | 1 | 70 | test(invariants): harnais jest + Postgres jeta |
| test/invariants-l2-blockers | local | 784a07c | 1 | 69 | test(invariants): blockers argent en tableau d |
| chore/baseline-fidele-prod | remote | 74d9cc2 | 0 | 26 | chore(schema): #10 Étape 1 — baseline FIDÈ |
| chore/ci-filet-integration | remote | 23c0133 | 3 | 71 | ci(fix): baseline TS = 0 (install à froid) +  |
| chore/dbinit-folder | remote | 2b4372d | 1 | 30 | chore(schema): #10 Étape 2 — prouver DbInit |
| chore/etape4-bascule-executee | remote | f1ed1e0 | 0 | 24 | docs(schema): #10 Étape 4 — bascule prod EX |
| chore/ledger-mouvement-type | remote | c7c8cf8 | 0 | 12 | feat(ledger): #19 — colonne type sur stock_m |
| chore/nestjs-http-contract | remote | 7f881e7 | 0 | 65 | chore(deps): aligner @nestjs/common,jwt,passpo |
| chore/schema-baseline | remote | f8d97f4 | 1 | 32 | chore(schema): #10 Étape 1 — baseline repro |
| chore/schema-convergence-adr | remote | b93f21d | 1 | 33 | docs(adr): #10 — plan de convergence schéma |
| chore/ux-repeigne-lot1 | remote | 5b742fe | 1 | 68 | chore(ux): repeigne lot 1 — Profil & Paramè |
| claude/accents-ui | remote | c31d467 | 0 | 296 | fix(ui): corrige 128 accents dans les chaines  |
| claude/b1-marche-cascade | remote | 71657ef | 0 | 63 | feat(marche): durcir la cascade de visibilite  |
| claude/b2-reservation-stock | remote | 8c302dc | 0 | 58 | test(invariants): argent gele sur le cycle de  |
| claude/boutique-sync | remote | 4b13641 | 0 | 296 | feat(boutique): endpoint de synchro offline-fi |
| claude/db-authoritative | remote | 12e4c54 | 1 | 275 | fix(db): prepareDatabase autoritaire (ignore l |
| claude/db-auto | remote | 5ded91e | 1 | 277 | fix(db): construction auto du schema sur base  |
| claude/deploy-manuel | remote | 66cfc71 | 0 | 281 | ci(deploy): ajoute workflow_dispatch (bouton " |
| claude/deploy-migration-step | remote | 0108748 | 0 | 56 | ci(deploy): étape migration TypeORM contrôl� |
| claude/fix-caisse-bugs | remote | bd9a9d8 | 1 | 269 | fix(caisse): 5 bugs remontés par le test QA ( |
| claude/fix-cron-schema | remote | 072abd5 | 1 | 259 | fix(db): compléter colonnes/tables manquantes |
| claude/fix-deploy-frontend-build | remote | a114636 | 0 | 54 | fix(deploy): corriger le build frontend pour l |
| claude/fix-login-wiring | remote | 086d49e | 1 | 271 | fix(v2): réparer la connexion cross-domaine ( |
| claude/garde-fou-nest-versions | remote | 4e9b1c2 | 1 | 2 | chore(dev): garde-fou anti-500 sur incohérenc |
| claude/hors-ligne-solide | remote | 4bf89ba | 1 | 263 | feat(offline): rester connectée hors-ligne +  |
| claude/kpi-exclut-annulees | remote | 1574fe9 | 0 | 5 | fix(caisse): une vente annulée ne compte dans |
| claude/last30days-search-tool-mp3zxi | remote | 5108d34 | 0 | 162 | revert(veille): retire l'integration Julaba de |
| claude/no-cloud-tts | remote | c7554ef | 1 | 258 | feat(voix): ElevenLabs coupé PAR DÉFAUT dans |
| claude/offline-lectures | remote | 4eef744 | 1 | 262 | feat(offline): historique, stock et produits c |
| claude/pin-key | remote | 516b22d | 1 | 276 | fix(auth): accepter tout secret PIN_ENCRYPTION |
| claude/piper-deploy | remote | 7666ba8 | 1 | 261 | feat(voix): déployer Piper sur le serveur (vo |
| claude/recette-ui-annulation | remote | 7c5cd85 | 1 | 7 | test(recette): annulation self-service via l'U |
| claude/rename-tata-nanti-lou | remote | 1bce70e | 1 | 265 | chore(branding): renommer l'assistante « Tata |
| claude/render-db-fix | remote | f82dc47 | 1 | 278 | fix(db): schema par synchronize sur base vierg |
| claude/render-deploy | remote | 0826154 | 1 | 280 | feat(deploy): blueprint Render pour un Julaba  |
| claude/render-fix | remote | b64c787 | 1 | 279 | fix(render): retirer plan sur le site statique |
| claude/render-stock-reservations-table | remote | 27bc9d8 | 0 | 52 | fix(render): créer stock_reservations au boot |
| claude/render-wire | remote | e67fe3f | 2 | 274 | fix(caisse): créer caisse_sessions/produits s |
| claude/s1-fix-ca-quantites | remote | e080071 | 0 | 50 | fix(stats): chiffre d'affaires et quantités j |
| claude/s1-fix8-rejeu-offline | remote | cc2e367 | 0 | 44 | fix(voix): rejeu hors-ligne honnête — ne ja |
| claude/s1-onboarding-libelle-voix | remote | 08d7f1e | 0 | 46 | fix(onboarding): libellé voix truthful — v� |
| claude/s1-vente-sup-stock | remote | 0beaccb | 0 | 48 | feat(vente): avertir à la voix quand la vente |
| claude/seed-demo | remote | c2e1cd7 | 1 | 272 | feat(seed): comptes de démo prêts à l'emplo |
| claude/seed-roles | remote | a1e7627 | 1 | 270 | feat(seed): un compte de démo par rôle (prod |
| claude/socle-schema-hygiene-codeonly | remote | 3fa938b | 1 | 43 | refactor(schema): hygiène de schéma code-onl |
| claude/throttling-modele-unique | remote | 864466f | 0 | 3 | fix(throttling): un seul limiteur `default` g� |
| claude/trust-proxy-env-gated | remote | a1ba5a9 | 1 | 1 | feat(net): trust proxy piloté par env (défau |
| claude/tts-souverain | remote | 4a86c56 | 1 | 264 | feat(voix): TTS souverain — Piper d'abord, c |
| claude/tts-status | remote | c9fb2f2 | 1 | 260 | feat(voix): point de contrôle public /tts/sta |
| claude/ux-catalogue-images | remote | c7fd412 | 1 | 268 | feat(ux): ajouter un produit en touchant une p |
| claude/ux-mains-libres | remote | 4f56122 | 1 | 266 | feat(ux): vente mains libres — mot-réveil � |
| claude/ux-quickwins | remote | e3f720a | 1 | 267 | feat(ux): quick wins audit non-lectrice (#1 po |
| claude/voix-locale-autoritaire | remote | 829d0da | 1 | 257 | fix(voix): reconnaissance sur l'appareil AUTOR |
| claude/voix-offline | remote | 7d1a91e | 0 | 284 | feat(db): migrations auto au demarrage du back |
| claude/voix-offline-intent | remote | 486993c | 0 | 291 | feat(voice): enrichit la comprehension hors-li |
| consolidate/lot1-entree-ux | remote | 63c83c7 | 0 | 42 | feat(entree): parcours d'entrée v0.3 — écr |
| consolidate/repeigne-profil-parametres | remote | 39dc13c | 0 | 40 | chore(ux): repeigne Profil & Paramètres — t |
| docs/adr-12-decrement-stock | remote | 52188ca | 0 | 35 | docs(adr): cadrage #12 — décrément de stoc |
| docs/etape4-plan | remote | 480fc4f | 2 | 29 | docs(schema): #10 Étape 4 — renforcer la po |
| docs/recette-espaces-e2e | remote | e683fe3 | 0 | 16 | docs(recette): boucle espèces marchand — PV |
| feat/annulation-self-service-marchand | remote | 46e23f7 | 0 | 8 | feat(caisse): #20 — annulation self-service  |
| feat/caisse-phase1 | remote | 349356d | 0 | 144 | fix(caisse): déconnexion robuste si appLogout |
| feat/caisse-phase2-accueil-unique | remote | d21d98d | 0 | 139 | fix(caisse): retire l'alerte obsolète « ouvr |
| feat/caisse-phase3-vente-simple | remote | e754457 | 0 | 136 | feat(caisse): encaissement — montant sur le  |
| feat/caisse-phase4-mobile-money-declare | remote | e33db24 | 1 | 135 | feat(caisse): mobile money déclaré à l'enca |
| feat/producteur-stats-endpoint | remote | a97e63d | 1 | 39 | feat(producteur): endpoint stats autoritatif � |
| feat/produits-socle-marchand | remote | e0f7b2e | 1 | 62 | feat(produits): socle produits marchand — so |
| feat/stock-vente-directe | remote | a3c7c5b | 2 | 34 | test(invariants): nettoyer les récoltes en af |
| fix/admin-datasource | remote | 90c41f6 | 0 | 159 | fix(backend): dédoublonne typeorm (override 0 |
| fix/annulation-remise-stock | remote | 1415bdb | 0 | 18 | feat(caisse): annulation vente → remise en s |
| fix/boutique-mouvements-prod | remote | 4a585ef | 1 | 28 | fix(boutique): créer boutique_mouvements en p |
| fix/c0-1-role-authority | remote | 0d55e44 | 1 | 67 | fix(auth): C0.1 M6+M8 — barrière d'autorit� |
| fix/caisse-credit-desactive-pilote | remote | c5911d5 | 0 | 20 | fix(caisse): désactiver la vente à crédit � |
| fix/caisse-mobile-money-masque | remote | 6b32f36 | 0 | 16 | fix(caisse): masquer le mobile money déclarat |
| fix/caisse-stock-autorite-backend | remote | a5f2fe6 | 0 | 22 | fix(caisse): stock — backend seul maître su |
| fix/m6-m8-role-escalation | remote | f945109 | 2 | 67 | fix(auth): R1 — allow-list stricte fail-clos |
| fix/offline-queue-4xx | remote | cac32f5 | 0 | 63 | fix(caisse offline): dead-letter les rejets 4x |
| fix/prod-migrationsrun-respecte-env | remote | 7f34e1b | 0 | 10 | fix(prod): boot — respecter DB_MIGRATIONS_RU |
| fix/publications-onconflict-index-500 | remote | cfd1bce | 0 | 38 | fix(marché): poser ux_publications_user_produ |
| fix/react-router-react18-compat | remote | 44746ea | 0 | 161 | fix(deps): react-router 7.13.0 (compat React 1 |
| fix/schema-drifts | remote | d8fde1a | 1 | 31 | fix(schema): #10 Étape 3 — corriger les dri |
| fix/vente-atomique-stock-ledger | remote | 7ac65d4 | 1 | 68 | fix(caisse): vente atomique + ledger stock (I1 |
| fix/voix-chef-orchestre | remote | 6665aca | 0 | 159 | fix(voix): chef d'orchestre audio robuste —  |
| test/invariants-financiers | remote | 05ce71f | 1 | 70 | test(invariants): harnais jest + Postgres jeta |
| test/invariants-l2-blockers | remote | 784a07c | 1 | 69 | test(invariants): blockers argent en tableau d |
