# AUDIT ACTEUR — IDENTIFICATEUR — 2026-10-05

## 1. Identité et périmètre

- **Rôle** : `identificateur` — acteur terrain d'enrôlement (création de dossiers d'identification, comptes acteurs, suivi, mutation).
- **Périmètre audité (statique, lecture seule)** :
  - Frontend : `frontend_src/src/app/components/identificateur/**` (16 fichiers, ~15 400 l., dont `FicheIdentificationDynamique.tsx` 5 753 l.), routes `routes.tsx:163-186`, contexts `IdentificateurContext.tsx` (413 l.) / `ZoneContext.tsx` (155 l.), `api-client.ts`.
  - Backend : `backend/src/{identifications,acteurs-rest,oneci,admin-divisions}/`, plus supports directement impliqués : `auth/` (signup allow-list, PIN identificateur, verrou, activation P0.0, jwt.strategy), `users/` (by-phone, search-identificateur, PATCH :id, photo), `mutations/`, `zones/`.
  - Normes : PROJECT_CONTEXT §1/§8, ACCESSIBILITY_GUIDE §4/5/6, DESIGN_SYSTEM §9, worklog Tasks 1-8.
- **Sonde runtime** (backend :3001, 5 requêtes max, lecture seule) : 3 GET sans token + 1 POST login + 1 GET avec token (voir §3/§7).
- **Audit antérieur** : `AUDIT-ACTEUR-IDENTIFICATEUR-2026-09-28.md` = squelette sans preuve fichier:ligne ; ses 3 constats (auth WS, contrôle de zone, perf) sont repris, vérifiés et prouvés ci-dessous (§3, IDs 06/07/08).

## 2. Fonctionnalités observées dans le code

| Fonction | Où | Observation |
|---|---|---|
| Fiche d'enrôlement multi-étapes (marchand/producteur/coop) | FicheIdentificationDynamique.tsx | 8 onglets, GPS + reverse-geocode, photo compressée (800 px, 5 Mo max), signature tactile, NNI via ONECI, brouillon auto |
| Création compte + dossier atomique | identifications.controller.ts:295-483 | transaction, code d'activation P0.0 rendu une seule fois (:441-448) |
| Brouillons serveur + écran dédié | POST/GET/DELETE /identifications/draft*, MesBrouillons.tsx | IDOR contrôlé côté serveur (:147, :593) |
| Suivi de dossiers | SuiviIdentifications.tsx, Identifications.tsx | lecture seule côté UI (aucun PATCH) |
| Détail acteur par numéro/UUID | ActeurDetails.tsx:138-165 → GET /users/by-phone/:phone, /users/:id, /historique | zone flaggée horsZone |
| Mutation de zone | DemandeMutation.tsx → mutations.controller.ts | 1 demande en_attente max (:79-90), décision admin (:113-115), réaffectation transactionnelle (:147-201) |
| PIN identificateur | auth.controller.ts:507-759, pin-identificateur.ts, verrou-pin.ts | 4 chiffres 2-9 CSPRNG, échelle 3→5 min/6→15 min/9→1 h, jamais rendu (SEC-05) |
| ONECI lookup NNI | oneci.controller.ts:8-9 → RNPP verif.ci | accessible à tout utilisateur authentifié |
| Wallet/keiwa, academy, support, stats, rapports | routes :177-185 | héritées du shell générique |

## 3. Constats détaillés

### IDENTIFICATEUR-01 [P1] — Auto-approbation de dossier possible via PATCH (rupture de séparation des pouvoirs)

identifications.controller.ts:494-524 : le PATCH /:id autorise le propriétaire (identificateur) et l'allow-list allowedFields:494-499 **inclut statut**. Un identificateur peut donc passer son propre dossier à approuve/valide par appel API direct (l'UI ne le fait pas — SuiviIdentifications.tsx est en lecture seule), ce qui déclenche en plus le SMS de validation (:534-566). La transition d'état n'exige jamais le rôle admin ni la permission enrolement.validate. Impact : contournement du workflow de validation 24-48 h présenté à l'écran (FicheIdentificationDynamique.tsx:2165-2231) ; fausse activité de validation, statistiques et commissions faussées.

