# AUDIT ACTEUR — IDENTIFICATEUR — 2026-10-19

> **Mission** : 2ᵉ vague d'audits statiques par acteur (rejouer les constats du 05/10 + constats comptables transverses C-12/D-05/C-14 + delta commits depuis le 05/10 + monéticité).
> **Périmètre** : front `frontend/src/app/components/identificateur/` (16 fichiers) + contexts `IdentificateurContext`/`ZoneContext`, routes `routes.tsx:163-191` ; back `backend/src/{identifications,oneci,mutations,user-flags,evaluations-rest,users,auth,admin-divisions}`.
> **Méthode** : relecture de première main sur l'arbre `/home/z/julaba-wt` (dev, HEAD `04ae652`), relocalisation de chaque preuve (`fichier:ligne` re-read le 19/10), `git log --since=2026-10-05`, AUCUNE sonde réseau, AUCUNE modification de code.
> **Auteur** : agent Z.ai Code — Task 45-c.

## 1. Identité et périmètre

- **Rôle** : `identificateur` — enrôlement terrain (dossiers d'identification, comptes acteurs, suivi, mutation). Rôle porteur de la PII la plus forte (NNI/CNI/CNPS/CMU/signature/photo).
- **Évolutions depuis le 05/10** (commits touchant le périmètre) :
  - `265062e` merge main (retours terrain PIE 07/10) + `7699927` routes canoniques identificateur (redirects, onglet Suivi) ;
  - `060c333` renforcement parcours identificateur/producteur (brouillon localStorage, a11y) ;
  - `e04fa73` retire bouton Rapport + Dev Mode, puis **`04ae652` (15/10) les RÉINSTALLE** : `ProfileSwitcher` dans `IdentificateurLayout.tsx:82` ; écran de connexion réécrit (LoginPassword version main, 180 l. modifiées) ;
  - Auth transverse : `75c869d`+`7b146b4` (design numéro + micro en bout de ligne) puis **défaits par `04ae652`** ; `a6a9eff` menu `<>` test rôles (retiré, orphelin) ; `f739a66`+`2b23bef` nettoyages.

### Évolutions depuis le 05/10 — verdict gating dev/prod
- `ProfileSwitcher` (Dev Mode) : **correctement gated** — `IdentificateurLayout.tsx:82` `{import.meta.env.DEV && <ProfileSwitcher/>}` ; double protection interne (`ProfileSwitcher.tsx:25` doc « MODE DEV UNIQUEMENT »). En build production Vite (`import.meta.env.DEV=false`) le widget n'existe pas dans le bundle.
- Bouton « 🐞 Rapport de test » de l'écran de connexion : **NON gated** — `LoginPassword.tsx:1531-1544` rendu inconditionnel (visible en prod pour tout utilisateur, dont l'identificateur, au login). Le bouton 🐞 de `AppLayout.tsx:172-192` (non gated aussi) ne touche PAS l'identificateur connecté (layout dédié).
- Menu `<>` de test des rôles (`a6a9eff`) : **retiré** par `04ae652` (0 import restant) ; le composant porte lui-même un garde `MenuRolesTest.tsx:57` `if (!import.meta.env.DEV) return null` — double barrière en cas de réimport accidentel.
- Impact sécurité de la réécriture LoginPassword : **aucun changement de comportement** — anti-énumération inchangée (front `LoginPassword.tsx:478` → serveur `auth.controller.ts:85-95` échéance uniforme + throttler login 5/min `:118-119`), miroir TEST_PHONES conservé (`:176`), verrou PIN côté serveur inchangé (`verrou-pin.ts`, échelle 3→5 min/6→15 min/9→1 h), verify-pin identificateur toujours serveur (`auth.controller.ts:507`).

## 2. Fonctionnalités observées dans le code

