# CHANGELOG.md — JULABA

> Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
> Adjonction du système multi-agents le 2026-09-28.


### Ajouté — Audit UX marchand/producteur/vente vocale + lots UX-7 « La voix dit vrai » et UX-8 « Argent marchand sous la garde » (2026-10-07, 2ᵉ session)
Sur demande utilisateur (« améliorer l'UX marchand et producteur, meilleur UX pour la vente vocale ») — audit re-état puis exécution :
- **Audit** : `docs/audit/AUDIT-UX-MARCHAND-PRODUCTEUR-VOIX-2026-10-07.md` — 3 explorations parallèles (marchand, producteur, vente vocale), re-état des constats du 06/10 (la majorité corrigée, preuves `dev@5e773ae`), carte du pipeline voix, frictions F-V1..F-V7, plan UX-7..UX-10, 5 décisions à trancher (Patrick). Faux positif documenté : « erreur de syntaxe TantieSagesseModal:73 » = artefact de transport `[m` avalé à l'affichage (vérifié grep-pattern + tsc vert).
- **UX-7 (voix)** : T7 caisse — l'échec générique d'encaissement S'ÉCRIT (`e780436`) ; T7 marchand — MesCommandes/DepenseForm/hors-ligne s'écrivent (`4ab3452`) ; Tontines — trois situations trois phrases + Réessayer (`14662b9`) ; T7 producteur — plus aucun message serveur brut ni UUID dictés, `messageUtilisateur` + toasts appariés (`eba2380`) ; ARG-17 — montants dictés en toutes lettres (`nombreEnMotsFr`, `1f44736`) ; encaissement producteur — même phrase dit/écrite + triple canal vibrerSucces/vibrerErreur (`5a56cb3`) ; le muet §8.1 devient lisible — réglage « Voix coupée » dans les Paramètres (`48b868f`)
- **UX-8 (argent marchand)** : MarchéVirtuel — verrou synchrone anti double-tap (commandes dupliquées impossibles, BUG-011) + PIN honnête (« Confirmer la commande ») + fermeture refusée pendant l'envoi (`968c454`) ; TransfertPage — recherche destinataire trois situations (404 ≠ panne ≠ hors ligne + Réessayer, M-P1-1) + échec d'envoi dit et écrit (`56c0293`) ; PIN conditionnel dans la relecture — **M-P0-3 COMPLET** (`34f8c0a`)
- Vérifications : `tsc -b` front 0, `tsc --noEmit` back 0, `test:charte-marchande` EXIT 0, `test:ci` EXIT 0 (622 assertions vertes, 0 croix), `test:parole-entree` EXIT 0, `test-voix-trace-source` = EXACTEMENT les 4 rouges héritées connues (0 nouveau — AppContext reste verte), garde-argent = EXACTEMENT les 3 refus attendus (re-gel humain Patrick en attente)
## [Non publié]

### Ajouté — Primitives d'argent maison T8 (2026-10-07)
Suite des corrections de l'audit UX (REVIEW-001, actions R1-2..R1-5) — les deux primitives obligatoires pour tout mouvement d'argent existent désormais UNE fois et sont inévitables pour les nouveaux parcours :
- **`RelectureArgent`** (`components/argent/`) : l'écran de relecture sur Radix Dialog (focus trap, ESC, AUTH-05) — relecture **dite et affichée depuis la même source** (montant nombre → « FCFA » à l'écran, « francs » à la voix, ARG-17), **vibration d'attente** (90 ms, motif maison POSCaisse) pendant l'envoi, fermeture refusée tant que l'irréversible est en vol, verrou synchrone conservé chez l'appelant. Migrée dans TransfertPage (transfert keiwa) et MaCooperative (cotisation)
- **`PinArgent`** (`components/argent/`) : le champ PIN 4 chiffres (contrôlé, erreur `role="alert"`) — la vérification `/auth/pin/verify` reste chez l'appelant, avant le POST d'argent
- **Triple canal complété** : `vibrerSucces()`/`vibrerErreur()` ajoutés aux issues du transfert et de la cotisation (haptique.ts)
- **TransfertPage 562 → 499 lignes** (R1-2) : `genererCleIdempotence` extraite vers `utils/idempotence.ts` (contrat réutilisable), catalogue des moyens vers `methodsTransfert.ts` ; **MaCooperative 440 → 382 lignes**
- MarcheVirtuel garde son modal PIN historique (`montantsMasqués` + `speakSilent`) — migration tracée comme lot à part
- Vérifications : `tsc -b` 0, charte EXIT 0, `test:ci` EXIT 0 (622 assertions vertes, 0 croix), `test:parole-entree` EXIT 0, `test-voix-trace-source` = les 4 rouges hérités (0 nouveau), garde-argent = les 3 refus attendus