### IDENTIFICATEUR-02 [P1] — Le PIN identificateur n'est pas appliqué côté serveur sur les routes de modification

Le PIN « protège la modification des fiches acteurs » (pin-identificateur.ts:29-31, IdentificateurPinChangeSection.tsx:259). Or il n'est vérifié que par POST /auth/identificateur/me/verify-pin (auth.controller.ts:507), appelé **client-side** avant édition (FicheIdentificationDynamique.tsx:1639 ; absence totale de verify-pin dans ModalEditerActeur.tsx). PATCH /users/:id (users.controller.ts:263-338) n'exige aucun PIN : avec un JWT identificateur volé/une session ouverte, on édite les champs PII-adjacents (numCNPS, numCMU, dateNaissance, photoUrl — :315) sans le PIN, le verrou verrou-pin.ts ne voyant jamais ces requêtes. Impact : le verrou documenté comme condition de validité de l'arbitrage 4 chiffres est décoratif sur le chemin réel d'écriture.

### IDENTIFICATEUR-03 [P1] — Upload photo acteur : extension non contrôlée + pas de validation UUID

users.controller.ts:357-408 : MIME vérifié (déclaré client) mais l'extension vient du nom de fichier (:392), sans allow-list ni ParseUUIDPipe sur id (comparer :344 qui l'a). Un fichier image/jpeg nommé x.php/x.html atterrit sous /var/www/julaba/uploads/acteurs (:396) et est servi publiquement (julaba.online/uploads/... :404) — contenu arbitraire hébergé sur le domaine (stored XSS / exécution selon serveur). L'param id étant décodé par Express, un ..%2F n'est pas exclu par le code. Impact : vecteur de compromission serveur via une route ouverte à l'identificateur.

### IDENTIFICATEUR-04 [P1] — PII forte en clair : stockage navigateur (sessionStorage) et JSONB sans chiffrement

La fiche collecte NNI/CNI, CNPS, CMU, récépissé, signature, photo (base64) (FicheIdentificationDynamique.tsx:73,932,1572-1573). Le brouillon auto écrit **tout** ce lot en sessionStorage en clair : sessionStorage.setItem('julaba:fiche-draft:'+profil, …) (:1016) + complement_dossier (:847). Côté serveur, form_data/documents sont des colonnes jsonb sans chiffrement (identification.entity.ts:10,22) et la photo est recopiée dans users.photo_url en data-URL (identifications.controller.ts:383-393) sans limite de taille serveur. Aucun masquage réutilisé côté espace identificateur (le masquage existe pourtant : remise-code-bo.ts:19-25, utilisé par auth). Impact : fuite massive en cas de XSS (sessionStorage lu à volonté) ; exposition base ; non-conformité loi ivoirienne n°2013-450 (P1 projeté §10 du contexte).

### IDENTIFICATEUR-05 [P1] — Lookup ONECI (registre national) sans restriction de rôle

oneci.controller.ts:4-12 : JwtAuthGuard seul — **aucun** RolesGuard/@Roles. Tout utilisateur authentifié (marchande, producteur…) peut interroger GET /api/v1/oneci/lookup/:nni et recevoir les PII d'état civil (nom, prénoms, naissance, genre — oneci.service.ts:32) du registre RNPP, ainsi que le quota d'appels. Pas de journal d'accès NNI (le code :26-28 mappe les erreurs, rien ne trace qui a interrogé quel NNI). Impact : détournement d'un accès réglementaire en source de requêtes PII nationales par tout compte ; pas de preuve d'usage légitime en cas d'incident.