| Fonction | Où | Observation 19/10 |
|---|---|---|
| Fiche multi-étapes + brouillon | FicheIdentificationDynamique.tsx | Brouillon auto désormais en **localStorage** (:976-1017, « survit au redémarrage ») ; complement_dossier toujours sessionStorage (:843-858) |
| Création compte+dossier | identifications.controller.ts:295-365 | `create-with-acteur` : anti-injection de rôle explicite (:314-323), P0.0 secret aléatoire (:331), zone héritée (:325-329) ; **toujours sans @Roles sur l'appelant** |
| PATCH dossier | :485-577 | allowedFields **inclut `statut`** (:494-499) + SMS déclenchés (:525-566) |
| Suivi/listes | SuiviIdentifications, Identifications, IdentificateurContext | N+1 `/users/:id` par dossier (:163-165) + polling 30 s (:251-253) ; filtre `acteur_id` ignoré serveur (:93) |
| Lookup ONECI | oneci.controller.ts:4-12 | JwtAuthGuard seul, aucun @Roles |
| Routes Keiwa | routes.tsx:182-187 | 6 pages wallet montées sous /identificateur (nav masquée `hasKeiwa:false` roleConfig.ts:424) ; backend `wallets.controller.ts:15-16` JwtAuthGuard seul |
| PIN identificateur | auth.controller.ts:507, verrou-pin.ts | verify-pin serveur vivant ; côté front usage client-only (Fiche :1640-1663) |
| Voix | IdentificateurLayout.tsx:49/73/75-79 | Tata branchée (Sidebar+BottomBar→TantieSagesseModal) ; parcours d'enrôlement toujours muet (0 `parle()` dans les 16 fichiers) |

## 3. Constats détaillés

### IDENTIFICATEUR-01 [P1] — Auto-approbation du statut via PATCH — **TOUJOURS VALABLE (05/10 → 19/10)** (= C-12)
`identifications.controller.ts:485-508` : le propriétaire passe, et `allowedFields:494-499` inclut `statut` — un identificateur peut approuver/valider SON dossier par appel API direct ; déclenche les SMS :525-566. Aucune machine à états, aucune permission `enrolement.validate`, **aucun audit_logs** sur ce PATCH. Impact : commissions/statistiques faussées (C-12), contournement du circuit 24-48 h annoncé à l'écran.

### IDENTIFICATEUR-02 [P1] — PIN non appliqué serveur sur les écritures fiches — **TOUJOURS VALABLE**
`users.controller.ts:263-338` : PATCH /users/:id sans aucune vérification PIN (le verrou `verrou-pin.ts` ne voit jamais ces requêtes) ; la vérif. reste client-side (Fiche :1640-1663) et `ModalEditerActeur` n'en fait rien. Les champs PII (numCNPS, numCMU, dateNaissance, photoUrl) restent éditables par l'identificateur dans la liste `ALLOWED_FIELDS:315` sans PIN.

### IDENTIFICATEUR-03 [P1] — Upload photo : extension libre + chemin public — **TOUJOURS VALABLE**
`users.controller.ts:357-408` : MIME allow-list vivante (:387-390) MAIS extension dérivée du nom client (:392 `originalname.split('.').pop()`), pas d'allow-list d'extensions, pas de ParseUUIDPipe sur :id, écriture sous `/var/www/julaba/uploads/acteurs` (:396) servie publiquement (`julaba.online/uploads/...` :404).

### IDENTIFICATEUR-04 [P1] — PII en clair côté navigateur : **AGGRAVÉ** (sessionStorage → localStorage)
La fiche collecte toujours nin/CNPS/CMU/récépissé/signature (:904-932) ; le brouillon auto est passé à **localStorage** (:976 commentaire « localStorage survit au redémarrage de l'APK/WebView », :1017 écriture) : la PII persiste désormais indéfiniment (jusqu'à purge :1533) au lieu de mourir avec l'onglet. JSONB serveur sans chiffrement inchangé (`identification.entity.ts` form_data/documents). Gain UX réel, mais la fuite PII en clair s'étend dans le temps.

### IDENTIFICATEUR-05 [P1] — Registre ONECI ouvert à tout rôle — **TOUJOURS VALABLE**
`oneci.controller.ts:4-12` : JwtAuthGuard seul, aucun RolesGuard/@Roles, aucun journal d'accès NNI (service inchangé, NNI non validé :25). Rejoint INSTITUTION-01 (P0 comptable du rôle institution).

### IDENTIFICATEUR-06 [P1] — Zone décorative en lecture — **TOUJOURS VALABLE**
`users.controller.ts:61-69` (by-phone) et :250-258 (GET /users/:id) : profil complet renvoyé hors zone avec simple drapeau `horsZone` + « consultation uniquement ». Les ÉCRITURES restent fail-closed (:297-302 zone nulle/hors zone ⇒ Forbidden).

### IDENTIFICATEUR-07 [P2] — Voie `create-acteur` « 0000 » — **TOUJOURS VALABLE**
`auth.controller.ts:761-788` : identificateur admis (:763), mot de passe canonique par rôle (0000 acteurs) :778, jetons rendus à l'appelant ; mitigation `mustChangePassword` :783/:787 (bloque les routes, pas le login ni le changement de secret).