### Corrigé — Corrections des revues (2026-10-07)
Exécution des corrections restantes des REVIEW-001/002/003, sur ordre explicite de l'utilisateur (« Continues les corrections ») — hors re-gel humain (Patrick) et hors chaîne `test:ci` (gelée, décision humaine en attente) :
- **B3-3 fermé — suite de tests backend ressuscitée** : les majeures non prouvées sont retirées (`jest` ^30.5.2 → ^29.7.0, `@types/jest` ^30 → ^29.5.14, `@nestjs/swagger` ^12.0.2 → ^11.4.7 — backend ET racine, retour byte-identique à `dffe705` vérifié). Preuves : suite unitaire **33 suites / 251 tests EXIT 0**, `tsc --noEmit` 0, `nest build` EXIT 0, versions installées vérifiées (jest 29.7.0 / ts-jest 29.4.14 / swagger 11.4.7). Preuve nouvelle : l'upgrade swagger 12 était **irrésoluble** — `@nestjs/swagger@12.0.2` exige un peer `@nestjs/common@^12` contre common 11.2.6 (ERESOLVE npm) — la recette swagger 12 demandée en REVIEW-003/action 4 est morte-non-lieu : l'upgrade est retiré, pas prouvé. Les invariants (Postgres jetable) restent l'affaire de la CI (aucun Postgres dans le sandbox). Un maillon backend dans `test:ci` n'a PAS été ajouté : la chaîne est GELÉE (refus 2 du garde-argent, décision humaine en attente)
- **R1-1 fermé — le montant cotisation ne vit plus qu'à un endroit** : `COTISATION_MONTANT_LIBELLE` dérivé de `COTISATION_MONTANT` dans `MaCooperative.tsx` (bouton « Payer ma cotisation » + récap du modal) — rendu byte-identique prouvé (`25\u00A0000 FCFA`, insécables préservés) ; la promesse « une seule ligne à changer à la bascule API » tient désormais aussi pour l'affichage
- **R2-2 fermé — newline final `AppContext.tsx`** + fixture `parole-3917bb7.json` re-bénie PAR LE GARDE en liste blanche (seule l'empreinte `contexts/AppContext.tsx` change, les 3 divergences héritées restent volontairement rouges — diff fixture = 1 ligne)
- **R2-1 fermé par traçage — CODE-NEW-7** dans `DEBT_REPORT.md` : écrans orphelins `IdentificateurStats.tsx` + `IdentificateurDashboard.tsx` (orphelinat re-vérifié mécaniquement : 0 route, 0 import) — la suppression reste le geste de la fusion §8.5 définitive (producteur)
- Vérifications : `tsc -b` front 0, `tsc --noEmit` back 0, `test:charte-marchande` EXIT 0, `test:ci` EXIT 0 (622 assertions vertes, 0 croix), `test:parole-entree` EXIT 0, `test-voix-trace-source` = les 4 rouges hérités connus (0 nouveau), garde-argent = les 3 refus attendus (re-gel humain en attente), `npm run test:unit` backend 251/251



### Corrigé — Actions correctives REVIEW-003/REVIEW-004 (2026-10-06)
Exécution des actions demandées par la revue — hors re-gel humain (Patrick) et hors `backend/package.json` (B3-3, périmètre producteur) :
- **Verrou de schéma CI restauré** (REVIEW-004/B4-1) : `scripts/schema-pilote.mjs` et `scripts/check-nest-versions.mjs` revenus à l'état `dffe705` — `check:nest-versions` EXIT 0 (« @nestjs cohérent, major 11 »), l'appel de `.github/workflows/schema-pilote.yml` redevient valide
- **Gels garde-argent restaurés à `dffe705`** (REVIEW-003/Act-1, INC-001) : restauration de fichiers (pas un gel) — retour mécanique aux **3 refus attendus** (périmètre 55 sortis : chemins `frontend_src` morts du renommage `628ef4e` ; chaîne test:ci gelée, pré-existante ; empreinte : 131 gardes débranchées) — le re-gel avec `racinesScannees` → `frontend/src` reste le geste humain de Patrick
- **Gardes voix réécrites pour encoder les décisions nouvelles avec historique** (REVIEW-004/B4-2) : `paroleEntree.test.mts` §[7] encode désormais §8.1 (voix ouverte aux 3 rôles, muet = LA borne, l'ancien garde et sa trace ne reviennent pas en silence, décision consignée sur site) ; `test-voix-trace-source.mjs` A/C : refus muet = borne unique §8.1, Rapport de test = surface unique Paramètres (retrait `1c2f914` arbitré) ; fixture `parole-3917bb7.json` : seule l'entrée `contexts/AppContext.tsx` re-bénie (§8.1), les 3 divergences héritées (useVoiceCore, AppLayout, ObjectifContext) restent volontairement rouges
- **BUGS.md** : compteur réconcilié avec le contenu (8 bugs, 5 résolus, 3 ouverts) + BUG-006/007 réservés (REVIEW-004/Act-3)
- Vérifications : `tsc -b` 0, `tsc --noEmit` backend 0, `test:ci` 44 maillons EXIT 0, charte marchande verte, `test:parole-entree` vert, `test:voix-trace-source` = les 4 rouges hérités connus (0 nouveau), `test:maillons-orphelins` vert, `check:nest-versions` EXIT 0, garde-argent = les 3 refus attendus (re-gel humain en attente)


### Corrigé — Lots UX-2 « Voix pour tous » et UX-6 « IA/routing » (2026-10-06)
Suite du suivi de l'audit UX (même source que UX-1) — périmètre marchand/identificateur/transversal (l'agent UX producteur couvre le sien) :
- **Voix ouverte aux 3 rôles** (décision §8.1, T1 P0) : le garde `role !== 'marchand'` d'`AppContext.speak` est retiré — ~40 appels producteur reprennent vie, le bouton Tata ne meurt plus pour l'identificateur ; le muet utilisateur reste la borne
- **Parité Tata dans IdentificateurLayout** : `TantieSagesseModal` montée + `onMicClick` passé à Sidebar/BottomBar (comme AppLayout)
- **Porte keiwa marchand restaurée** (décision §8.3, M-P1-2) : tuile « Mon argent » de retour sur l'accueil vers `/marchand/keiwa` — porte unique, conforme au commentaire d'UniversalProfil ; l'historique (retrait Patrick 24/09, écran verrouillé muet) est consigné et supersedé dans le code
- **Routes identificateur** (T5/I-P1-4/I-P1-5) : `/identification` → `/fiche-identification`, `/acteurs` → `/identifications`, orphelines `/statistiques` et `/dashboard` → `/rapports` ; onglet « Suivi » ouvre enfin SuiviIdentifications (`/suivi`) ; titre d'écran « Acteurs » aligné sur l'onglet ; `useScoreJULABA` pointe la route canonique
- **BUG-005** : `/paiement/failed` affichait « Paiement effectué ✅ » (détection `includes('error')` seulement) — corrigé (`/error|failed/`)
- Vérifications : `tsc -b` 0, garde charte marchande vert, `test:ci` 44 maillons 0, garde-argent = les 3 refus attendus (gels humains en attente)
### Ajouté — Revue audit UX des trois rôles (2026-10-06)
- Revue du commit `060c333` et de `AUDIT-UX-ROLES-2026-10-06.md`.
- Lots UX-2/3/4/5/6 réconciliés dans `TASKS.md` : les corrections sont partielles et restent soumises aux validations QA, a11y, performance et Tech Lead.
 - Trois reliquats P1 enregistrés dans `BUGS.md` : mutations producteur hors ligne sans outbox (`BUG-008`), annulation producteur sans confirmation (`BUG-009`), revenu incluant les commandes non livrées (`BUG-010`).
- Un reliquat performance P2 est tracé : polling producteur sans suspension hors ligne (`PERF-007`).

### Corrigé — Lot UX-1 « Promesses d'argent » (2026-10-06)
Suivi de l'audit UX des 3 rôles (`docs/audit/AUDIT-UX-ROLES-2026-10-06.md`) — décisions §8 tranchées, lot UX-1 exécuté (BUG-001..004) :
- **Paiements services (Keiwa)** : plus de « Payer maintenant » sans backend — page masquée derrière `PAIEMENTS_SERVICES_ACTIFS`, porte retirée du wallet, route redirigée (BUG-001, `68149f2`)
- **Transfert keiwa** : relecture obligatoire « Tu envoies X à Y — tu confirms ? » + verrou synchrone anti double-tap (BUG-002, `f7e9544`)
- **Marché virtuel** : annonce « Commande passée — à régler à la livraison » au lieu de « Paiement effectué avec succès » (aucun mouvement wallet à la création, invariant B2) ; modal succès « Montant à régler / rien n'est encore débité » (BUG-003, `67f72ef`)
- **Cotisation coopérative (25 000 F)** : relecture + PIN conditionnel (`pinSecurityEnabled`, /auth/pin/verify) + verrou synchrone + erreurs affichées ET parlées (BUG-004, `41b6671`)
- Vérifications : `tsc -b` 0, garde charte marchande vert, `vite build` 0 (21,9 s), `test:ci` 44 maillons 0, garde-argent = les 3 refus attendus (gels humains en attente), aucun refus nouveau

### Ajouté — Système multi-agents (2026-09-28)
- Initialisation du dossier `.ai/` avec 30+ fichiers de pilotage
- Audit initial complet : backend (76/100), frontend (73/100), DevOps (68/100), sécurité (72/100), documentation (78/100)
- Premier audit global (`AUDIT-001`) : score 73/100 (autorisé pour PROD ≥ 60/100)
- Cartographie de l'architecture, des 361 endpoints API, du design system, du plan de test
- Synthèse du registre de dette existant (48 items OUVERTS, 0 P0)
- Plan de test E2E initial
- Guide d'accessibilité (WCAG 2.1 AA + voice-first)
- Budget performance (bundle 565/800 KB, Core Web Vitals à instrumenter)
- Workflows formalisés (7 phases + audit global périodique)

## [5.0.0] — Pilote 15/09/2026

### Ajouté
- APK Android pilote (Capacitor 8, compileSdk 36, debug-signed)
- Distribution via GitHub Releases (`pilote-latest` tag, retention 14 jrs)
- Voix offline native : sherpa-onnx STT zipformer2 FR (~71 Mo) + VITS-Piper TTS siwis CC-BY 4.0 (~79 Mo)
- 137 clips mp3 Tata Nanti Lou pré-cachés (~7 Mo)
- PWA complète (SW custom, manifest, IndexedDB)
- 5 flux Maestro mobile (jamais exécutés — écrits sans appareil)

### Modifié
- ADR-0003 : 6 arbitrages de Patrick sur unités/devise/stockabilité (2 appliqués, 1 partiel, 3 décidés différés)
- Doctrine voice-first (Patrick, 20/09/2026) : « La voix est une propriété du PARCOURS, pas de l'écran »
- 6 lots voix (A, B, B2, C, D, E) + 2 lots habillage (F, F2) livrés

### Sécurité
- ADR-002 : fin du takeover `0000` (code d'activation à usage unique, PIN choisi par la marchande)
- Verrou PIN modernisé : échelle d'attente (3→5min, 6→15min, 9+→1h, jamais définitif)
- Argent gelé pour Keiwa / B-Pay / mobile money (invariant `argent-gele-b2.spec.ts`)

### Architecture
- ADR-0001 : décrément de stock à la vente (cycle `disponible → réservation → conversion → livraison → annulation`)
- ADR-0002 : convergence schéma vers migrations reproductibles (étapes 1-3 réalisées, étape 4 en attente)
- Catalogue-maître : miroir Postgres du référentiel Odoo 19 (POC désactivé par défaut)
- Odoo gateway : allow-list lecture seule, bascule mock/real via `ODOO_CLIENT_MODE`

### Corrections
- 33 dettes FERMÉES (registre révision 20)
- SCHEMA-07 trouvé par `schema-pilote.yml` avant le terrain
- Incident 18/09/2026 : `caisse_transaction_status_enum already exists` → `DB_MIGRATIONS_RUN=false` en prod

## Historique antérieur

Voir `git log` pour le détail des 780 commits (780 commits au total, ~51% signés Claude, contributeurs : Claude 396 / PATRICK 198 / SOMET1010 132 / claude[bot] 35 / Pascal Somet 14 / ABOA AKOUN BERNARD 3).