### IDENTIFICATEUR-06 [P1] — Contrôle de zone décoratif sur les consultations (constat P1 de l'audit 2026-09-28, confirmé et précisé)

users.controller.ts:61-70 (by-phone) et :250-259 (GET /users/:id) : pour un identificateur, la zone est calculée (memeZone) mais **les données complètes sont renvoyées dans tous les cas**, avec un simple drapeau horsZone:true + message « en consultation uniquement ». Consultation nationale de n'importe quel compte par n'importe quel identificateur (incl. search-identificateur sans filtre de zone, users.service.ts:280-335). Seules les ÉCRITURES sont fail-closed (:297-302 — zone nulle ⇒ Forbidden) et l'historique est bloqué hors zone (:224-235). Contraste avec identifications.controller.ts:132-135 où l'accès au dossier est réellement refusé. Impact : « l'identificateur ne voit que sa zone » est faux ; PII nationales accessibles en lecture sans journal dédié.

### IDENTIFICATEUR-07 [P2] — POST /auth/create-acteur garde la voie « 0000 » contredisant P0.0 (ADR-002)

auth.controller.ts:761-820 : les rôles autorisés incluent identificateur (:763) ; signup() applique le mot de passe par défaut 0000 aux rôles acteur (auth.service.ts:42-43,132), crée le compte **ACTIF** (:165) et **rend des jetons à l'appelant** (:199-202). La mitigation mustChangePassword (jwt.strategy.ts:37-44) bloque les autres routes mais pas le login ni le changement de secret : la fenêtre de takeover « numéro + 0000 » que P0.0 a fermée sur create-with-acteur (identifications.controller.ts:331-359 — secret aléatoire + EN_ATTENTE_ACTIVATION) reste **ouverte sur cette seconde voie**. Aucun appel frontend trouvé (endpoint dormant, front utilise create-with-acteur FicheIdentificationDynamique.tsx:1837), mais la surface API est vivante. Impact : deux voies d'enrôlement incohérentes ; la plus faible est appelable par l'identificateur lui-même.

### IDENTIFICATEUR-08 [P2] — POST /identifications/create-with-acteur sans garde de rôle + PII dans les logs

identifications.controller.ts:295-323 : aucun @Roles ni vérification de rôle — tout utilisateur authentifié (marchande incluse) peut créer des comptes acteurs et recevoir un code d'activation (la variable isCreatedByIdentificateur:298 ne sert qu'à l'héritage de zone :325-329). Par ailleurs les logs contiennent de la PII : console.error(... acteurPhone: acteurData?.phone) (:470) et console.log('Cleanup acteur orphelin:', acteurId) (:458) ; côté auth, téléphone complet en log à auth.service.ts:200,267,305 (le masquage AUTH-07 ne couvre que les TEST_PHONES). @SkipThrottle() sur tout le contrôleur (:21). Impact : élargissement de la surface d'enrôlement à tout compte ; téléphone acteur en clair dans les journaux (contraire au standard établi par AUTH-07).

### IDENTIFICATEUR-09 [P2] — admin-divisions sans aucune authentification (preuve runtime)

admin-divisions.controller.ts:5-38 : aucun @UseGuards. Sonde : GET /api/v1/admin-divisions/districts sans token → **HTTP 200** (liste des districts). Données de référence peu sensibles, mais le POST reverse-geocode (:32-38) est un proxy appelable anonymement (coût/quota externe), et c'est la seule famille de routes métier du périmètre entièrement publique. Impact : incohérence avec le modèle « tout le reste est 401 » (sondes : /identifications 401, /oneci/* 401) ; robinet de coût.

### IDENTIFICATEUR-10 [P2] — Voix et identité de rôle : bouton Tata présent mais mort ; aucune voix dans le parcours enrôlement

