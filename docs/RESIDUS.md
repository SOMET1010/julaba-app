# Registre des résidus — Julaba

Ouvert le 11/08/2026. Les implémentations par couches (nécessaires pour livrer
sans casser) laissent des résidus : ce registre les rend VISIBLES et suivis,
au lieu de les laisser s'accumuler en silence. Règle : toute passe de
nettoyage retire une ligne d'ici ou en ajoute une, avec preuve.

## Nettoyé (passe 1 — v5.0.0.6, 11/08/2026)

- `Ollama` (fichier vide à la racine, suivi par git) : supprimé.
- `frontend_src/src/imports/` : 35 fichiers non-code (specs .md, logs .txt,
  SVG en double) supprimés — aucun n'était importé (vérifié par grep, y
  compris `?raw`). Les `*-api.ts` réellement importés sont conservés.
- `MarchandAccueil.tsx` (ancien accueil marchand) : supprimé — plus aucun
  importeur depuis la Phase 2 (accueil unique MarchandAccueilVoice).
- `useWakeWord.ts` + son câblage dans VenteVocaleModal (état mains libres,
  bip, bloc UI) : supprimés — le hook renvoyait `supported: false` en dur
  depuis l'abandon du mot-réveil en ligne ; le bloc UI ne se rendait jamais.
  Un futur mot-réveil HORS-LIGNE (sherpa) repartira de zéro, proprement.

## Nettoyé (passe 2 — v5.0.0.7, 11/08/2026)

- Chaîne « academy » legacy supprimée (5 fichiers morts, prouvés sans
  importeur atteignable) : `useAcademy.ts` (10 erreurs TS, imports de
  fonctions inexistantes), `useAcademyTracking.ts`, `useAcademyModules.ts`,
  `JulabaAcademy.tsx`, `MarchandAcademy.tsx`. La route réelle pointe vers
  `UniversalAcademy`.
- `StockContext` : l'enveloppe « compatibilité » contenait un bloc de
  polling référençant des identifiants INEXISTANTS (`appUser`,
  `refreshStocks`) — il aurait planté au premier rendu s'il avait été
  exécuté. Retiré ; le vrai rafraîchissement vit dans `StockProviderInner`.
- Types résorbés (49 erreurs TS, 239 → 190) : variantes d'API déclarées en
  OPTIONNEL sur `Recolte`/`CommandeProducteur` (ProducteurContext) et
  `Recolte` (recoltes-api), alias `Cycle as CycleAgricole`, types de
  publication depuis les alias locaux existants.

## Nettoyé (passe 3 — v5.0.0.8, 11/08/2026)

- Résorption types paquet 2 (45 erreurs, 190 → 145) : configs d'énums
  complétées (TYPE_CONFIG, NIVEAU_CONFIG), gardes équivalentes au runtime
  (dates/index optionnels), ProduitMarche aligné sur le flux /publications
  réel, props de compat sub/trendUp déclarées sur UniversalKPI.
- Mensonge de type corrigé : `InstitutionBO.modules` et
  `BOInstitution.modules` déclaraient `string[]` alors que TOUS les écrans
  BO le lisent en dictionnaire module → niveau. Types alignés sur la
  réalité (`ModuleAcces`).

## Nettoyé (passe 4 — v5.0.0.9, 11/08/2026)

- Résorption types paquet 3 (55 erreurs, 145 → 90) : UserData complété
  (alias hérités firstName/lastName/activity/phone), BOAuditLog/BOUser/
  InstitutionProfil/JulabaNotification complétés, forme réelle des
  commandes API déclarée (CommandeContext), @types/leaflet installé.