### IDENTIFICATEUR-08 [P2] — create-with-acteur sans rôle + PII logs — **PARTIELLEMENT CORRIGÉ**
Corrigé : anti-injection de rôle serveur (`:314-323` Forbidden si role hors marchand/producteur/cooperateur) + P0.0 (:331). Toujours valable : aucun @Roles sur l'appelant (`:295-296`), contrôleur `@SkipThrottle()` :21, logs PII vivants (`:458` Cleanup acteur orphelin, `:470` `acteurPhone` en clair).

### IDENTIFICATEUR-09 [P2] — admin-divisions public — **TOUJOURS VALABLE**
`admin-divisions.controller.ts:5` : aucun guard sur tout le contrôleur (GET référentiels + POST reverse-geocode :32 proxy anonyme).

### IDENTIFICATEUR-10 [P2] — Voix : **PARTIELLEMENT CORRIGÉ**
Corrigé : le bouton Tata est branché (`IdentificateurLayout.tsx:49/73` onMicClick → TantieSagesseModal :75-79, plus de no-op). Toujours valable : zéro `parle()`/clip dans les 16 fichiers du dossier — la remise du code d'activation reste 100 % visuelle (Fiche :2151 clipboard) contre la doctrine voice-first.

### IDENTIFICATEUR-11 [P2] — Offline terrain : **PARTIELLEMENT AMÉLIORÉ**
Le brouillon localStorage survit au redémarrage (progression réelle). Toujours absent : outbox/file de rejeu idempotente pour la soumission (POST `create-with-acteur` requiert le réseau), pas de clé d'Idempotency-Key, pas d'indicateur réseau dans le parcours (seul badge global du layout :52-64). Perte de saisie à la soumission toujours possible.

### IDENTIFICATEUR-12 [P2] — N+1 + polling 30 s + filtre ignoré — **TOUJOURS VALABLE**
`IdentificateurContext.tsx:163-165` (GET /users/:id par dossier), :251-253 (setInterval 30 000 ms) ; `identifications.controller.ts:93` ne lit que page/limit — `acteur_id` ignoré.

### IDENTIFICATEUR-13 [P3] — Routes/écrans fantômes : **PARTIELLEMENT CORRIGÉ**
Corrigé : routes canoniques + redirects (routes.tsx:166-188), KpiModals rebranché (`RapportsIdentificateur.tsx:32`). Reste : `IdentificateurProfil.tsx` (5 l.) et `IdentificateurParametres.tsx` (11 l.) coquilles routées ; `IdentificateurStats.tsx`/`IdentificateurDashboard.tsx` orphelins (dette CODE-NEW-7).

### IDENTIFICATEUR-14 [P3] — Modale PIN custom — **TOUJOURS VALABLE**
`IdentificateurPinChangeSection.tsx` : ESC (:98-102), aria-modal (:291), retour focus (:79) OK — pas de focus trap (Tab sort) ; couleurs en dur hors charte toujours présentes dans le dossier.

### IDENTIFICATEUR-15 [P3] — Anti-doublon « NNI/biométrie » inexistant — **TOUJOURS VALABLE**
Sonde by-phone renvoie le profil complet (:60-71) ; aucune unicité NNI côté backend ; l'écran de succès promet toujours un contrôle biométrique inexistant.

### IDENTIFICATEUR-16 [P2] — **NOUVEAU** — Surface Keiwa montée pour le rôle + backend wallets sans garde de rôle
`routes.tsx:182-187` monte 6 pages wallet sous /identificateur (atteignables par URL directe ; nav masquée roleConfig.ts:424) et `wallets.controller.ts:15-16` n'applique QUE JwtAuthGuard : recharge/retrait/transfert de SON wallet sont ouverts à tout rôle authentifié. Le rôle reste sans composant d'argent dans son dossier (monéticité du dossier confirmée) mais la « neutralité » est une convention de navigation, pas une protection serveur.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| IDENTIFICATEUR-01 | Self-approbation statut (C-12) | Autorisation/workflow | P1 | API directe PATCH statut |
| IDENTIFICATEUR-02 | PIN décoratif sur écritures PII | Auth secondaire | P1 | Session compromise |
| IDENTIFICATEUR-03 | Upload extension libre, path public | Sécurité applicative | P1 | POST multipart |
| IDENTIFICATEUR-04 | PII localStorage/JSONB en clair (aggravé) | Confidentialité | P1 | XSS / accès device |
| IDENTIFICATEUR-05 | ONECI ouvert à tout rôle | Autorisation/PII | P1 | JWT quelconque |
| IDENTIFICATEUR-06 | Lecture nationale (drapeau) | Autorisation | P1 | JWT identificateur |
| IDENTIFICATEUR-07 | Voie 0000 (create-acteur) | Takeover | P2 | API directe |
| IDENTIFICATEUR-08 | Pas de rôle appelant + logs PII | Autorisation/logs | P2 | JWT quelconque |
| IDENTIFICATEUR-09 | admin-divisions anonyme | Exposition surface | P2 | Sans auth |
| IDENTIFICATEUR-10 | Parcours d'enrôlement muet | Voice-first/A11y | P2 | Usage normal |
| IDENTIFICATEUR-11 | Soumission hors ligne impossible | Continuité | P2 | Perte réseau |
| IDENTIFICATEUR-12 | N+1 + polling + filtre ignoré | Performance | P2 | Volume dossiers |
| IDENTIFICATEUR-13 | Coquilles/orphelins résiduels | Qualité | P3 | Navigation |
| IDENTIFICATEUR-14 | Pas de focus trap / hex en dur | A11y/DS | P3 | Clavier |
| IDENTIFICATEUR-15 | Anti-doublon promis inexistant | Intégrité données | P3 | Enrôlement normal |
| IDENTIFICATEUR-16 | Keiwa monté + wallets sans garde | Argent/surface | P2 | URL directe |