IdentificateurLayout.tsx:13-46 : le shell rend Sidebar/BottomBar **sans** onMicClick (:36) ni TantieSagesseModal — or BottomBar.tsx:66-78 affiche le bouton « Tantie » de toute façon ; handleMicClick:41-43 est un no-op. Zéro appel parle()/clips dans les 16 fichiers du dossier (grep exhaustif) : la remise du code d'activation — moment critique — n'est énoncée que par écrit (FicheIdentificationDynamique.tsx:2115-2162) contre la doctrine voice-first (PROJECT_CONTEXT §1) et ACCESSIBILITY_GUIDE §4.1. Impact : contrôle mort (WCAG 2.1.1/4.1.2 côté feedback), information d'activation uniquement textuelle/visuelle.

### IDENTIFICATEUR-11 [P2] — Aucun mode dégradé hors-ligne alors que l'enrôlement est un travail de terrain

Dans FicheIdentificationDynamique.tsx : aucun navigator.onLine, aucun intercepteur offline, aucune haptique (grep vide). La soumission échoue avec un simple toast réseau (:1870) ; le brouillon serveur requiert le réseau (:1579). Seul filet : brouillon sessionStorage local (débounce 500 ms, :1008-1016), perdu à la fermeture du navigateur. Contraste avec le reste de l'app (PWA/outbox documentés au registre). Impact : perte de saisies terrain (zone à faible réseau = cas d'usage premier de ce rôle).

### IDENTIFICATEUR-12 [P2] — Économie d'API : N+1 + polling 30 s avec enrichissement par acteur

IdentificateurContext.tsx:135-177 : après le fetch des dossiers, un GET /users/:id **par** dossier (Promise.all :163-168), relancé toutes les 30 s (:250-253). Avec N dossiers : N+1 requêtes × 2/min. Le filtre acteur_id passé par ActeurDetails.tsx:164 (GET /identifications?acteur_id=) est **ignoré** côté serveur (identifications.controller.ts:92-124 ne lit que page/limit) — le filtrage réel se fait... nulle part côté serveur. Impact : charge base/API croissante avec le volume d'enrôlement (constat P2 « performance suivi » de l'audit 2026-09-28 : confirmé et chiffré).

### IDENTIFICATEUR-13 [P3] — Routes dupliquées et écrans fantômes

routes.tsx:165 vs 176 (même composant sur identification et fiche-identification), :168 vs 172 (acteurs et identifications → Identifications.tsx). IdentificateurProfil.tsx ne fait que 5 lignes, IdentificateurParametres.tsx 11 lignes — coquilles vides routées. KpiModals.tsx (655 l.) non référencé par les routes (orphelin). Impact : dette de lisibilité, risque de divergence de contenus.

### IDENTIFICATEUR-14 [P3] — Modale PIN custom sans focus trap ; couleurs en dur hors charte

