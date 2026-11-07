# STATUS — JULABA

**Source de vérité de la passation.** Mise à jour à chaque étape franchie et
avant toute fin de session.

> Décision de Patrick (07/10/2026, point 7) : **ce fichier fait foi**. `docs/PASSATION.md`
> et `docs/JOURNAL.md` sont archivés (bandeau en tête, plus mis à jour) et renvoient ici.

| | |
|---|---|
| relevé | **07/11/2026** |
| branche par défaut | `main` |
| branche en cours | `dev` |
| dernier commit | `34ba9c24` — docs(worklog): voix-eventualites-06-11 |
| dernier lot applicatif | 2 `feat` voix du 06/11 (ordre Patrick : « la voix pour toutes les éventualités ») : 24 clips embarqués sur les textes EXACTS des trois flux (produit, dépense, caisse) + registre régénéré (`56a677d8`), le chemin AppContext.speak consulte l'index des clips (`1b1e5658`) — à la suite des 3 `feat` des deux portes du matin (`cd51a5f8`, `42fe5d10`, `50f2013d`) et des 3 `fix` voix du terrain (`27127245`, `dc20365d`, `4b568139`) |
| dépôt | `SOMET1010/julaba-app` |

---

## Session 07/11 — portes vocales, ajout produit et corrections de relecture

**Livrable en cours** : alignement des deux parcours vocaux sur l’aperçu
non-prod en réutilisant les parcours existants, puis sécurisation des cycles
final/interim, de la parole de confirmation et des annulations. La maquette
`frontend/apercu-accueil-voix/` reste non suivie et inchangée. Aucun commit,
push ni déploiement.

| Critère (DoD) | Statut | Preuve |
|---|---|---|
| « Ouvrir ma caisse » disponible au bon état, par voix depuis l’accueil | ✅ ciblé | `MarchandAccueilVoice.tsx`, `test:commandes-accueil`, `test:accueil-cable` |
| Question exacte et relecture catalogue/parlée; seul un oui compris ouvre la caisse | ✅ ciblé | `OuvertureCaisseVoix.tsx`, `BoutonDirePrix.tsx`, `test:accueil-cable`, `test:clips-embarques` |
| Interim distinct de la validation; un seul montant final après arrêt du micro | ✅ ciblé | cycle pur `montantDit.ts`; `test:montant-dit` couvre interim/final/annulation; `test:accueil-cable` |
| Double démarrage et annulation pendant les awaits (prix/nom) | ✅ corrigé | verrou synchrone et jeton de session dans `sessionAsyncExclusive.ts`, `BoutonDirePrix.tsx`, `BoutonDireNom.tsx`; tests comportementaux dans `test:accueil-cable` |
| Échec de parole de confirmation ou rejet de `openDay` : aucune fausse confirmation; reprise sans double écriture | ✅ corrigé | `tentativeOuverture.ts`, `OuvertureCaisseVoix.tsx`, clé catalogue `CAI_OUVERTURE_ECHEC`; test comportemental dans `test:accueil-cable` |
| X/démontage des dictées prix et nom n’expédient ni ne conservent de session obsolète | ✅ corrigé | annulation immédiate du jeton et capture locale dans `BoutonDirePrix.tsx` et `BoutonDireNom.tsx`; `test:montant-dit`, `test:accueil-cable` |
| Écoute sans texte; annulation de confirmation sans écriture | ✅ ciblé | `EcranEcoutePleinEcran.tsx`, garde `test:accueil-cable` |
| Ajout vocal routé au guide graphique existant; unité re-demandée pour chaque opération, même produit existant | ✅ ciblé | `GestionStock.tsx`, `AjoutProduitGuide.tsx`, `premierProduit.ts`; `test:premier-produit`, `test:produit-dit`, `test:parcours-guide-parle`, `test:accueil-cable` |
| `test:commandes-accueil` et `test:accueil-cable` rattachés à `verify`; `test:ci` inchangé | ✅ | `frontend/scripts/maillons-verify.json`, `test:maillons-orphelins`; `frontend/package.json` non modifié |
| Typecheck et build frontend | ✅ | `npm run typecheck`, `npm run build` verts |
| Chaîne `verify` sans rouge nouveau | ⚠️ non conforme | dernière exécution : 159/168 verts; 1 🟠 connu (`test:garde-argent`) et 8 ❌ non résolus, hors périmètre (`test:jargon`, `test:enum-check-phone`, `test:warn-dev`, `test:voix-trace`, `test:voix-trace-source`, `test:i18n-source`, `test:i18n-empreintes-argent`, `test:micro-niveau-parole`); aucun n’a été modifié dans ce lot |
| Écoute au micro web/APK et recette terrain | ⬜ | non exécutées; couverture ciblée de source/pure seulement |

**Relecture des bloqueurs (07/11)** : les doubles appels sont verrouillés dès
l’entrée dans la fonction, avant le premier `await`. Chaque session invalide
ses callbacks et ne peut libérer ni remplacer la session suivante; X et
démontage arrêtent également une capture dont le démarrage est encore pendant.
Un rejet de l’ouverture garde le montant confirmé, annonce l’échec via le
catalogue, puis réarme la confirmation vocale et tactile après la parole. La
tentative ignore les appels simultanés et n’autorise un nouvel essai qu’après
rejet; un succès la ferme. Les tests comportementaux ont été ajoutés au maillon
existant `test:accueil-cable`, déjà inscrit dans
`frontend/scripts/maillons-verify.json`; aucun maillon ajouté et `test:ci` reste
inchangé.

**Preuves de relecture (07/11)** : `test:accueil-cable`,
`test:montant-dit`, `test:produit-dit`, `typecheck` et `build` passent.
`npm run verify --workspace frontend` termine à 159/168 (1 🟠 et 8 ❌ hors
périmètre détaillés ci-dessus); le lot ne corrige aucun de ces rouges. Le
micro web/APK et la recette terrain restent non exécutés.

### Seconde relecture — bloqueurs de confirmation et parcours comportemental

La reprise après rejet de `openDay` vérifie maintenant le résultat booléen de
`paroleConfirmationTerminee`. Si le TTS d’erreur échoue, l’état reste non
confirmé : aucun écouteur oui/non ne démarre et `paroleRef` interdit une autre
écriture. L’écran affiche l’échec et propose « Réessayer la parole » ou « Plus
tard ». Un test React/JSDOM avec les composants réels couvre le rejet de
`openDay`, le TTS de reprise en échec puis réussi, l’absence d’écriture avant
un nouveau oui, et les annulations durant `getUserMedia` et la résolution de
`demarrerCaptureVocale`.