## 5. Points forts

1. **Anti-injection de rôle serveur sur create-with-acteur** (`:314-323`) — rejet explicite avant toute création, en plus de l'allow-list signup (auth.service rolesCreablesPar inchangée).
2. **P0.0/ADR-002 toujours tenue sur la voie terrain** : secret aléatoire (:331), compte en_attente_activation, code à usage unique TTL 30 min (activation.service), écran de remise one-shot.
3. **Verrou PIN serveur intacts** : échelle 3-6-9 (`verrou-pin.ts`), verify-pin `auth.controller.ts:507`, jamais de rendu du code.
4. **IDOR propre sur les dossiers** : GET/PATCH/DELETE scoping identificateur_id (:126-137, :485-493, :579-593) ; DELETE réservé super_admin :605-611.
5. **Écran de connexion durci et inchangé fonctionnellement** : anti-énumération à échéance uniforme (auth.controller.ts:85-95), login 5/min (:118), miroir TEST_PHONES gardé (`test:enum-check-phone`), verrou audible conservé.
6. **Routes canoniques + redirects** (7699927) et KpiModals rebranché — dette de navigation réduite.
7. **Tata vivante** dans le shell identificateur (IdentificateurLayout.tsx:49-79) — progrès a11y depuis le 05/10.

## 6. Recommandations de correction

