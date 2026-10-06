# AUDIT SYSTÈME — AUTHENTIFICATION — 2026-10-05

## 1. Identité et périmètre

- **Objet** : audit du SYSTÈME d'authentification complet (backend + frontend + config), complémentaire à l'audit UI `AUDITS/AUDIT-UI-AUTH-2026-10-05.md` (frontend). IDs nouveaux préfixés **AUTH-SYS** (AUTH-01..17 réservés à l'audit précédent).
- **Périmètre audité** : `backend/src/auth/**` (21 fichiers, 2 733 l.) + `backend/src/main.ts` (327 l.) + `app.module.ts`/`throttler.config.ts`/`seed-demo.service.ts` (supports) ; frontend `components/auth/**` (14 fichiers, 3 391 l.) + `api/api-client.ts` (202 l.) + `api/auth-api.ts` + `main.tsx` (filet) ; config `backend/.env` (PRÉSENCE des clés vérifiée, valeurs jamais lues/affichées), `.env.example`.
- **Méthode** : lecture statique ligne à ligne + exécution des gardes `test:coffre-web` (exit 0) et `test:enum-check-phone` (exit 0) + sondes runtime curl sur :3001 (3 GET, 1 POST login, 2 POST check-phone timing — aucune écriture métier).
- **Auditeur** : AGENT AUDIT (système multi-agents) — audit strictement READ-ONLY.
- **Référentiels** : `PROJECT_CONTEXT.md` §8, `ACCESSIBILITY_GUIDE.md` §4/5/6, `ADR-002` (.ai/ADR), `DEBT_REPORT.md` §AUTH, worklog Tasks 1–8-bis.

## 2. Architecture auth observée

```
EntryGate (/) ── numéro → POST /auth/check-phone (échéance uniforme 300+gigue ms)
             └─ PIN/mot de passe → POST /auth/login (throttle 5/min, verrou échelle serveur)
                    ├─ bcrypt.compare(password, passwordHash cost 10)
                    ├─ verrou : 3 échecs→5 min, 6→15 min, 9+→1 h (verrou-pin.ts, colonnes users)
                    └─ JWT HS256 15 min {sub, phone, role} + refresh 64 octets (hash HMAC-SHA256+sel, 7 j, max 5 sessions)
                    └─ Set-Cookie HttpOnly access_token/refresh_token (+bo_access_token si rôle BO)
                        web dev : SameSite=Lax ; prod : SameSite=None;Secure (auth.controller.ts:999-1012)
Session : cookie httpOnly (web) OU localStorage+Bearer (APK, via utils/stockerJetonsSiMobile — no-op web)
401 → api-client rafraichirSession (mutex) → POST /auth/refresh → rotation, rejeu « used » = compromission → révocation TOUT
APK : rotation → successeur en localStorage ; WEB : ADR-002 = cookies seuls (VIOLÉ, voir AUTH-SYS-01)
Change-password : canal mémoire one-shot codeActuelMemoire (60 s) ; mustChangePassword allow-list serveur (jwt.strategy.ts:37-44)
Activation P0.0 : code selector+verifier (verifier hashé bcrypt), usage unique ATOMIQUE, TTL 30 min, PINS_INTERDITS {0000,1234}
WebAuthn : RP ID/Origin vérifiés (env), challenge stocké par user ; PIN identificateur : AES-256-GCM (v2) + timingSafeEqual + verrou à colonnes dédiées
Rôles : JwtAuthGuard (cookie→Bearer) + RolesGuard (@Roles) + allow-list création fail-closed (auth.service.ts:67-73)
```

## 3. Statut des constats AUTH-01..17 de l'audit précédent

| ID | Titre | Statut | Preuve |
|---|---|---|---|
| AUTH-01 | Garde entrée unique orpheline | CLOSE | routes.tsx:53-54 `<Navigate to="/" replace/>` ; garde `test:entree-unique` dans verify (verte) |
| AUTH-02 | PIN dans history.state | CLOSE | `codeActuelMemoire.ts:39-58` canal one-shot 60 s ; garde `test:canal-code` verte |
| AUTH-03 | Verrou inaudible | CLOSE | clips ui-125/login-30/login-28 + garde texte→clip renforcée (audit §11, recette GET .mp3 206) |
| AUTH-04 | Réécoute numéro muette | CLOSE | feedback non audio (surbrillance+haptique) ; numéro jamais énoncé |
| AUTH-05 | Modale non conforme | CLOSE | Radix Dialog, ESC, fond non-refusant, Fermer 44 px |
| AUTH-06 | Jetons en localStorage (web) | REOUVERT (partiel) | ADR-002 acceptée + coffre ok, MAIS `api-client.ts:128,132` réécrit les 2 jetons en localStorage sur WEB à chaque rotation (détail → AUTH-SYS-01) |
| AUTH-07 | Énumération check-phone + TEST_PHONES non journalisés | CLOSE | `anti-enumeration.ts` ; runtime : 368/382/308 ms uniformes ; log WARN `accès TEST_PHONE 08 •• •• 40 40` vu (backend-dev.log:1142) |
| AUTH-08 | ~70 couleurs hardcodées | CLOSE | `authCharte.test.mts` (181 l.), budgets figés, verte |
| AUTH-09 | Cibles < 44 px | CLOSE | garde cible-tactile étendue à l'auth (4 cibles) |
| AUTH-10 | LoginPassword 1 652 l. | CLOSE | 1 540 l. aujourd'hui, 4 modules extraits (BanniereErreur, PaveSaisie, useDicteeLive, useDevMode) |
| AUTH-11 | Formulaires sans aria-invalid/autoComplete | CLOSE | ChangePasswordScreen + ActivationScreen attribués |
| AUTH-12 | i18n visuel absent | OUVERT (registre) | `.ai/DEBT_REPORT.md:167` — P3 XL, hors lot |
| AUTH-13 | Transcripts STT non masqués | CLOSE | `voiceTrace.masquerChiffresSensibles()` source + dump |
| AUTH-14 | 13 console.warn en prod | CLOSE | `warnDev.ts` DEV-gated ; AUTH-14b : runbook `.ai/HANDOFF/SECURITY_TO_TEAM.md` |
| AUTH-15 | SVG dessinés main | CLOSE | icônes lucide (Keyboard, Delete, Check, Play) |
| AUTH-16 | Surfaces inline hors tokens | CLOSE | jetons `--commerce-*` ; exception feuille modale documentée |
| AUTH-17 | « Vérification… » sans live | CLOSE | `role="status"` + `aria-live="polite"` |

**14/17 closes, 1 réouverte (partielle), 2 ouvertes au registre** (+ AUTH-ERR, clip voix, P3, registre).

## 4. Constats détaillés (nouveaux)

### AUTH-SYS-01 [P1] — ADR-002 violé à la première rotation : les deux jetons réapparaissent en localStorage sur WEB, et la garde est aveugle au contournement

`rafraichirSession` (api-client.ts:111-138) écrit le jeton d'accès (:128) et le refresh (:132) via `ecrireStockage` (:85-87) — un wrapper `localStorage.setItem` SANS porte `estMobileNatif()`. Sur web, dès qu'un 401 suit l'expiration du JWT (15 min) — la minuterie de session déclenche même le refresh (api-client.ts:59-72) — `POST /auth/refresh` renvoie les jetons dans le corps (auth.controller.ts:155) et ils sont écrits. Le refresh 7 jours redevient lisible par XSS, exactement la propriété qu'ADR-002 (« Sur le web, les jetons ne sont JAMAIS écrits ») interdit. La garde `test-coffre-web.mjs:82` ne matche que `setItem\((['"\`])(julaba_(access|refresh)_token)` — clé LITTÉRALE ; le wrapper à variable passe à travers (garde exécutée à l'instant : VERT, fausse assurance). Impact : réouverture de la classe d'attaque fermée par AUTH-06 ; invariants 1 et 2 de l'ADR faux en runtime.

### AUTH-SYS-02 [P2] — CSRF : la sous-dette ADR-002 reste ouverte ET un de ses deux piliers est contredit par le code

La vérification serveur de l'`Origin` sur les mutations auth n'existe nulle part (confirmé : aucun contrôle origin dans auth.controller.ts). Pire, la justification de l'ADR (« l'API ne parle qu'en application/json → tout corps de formulaire simple-request arrive vide ») est invalidée par `main.ts:193` : `express.urlencoded({extended:true})` est ACTIF → un POST form-urlencoded vers `/auth/login`, `/auth/logout` (SkipThrottle) ou `/auth/refresh` est parsé et interprété. En prod (SameSite=None;Secure), une page tierce peut déclencher logout (DoS), rotation forcée, ou login-CSRF (fixation de session vers un compte attaquant). Vecteur : navigateur victime, origine croisée.

### AUTH-SYS-03 [P2] — WebAuthn : énumération de comptes et absence de rate-limit dédié sur les endpoints d'authentification biométrique

`webauthn/authenticate/options` (auth.controller.ts:912-941) distingue « Utilisateur introuvable » (:926) et « Aucune clé biométrique enregistrée » (:927-928) → oracle d'énumération ; aucun `@Throttle` sur options (:912) ni verify (:943) — ils reçoivent le défaut généreux 300/min/IP, contre 5/min pour login. `verify` accepte un `userId` fourni par le client (:946) et des erreurs différenciées (challenge manquant/credential introuvable). Impact : probing de comptes à grande vitesse ; contraste direct avec le soin anti-énumération porté à check-phone.

### AUTH-SYS-04 [P3] — Verrou PIN partagé entre login et pin/verify : un contournement de verrou par deux portes

`pin/verify` (auth.controller.ts:277-293) compte ses échecs dans les MÊMES colonnes `failedPinAttempts`/`lockedUntil` que le login (auth.service.ts:265-291) — la séparation que le contrôleur jugeait indispensable pour le PIN identificateur (auth.controller.ts:554-565, colonnes dédiées) n'existe pas pour le PIN acteur. Une session ouverte (vol de téléphone, XSS) qui rate 9 fois le PIN du portefeuille verrouille AUSSI la connexion de la marchande ; réciproquement, un login réussi remet à zéro le compteur du PIN (contournement partiel du verrou).

### AUTH-SYS-05 [P3] — bcrypt cost 10 partout (bcryptjs pur JS)

auth.service.ts:133 (signup), auth.controller.ts:246/343, activation.service.ts:31/80. ~80 ms/essai en dev ; OWASP recommande d'ajuster vers 10-12 selon matériel. À 5 login/min le débit est borné, mais en prod Render un cost 12 coûte peu pour un gain 2×. Recommandation de calibrage, pas une faille.

### AUTH-SYS-06 [P3] — POST /auth/refresh répond 200 + corps {error} en cas d'échec

auth.controller.ts:133-162 : échec de rotation → 200 `{error}` + effacement des cookies (le client api-client.ts:74-77 documente le contournement « on lit le corps »). Toute autre couche cliente (nouveau consommateur, script APK) traitant 200=OK se croit authentifiée. Ambiguïté HTTP évitable : 401 serait le contrat correct.

### AUTH-SYS-07 [P3] — Timing de /auth/login non uniformisé : oracle d'énumération résiduel

auth.service.ts:240-242 : utilisateur inconnu → `throw` AVANT `bcrypt.compare` (~0 ms) ; utilisateur connu → compare ~80 ms. Le throttle 5/min borne le débit mais pas la mesure statistique. Contraste : check-phone a été uniformisé (AUTH-07), login non. La journalisation des échecs (228, 267) fournit déjà le comptage côté serveur.

### AUTH-SYS-08 [P3] — Incohérence de comparaison temps constant dans le PIN identificateur

`verifyIdentificateurPin` utilise `timingSafeEqual` (auth.controller.ts:540-543) ; `changeIdentificateurPin` compare `pin.trim() !== body.oldPin.trim()` (:643). Même verrou derrière (attenteVerrouPinIdentificateur :637), donc risque marginal — mais l'incohérence contredit l'intention documentée SEC-07.

### AUTH-SYS-09 [P3] — PII : numéros complets en clair dans les journaux auth

auth.service.ts:228 (`Echec login email: ${email}`), :267 (`Echec login: ${phone}`), :305 (`Login: ${phone}`), :418 (`Rotation token: user ${phone}`). Le projet a établi un standard de masquage (`masquerTelephone` pour les TEST_PHONE, :215/:333) qui ne s'applique pas aux utilisateurs réels. Incohérence avec la minimisation PII (loi 2013-450) ; PAS de PIN/password dans les logs (vérifié).

### AUTH-SYS-10 [P3] — SEED_DEMO="true" opt-in explicite peut créer les comptes démo en production

seed-demo.service.ts:130 : le seed tourne en prod si `SEED_DEMO === 'true'`. Garde bonne foi : BO_PASSWORD refusant '123456' (:65-69), `.env.example` documente. Risque résiduel de config (copier-coller du .env de dev). À durcir par un refus boot si `NODE_ENV=production && SEED_DEMO=true` sans flag d'urgence explicite.

### AUTH-SYS-11 [P3] — Payload JWT : téléphone embarqué

auth.service.ts:448 : `{sub, phone, role}`. `sub` suffit aux stratégies (jwt.strategy.ts:33 lit `payload.sub` seul) ; le téléphone est PII dupliquée dans chaque cookie jeton (httpOnly, atténuant).

### AUTH-SYS-12 [P3] — Jeton back-office en sessionStorage, hors périmètre ADR-002

backoffice-api.ts:18-26 : `julaba:bo:access-token` en sessionStorage (lisible par XSS sur le BO) alors que le cookie `bo_access_token` httpOnly existe déjà. ADR-002 ne couvre que `julaba_access_token`/`julaba_refresh_token` — le coffre BO n'est pas réglé.

### AUTH-SYS-13 [P3] — PATCH /auth/preferences fusionne un corps non validé

auth.controller.ts:222-228 : `Record<string, boolean|string|number>` mergé tel quel dans `user.preferences`, sans allow-list de clés ni DTO ; ValidationPipe sans DTO ne filtre rien. Persistance de données arbitraires renvoyées ensuite via /auth/me.

### AUTH-SYS-14 [P3] — PINS_INTERDITS non appliqués hors activation

activation.service.ts:10 refuse {0000,1234} ; `pin/set` (auth.controller.ts:234-252) et `change-password` (:330-346, 4 caractères min) ne les appliquent pas — incohérence de politique sur un même secret utilisateur.

Catégorie a11y (§4/5/6 ACCESSIBILITY_GUIDE) : **VIERGE en constats nouveaux** — l'audit système n'a rien relevé au-delà de l'audit UI (rôles fail-closed côté EntryGate.tsx:93-102, spinner `role="status" aria-live="polite"` :133-148) ; les résidus AUTH-12/AUTH-ERR sont déjà au registre.

## 5. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| AUTH-SYS-01 | Jetons access+refresh réécrits en localStorage web à chaque rotation (ADR-002 inopérante en runtime) | session | P1 | XSS web lit le refresh 7 j |
| AUTH-SYS-02 | CSRF sur mutations auth ; urlencoded valide la requête d'attaque | session | P2 | page tierce, origine croisée, SameSite=None prod |
| AUTH-SYS-03 | Énumération + probing WebAuthn sans throttle dédié | autorisation | P2 | client non navigateur, 300 req/min |
| AUTH-SYS-04 | Verrou PIN partagé login/pin-verify | session | P3 | session ouverte → DoS verrou |
| AUTH-SYS-07 | Oracle de temps sur login (inconnu vs connu) | session | P3 | mesure statistique à 5/min |
| AUTH-SYS-09 | Numéros complets dans les journaux auth | PII | P3 | accès aux logs |
| AUTH-SYS-10 | Seed démo activable en prod par config | config | P3 | .env erroné |
| AUTH-SYS-05/06/08/11/12/13/14 | Cost bcrypt, 200-en-échec, comparaison non constante, PII JWT, sessionStorage BO, preferences libres, PINS_INTERDITS partiels | crypto/config/session | P3 | divers |

## 6. Points forts

1. **Fail-fast secrets prod** : boot refusé sans JWT_SECRET/REFRESH_TOKEN_SALT/PIN_ENCRYPTION_KEY (main.ts:84-92) — vérifié présent + gitignored (`.gitignore:9`), jamais versionné.
2. **Verrou PIN serveur-driven** : échelle 3→5 min/6→15 min/9+→1 h documentée et testable (verrou-pin.ts), remontée en clair à l'écran ; verrou hérité 100 ans levé automatiquement.
3. **Rotation refresh robuste** : hash HMAC+sel (auth.service.ts:507-513), rejeu « used » = compromission → révocation totale (390-395), 5 sessions max FIFO (34, 483-496).
4. **Activation P0.0 exemplaire** : selector+verifier (verifier hashé bcrypt), usage unique ATOMIQUE en transaction, TTL 30 min, PINS_INTERDITS (activation.service.ts:27-89).
5. **PIN identificateur** : AES-256-GCM v2 (IV aléatoire, tag), repli legacy CBC assumé ; comparaison temps constant + verrou à colonnes dédiées anti-contournement (auth.controller.ts:507-606).
6. **Rôles fail-closed** : `super_admin` jamais créable générique, allow-list `rolesCreablesPar` appliquée DANS le service (auth.service.ts:45-73) ; RolesGuard throw sur rôle requis non satisfait.
7. **Anti-énumération check-phone prouvé runtime** : 368/382/308 ms (plancher 300 + gigue 80), malformé inclus ; TEST_PHONE journalisés masqués (log WARN constaté).
8. **Défense en profondeur** : helmet CSP, CORS allow-list (jamais wildcard, credentials assumés), ClassSerializerInterceptor global (main.ts:236) — `/auth/me` sans passwordHash/pinCodeHash vérifié runtime.
9. **mustChangePassword appliqué côté serveur** avec allow-list de routes (jwt.strategy.ts:37-44), pas seulement côté écran.
10. **Throttler hiérarchisé** : défaut 300/min, login 5, check-phone 10, signup 3, activer 20, contacts-recovery 5 (auth.controller.ts).
11. **WebAuthn vérifié** : expectedOrigin/RP_ID par env, challenge consommé, counters mis à jour (auth.controller.ts:850-997).
12. **Suppression de compte RGPD-like** qui ne touche jamais à l'argent (auth.controller.ts:348-449).

## 7. Recommandations de correction

1. **AUTH-SYS-01 (S)** : porter la porte `if (!estMobileNatif()) return;` DANS `ecrireStockage` (api-client.ts:85) ou supprimer les 2 appels web ; ÉTENDRE `test-coffre-web` aux wrappers (`localStorage.setItem` à clé variable + toute fonction nommée *[eE]crire* appelée avec les constantes) et à `sessionStorage`.
2. **AUTH-SYS-02 (M)** : middleware `Origin`/`Sec-Fetch-Site` allow-list sur POST/PATCH/DELETE `/auth/*` (rejeter toute origine absente de la liste CORS) ; corriger la justification ADR-002 ou restreindre `express.urlencoded` hors des routes auth.
3. **AUTH-SYS-03 (S)** : `@Throttle({default:{limit:5,ttl:60000}})` sur webauthn options/verify ; réponses uniformes (« introuvable » vs « sans clé » → même forme), ne pas renvoyer `userId` depuis options.
4. **AUTH-SYS-04 (S)** : colonnes dédiées `pinVerifyAttempts`/`pinVerifyLockedUntil` pour `pin/verify` (modèle du PIN identificateur).
5. **AUTH-SYS-05 (S)** : cost 12 en prod (variable d'env `BCRYPT_COST`, défaut 10).
6. **AUTH-SYS-06 (S)** : `POST /auth/refresh` → 401 en échec (garder le corps d'erreur), coordonner api-client.
7. **AUTH-SYS-07 (M)** : échéance uniforme sur `login` (réutiliser `repondreAEcheanceUniforme`) ou bcrypt factice sur miss.
8. **AUTH-SYS-08 (S)** : `timingSafeEqual` dans changeIdentificateurPin.
9. **AUTH-SYS-09 (S)** : généraliser `masquerTelephone` sur :228/:267/:305/:418.
10. **AUTH-SYS-10 (S)** : refus boot si `NODE_ENV=production && SEED_DEMO=true` sans `SEED_DEMO_I_KNOW=oui`.
11. **AUTH-SYS-11..14 (S)** : retirer `phone` du payload JWT ; migrer le jeton BO vers le cookie httpOnly ; allow-list de clés preferences ; appliquer PINS_INTERDITS à pin/set et change-password.
12. **Registre** : AUTH-12 (i18n XL) et AUTH-ERR (clip voix) restent à leur propriétaire.

## 8. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Login | numéro+PIN → cookies HttpOnly posés | Set-Cookie HttpOnly sur access/refresh ; 401 sans jeton |
| Session web | >15 min puis requête | localStorage RESTE vide après refresh (AUTH-SYS-01 corrigé) |
| Rotation | rejouer un refresh « used » | toutes sessions révoquées, 401 |
| Verrou PIN | 3/6/9 échecs | attente 5 min/15 min/1 h remontée en clair, jamais définitive |
| Anti-énumération | check-phone existant/inconnu/malformé | écarts de durée < gigue (80 ms) ; log WARN masqué |
| CSRF | POST form-urlencoded cross-origin vers /auth/login | rejeté (Origin absent de la liste) |
| WebAuthn | 10 sondes options/verify | throttle 5/min actif, réponses uniformes |
| Activation | code rejeu après usage | « Code déjà utilisé », aucun effet |
| Comptes recette | login/check-phone TEST_PHONE | WARN masqué + durée uniforme |
| PII logs | grep logs sur login/rotation | aucun numéro complet, aucun PIN |
| Fail-closed | rôle inconnu post-login | logout forcé + retour `/` |
| a11y | parcours EntryGate→PIN→rôle | conformité audit UI (§8 de l'audit précédent) |

## 9. Tests critiques recommandés

1. **Coffre runtime** : web login → attendre rotation → assert `localStorage.length === 0` (échoue aujourd'hui — AUTH-SYS-01).
2. **CSRF** : POST form-urlencoded cross-origin `/auth/login` + `/auth/logout` avec cookies → doit échouer (Origin check).
3. **Timing login** : 50 miss vs 50 hit → distributions indiscernables.
4. **WebAuthn** : 20 options/s sur numéro inconnu → 429 ; messages indistinguables.
5. **Rotation rejeu** : rejouer ancien refresh → `Token compromis`, toutes sessions révoquées.
6. **Verrou partagé** : 9 échecs pin/verify → login verrouillé 1 h (documenter ou corriger).
7. **Activation** : code consommé re-joué en parallèle (race) → un seul succès.
8. **PII** : scan des logs après 1 login/1 échec/1 rotation → zéro numéro complet.
9. **SEED prod** : boot prod avec SEED_DEMO=true → refuse sans flag d'urgence.
10. **mustChangePassword** : appel métier avec flag actif → 401 hors allow-list.

## 10. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | AUTH-SYS-01 : porte native dans `ecrireStockage` + garde étendue aux wrappers | S |
| P2 | AUTH-SYS-02 : vérification Origin sur mutations auth + justification ADR-002 corrigée | M |
| P2 | AUTH-SYS-03 : throttle + uniformisation WebAuthn options/verify | S |
| P3 | AUTH-SYS-04/07 : verrou dédié pin/verify + échéance uniforme login | M |
| P3 | AUTH-SYS-05/06/08/09/10/11/12/13/14 : lot hygiène | S chacun |
| Registre | AUTH-12, AUTH-ERR (déjà tracés, propriétaires désignés) | XL/S |

## 11. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Sécurité | 78/100 | Serveur très solide (verrou, rotation, activation, fail-closed, fail-fast) ; retrait pour AUTH-SYS-01 (P1), CSRF ouvert et WebAuthn |
| Accessibilité | 79/100 | Aucun nouveau constat ; P1 a11y auth fermés avec preuves ; restent AUTH-12/AUTH-ERR |
| Qualité du code | 71/100 | Commentaires de décision exemplaires ; mais auth.controller 1 022 l., logique de hash dupliquée (:184-188 vs service), réponses 200-en-échec |
| Global | 76/100 | Au-dessus du seuil PROD 60 ; l'écart au standard 75 est porté par 1 P1 + 2 P2 |

## 12. Conclusion + statut

Le socle serveur d'authentification est **mûr et remarquablement documenté** : les 15 corrections AUTH-01..17 (hors 2 dettes assumées) tiennent leurs promesses, vérifiées par gardes vertes et recette runtime (401 sans jeton, cookies HttpOnly, timing check-phone uniforme 308–382 ms, TEST_PHONE journalisés masqués, secrets fail-fast, chiffrement PIN GCM). **Un P1 nouveau invalide toutefois la garantie centrale d'ADR-002 en runtime** : à la première rotation, `api-client.ts:128/132` réécrit les deux jetons en localStorage sur le web — hors porte `estMobileNatif`, invisible pour la garde `test:coffre-web` (clés littérales uniquement). La fermeture d'AUTH-SYS-01 (effort S) doit précéder toute clôture définitive d'AUTH-06, accompagnée de l'extension de la garde. La sous-dette CSRF inscrite dans ADR-002 reste ouverte et son pilier « JSON-only » est contredit par `express.urlencoded` (AUTH-SYS-02). Statut : **AUDIT AUTH-SYS TERMINÉ — 1 P1, 2 P2, 11 P3 ; périmètre non bloquant pour la PROD sous réserve de traiter AUTH-SYS-01 avant livraison web**. Aucun fichier modifié (audit lecture seule).