- Trois bugs réels corrigés (révélés par le typage) :
  1. Notifications coopérative : le champ `titre` n'existait pas (le type
     attend `title`) — le titre n'était JAMAIS transmis à l'API. Corrigé.
  2. Tableau de bord identificateur : tuiles « Identifications » et
     « À valider » affichaient du vide (champs inexistants sur le résumé) —
     branchées sur les vrais champs (total, enAttente).
  3. Modal « Utilisateurs » institution : la section stats lisait
     `.marchands.total` directement sur une PROMESSE (plantage à
     l'ouverture) — désormais attendue puis lue par rôle, 0 en repli.
     À vérifier à l'écran (runtime) lors de la prochaine recette.

## Nettoyé (passe 5 — v5.0.0.10, 11/08/2026)

- ZÉRO erreur TypeScript (90 → 0). Résidus supprimés au passage :
  `src/types/leaflet.d.ts` (shim `declare module 'leaflet'` qui écrasait
  @types/leaflet et rendait toute la carte non typée), ui/carousel.tsx,
  ui/drawer.tsx, ui/input-otp.tsx (composants shadcn jamais importés, aux
  dépendances absentes), examples/document-examples.ts (orphelin).
- Corrections réelles : icône de repli du Toast jamais importée (plantage
  possible), doublon d'export IMG_PRODUIT_AUTRE (le 2e visait « repas »),
  chemin du module responsive de la Sidebar, refreshAuditLogs présent au
  runtime mais absent du type ET de la valeur publiée du contexte BO,
  rôle « cooperateur » sans entrée sur les pages universelles Marché et
  Produits (écran cassé pour ce rôle), garde-fous divers.

## Nettoyé (passe 6 — v5.0.0.12, 11/08/2026) : câblage des fonctions mortes

- **Compteur « réponses du support non lues » : CÂBLÉ.** Le backend n'offre
  aucun endpoint « lu » côté utilisatrice (seul `PATCH :id/lu` existe, côté
  back-office → `lu_par_bo`) : un compteur branché sur `reponses[].lu` ne se
  serait JAMAIS vidé. Solution honnête : mémoire de lecture LOCALE
  (`services/supportLu.ts`, module pur testé — `npm run test:support`).
  Ouvrir l'écran Support marque tout vu ; SupportCardProfil affiche le vrai
  compte (fini le `0` en dur), SupportContact utilise la même source.
- **Marché virtuel sans sous-profil : EXPLIQUÉ.** Un marchand sans
  `sous_profil_marchand` voyait des onglets vides sans comprendre pourquoi.
  Bandeau clair ajouté (MarcheVirtuel) : « vois ton identificateur… ».
- **Distribution de stock (coopérative) : NON câblée, décision motivée.**
  Le backend NEUTRALISE volontairement `POST cooperatives/distribution`
  (« feature stock non finalisée… aucune écriture », cooperatives-rest.
  controller.ts) : câbler la saisie de quantité côté frontend simulerait un
  succès mensonger. À construire backend d'abord, frontend ensuite.
- **« Bug latent » publications : CLASSÉ NON-BUG, preuve backend.**
  L'intention « mes publications actives » est déjà honorée côté serveur :
  `GET /publications` force `WHERE p.user_id = $1` (publications-rest).
  L'adaptateur sans filtre renvoie donc DÉJÀ uniquement les publications de
  l'utilisatrice. Ligne fermée.

## Fonctions jamais câblées : section VIDÉE (v5.0.0.13, 11/08/2026)

- ~~Saisie vocale de l'objectif (ObjectifModal)~~ : **CÂBLÉE.** L'option
  `onResult` n'a jamais existé sur useVoiceCore — le rappel n'était jamais
  appelé, le bouton « Dis ton objectif » n'écrivait rien. Rebranchée sur le
  rouage de la connexion : `startLiveDictation` (sherpa hors-ligne) +
  `extraireNombreBambara` (lit « 12 500 » ET « waa duuru »). Le montant se
  remplit à l'écran au fil de la voix, ~2 s de silence rangent le micro,
  filet dur 15 s, micro coupé à la fermeture du modal. Hors APK : message
  honnête (« la voix marche dans l'application »), clavier en filet.
  À vérifier au runtime sur l'APK à la prochaine recette.

## Résidus connus, assumés, à traiter

- ~~241 erreurs TypeScript baseline~~ : **ÉLIMINÉES le 11/08/2026**
  (v5.0.0.7 → v5.0.0.10, cinq paquets, zéro erreur introduite). Nouvelle
  règle : `npm run verify` (typecheck 0 + 9 suites) doit être vert avant
  tout push — le zéro est un invariant, plus une baseline.
- ~~`styles/soleil.css` v1 (sélecteurs d'attribut)~~ : **RETIRÉ le
  11/08/2026 (v5.0.0.16)**, avec une découverte : preuve au Chromium que le
  navigateur normalise les hex en rgb() dans l'attribut style — les 8
  sélecteurs `[style*="color:#…"]` n'ont JAMAIS matché (seuls les rgba
  fonctionnaient). La vraie couverture est la migration tokens, achevée
  pour les `color:` inline : ~180 usages des gris pâles (#6B7280, #9CA3AF,
  #aaa, rgba(124,98,80,α)) migrés vers var(--encre-3)/var(--encre-4) sur
  toute l'app (BO compris), ternaires inclus. soleil.css ne garde que le
  zoom et la base rem. RESTE hors périmètre (le bloc v1 ne les couvrait
  pas non plus) : les gris affectés à des VARIABLES (`const color = …`,
  souvent alpha-concaténées `${color}15` — un var() casserait), les props
  d'icônes/Badge (`color="#6B7280"`, attribut SVG sans var()), et les
  fonds/bordures. À reprendre écran par écran, à froid.
- ~~`imports/*-api.ts`~~ : **RELOGÉS le 11/08/2026 (v5.0.0.17)** dans
  `app/services/api/` (17 modules, 49 importeurs réécrits), avec DEUX
  découvertes : (1) `tsconfig.json` EXCLUAIT `src/imports` du typecheck —
  toute la couche API n'a jamais été typée ; l'exclusion est levée et la
  couche entre au portail avec ZÉRO erreur ; (2) quatre fichiers morts
  supprimés : academy-api, backoffice-api, backoffice-color-theme (aucun
  importeur) et `server.ts` — un vestige d'edge function Deno/Hono/Supabase
  qui importait `npm:hono` et un `kv_store.tsx` inexistant.
- ~~`TextSizeSlider` quasi cosmétique~~ : **BRANCHÉ POUR DE VRAI le
  11/08/2026 (v5.0.0.15).** Décision : ni rem partout (gros chantier), ni
  retrait (la fonctionnalité a du sens) — le curseur pilote un ZOOM réel sur
  `<body>` (`utils/tailleTexte`, 85 % → 130 %, testé au tsx), la même
  mécanique éprouvée que le mode soleil sur `<html>` (les deux se
  multiplient). L'écriture inline de `--font-size` est supprimée — elle
  écrasait la base relevée du mode soleil (bug silencieux).
- ~~Doublon d'accueil `greetTitle` (connexion)~~ : **UNIFIÉ le 11/08/2026
  (v5.0.0.15).** Le prénom d'accueil lit d'abord le compte mémorisé
  (`comptesMemorises`, source de vérité, survit à la déconnexion),
  `julaba_auth_user` en simple repli.
- ~~`ThemeContext` (mode sombre 18h-6h) coexistant avec le mode soleil~~ :
  **UNIFIÉS le 11/08/2026 (v5.0.0.14).** `utils/confortVisuel` est l'arbitre
  UNIQUE des trois modes (normal / soleil / sombre) : une seule classe sur
  <html> à la fois (les classes `soleil` et `dark` ne peuvent plus se
  cumuler), migration de l'ancienne clé `julaba_dark_mode`, ThemeContext
  délègue (API conservée : isDark/toggleDark/auto 18h-6h). Les tokens
  `--encre*`/`--trait` ont enfin leur surcharge `html.dark` — avant, les
  écrans migrés aux tokens affichaient une encre NOIRE sur fond sombre.
  Parité soleil/sombre verrouillée par `npm run test:tokens`.