Le nouveau maillon `test:ouverture-caisse-react` est inscrit dans
`frontend/scripts/maillons-verify.json`; `test:ci` n’a pas été modifié.
Validations exécutées : `npm run test:ouverture-caisse-react --workspace
frontend`, `npm run test:accueil-cable --workspace frontend`, `npm run
test:montant-dit --workspace frontend`, `npm run test:maillons-orphelins
--workspace frontend`, `npm run typecheck --workspace frontend` et `npm run
build --workspace frontend` passent. La dernière chaîne
`npm run verify --workspace frontend` sort **1** : 160/169 verts, 1 🟠 connu
(`test:garde-argent`) et 8 ❌ déjà signalés, sans rouge nouveau :
`test:jargon`, `test:enum-check-phone`, `test:warn-dev`, `test:voix-trace`,
`test:voix-trace-source`, `test:i18n-source`,
`test:i18n-empreintes-argent`, `test:micro-niveau-parole`.
Une commande `npm run build` lancée initialement à la racine a aussi exécuté
le build du workspace backend; elle s’est terminée sans erreur et aucun fichier
backend n’a été modifié. Les validations finales ont été relancées sur le seul
workspace frontend. Deux premières commandes de tests appelées sans
`--workspace frontend` ont retourné `Missing script`; les lancements workspace
corrects cités ci-dessus passent.

`npm run check` reste rouge sur l’échec backend préexistant
`backend/test/unit/pin-jamais-journalise.spec.ts:145` / `auth.controller.ts:138`;
il n’a pas été relancé ni corrigé, hors périmètre.
Aucun fichier gelé, backend, `Caddyfile` ou base distante touché.

---

## Session 06/11 — fiabiliser trois commandes vocales

**Livrable en cours** : entrée au démarrage, dictée de l’unité d’un produit et
enregistrement vocal d’une dépense. Aucun changement backend, aucun commit,
push ou déploiement.

| Critère (DoD) | Statut | Preuve |
|---|---|---|
| « Dis oui pour entrer » et variantes reconnues sans faire passer un refus pour un oui | ✅ code | `test:commandes-entree` |
| La question de l’unité est dite une fois et le micro l’écoute | ✅ code | `test:parcours-guide-parle`, `test:unite-dite` |
| Une dépense dite avec motif et montant rejoint la confirmation existante et conserve son motif à l’enregistrement | ✅ code | `test:depense-vocale`, garde positive/nulle/négative, vente exclue |
| Capture Web/Sherpa mutualisée sans modifier les règles métier des six parcours | ✅ code | `captureVocale.ts`; gardes produit, nom, prix, unité, quantité et dépense |
| Rendu du bouton dépense validé | ✅ | capture `docs/parcours/captures/bouton-depense-etats.png` |
| Typage et build de production frontend | ✅ | `typecheck` et `build` terminés sans erreur |
| Vérification frontend complète sans nouveau rouge | ⚠️ | 158/166 verts; rouge connu `test:garde-argent` (référence signalée 4 entrés / 14 perdues); 7 rouges hors diff : `jargon`, `enum-check-phone`, `warn-dev`, `voix-trace`, `voix-trace-source`, `i18n-source`, `micro-niveau-parole` |
| `npm run check` | ❌ bloqueur de push | 1 test backend échoue : `backend/test/unit/pin-jamais-journalise.spec.ts:145` (préexistant, hors diff; non corrigé dans ce lot) |
| Écoute au micro web et APK, puis recette sur preview déployée | ⬜ | non exécutées; aucune preview disponible |

La relecture `relecteur` a demandé, avant tout push, une orchestration commune
Web/Sherpa, l’alignement du bouton sur le design system et l’inventaire des
clés. Les messages sont catalogués et l’inventaire documente leurs clés. Une
fonction pure testée valide le type d’action et le montant. Patrick a autorisé
le refactor partagé. Le designer a validé le rendu repos/écoute/indisponibilité
(capture : `docs/parcours/captures/bouton-depense-etats.png`).

**État** : refactor terminé. Typecheck, build, `test:depense-vocale`,
`test:web-reco`, `test:micro-contraint` et les gardes des six parcours passent.
`test:maillons-orphelins` passe; le nouveau banc dépense est déclaré dans
`frontend/scripts/maillons-verify.json`, sans modification de `test:ci`.
Le bouton dépense est découpé en visuel, hook et contrôleur; le test confirme
que l’annulation Sherpa ne livre ni le final de `stop()` ni les résultats
tardifs. Le verrou de démarrage empêche les doubles ouvertures et les
notifications après démontage. Le relecteur confirme ces corrections.

**Bloqueurs avant push** : `npm run check` reste rouge sur
`backend/test/unit/pin-jamais-journalise.spec.ts:145`, hors diff; la vérification
frontend complète reste à 158/166 avec les 8 rouges détaillés ci-dessus.
L’écoute au micro réel (web et APK) et la recette sur preview restent à faire;
aucune preview n’est disponible. Aucun commit, push ni déploiement.

## Session 05/11 — alignement du domaine d’accès Azure de test

Domaine communiqué : `https://julaba-app.dev-dtdi.ansut.ci/`.

| Critère (DoD) | Statut | Preuve |
|---|---|---|
| Routes API, CORS, WebSocket, WebAuthn, B-Pay et QR alignées sur le domaine | ✅ code | Cibles mises à jour dans backend/front et `.env.production.example` |
| Tests WebAuthn et méthodes CORS | ✅ | Jest ciblé : 2 suites, 8 tests |
| Build frontend et backend + typecheck frontend | ✅ | `npm run build`, `npm run typecheck --workspace frontend` |
| Variables de l’instance Azure déployée mises à jour | ⬜ | Hors dépôt : à poser dans la configuration du backend Azure |
| Passkeys ré-enregistrées sur le nouveau RP ID | ⬜ | Nécessaire après changement de domaine |
| URLs de callback autorisées chez B-Pay et parcours paiement testés | ⬜ | À confirmer avant tout paiement réel |
| Nouvel enregistrement audio du clip `login-50.mp3` | ⬜ | Le clip existant prononce encore l’ancien domaine ; ne pas désynchroniser texte et audio |

Le `.env` local reste ignoré par Git. Le déploiement Azure et les paiements
n’ont pas été exécutés depuis cette session.

## ⚠️ LE FAIT QUI CHANGE LE CADRE : IL N'Y A AUCUNE PREVIEW

Établi par l'enquête du 05/10, trois preuves convergentes :

- `render.yaml` ne déclare **ni `previews:`, ni `previewsEnabled`, ni
  `pullRequestPreviewsEnabled`** (vérifié : 0 occurrence) ;
- `coordination/JULABA-STATUS.md` : « la recette par un agent web est
  **ABANDONNÉE** : elle exigeait une **preview Render**, donc de toucher au
  Blueprint, donc un chantier infra que **Patrick refuse à ce stade** (16/09) » ;
- `docs/etape4/RUNBOOK-BASCULE-MIGRATIONS.md` §3.1 : « ☐ Créer un **preview
  environment** sur Render » — **case non cochée**.

**Conséquences, et elles portent sur la méthode de travail :**

| | |
|---|---|
| pousser sur une branche ≠ `main` | **ne produit AUCUNE URL consultable** |
| pousser sur `main` | **déploie la PRODUCTION** — `autoDeploy: true`, et les deux URLs `onrender.com` *sont* la prod |
| il n'y a **pas d'étage intermédiaire** | ni preview, ni staging |