IdentificateurPinChangeSection.tsx:280-298 : role="dialog"/aria-modal/ESC/retour focus OK (:79,98-103), mais pas de focus trap (Tab sort de la modale) — contre DS §9 « préférer Radix ». Couleurs littérales largement présentes (MesBrouillons.tsx:336 #B74725, FicheIdentificationDynamique.tsx:2116-2149 #F59E0B/#FFFBEB/..., KpiModals.tsx) — la charte fermée authCharte/caisseCharte ne couvre pas l'espace identificateur. Impact : navigation clavier dégradée ; dérive de charte non gardée.

### IDENTIFICATEUR-15 [P3] — Le filtre anti-doublon dépend d'une vérification téléphone « silencieuse » côté serveur

FicheIdentificationDynamique.tsx:1058-1076 : sonde GET /users/by-phone/:phone à chaque saisie (10 chiffres). Le endpoint est restreint aux rôles admin+identificateur (users.controller.ts:56-58) — bien — mais renvoie le profil complet à l'identificateur pour un simple contrôle de doublon (usage légitime = exists ; réponse surdimensionnée). L'écran de succès mentionne un contrôle de doublons « NIN, téléphone, biométrie » (:2179) : aucune vérification biométrique ni NNI unique n'existe côté backend (NNI non indexé/contraint dans CreateActeurDto:40 nin libre). Impact : UX de doublon insuffisante vs promesse écran ; surface de réponse inutile.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| IDENTIFICATEUR-01 | Auto-validation de dossier par l'identificateur | Autorisation / workflow | P1 | API directe PATCH statut |
| IDENTIFICATEUR-02 | PIN non appliqué serveur sur écritures PII | Authentification secondaire | P1 | Session compromise / curl |
| IDENTIFICATEUR-03 | Upload photo : extension arbitraire + chemin public | Sécurité applicative | P1 | POST multipart |
| IDENTIFICATEUR-04 | PII forte en clair (sessionStorage + JSONB) | Confidentialité / conformité | P1 | XSS / accès base |
| IDENTIFICATEUR-05 | Registre ONECI accessible à tout rôle | Autorisation / PII | P1 | JWT quelconque |
| IDENTIFICATEUR-06 | Zone décorative en lecture (national) | Autorisation / IDOR | P1 | JWT identificateur |
| IDENTIFICATEUR-07 | Voie « 0000 » contredisant P0.0 | Takeover de compte | P2 | API directe create-acteur |
| IDENTIFICATEUR-08 | create-with-acteur sans rôle + PII logs | Autorisation / logs | P2 | JWT quelconque |
| IDENTIFICATEUR-09 | admin-divisions public (preuve 200) | Exposition surface | P2 | Sans auth |
| IDENTIFICATEUR-10 | Voix absente + bouton Tata mort | A11y / doctrine | P2 | Usage normal |
| IDENTIFICATEUR-11 | Aucun offline terrain | Continuité / UX | P2 | Perte réseau |
| IDENTIFICATEUR-12 | N+1 + polling 30 s | Performance | P2 | Volume dossiers |
| IDENTIFICATEUR-13 | Routes dupliquées / écrans vides | Qualité | P3 | Navigation |
| IDENTIFICATEUR-14 | Modale sans focus trap / couleurs en dur | A11y / design system | P3 | Clavier |
| IDENTIFICATEUR-15 | Anti-doublon NNI/biométrie inexistant | Intégrité données | P3 | Enrôlement normal |

## 5. Points forts

1. **Allow-list de création de rôles fail-closed exemplaire** : rolesCreablesPar (auth.service.ts:53-73) — identificateur ⇒ uniquement marchand/producteur/cooperateur ; super_admin jamais créable ; règle appliquée DANS le service, non contournable par contrôleur (règle §8.8 respectée).
2. **P0.0 (ADR-002) réellement implémenté sur la voie terrain** : secret aléatoire semé, compte EN_ATTENTE_ACTIVATION non-loginable (auth.service.ts:295 + jwt.strategy.ts:36), code à usage unique — TTL 30 min, verifier bcrypt, consommation atomique anti-rejeu, un seul code actif, jamais de repli PIN défaut (activation.service.ts:9-89) ; l'écran de remise affiche le code une seule fois et l'explique (FicheIdentificationDynamique.tsx:2112-2162).
3. **PIN identificateur bien conçu côté serveur** : CSPRNG sans biais, alphabet 2-9 documenté comme arbitrage assumé (pin-identificateur.ts), verrou à échelle avec colonnes séparées de la connexion (anti-bypass logout/re-login, auth.controller.ts:554-606), réinitialisation SMS-only sans jamais rendre le code (SEC-05, :664-745), audit PIN_RESET sans fragment de secret.
4. **IDOR propre sur les dossiers** : GET/PATCH/DELETE identifications scoping par identificateur_id systématique (:132, :147, :210, :593) ; suppression réservée super_admin avec audit (:605-629) ; mutation : unicité d'attente + décision transactionnelle qui applique réellement la zone (mutations.controller.ts:147-201).
5. **Sérialisation défendue** : stripSensitiveUserFields appliqué sur acteurs/findOne/findByPhone (sanitize-user.util.ts, users.service.ts:66,277) ; SEC-04 respecté sur la recherche (users.service.ts:337-343).
6. **A11y de base solide dans les listes/états** : role="status"/aria-live systématiques (16 occurrences relevées), sr-only labels (MesBrouillons.tsx:355-357), role="alert" sur erreurs (:318), autocomplete PIN corrects (IdentificateurPinChangeSection.tsx:313).
7. **Validation photo frontend rigoureuse** : MIME + taille avant/après compression, revoke d'objectURL systématique (FicheIdentificationDynamique.tsx:1082-1149).

## 6. Recommandations de correction

1. **IDENTIFICATEUR-01** : retirer statut de allowedFields pour le propriétaire non-admin ; transitions réservées aux rôles BO avec permission enrolement.validate ; machine à états (brouillon→en_attente→approuve/rejete/complement) côté service.
2. **IDENTIFICATEUR-02** : exiger le PIN (header x-pin-verified signé à courte durée ou re-vérif. serveur) dans PATCH /users/:id et PATCH /acteurs/:id quand isIdentificateur && !isOwner ; le verrou devient alors réellement la condition de l'arbitrage 4 chiffres.
3. **IDENTIFICATEUR-03** : allow-list d'extensions (jpg/jpeg/png/webp), normalisation path.extname, ParseUUIDPipe sur :id, magic-byte check, stockage hors racine web + livraison signée.
4. **IDENTIFICATEUR-04** : ne stocker en sessionStorage qu'un ID de reprise + champs non-sensibles ; chiffrer form_data/documents (ou déplacer photo/signature en fichiers servis en accès contrôlé) ; purger complement_dossier après usage ; réutiliser masquerTelephone dans les listes du rôle.
5. **IDENTIFICATEUR-05** : @Roles('identificateur','operateur_terrain','super_admin',...) + throttle dédié + log d'accès NNI masqué (qui/quand/succès).
6. **IDENTIFICATEUR-06** : aligner lecture sur écriture : soit 404/403 hors zone pour GET /users/:id, by-phone, search ; soit un DTO réduit hors zone (id, nom, rôle seulement) — plus journal d'« consultation hors zone ».
7. **IDENTIFICATEUR-07** : passer create-acteur sur le modèle P0.0 (secret aléatoire + EN_ATTENTE_ACTIVATION + code) ou l'interdire aux rôles terrain ; supprimer le retour de jetons de signup() quand l'appelant ≠ l'utilisateur créé.
8. **IDENTIFICATEUR-08** : @Roles('identificateur','operateur_terrain','super_admin','admin_general') sur create-with-acteur ; masquer téléphone/id dans les logs (:458,470) et auth (:200,267,305) via masquerTelephone ; retirer @SkipThrottle du contrôleur.
9. **IDENTIFICATEUR-09** : JwtAuthGuard sur admin-divisions (référentiel public au sens métier ≠ public au sens HTTP) ; rate-limit reverse-geocode.
10. **IDENTIFICATEUR-10** : câbler onMicClick + TantieSagesseModal dans IdentificateurLayout (ou masquer le bouton tant que non branché) ; dictation/lecture vocale du code d'activation (clip existant ou TTS) sur l'écran de remise.
11. **IDENTIFICATEUR-11** : brouillon local persistant (localStorage chiffré ou IndexedDB) + file d'attente offline avec rejeu idempotent (Idempotency-Key sur create-with-acteur), indicateur de statut réseau parlé.
12. **IDENTIFICATEUR-12** : enrichissement serveur (JOIN dans findAll ou endpoint batch /users?ids=) ; respecter/implémenter le filtre acteur_id ; passer le polling à 2-5 min ou WebSocket authentifié.
13. **IDENTIFICATEUR-13** : dédupliquer routes + fermer/supprimer IdentificateurProfil/Parametres vides ou les remplir ; intégrer ou retirer KpiModals.
14. **IDENTIFICATEUR-14** : migrer la modale PIN sur Radix Dialog ; étendre la charte fermée (modèle authCharte) à l'espace identificateur.
15. **IDENTIFICATEUR-15** : contrainte d'unicité NNI (partielle si nullable) + vérif. serveur de doublons avant création ; renvoyer un objet minimal sur by-phone.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth | login identificateur, verrou 3-6-9, EN_ATTENTE_ACTIVATION non loginable | conforme verrou-pin.ts ; aucun login avant activation |
| Activation P0.0 | code reçu sur écran de remise, expiré à 30 min, rejeu refusé | 2e usage = Unauthorized ; compte inerte avant |
| Autorisation | API directe sans rôle (marchande) sur identifications/create-with-acteur, oneci, create-acteur | 403 après correctifs 05/08/07 |
| Workflow | PATCH statut par le propriétaire du dossier | refus (sauf admin) après IDENTIFICATEUR-01 |
| Zone | GET users/dossiers hors zone en lecture | 403 ou DTO réduit, jamais PII complète |
| PIN | PATCH fiche acteur avec session ouverte sans PIN | refus serveur (IDENTIFICATEUR-02) |
| Upload | fichier photo.php en image/jpeg, UUID invalide | rejet 400, rien écrit sous /uploads |
| PII | sessionStorage après saisie fiche ; logs backend pendant enrôlement | aucun NIN/CNPS/photo/téléphone en clair |
| Voix | écran de remise du code, parcours complet sans lecture | information clé audible (Tata/clips) |
| Offline | avion en cours de saisie puis réseau rétabli | brouillon conservé, soumission unique (pas de doublon) |
| Mutation | 2e demande en attente ; décision admin → zone réellement changée | 400 puis users.zone_id = zone demandée (1 transaction) |
| A11y | Tab dans modale PIN ; bouton Tantie identificateur | focus piégé ; action observable (ou bouton absent) |

## 8. Tests critiques recommandés

1. **Fail-closed rôles** : JWT marchande sur POST /identifications/create-with-acteur, POST /auth/create-acteur, GET /oneci/lookup/:nni → 403 (après corrections).
2. **Self-approval** : PATCH identifications/:id {statut:'approuve'} par le propriétaire → 403 + aucun SMS émis.
3. **PIN serveur** : PATCH /users/:id (acteur en zone) sans vérification PIN préalable → 403 ; avec verrou actif → refus au-delà du palier.
4. **Activation** : usage double du code, code expiré, code du mauvais format, PIN 0000/1234 refusés ; après activation, login OK.
5. **Zone** : identificateur zone A sur acteur zone B : GET (par id, by-phone, search) et PATCH → refus/DTO réduit ; acteur sans zone → Forbidden (déjà fail-closed, à verrouiller par test).
6. **Upload** : x.php/x.html en MIME image, %2F dans id, GIF de 6 Mo → tous rejets ; nom final toujours .jpg/.png/.webp.
7. **Rejeu offline** : 2 soumissions identiques (réseau rétabli) → 1 seul acteur + 1 seul dossier (clé d'idempotence).
8. **PII** : grep des logs backend après un enrôlement complet → aucun téléphone/NNI en clair ; sessionStorage sans nin, numCNPS, photo, signature.
9. **Verrou PIN identificateur** : 3 échecs → 5 min, 6 → 15 min, 9 → 1 h ; réussite remet à zéro ; logout/relogin ne réinitialise pas.
10. **Mutations** : double décision concurrente → une seule réussit (update WHERE statut='en_attente', déjà codé — à tester en parallèle).

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | IDENTIFICATEUR-01 : machine à états statut serveur, transitions admin-only | M |
| P1 | IDENTIFICATEUR-02 : enforcement PIN serveur sur écritures fiches | M |
| P1 | IDENTIFICATEUR-03 : durcir upload photo (ext, UUID, magic bytes, stockage) | S |
| P1 | IDENTIFICATEUR-04 : retirer PII de sessionStorage + chiffrer form_data/documents | L |
| P1 | IDENTIFICATEUR-05 : rôles + journal sur ONECI lookup | S |
| P1 | IDENTIFICATEUR-06 : aligner lecture sur zone (403 ou DTO réduit) | M |
| P2 | IDENTIFICATEUR-07/08 : aligner create-acteur sur P0.0 ; rôles + masquage logs + throttle | M |
| P2 | IDENTIFICATEUR-09 : auth sur admin-divisions | S |
| P2 | IDENTIFICATEUR-10/11 : brancher Tata + brouillon offline terrain | M |
| P2 | IDENTIFICATEUR-12 : tuer le N+1 (batch/JOIN) + filtre acteur_id serveur | S |
| P3 | IDENTIFICATEUR-13/14/15 : dédoublonnage routes, Radix + charte, unicité NNI | S/M |

## 10. Scores proposés

| Dimension | Score | Justification condensée |
|---|---|---|
| Sécurité | 62/100 | Allow-list signup + P0.0 terrain excellents ; mais self-approval statut, PIN non appliqué serveur, upload fragile, oneci sans rôle |
| PII | 55/100 | Collecte justifiée et masquage disponible, mais sessionStorage/JSONB en clair, téléphone dans les logs, lecture nationale flag-only |
| A11y | 60/100 | ARIA/états/live réguliers ; voix absente du parcours + bouton mort, offline absent, modale non-Radix |
| Qualité | 66/100 | Commentaires de décision remarquables, transactionnalité soignée ; 5 753 l. monolithe, N+1, routes dupliquées |
| **Global** | **61/100** | Au seuil PROD (60) mais **sans marge** : les 6 P1 conditionnent la mise en enrôlement réel de masse |

## 11. Conclusion + statut

L'espace **Identificateur** est le point de création de tous les comptes acteurs et concentre la PII la plus forte du produit (NNI/CNI/CNPS/CMU/photo/signature). Les fondations critiques sont réelles et bien documentées : allow-list de rôles fail-closed (auth.service.ts:53-73), activation P0.0 conforme à usage unique (TTL 30 min, consommation atomique, aucun secret par défaut sur la voie terrain), verrou PIN à échelle non contournable, IDOR propre sur les dossiers. En revanche, l'audit révèle des **trous d'autorisation côté serveur** (self-approval de statut, PIN décoratif sur les écritures, ONECI sans rôle, lecture nationale masquée par un drapeau), une **fuite structurelle de PII** (sessionStorage + JSONB en clair + téléphone dans les logs), un **upload de photo durci de moitié**, et un écart assumé de fait avec la doctrine voice-first (bouton Tata rendu mais mort, remise du code 100 % visuelle).

Les trois constats de l'audit du 2026-09-28 restent **valables** : contrôle de zone (confirmé, précisé en IDENTIFICATEUR-06), performance suivi (confirmé et chiffré, IDENTIFICATEUR-12), auth WS (le rôle reste en polling 30 s sans WebSocket authentifié — IDENTIFICATEUR-12). Cet audit dote par ailleurs le rôle de constats avec preuve fichier:ligne qui manquaient au précédent.

**Statut de l'audit : AUDIT STATIQUE + SONDAGE RUNTIME TERMINÉ — 6 P1 à corriger avant enrôlement réel à grande échelle.**

Sondes runtime exécutées (lecture seule) : GET /identifications sans token → 401 ; GET /oneci/lookup/... sans token → 401 ; GET /admin-divisions/districts sans token → **200 public** (anomalie) ; POST /auth/login (Awa Koné) → 400/401 (contrat phone/password, pas motDePasse) puis **429** après 3 essais = throttler actif. Aucune écriture, aucune modification de fichier.