1. **01/C-12** : retirer `statut` de allowedFields pour le propriétaire ; machine à états serveur (brouillon→en_attente→approuve/rejete/complement) réservée aux rôles BO + `exigerPermissionBO('enrolement.validate')` + audit_logs dans la même transaction.
2. **02** : exiger le PIN serveur (header signé court ou re-vérif.) sur PATCH /users/:id quand `isIdentificateur && !isOwner`.
3. **03** : allow-list d'extensions + `path.extname` normalisé + ParseUUIDPipe + magic bytes + stockage hors racine web.
4. **04** : ne garder en localStorage qu'un ID de reprise + champs non sensibles (ou chiffrement local) ; chiffrer form_data/documents serveur ; purger complement_dossier.
5. **05/INSTITUTION-01** : @Roles + throttle dédié + journal d'accès NNI sur /oneci/*.
6. **06** : DTO réduit hors zone (ou 403) sur by-phone et GET /users/:id.
7. **07** : aligner create-acteur sur P0.0 ou le fermer aux rôles terrain.
8. **08** : @Roles sur create-with-acteur + masquer téléphone dans les logs (:458/:470) + retirer @SkipThrottle du contrôleur.
9. **09** : JwtAuthGuard sur admin-divisions + throttle reverse-geocode.
10. **10/11** : clip vocal de remise du code ; outbox idempotente (Idempotency-Key) pour la soumission terrain.
11. **12** : enrichissement serveur (JOIN) ou batch ; implémenter acteur_id ; polling → WebSocket authentifié.
12. **16** : décision d'architecture : @Roles('marchand','producteur','cooperateur') sur wallets.controller ou retirer les routes keiwa des espaces non monétiques.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth | login, verrou 3-6-9, EN_ATTENTE_ACTIVATION | conforme verrou-pin ; 429 observé au-delà de 5/min |
| Activation P0.0 | code one-shot 30 min, rejeu refusé | 2ᵉ usage = Unauthorized |
| Workflow | PATCH statut par le propriétaire | refus après correctif 01 (aujourd'hui PASSANT = anomalie) |
| PIN | PATCH fiche acteur sans PIN | refus serveur |
| Upload | photo.php en image/jpeg, %2F, 6 Mo | rejet 400, rien sous /uploads |
| PII | localStorage après saisie ; logs backend | aucun NIN/CNPS/téléphone en clair |
| Zone | lecture hors zone | DTO réduit ou 403 |
| Voix | remise du code sans lecture | information audible |
| Offline | coupure pendant soumission | brouillon conservé + soumission unique (idempotence) |
| Gating prod | build VITE_ production | ni ProfileSwitcher ni menu <> ; « Rapport de test » login = décision à trancher |
| Argent | POST /wallets/me/transfert avec JWT identificateur | décision assumée : 403 (correctif 16) ou documenté |

## 8. Tests critiques recommandés

1. PATCH identifications/:id {statut:'approuve'} par le propriétaire → 403 + aucun SMS (rouge aujourd'hui).
2. JWT marchande sur create-with-acteur / oneci lookup → 403.
3. PATCH /users/:id sans verify-pin → 403 (rouge aujourd'hui).
4. Upload x.php/x.html en MIME image → rejet + nom final .jpg/.png/.webp.
5. Grep logs backend après enrôlement complet → aucun téléphone/NNI clair (rouge aujourd'hui :470).
6. Rejeu offline : 2 soumissions identiques → 1 acteur + 1 dossier (idempotence, absente).
7. Verrou 3-6-9 : 3 échecs→5 min, 9→1 h, logout ne réinitialise pas.
8. Garde CI anti-littéraux + garde `import.meta.env.DEV` sur tout outil de recette (empêcher le retour non gated du bouton Rapport).

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | 01/C-12 : machine à états statut + permission serveur + audit | M |
| P1 | 02 : PIN serveur sur écritures fiches | M |
| P1 | 03 : durcir upload (ext/UUID/magic bytes) | S |
| P1 | 04 : retirer PII du localStorage + chiffrer JSONB | L |
| P1 | 05 : rôles+journal ONECI (partagé avec INSTITUTION-01) | S |
| P1 | 06 : lecture alignée zone | M |
| P2 | 07/08/09 : create-acteur P0.0 ; rôles+logs+throttle ; auth admin-divisions | M |
| P2 | 10/11 : clip vocal remise code ; outbox offline | M |
| P2 | 12/16 : tuer N+1 ; cadrer surface Keiwa/wallets | S/M |
| P3 | 13/14/15 : orphelins, Radix+charte, unicité NNI | S/M |

## 10. Scores proposés

| Dimension | Score | Justification condensée |
|---|---|---|
| Sécurité | 62/100 | Anti-injection de rôle + P0.0 + verrou intacts ; mais self-approval (01), PIN décoratif (02), upload (03), ONECI (05) inchangés |
| Argent/intégrité | 64/100 | 0 composant d'argent dans le dossier ; commissions faussées par 01 ; surface Keiwa/wallets non cadrée (16) |
| Accessibilité | 62/100 | Tata branchée, aria/sr-only solides ; parcours muet, modale sans trap, offline partiel |
| Voice-first | 45/100 | Shell vocal vivant mais parcours métier (remise de code) 100 % visuel |
| Qualité | 69/100 | Routes canoniques, KpiModals rebranché ; N+1, orphelins résiduels, monolithe 5 753 l. |
| **Global** | **61/100** | Au seuil PROD sans marge ; les P1 conditionnent l'enrôlement réel |

## 11. Conclusion + statut

Sur 15 constats du 05/10 : **10 toujours valables** (01,02,03,05,06,07,08-partiel,09,12,14,15), **3 partiellement corrigés** (08 anti-injection, 10 Tata, 11 brouillon persistant, 13 routes), **1 aggravé** (04 : PII migrée de sessionStorage vers localStorage — persistance accrue). Le constat comptable C-12 (self-approbation) est **re-confirmé ligne en main**. Nouveau constat 16 : la neutralité monétique du rôle est une convention d'UI (nav masquée), pas un contrôle serveur — wallets.controller reste ouvert à tout authentifié. Le delta auth (04ae652) n'a **aucun effet de sécurité** : anti-énumération, throttler et verrou PIN inchangés ; en revanche l'outil de recette « Rapport de test » est revenu **sans gating** sur l'écran de connexion partagé. Aucun élément Dev Mode ne fuit en production (double gating vérifié), seul le bouton Rapport exige une décision (à gated ou à assumer).

**Statut : CONFORME SOUS CONDITIONS — enrôlement réel à grande échelle conditionné aux 6 P1 (inchangés depuis le 05/10), dont C-12 re-prouvé le 19/10.**