Donc, en l'état, **l'agent recette ne peut vérifier aucune DoD « sur la
preview déployée »** : il n'y a que trois façons de voir tourner du code —
fusionner dans `main` (c'est-à-dire en production), construire un **APK**
(`apk.yml`, déclenchable à la main), ou activer les previews de PR sur
`julaba-web` au tableau de bord Render (geste infra, jamais fait, et le
backlog le limite explicitement **au site statique** : une preview du backend
payant serait une dépense réelle).

**C'est l'accès manquant n° 1.** Tant qu'il n'est pas levé, la DoD d'un
livrable d'interface doit s'appuyer sur un **APK** ou sur des **captures de
l'aperçu local**, pas sur une URL de preview.

---

## Livrable en cours

### Session 06/11 (après-midi) — la voix pour toutes les éventualités des trois flux

Patrick (06/11) : « Assure-toi qu'on a la voix pour toutes les éventualités de
ces fonctionnalités » — l'entrée, l'ajout de produit, la dépense vocale.

CE QUE L'AUDIT A TROUVÉ (preuve d'abord, script one-shot supprimé) : 26 textes
fixes des trois flux partaient TOUJOURS à la synthèse. Deux causes : (1) les
clips du parcours produit et de la dépense n'existaient pas — le catalogue les
porte (`audioMode: 'none'`), l'audio n'a jamais suivi ; (2) pire, les quatre
replis de confirmation d'argent de la caisse (core-err-01..04) ONT un clip —
mais il dit une AUTRE formulation (« Je n'ai pas bien capté… » contre « Je
n'ai pas bien compris… »). L'appariement exact ne tombait jamais dessus :
« un mot d'écart = muet » (leçon login-41), sur les quatre phrases les plus
critiques. Et le défaut structurel derrière : AppContext.speak →
audioManager.speak ne consultait JAMAIS l'index des clips — même « Dépense
enregistrée » (ui-034, vraie voix de Tantie, pré-cachée) sortait en synthèse.

| Flux | Ce qui manquait | Ce qui est livré |
|---|---|---|
| Produit (parcours guidé) | aucun audio pour STK_047/051/052/053/054/060/063/067/070 | 9 clips `stk-*`, textes mot pour mot du catalogue (`56a677d8`) |
| Dépense vocale | aucun audio pour DEPENSE_001/003/004/005/006/007/009 + montant incompris | 8 clips `dep-03..10` (`56a677d8`) |
| Caisse (replis d'argent) | core-err-01..04 portaient des variantes | audio régénéré sur le texte EXACT de `useVoiceCore` l.924-944, mêmes fichiers (`56a677d8`) |
| Vente (micro) | aucun audio pour TATA_QUE_VENDRE / TATA_INVITE / TATA_VENTE_ECHEC | 3 clips `vente-07..09` (`56a677d8`) |
| Le câblage | audioManager.speak allait droit à la synthèse | `speak` consulte `tataUiClipForText` : clip d'abord, synthèse en repli dans le même créneau (`1b1e5658`) |

Specs des clips (mêmes règles que les lots 43-85) : voix de synthèse
contrôlée distincte de Tantie (aucune imitation), 24 kHz mono 96 kbps,
−16 LUFS, silences coupés, débit ralenti ; le texte dynamique (montants,
noms, unités) reste à la synthèse — on ne pré-enregistre pas ce qui change.
Registre régénéré : **277 clips mappés, 285 fichiers**, cohérence prouvée.

Preuves : `test:registre-voix`, `test:clips-embarques`, `test:audio`,
`test:clip-echec-caisse`, `test:voix`, `test:vendre-unifie`,
`test:tata-actions`, `test:niveau-voix`, `test:offline-voice-hook`,
`test:voice-confirmation-bypass`, `typecheck` : tous verts ; audit final
26/26 textes des trois flux tombent sur un clip. **Reste à recetter** : une
oreille ivoirienne au studio (`atteste` reste FAUX, règle lot B) et le micro
réel sur appareil.

### Session 06/11 — les deux portes du matin : la caisse s'ouvre en parlant, l'étal se pose à la voix

Patrick (06/11) : un bouton d'ouverture de caisse sur l'accueil, accessible à
la voix (« Tu as combien dans ta caisse aujourd'hui ? » → montant dit →
confirmation vocale) ; l'ajout produit lancé par la voix, en reprenant
EXACTEMENT le workflow graphique ; et un produit existant RE-DEMANDE son
unité (elle peut varier d'une opération à l'autre). Deux agents Explore en
parallèle ont inventorié ce qui existait AVANT d'écrire : `openDay` servait
tel quel, `OpenDayModal` était ÉCRITE MAIS MONTÉE NULLE PART (orpheline),
`BoutonDirePrix` + `intentionOuiNon` portaient déjà la dictée et la
confirmation — seul le CÂBLAGE manquait, et l'intent `ouvrir_journee` était
attendu par le moteur sans être reconnu par aucun.

| Porte | Ce qui manquait | Ce qui est câblé |
|---|---|---|
| « Ouvrir ma caisse » | le bouton, la question, la dictée du fond, la confirmation, la modale orpheline | bouton du matin (ni ouverte, ni fermée le soir) → flux vocal (question → montant dit → RELIT + oui/non → `openDay` + MARCHAND_007) ; le doute n'écrit rien ; « non » → on redemande ; repli NOMMÉ : OpenDayModal enfin montée ; l'accueil écoute « ouvre la caisse » / « ajoute un produit » (`cd51a5f8`, `42fe5d10`) |
| « Ajoute un produit » | l'intent (l'ancien `ajouter_stock` avait été retiré volontairement) et la navigation (le parcours n'a pas de route) | la commande route vers `/marchand/stock?ajout=1` → LA même modale d'ajout (un seul chemin de création), param consommé au montage (`50f2013d`) |
| Unité re-demandée | la porte A1 imposait l'unité de la ligne existante | la porte au nom mène à L'ÉTAPE DE L'UNITÉ (même question, même micro) ; le TRI nom+unité vit dans UNE fonction lue par les trois chemins : même unité → complément du stock (le prix reste le sien), autre unité → NOUVELLE ligne à l'étape prix (`50f2013d`) |

Preuves : typecheck vert ; `test:accueil-cable` NOUVEAU (garde transversal des
deux portes) + 21 gardes vertes ; `test:jargon` et `test:nom-du-personnage`
rouges PRÉEXISTANTS (prouvé par stash). **Reste à recetter sur appareil** :
le micro réel web et APK.

### Session 06/11 — les trois oreilles vocales du terrain : entrer, vendre comment, payer où

Patrick relève trois défauts (06/11) : « dis oui pour entrer » pas compris,
la transcription mauvaise à « comment souhaites-tu le vendre ? », et
l'enregistrement des dépenses vocales qui ne marche pas. Mesuré AVANT de
corriger (script one-shot sur l'état) : le parse de la dépense est sain, ce
sont l'OREILLE (le micro ne s'ouvrait jamais sur l'APK — drapeau figé lu avant
que le plugin natif ne se monte) et la LECTURE (les formes réelles du STT —
« wi », « c est bon », « aukilo », « alapièce » — rendaient null) qui
défaillent, plus une asymétrie doigt/voix au dispatch.

| Défaut rapporté | Cause mesurée | Correctif |
|---|---|---|
| « Dis oui pour entrer » pas compris | `offlineModelReady()` FIGÉ disait non au premier écran (plugin natif pas encore monté, B3) → l'écoute ne s'ouvrait JAMAIS ; et le « oui » réel du STT (« wi », « c est bon ») rendait null | sonde ASYNCHRONE dans `useCommandesVocales` (le micro n'ouvre que si elle passe) ; écrans sur le drapeau persistant ; `ACQUITTEMENT_APLATI` dans la grammaire d'entrée/numéro — PAS dans l'argent (`27127245`) |
| « Comment souhaites-tu le vendre ? » mal transcrite | l'ASR colle la préposition à l'unité : « aukilo », « alapièce », « ensacs », « untas » → null → relance pour une réponse déjà donnée | le DÉCOLLAGE dans `uniteDite` : itératif borné, toutes les variantes explorées, chaque morceau repasse par LES MÊMES règles, rien n'est inventé (« restaurant » → null) (`dc20365d`) |
| Dépense vocale non enregistrée | parse sain ; `DepenseForm` sans `offlineLocalIntents` → mise en file de rejeu hors ligne, `enregistrerDepense` jamais appelé — alors que le TACTILE notait sa dépense (offline-first, clé d'idempotence) | `offlineLocalIntents: ['depense']` : la voix emprunte le chemin du doigt, hors ligne compris ; la policy dit la vérité élargie (`4b568139`) |

Preuves : typecheck vert ; 11 gardes vertes (commandes-entree, unite-dite,
depense-vocale, depense-libelle, offline-voice-policy, offline-voice-dispatch,
parole-entree, auth-charte, entree-unique, entree-numero-voix,
parcours-guide-parle). **Reste à recetter sur appareil** : le micro réel web
et APK — la grammaire et le câblage sont prouvés ici, l'écoute ne l'est pas.

### Session 06/11 — la base Azure alignée sur le schéma du code ; le boot blindé contre les deux pièges Azure

Le propriétaire a fait aligner la base Azure (`julaba_db`, PostgreSQL 18.6) sur la
structure de référence locale (rapport d'alignement du 06/11, alignement strictement
additif, sauvegarde préalable). Revue faite sur le dépôt — le rapport est vérifié
exact sur tous les points contrôlables depuis le code : `raccourcis` n'a bien
**aucune** entité (le contrôleur `raccourcis` opère sur `raccourcis_vocaux`) ; les
migrations miroir (Tontines, CotisationsSociales, CodesRecuperation, AppellationChoisie,
WidenUserPhone…) existent et correspondent aux 12 tables/colonnes créées ;
`computeBootDbFlags` force bien `synchronize=false` sur base peuplée (`DB_SYNCHRONIZE=true`
du `.env` inerte) ; `users.status` est la seule colonne de `users_status_enum`.

**Corrections de code qui découlent de l'alignement (3 commits, le code rattrape la base)** :

| Commit | Piège corrigé |
|---|---|
| `97404d10` | `main.ts` lançait `CREATE EXTENSION "uuid-ossp"` sur toute base VIERGE — extension **refusée par Azure** → boot mort. Désormais : si refusée, alias `public.uuid_generate_v4() → gen_random_uuid()` (même substitution que l'alignement) |
| `c8088ffc` | `DB_MIGRATIONS_RUN=true` sans table `migrations` → TypeORM rejoue la baseline sur le schéma existant (incident 18/09) ; Azure aligné n'a **pas** de table `migrations` → le drapeau est ignoré avec avertissement tant que l'amorçage du RUNBOOK n'a pas été fait (aucune régression #19 : historique amorcé = drapeau respecté) |
| `97f06306` | la migration miroir P0 ajoutait `en_attente_activation` **en fin d'enum** (`ADD VALUE`) — divergeant du code TS et d'Azure ; elle recrée désormais le type à la position du code |

**Reste ouvert (arbitrages du propriétaire)** :
1. **Dette de mots de passe** : les 16 comptes Azure portent le mot de passe publié du dépôt
   (vérifié par comparaison bcrypt ; dont 2 `admin_general` actifs) — réinitialisation
   forcée à arbitrer, en priorité pour les comptes back-office.
2. **Quelle base est la production** : Render (encore la seule API vivante ce jour),
   Azure (désormais alignée structurellement) ou Supabase — la contradiction §Accès
   ci-dessous reste à trancher ; elle décide du reste (APK à regénérer à la bascule).
3. **Amorçage de l'historique de migrations sur Azure** (RUNBOOK § Phase 3 étape 2) si on
   veut la chaîne TypeORM ; sinon `DB_MIGRATIONS_RUN=false` — désormais protégé de toute façon.
4. **Re-gel de l'empreinte `intentLocal`** (06/11, après le merge azure/dev `656cd973`) :
   `test:i18n-empreintes-argent` crie VOLONTAIREMENT — le comportement d'`intentLocal` a
   changé avec le travail absorbé du push Azure `b9321d97` (description libre des dépenses
   qui ne se perd plus en « Dépense vocale » + l'intent `ouvrir_journee` compris
   localement). Le correctif était demandé (retour terrain passé par l'autre canal) ;
   l'empreinte ne se re-fige PAS sans Patrick (doctrine EMPREINTE-GARDES) — le geste
   humain de re-gel reste à autoriser. Le piége no-op de l'`ouvrir_journee` confirmé sur
   la caisse a été fermé au passage (`MicroVenteCaisse` exécute désormais `openDay`).

Limites connues du rapport (assumées) : `gen_random_uuid()` au lieu de `uuid_generate_v4()`
(extension non allow-listée Azure) ; rendu textuel de 2 CHECK (PG 16 vs 18) ; outils et
sauvegardes dans `/tmp` (éphémères) — porter le contrôle en `ci/` avec identifiants lus
dans l'environnement si on veut qu'il survive.

### Session 21/10 — l'historique de `dev` rendu véridique, les 2 rouges hors `CONNUS` fermés

**Le blocage** : `dev` ne pouvait plus rien recevoir (`pull` bloqué sur un
arbre sale) et son journal contenait un commit qui ne disait pas ce qu'il
faisait (`2ed08e62`, « effacement en TTS français » : le code ne changeait
rien). L'arbre a été réécrit sur `origin/dev` (`d6da2966`), le faux commit
retiré, et les **3 modifications de travail** restées en suspens ont été
reprises, une par une, dans des commits qui disent ce qu'ils font.

| Critère (DoD) | Statut | Preuve |
|---|---|---|
| `dev` reçoit de nouveau des commits (fast-forward) | ✅ | `git push origin dev` — base distante conservée, aucun commit perdu |
| Le commit mensonger `2ed08e62` n'est plus dans l'historique | ✅ | `git log --oneline` : absent ; `LoginPassword.tsx` identique à `origin/dev` (texte `AUTH_41` conservé) |
| Les 3 modifs de travail sont commitées, une par une | ✅ | `fb1a1c33` centrage du numéro · `a3aeda50` identité hors navigation · `de4229f8` catalogue |
| Le journal `.ai/CHANGELOG.md` dit ce qui est VRAI | ✅ | les 3 entrées de la session 19/10 sont replacées dans leur section ; la décision est écrite |
| **Les 2 rouges hors `CONNUS` sont FERMÉS (pas documentés)** | ✅ | `verify` : **150 vert / 2 rouge sur 152** — les 2 rouges restants sont les 🟠 connus ; **0 rouge nouveau** |
| `npm run check` | ❌ rouge **préexistant** | 2 suites unitaires backend rouges **à l'HEAD sans mon lot** (prouvé par stash) — voir « Cassé / rouge » |

**Les 2 rouges fermés, cause réelle (pas de whitelist)** :
- `test:enum-check-phone` — le `.env` local n'avait pas `AUTH_TELEPHONES_TEST`.
  Corrigé **localement** (jamais commité : `.env` est gitignoré) ; la règle
  est écrite dans `backend/.env.example` (`adc66a99`), sans aucun numéro.
- `test:i18n-source` — « Le montant du coût n'est pas valide »
  (`GestionStock.tsx:511`, introduite par `964697ce` 20/10 STK-04) n'était
  pas au catalogue. Entrée `STOCK_COUT_INVALIDE` ajoutée (`critiqueArgent:
  true` — un coût de réassort est de l'argent), inventaire et CSV
  Manus régénérés (`de4229f8`).

**Signalé, non touché** : 2 suites unitaires backend rouges à l'HEAD
(`telephones-tests-uniques.spec.ts`, `stocks-rest.idempotency.spec.ts`) —
gardes d'argent à empreintes gelées, hors du périmètre de ce lot.

### Session 19/10 — dictée vocale sur le WEB + corrections de session

(branche `dev`, commit `55a8e0c0`, poussé — antérieur : `725caf7e` fix wallets).
Arbitrage Patrick (19/10) : reconnaissance vocale **native du navigateur**
(`SpeechRecognition`) sur tout le web ; sherpa-WASM écarté ; sherpa reste le
seul moteur de l'APK. Trace : `docs/DECISIONS.md` 19/10.

| Critère (DoD) | Statut | Preuve |
|---|---|---|
| Dictée dispo sur navigateur : ventes **et** dictée du numéro | ✅ | `voice-offline/webReco.ts` ; branché dans `useVoiceCore`, `useDicteeLive`, `LoginPassword` (`voixEcouteDispo`) |
| Un reset ne livre jamais un texte périmé (brouillon annulation corrigé) | ✅ | contrat `conclure()/annuler()` — `webReco.test.mts` [3][4] |
| APK exclue de la reco navigateur (jamais deux moteurs) | ✅ | `webReco.test.mts` [2] |
| Pavé clavier reste le filet partout ; aucun micro sur le code secret | ✅ | `webReco.test.mts` [1] ; `recoWebDispo()` gate |
| Nouveau banc inscrit dans `verify` (règle : sinon orphelin) | ✅ | script `test:web-reco` + `maillons-verify.json` (152 maillons) ; `test:maillons-orphelins` vert |
| Aucun rouge **nouveau** dans `verify` | ✅ | 144 vert / 8 rouge sur 152 : 2 connus + 6 **préexistants à l'HEAD** (prouvés par stash : les 6 sont rouges sans mon lot) |
| VOICE-01 intact | ✅ | `test:voix-trace-source` : mêmes 5 échecs avant/après |
| Typecheck + check | ✅ | `tsc -b` 0 ; `npm run check` vert (garde-argent informatif connu) |
| **Vérifié à l'oreille / au micro réel** | ⬜ | à faire sur navigateur réel (Chrome/Safari) : dire un prix, vérifier la dictée et l'annulation |

**Corrections livrées avec (trace `docs/DECISIONS.md` 19/10)** : `GET
/wallets/me` crée le wallet manquant (+ backfill, 18 wallets) ; proxy Vite
`/socket.io` → `localhost:3001` ; bouton « Retour » retiré de l'écran code
secret.

**Signalement, non touché** : `WalletContext.tsx` mappe `balance: w.solde || 0`
— violation ACC-03 potentielle, arbitrage Patrick avant tout changement.

### STK-25 (20/10) — ajouter un produit inconnu par la voix

Ta demande : « les produits sont pré-enregistrés, alors que l'utilisateur peut
ajouter tous les produits qu'il veut ». **Reproduit**, et le défaut était réel.

| Ce qui marche | Preuve |
|---|---|
| **Vendre** un produit inconnu par la voix : possible depuis CAT-01/02 | `vendreVocalUnifie.ts:307` (ligne libre) ; reproduction : « je vends 3 kassos à 500 » → demande de prix, pas de « pas compris » |
| **Ajouter** un produit inconnu par la voix : **ne marchait pas** | `BoutonDireProduit.tsx` : le nom absent du lexique ET de l'étal → `produitDit` `null` → « Je n'ai pas entendu de produit » |

**Cause** (tracée, pas devinée) : la reconnaissance de produit a deux portes
écrites à la main — `PRODUITS_FORMES` (28 formes) et l'étal de la marchande.
Un troisième nom, même parfaitement transcrit, n'entrait nulle part ; le
`catch` du bouton jetait le texte. La vente, elle, a une porte de plus (l'article
libre).

**Correction** : `produitDit.nomLibreDicte` (nom conservé tel quel, mots outils
retirés par les listes de la caisse) + `BoutonDireProduit` s'en sert. Le parcours
guidé garde unité et prix obligatoires ; un nombre orphelin reste une quantité.
Banc `test:produit-dit` section [10] ; `verify` 144/152 — **8 rouges, les mêmes
qu'avant** (2 connus + 6 préexistants à l'HEAD). Code mort retiré
(`dicteeNomRef`).

### Correctif cache produits (20/10) — un ajout ne disparaît plus

Ta remarque : « j'ai l'impression qu'il y a un cache lors de l'ajout de
produits, si c'est pas passé ». **Reproduit**, défaut réel.

**Cause** : le cache du téléphone (`julaba_cache_produits_<id>`) n'était écrit
que par `loadProducts`. `addProduct` / `updateProduct` / `deleteProduct`
modifiaient l'écran **sans réécrire le cache**. Donc : ajout → `refreshProducts()`
échoue (réseau) ou redémarrage hors ligne → `restaurerDepuisCache` écrase l'état
par le cache **périmé** → **le produit disparaît**.

**Correction** : `cleCacheProduits` factorisé + `ecrireCacheProduits` après
**chaque** mutation réussie. Reproductions : `repro-cache.mts` (❌ perdu) /
`repro-cache-fixe.mts` (✓ survit). Garde : 2 assertions dans
`test-fusion-panier.mjs` (banc existant, aucun maillon nouveau) ; test négatif
vérifié. `tsc -b` 0 ; `verify` 144/152, **mêmes 8 rouges**.

---

**Session 15/10 — Vue de connexion ramenée à celle de `main` + Rapport et Dev Mode
réinstallés** (session 15/10, demande expresse du propriétaire).
- `LoginPassword.tsx` = version de `main` (`24b40b3`) : le redesign maquette
  12/10 (slogan, carte Tata, micro au bout de la ligne, pavé avec lettres) et
  le menu `<>` des rôles sont **retirés** — retour volontaire à l'écran de main.
- Revert de `e04fa73` : bouton 🐞 **Rapport** fixe dans `AppLayout` (tous les
  écrans connectés, demande Patrick 28/09) + bouton « Rapport de test » au bas
  de la connexion, et **ProfileSwitcher** (Dev Mode) rémonté sur les 6 écrans.
- Preuve : `tsc` 0, `build` OK, `test:ci` vert, `verify` **identique au
  départ** (7 rouges, tous préexistants — comparaison avant/après).
- Écart à connaître : la 5e assertion de `test:voix-trace-source` —
  « l'écran de connexion n'embarque plus le doublon (arbitré REVIEW-004) » —
  tombe désormais ; le maillon est déjà 🟠 connu (VOICE-01), donc aucun rouge
  nouveau. L'arbitrage REVIEW-004 est **contrarié** par cette demande.

La session précédente a livré le Lot A (authentification d'agent) et l'a poussé.
**Correctifs démo (12/10)** — branche `claude/correctifs-demo`, sans PR (Patrick : « oui fais lot de correctif »).
Défauts trouvés en capturant l'écosystème pour la présentation Primature.

| Critère | Statut | Preuve |
|---|---|---|
| Une seule définition du volume : ventes de caisse non annulées, Keiwa exclu | ✅ | `backend/src/commun/vente-de-caisse.ts` ; invariant `chiffres-ventes-de-caisse` 6 rouges → verts |
| Tableau de bord institution : ventes de la zone, aucun zéro inventé | ✅ | unitaire 17/17 ; `test:accueil-institution` |
| Tableau de bord BO : bonne base d'API, chiffres cohérents Rapports/Supervision/Acteurs | ✅ | `test:base-api-temps-reel`, `test:ventes-bo`, `test:compteurs-acteurs-bo` |
| Images produits, débordements, fiche membre | ✅ | `test:image-produit`, `test:debordements-demo`, `test:fiche-membre` |
| Validations | ✅ | jest-unit 268/268 · invariants 296/296 · check vert · garde-argent tient · verify 150/151 (seul rouge connu VOICE-01) |
| Vérifié à l'écran | ⬜ | aucune preview ; à refaire sur stack locale ou après fusion |

Relecture : 1re NON CONFORME (5 bloquants) → corrigés → 2e CONFORME.

À DÉCIDER (Patrick) : retirer `test:garde-argent` et `test:i18n-empreintes-argent` de `CONNUS` (redevenus verts) ; « attiéké » ne mène plus au manioc (pas d'image attiéké).
Backlog : `BOScoreFinancier.tsx` même chemin `/api/v1` relatif ; `RoleDashboard.tsx:706` `|| 0` ; `BODashboard.tsx:556` mois non mesuré affiché « aucune donnée » ; `alertesCritiquesActives: 0` en dur ; seed déjà peuplé garde « COOP-CACAO » (ON CONFLICT DO NOTHING).

> **Fusion** : lot intégré dans `dev` le 19/10 (merge `claude/correctifs-demo` → `dev`), après résolution des conflits `frontend_src/` → `frontend/`. La vérification « à l'écran » reste à refaire sur la stack locale.

---

## Livré / partiel / cassé

### Livré et prouvé

| quoi | preuve |
|---|---|
| Vente vocale à la caisse | journal terrain `e758a37` : « Cinq piments » → prix demandé → micro rouvert seul → 5 Piments, 2 500 F |
| Ajout de produit à la voix (stock) | journal `NE7E` du 03/10 : produit → unité → prix → posé sur l'étal |
| Reconnaissance d'un produit de son étal | `STK-23`, 03/10 — reproduit avant correction |
| Annonce de caisse honnête à l'accueil | `ACC-03`, 03/10 — 6 cas au banc |
| Anti-écho du micro | `MIC-01` — balayage du dépôt, mordant prouvé par mutation |
| STT/TTS hors ligne (Sherpa natif) | `SherpaStt=true`, `SherpaTts=true` dans tous les journaux |
| Connexion (login + SMS) | journal 03/10 : `LOGIN_HTTP status 200` |
| `verify` exécute **tous** ses maillons | `VER-01` — 132 maillons, 129 verts / 3 rouges connus |
| Idempotence **par marchande** | `IDEM-01/02/03` — mordant prouvé par mutation |
| Règles d'agent (portée, délégation, plafonds) | `AGENT-A1/A2/A3` — 21 cas purs |
| Câblage d'agent + traçabilité serveur | `AGENT-A1..A4` — 19 cas |

### Partiel

| quoi | ce qui manque |
|---|---|
| **Agent WhatsApp — écriture** | les **plafonds** ne sont pas renseignés : toute écriture est refusée. Arbitrage du propriétaire |
| **Agent WhatsApp — lecture (b)** | fonctionne, **non vérifié en base** |
| **Tout le lot Agent + IDEM** | **aucun test n'a touché un Postgres** : 4 tables, ~15 requêtes SQL, prouvées par lecture seulement |
| Boucle d'ambiguïté du prix (`538f261`) | corrigée, **aucun APK ne la porte** |
| Passerelle Odoo | lecture seule, et la **voie est en suspens** depuis le 05/10 |

### Cassé / rouge, et pourquoi

| quoi | état |
|---|---|
| `test:voix-trace-source` | 🟠 **rouge voulu** — 4 empreintes VOICE-01. Attend `--regenerer` |
| `test:i18n-empreintes-argent` | ✅ **redevenu vert** (20/10) — plus dans la liste `CONNUS` |
| `test:garde-argent` | 🟠 **7 entrés / 55 perdus** (mesuré le 21/10 ; l'étiquette « 12/14 » est périmée). Cause : le renommage `frontend_src` → `frontend` (172 gardes vues comme nouvelles). Attend `--figer-perimetre` |
| `test:entree-unique`, `test:nom-tantie` | ❌ bancs **orphelins** découverts le 03/10, jamais exécutés avant. Hors `verify`, cause non diagnostiquée |
| 2 suites unitaires **backend** rouges (`npm run check`) | ❌ **rouge préexistant à l'HEAD**, prouvé par stash le 21/10 : `telephones-tests-uniques.spec.ts` (12 numéros de recette inscrits par deux suites d'invariants à la fois) et `stocks-rest.idempotency.spec.ts` (le PATCH de stock fait 3 requêtes et non 2 depuis STK-04). **Non touché** : ce sont des gardes d'argent ; les corriger touche aux empreintes gelées du garde-argent → **lot à arbitrer à part** |
| 6 rouges **nouveaux dans `verify`** (19/10) | ✅ **FERMÉS** : 4 corrigés par les commits du 20/10 ; `test:enum-check-phone` et `test:i18n-source` corrigés le 21/10 (`de4229f8`, `adc66a99`). `verify` : **150 vert / 2 rouge sur 152**, 0 rouge nouveau |

---

## Décisions déduites (avec source)

Voir `docs/DECISIONS.md` pour la liste datée complète. Les structurantes :

| décision | source |
|---|---|
| Le schéma se construit par `DbInitService`/`synchronize` sur base VIERGE ; sur base EXISTANTE la chaîne de migrations est AUTORITAIRE depuis #10 et le drapeau d'env est respecté — **seulement si l'historique est amorcé** (garde du 06/11) | `docs/adr/ADR-0002`, `backend/src/main.ts`, `backend/src/database/schema-flags.ts`, `docs/etape4/RUNBOOK-bascule-migrations.md` |
| `frontend_src/` est la source ; `frontend/` contient des **sorties de build** | `capacitor.config.ts` (`webDir: 'frontend/dist'`) |
| `POST /caisse/vente` est le **seul** chemin de vente | `caisse-rest.controller.ts:261` — une autre route a été fermée avec ce message |
| L'idempotence se juge **par marchande** | `fidelite_evenements` et `wallet_transactions` le faisaient déjà |
| ERPNext écarté, Odoo retenu puis **suspendu** | arbitrages des 04 et 05/10 |
| Auth agent = voie A, code **par SMS jamais par WhatsApp** | arbitrage du 05/10 |
| Plafonds d'agent : `null` = « pas encore décidé », **jamais « illimité »** | arbitrage du 05/10 |

---

## Hypothèses retenues

| hypothèse | raisonnement |
|---|---|
| **Le pilote reste caisse-seule** | trois verrous convergent : `CAISSE_CREDIT_ACTIF = false` en dur, le bandeau de `RC1.md` (« CE DOCUMENT NE COUVRE QUE LA CAISSE »), Keiwa hors pilote. Aucune instruction contraire |
| **`spike/oss-02-vad/` est mort** | `docs/oss/REGISTRE-OSS.md` marque OSS-02 **REJETÉ**. Conservé par prudence : un dossier mort coûte peu, une suppression hâtive coûte un historique |
| **Le hook `pre-push` sans husky** | règle de la maison : « aucun nouveau framework sans démonstration du gain ». Un hook git natif fait le même travail, sans dépendance |
| **Les seuils de garde-fous au niveau actuel** | des seuils idéaux bloqueraient tout le dépôt le premier jour. On empêche l'**aggravation**, on ne corrige rien à ce stade |

---

## À DÉFINIR

1. **Les plafonds d'agent** — par opération et par jour. Bloque toute écriture WhatsApp.
2. **Les 4 refigeages** — `--regenerer`, `--calculer`, `--figer-perimetre`, `--figer-gardes`.
3. **Les 6 bancs orphelins** : entrent-ils dans `verify` ? 4 verts, 2 rouges.
4. **L'APK** — dix lots poussés, aucun appareil ne les a vus.
5. **La voie ERP** — Odoo suspendu le 05/10, rien ne le remplace.
6. **Le nouchi** — langue retenue pour l'agent, **outillée nulle part** (ni lexique, ni corpus, ni test).
7. **L'échéance du pilote** — aucune date dans le dépôt.
8. **Les 3 testeurs** et les **5 prérequis §2** de `GO-PILOTE-JULABA.md`, non constatés.
9. **Dossiers au statut incertain** : `spike/`, `infra/odoo-poc/`, `tests/`, `database/`, `coordination/`, `nginx/`, `docker-compose*.yml`, `azure-pipelines.yml`.
10. **Un Postgres de test joignable** — sans lui, les invariants ne tournent pas.

---

## Le `check` a trouvé un rouge sur `main` dès sa première exécution

```
CHECK — 5 vert(s), 1 rouge(s), 0 absent(s)
❌ tests unitaires · backend
🟠 garde-argent (informatif — écart connu)
```

**Le test qui échoue :** `backend/test/unit/pin-jamais-rendu.spec.ts`, cas
**SEC-07** — « aucun secret n'est tiré avec `Math.random` ». Il désigne
`backend/src/auth/anti-enumeration.ts:108`.

**Mon analyse : c'est un faux positif du banc, pas un défaut de sécurité.**

```ts
const echeance = debut + PLANCHER_MS + Math.floor(Math.random() * GIGUE_MS);
```

`Math.random()` sert ici à une **gigue temporelle** — uniformiser le temps de
réponse pour qu'on ne puisse pas deviner, au chronomètre, si un compte existe.
**Ce n'est pas un secret**, c'est un délai. Le banc cherche `Math.random` dans
les fichiers sensibles sans distinguer « tirer un secret » de « tirer un
délai ».

**Deux issues, et c'est un arbitrage :**
- **exempter explicitement** ce cas dans le banc, avec le motif écrit (« un
  délai n'est pas un secret ») — c'est ce que je recommande ;
- ou **passer à `randomInt`** par précaution : un jitter prévisible affine
  théoriquement une mesure de timing, même si le plancher fixe domine.

**Je n'ai rien corrigé** (consigne). Conséquence à connaître : **le `check` est
rouge sur `main`, donc le hook `pre-push` bloquera** jusqu'à l'arbitrage. Les
tests restent volontairement **bloquants** : les rendre informatifs
désactiverait le filet pour supprimer un message, ce qui est l'inverse du but.

---

## Écart anti-spaghetti — mesuré le 05/10, rien corrigé

Les seuils sont réglés **au niveau actuel** : ils empêchent l'aggravation sans
bloquer. Ils se resserrent quand la dette baisse, jamais l'inverse.

| catégorie | mesure réelle | seuil posé | alertes |
|---|---|---|---|
| fichiers > 300 lignes | **185 fichiers**, max **6 644** (`FicheIdentificationDynamiqueBO.tsx`) | `max-lines: 6700` | 0 |
| fonction la plus longue | **2 262 lignes** (même fichier) | `max-lines-per-function: 2300` | 0 |
| complexité maximale | **166** (`FicheIdentificationDynamique.tsx`) | `complexity: 170` | 0 |
| duplication | **3,87 %** — 7 453 lignes sur 192 516, **301 clones** | `threshold: 4` | 0 |
| code mort et dépendances | **396 problèmes** : 41 fichiers inutilisés, **55 dépendances inutilisées**, 239 exports non lus, 28 exports en double | `--max-issues 400` | 0 |
| imports circulaires | `import/no-cycle` en **erreur** dès maintenant — seul seuil serré d'emblée | — | 0 |
| typage | `strict` déjà actif sur les deux workspaces | — | 0 |

**Les trois points les plus gênants** — les plus coûteux au quotidien, pas les
plus gros chiffres :

1. **Deux fichiers de 6 644 et 5 753 lignes** (`FicheIdentificationDynamiqueBO`
   et `FicheIdentificationDynamique`), dont une **fonction unique de 2 262
   lignes** à complexité 166. Personne ne peut relire ça, donc personne ne le
   modifie sans risque — et ils portent l'identification, c'est-à-dire
   l'entrée de tout acteur. **Et ils se ressemblent** : 283 lignes dupliquées
   entre deux `RecolteForm`, le même motif entre `MarchandAlertes` et
   `ProducteurAlertes`. C'est la duplication la plus coûteuse du dépôt :
   corriger un défaut oblige à le corriger deux fois, et on en oublie une.
2. **55 dépendances inutilisées.** Chacune est du temps d'installation, du
   poids, et une surface de sécurité pour rien. C'est aussi le signe que des
   lots passés n'ont pas « supprimé ce qu'ils rendaient inutile ».
3. **Le code portait 46 directives `eslint-disable` pour un eslint qui
   n'existait pas** (vérifié : aucune configuration, aucune dépendance avant
   ce jour). Des développeurs ont écrit des exemptions contre un outil absent
   — autrement dit, la règle était connue et personne ne pouvait la vérifier.

**Rien n'a été corrigé**, conformément à la consigne. Le lint est **vert à
zéro alerte** : il tient le plancher et refusera toute aggravation.

---

## Backlog

- Limite de requêtes **propre à l'agent** (seul le `ThrottlerGuard` global s'applique).
- Route d'écriture de stock pour l'agent (`stock:ecrire` existe, aucune route).
- `ODOO-L3/L4` (mapping sens vente, premier appel réel) — **gelés**.
- Les deux frottements consignés le 03/10 : **aucun bip** sur le chemin `BoutonDirePrix` ; **l'écoute dure 11 s** même quand le prix est compris en 2 s.
- Diagnostiquer `test:entree-unique` et `test:nom-tantie`.
- Réduire la dette anti-spaghetti (**ne rien corriger avant arbitrage**).

---

## Accès — ce qui marche, ce qui manque

| sujet | état |
|---|---|
| GitHub | ✅ `gh api` pleinement fonctionnel sur `julaba-app` (**permissions admin**). `julaba-whatsapp-agent` accessible après `add_repo` |
| Déploiement | ✅ `autoDeploy: true` sur `julaba-api` et `julaba-web` — **mais sur `main`, donc en production** |
| **Preview par branche** | ❌ **n'existe pas** (voir l'encadré en tête) |
| URLs de prod | ❌ **intestables depuis cette session** : l'egress refuse `julaba-api.onrender.com`, `julaba-web.onrender.com` et `julaba.online` (`connect_rejected`, 403 du proxy). À vérifier depuis un navigateur |
| Base de production | ⚠️ **contradiction non résolue** : `render.yaml` déclare `julaba-db` (Render), mais `docs/etape4/BASCULE-EXECUTEE-2026-08-15.md` affirme que les `DB_*` sont **surchargés au tableau de bord vers Supabase**. Seul le tableau de bord Render tranchera (`julaba-api` → *Environment* → `DB_HOST`) |
| Version Postgres | ⚠️ contradiction : ADR-0004 dit **16**, `reinitialiser-db.yml` dit **18** |
| **Base de preview / staging** | ❌ **elle n'existe pas** — aucune migration ne peut être jouée hors production sur un hôte |
| **Postgres de test** | ⚠️ injoignable **en l'état**, mais **à un geste près** : `scripts/pg-test-local.sh start` existe et Postgres 16 est installé localement. **C'est ce qui débloquerait les invariants** — jamais exécutés sur le lot Agent ni sur IDEM |
| Sauvegardes | ✅ `sauvegarde-db.yml` tourne chaque nuit ; artefact vérifié le 05/10 (~75,8 Ko) |
| Variables d'env | ✅ `backend/.env.example` les documente toutes (placeholders) |
| APK | ✅ `apk.yml` déclenchable à la main, artefact `julaba-apk-<sha7>`, Release `pilote-latest`. ⚠️ **signé avec la clé de debug** → chaque build signe différemment, donc toute mise à jour exige une **désinstallation, qui efface les données de la marchande**. Bloquant avant distribution |
| Docker / Azure | tranché par **ADR-0004** (28/09) : Render = prod ; OVH/Docker = secours **dormant** (manuel) ; Azure = miroir **muet**, PAT expiré le 08/09 ; `docker-compose.prod.yml` = vestige |
| Lovable | ❌ **aucune trace** dans le dépôt — hors stack |
| Supabase | vestiges de commentaires seulement, **aucune dépendance npm**. Mais voir la contradiction sur la base de prod |

### ⚠️ Alertes de sécurité remontées par l'enquête

1. **Le dépôt `julaba-app` est PUBLIC** (`"visibility":"public"`, vérifié par API).
2. **Mots de passe par défaut écrits en dur** : `backend/src/auth/auth.service.ts`
   **lignes 42-43**, appliqués à toute inscription réelle. Dans un dépôt public.
   `generateInitialPassword()` existe déjà au même endroit (l. 69-76).
3. **Un ancien secret est cité en clair** dans `.ai/SECURITY_AUDIT.md` l. 117,
   avec mention qu'il subsiste dans l'historique GitHub et Azure.
4. **ALERTE-SEC-01 toujours ouverte** : 29 identifiants en clair dans
   `akoun-dev/julaba` (public), dont 7 mots de passe back-office partageant une
   seule valeur.

*Aucune valeur de secret n'est reproduite ici — seulement les emplacements.*

---

## Pull requests

**PR #261 — « cadre de travail » — OUVERTE, NON FUSIONNÉE.**
https://github.com/SOMET1010/julaba-app/pull/261 · `claude/cadre-de-travail` → `main`
· 3 commits, 19 fichiers · `mergeable_state: unstable` (la CI `check` y est
rouge, du rouge préexistant SEC-07 décrit plus haut).

**Pourquoi elle n'est pas fusionnée alors que l'autorisation était donnée :**
l'autorisation (« je t'autorise à les faire arriver sur la branche par
défaut ») a été donnée **avant** que l'enquête n'établisse qu'il n'existe
aucune preview et que `autoDeploy: true` porte sur `main`. Fusionner, c'est
**déployer la production**. Cet effet n'était pas connu au moment de
l'autorisation : la fusion attend donc une confirmation explicite.

Règle permanente : *aucune PR sans que le propriétaire la demande.*

⚠️ **PR #245 — interdite de merge** (Keiwa, hors pilote).

---

## Agents mobilisés

`.claude/agents/` : **designer**, **dev-frontend**, **dev-backend**,
**recette**, **relecteur**. Créés le 05/10, aucun encore mobilisé sur un
livrable.
