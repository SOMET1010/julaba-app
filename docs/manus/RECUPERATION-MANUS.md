# Récupération contrôlée du travail Manus — inventaire A / B / C

**Décidé par Patrick le 20/09/2026.** Claude devient l'unique rail actif et la source de
vérité fonctionnelle. Manus n'est plus une branche à fusionner, c'est **une source à
récupérer**. Interdiction de fusionner `manus/refonte-ui-ux-voix` en bloc.

**Règle d'or.** UNE caisse. UNE logique métier. UNE source de vérité. Claude maintient le
socle ; l'UI et la voix viennent se poser dessus sans le réinventer.

**Règle de reprise (point 4).** Toute différence *fonctionnelle* Manus est **non autorisée
par défaut**. Elle n'entre que si l'on démontre : bug réel → reproduction → test rouge →
correction pertinente → test vert **après intégration sur le socle Claude**. Ce n'est
jamais le patch Manus qui entre tel quel : c'est un lot Claude qui reprend son idée.

**Règle de non-régression (point 6).** Aucune récupération graphique ou vocale ne fait
assouplir un invariant financier ou métier. Si un garde-fou rougit, c'est la récupération
qui plie, pas le garde-fou.

**Règle de fidélité visuelle (Patrick, précision du 20/09).** On ne choisit pas « Claude
contre Manus ». La cible est **le socle fonctionnel Claude avec le design, l'UX et la voix
Manus validés**. Le design produit par Manus est à **conserver**, pas à refaire : il ne
faut pas revenir visuellement à l'ancienne version Claude là où Manus avait déjà amélioré
un écran. Pour la caisse en particulier, on garde l'habillage, la hiérarchie visuelle, les
composants, les espacements, les états, les pictogrammes, les coupures, le responsive et
les éléments d'accessibilité, **tant qu'ils ne modifient pas la logique métier**.
Conséquences pratiques :
- chaque récupération se fait **à fidélité visuelle maximale**, écran par écran, en
  comparant l'écran Manus et l'écran obtenu après reprise ;
- **aucune refonte graphique nouvelle** n'est engagée : on récupère l'existant, on ne le
  réinvente pas ;
- la catégorie **A n'est donc pas une liste d'agréments optionnels** : c'est le design
  validé, et le laisser de côté serait une régression au même titre qu'un test rouge ;
- quand un fichier mêle habillage et logique — `POSCaisse.tsx` en est le cas type — on
  prend l'habillage **en entier** et on laisse la logique au socle. C'est la ligne de
  découpe, pas un choix entre les deux versions.

---

## Périmètre mesuré

| Base | Valeur |
|---|---|
| Socle Claude | `dad1136` (registre rév. 26) |
| Tête Manus | `2e8fc04` (branche `manus/refonte-ui-ux-voix`, PR #245 + 2 commits) |
| Fichiers différents | **167** |
| dont corpus multilingue (`docs/langues/manus-draft-2026-09-20`) | 47 |
| dont clips prototype `public/voix/fr-CI/prototype` | 16 |
| dont images redesign | 3 |
| **fichiers de code et de configuration** | **104** |

Source d'analyse : contre-audit QA de la PR #245 (journal des lots, révision 24) et
vérifications refaites sur `dad1136` pour les points fonctionnels.

---

## A — À RÉCUPÉRER

*UI, UX, design, responsive, accessibilité, voix, sans incidence fonctionnelle. **Design
validé à conserver**, pas à refaire : fidélité visuelle maximale, comparaison écran par
écran. Entre après passage des tests existants de la caisse, en lots courts.*

### A1. Renommage « Tata » → « Tantie Nanti Lou » (17 fichiers, 0 ligne hors renommage)
`assets/images.ts`, `academy/UniversalAcademy.tsx`, `academy/types.ts`,
`backoffice/BOInstitutionsPermissions.tsx`, `backoffice/BOLayout.tsx`,
`cooperative/Membres.tsx`, `identificateur/IdentificateurHome.tsx`,
`institution/InstitutionHome.tsx`, `layout/ErrorBoundary.tsx`, `producteur/Stocks.tsx`,
`shared/ModeAccesSwitcher.tsx`, `shared/RoleDashboard.tsx`, `shared/UniversalProfil.tsx`,
`hooks/useScoreJULABA.ts`, `pages/StudioVoix.tsx`, `services/loginVoiceScript.ts`,
`config/responsive.ts`.
→ Sans risque. À prendre en un seul lot de renommage.

### A2. Composants et styles d'affichage
`shared/PaveMontant.tsx` (+ son test), `shared/Montant.tsx`, `ui/UniversalKPI.tsx`,
`hooks/useMontantsPrives.ts` (+ test), `shared/VoiceLevelSelector.tsx`,
`marchand/MarchandAlertes.tsx`, `marchand/MarcheVirtuel.tsx`,
`marchand/RecoltesPrevues.tsx`, `marchand/GestionStock.tsx`,
`marchand/MarchandDepenses.tsx`, `marchand/ResumeCaisse.tsx`,
`assistant/TantieSagesseModal.tsx`, `data/catalogue-produits.ts` (pictogrammes + repli),
`styles/commerce.css`, `styles/login.css`, `assets/redesign/*.webp` (3).
→ Contrôle obligatoire : `test:tokens`, `test:taille`, `test:confort`, `caisseCharte`.

### A3. Mise en page et micro unique
`layout/AppLayout.tsx`, `layout/BottomBar.tsx`, `layout/Sidebar.tsx` : la modale Tantie
n'est montée qu'une fois, masquée sur la caisse (VOIX-03 préservée).
→ **Conflit connu** : `AppLayout.tsx` porte l'instrumentation du lot E (`vtrace.ecran`).
Les deux doivent coexister ; le garde-fou du lot E est l'arbitre.

### A4. Argent affiché (valeurs inchangées)
`marchand/CoupureDessinee.tsx`, `utils/fcfa.ts` + `fcfa.test.mts` : 500 F passe de billet à
pièce, repères BCEAO. `decomposerMonnaie` rend les mêmes valeurs.
→ **Conflit connu** avec le lot F (`direCoupure` déménage au lexique). À récupérer
**après** le lot F, sinon le conflit se résout deux fois.

### A5. Voix — actifs et outillage
16 clips `public/voix/fr-CI/prototype/*.mp3` + `manifest.json` (947 Ko),
`public/voix/registre-tata-fr-ci.json`, `scripts/generer-registre-voix.mjs`
(registre reproductible : 137 fichiers, 128 mappés, 9 orphelins, SHA-256).
→ Les clips entrent comme **actifs**, sans la politique « muet par défaut » (voir C4).

### A6. Langues affichées comme non disponibles
`shared/UniversalParametres.tsx` : Dioula et Bambara grisées, « en préparation ».
→ **Conflit connu** : le lot E a ajouté le bouton « Rapport de test » dans ce fichier.

### A7. Documents de recette terrain
`docs/qa/AIDE-MEMOIRE-MODERATEUR-UX.md`, `docs/qa/FICHE-ANOMALIE-UX.md`,
`docs/qa/GRILLE-OBSERVATION-UX-VENDEUSES.csv`,
`docs/qa/SCRIPT-AUDIT-UX-MOBILE-VENDEUSES.md`, `maestro/02-connexion.yaml`.
→ Utiles pour la recette avec les marchandes. Sans effet sur le code.

### A8. Tests d'écran, **dans `verify` uniquement**
`test-accueil-pilote.mjs`, `test-entree-unique.mjs`, `PaveMontant.test.mts`,
`useMontantsPrives.test.mts`, `test-nom-tantie-nanti-lou.mjs`,
`caisseSurfaceUnique.test.mts` (renforcé : raccourci panier collant).
→ `test:ci` reste **gelée** : voir C1.

### A9. Habillage de la caisse
`marchand/MicroVenteCaisse.tsx` (CSS et libellés), `marchand/POSCaisse.tsx` **partie
graphique seulement** (pavé de montant, choix chiffres ou coupures, raccourci panier
collant, pictogrammes), `marchand/SyncEchecsBanner.tsx` (affichage des opérations en
attente), `marchand/MarchandModals.tsx` (masquage des montants, retrait d'une fausse zone
« Comptage réel » sans champ ; le vrai champ de clôture est conservé).
→ Invariants vérifiés intacts par le QA : ligne du micro seule, deux appels de chaque
fonction de rendu, aperçu quatre cartes, tokens `--caisse-*`, aucune couleur en dur.
→ `MicroVenteCaisse` perd l'aide « Dis ce que tu as vendu de {produit} » : à **conserver**
chez nous, c'est une aide vocale utile.

### A10. Écrans liés aux lots en attente
`marchand/CreditModal.tsx` (1 ligne), `marchand/VentesPassees.tsx` (indicateurs repliés),
`contexts/AppContext.tsx` (partie affichage).
→ À récupérer **après** le lot B (crédit) : ce sont exactement les lignes du double compte.

---

## B — À EXAMINER

*Peut corriger un défaut réel. Rien n'entre sans la chaîne de preuve du point 4. Le
correctif est écrit sur le socle Claude, pas repris tel quel.*

### B1. Libellé de dépense perdu — dette **DEP-01** (P1, déjà ouverte au registre)
Manus : `backend/src/caisse-rest/caisse-rest.controller.ts`
(`descriptionDepenseDepuisBody`, lit `description ?? notes`), `services/api/caisse-api.ts`
(types), `backend/test/unit/depense-description.spec.ts`.
Défaut vérifié sur notre socle : le téléphone envoie `notes`, le backend lit `description`.
**Ce que nous faisons** : reproduction par un invariant sur `POST /caisse/depense` **et**
sur le rejeu d'une file hors ligne portant `notes`, puis correction côté Claude. Le
backend est notre périmètre, pas celui de Manus. Le test de Manus ne teste que son helper
neuf : il ne remplace pas la reproduction.

### B2. Vente hors ligne annoncée « réussie » — dette **OFF-01** (P1, déjà ouverte)
Manus : `services/statutOperationCaisse.ts` (module pur testé),
`contexts/CaisseContext.tsx`, `voice-offline/offlineCaisse.ts` (+ test, champ `cause`),
`marchand/DepenseForm.tsx`, `services/tataMarchandActions.ts`.
Défaut vérifié sur notre socle : écran « Vente réussie » et vibration de succès alors que
l'opération n'est qu'enfilée. **L'idée est bonne, la livraison est incomplète** : le
branchement sur la vente a été perdu dans les fusions Manus ; seule la dépense est honnête
chez lui. **Ce que nous faisons** : notre propre frontière « confirmée / en attente », un
test rouge sur la caisse, et l'écran, la vibration et la voix qui disent « gardée » tant
que le serveur n'a pas répondu. `enregistrerVente` est du chemin d'argent : lot Claude.

### B3. Micro lent au démarrage sur Android
Manus : `voice-offline/offlineStt.ts` — une première sonde négative du moteur hors ligne
n'est plus mémorisée pour toute la session ; ajoute `verifierOfflineModel()`.
Défaut plausible et cohérent avec le terrain (le plugin monte après l'écran). **Ce que
nous faisons** : reproduction par un test de la sonde, puis reprise. Petit, isolé, utile.

### B4. Refus explicite hors ligne avant une action de commande
Manus : `marchand/MesCommandes.tsx`. Empêche une action de commande sans réseau au lieu de
la laisser échouer en silence. Même famille qu'OFF-01. À reprendre avec sa preuve.

### B5. Mécanisme de niveau de voix
Manus : `services/audioManager.ts` (`setVoiceLevel`, `resoudreNiveauVoix`,
`importancePourTexte`), `contexts/AppContext.tsx`, `shared/VoiceLevelSelector.tsx`,
`services/voiceLevel.test.mts`.
**À séparer en deux** : le *réglage* (une marchande choisit d'entendre moins) est
souhaitable ; le *défaut* « Essentiel » après connexion ne l'est pas, il rend muets « Compte
juste », « Je n'ai pas compris » et les accueils. De plus le silence décidé par le niveau
n'est **pas journalisé** (limite L4 de GARDE-02). **Ce que nous faisons** : reprendre le
réglage avec « Complet » par défaut, et tracer tout silence dans le journal de voix.
`importancePourTexte` classe par expression régulière sur le français : inopérant dès la
première langue locale ; l'importance doit venir du catalogue (lot F), pas du texte.

### B6. Hors ligne du service worker
Manus : `public/sw.js`, `vite.config.ts`, `src/main.tsx`,
`scripts/test-offline-first-update.mjs`. Intention juste (images et polices disponibles
hors ligne), coût mesuré excessif : le précache passe de 4,6 Mo à **13 à 18 Mo** attendus
à la première installation, sur données mobiles. **Ce que nous faisons** : garder les
polices et les images d'interface, refuser le « tout précacher », garder la voix en tâche
de fond, et mesurer sur un réseau lent avant d'entrer.

### B7. Langues non activables tant que l'audio n'est pas validé
Manus : `hooks/useLangPref.ts` — `LANGUE_PRETE` ; une langue mémorisée mais non prête
retombe sur le français.
**Recommandé** : c'est exactement le garde-fou qui neutralise la dette **I18N-01** (la
préférence « Dioula » changeait la grammaire d'encaissement). À reprendre **en plus** de la
correction du lot F, pas à la place.

---

## C — À ABANDONNER

*N'entre pas dans le socle. Ce qui est tranché ici ne se rediscute qu'avec une décision
explicite de Patrick.*

### C1. Modification de la chaîne `test:ci`
`frontend_src/package.json` : 12 scripts ajoutés **en tête de la chaîne gelée**.
→ La chaîne `test:ci` reste identique à `f0c965c`, valeur contre valeur. Les 12 tests sont
verts et statiques : ils entrent dans `verify` (voir A8). C'est la modification de la
chaîne qui est refusée, pas les tests.

### C2. Déploiement Netlify branché sur l'API de production
`frontend_src/public/_redirects` (proxy `/api/v1/*` vers `julaba-api.onrender.com`),
`scripts/test-netlify-auth-proxy.mjs`, et la preview publique associée.
→ Une prévisualisation publique ne pointe pas la production, et le dépôt ne porte pas un
troisième mode de déploiement à côté de Render et de l'APK. Si une recette en ligne est
voulue, elle vise un backend de recette et se décide séparément.

### C3. Montant reçu rendu obligatoire dans `handlePay`
`marchand/POSCaisse.tsx` (`montantRecuManquant`) et l'assertion ajoutée dans
`scripts/test-cible-tactile.mjs` qui **verrouille cette règle dans `verify`**.
→ C'est une **règle produit nouvelle**, pas une correction : notre code documente
l'inverse (« le bouton accepte un reçu à 0, la voix non »). Un garde-fou d'interface ne
décide pas d'une règle d'encaissement. **Décision Patrick** si la règle doit changer ; elle
serait alors écrite par nous, dans la machine, avec son invariant.

### C4. Voix muette par défaut
`services/entreeVoix.ts`, `services/onboardingVoix.ts`, `services/accueilMarchandVoix.ts`,
`services/voiceHonesty.test.mts`, `services/entreeVoix.test.mts`,
`services/accueilMarchandVoix.test.mts`.
→ Les clips ne jouent que sous un drapeau défini nulle part : accueil, onboarding, saisie
du numéro, saisie du code, erreurs de code et « Écouter ma caisse » deviennent
**silencieux**, et l'accueil ne dit plus le montant de la caisse. Cela contredit la
doctrine : aucune information importante uniquement en texte, aucune étape importante
uniquement tactile. Pour une marchande qui ne lit pas, c'est une régression.
→ **Ce que nous gardons de l'idée** : distinguer clip humain, synthèse et absence de
couverture, en le **disant**, jamais en se taisant.

### C5. Suppression du message « clip non enregistré »
`hooks/useVoiceCore.ts` : le message à l'écran disparaît, il ne reste qu'une trace console.
→ Aggrave **VOIX-04** (« clip absent ≠ silence »), qui reste OUVERTE et nous revient.

### C6. Garde-fou du micro affaibli
`marchand/caisseUnSeulMicro.test.mts` : la vérification accepte désormais l'une **ou**
l'autre forme de montage, sans exiger qu'il n'y en ait qu'une.
→ Un garde-fou ne s'assouplit pas pour faire passer une refonte. La version renforcée est
à écrire par nous.

### C7. Changement du parcours d'authentification
`components/auth/LoginPassword.tsx` (un échec de `check-phone` devient bloquant),
`app/routes.tsx` (`/login` et `/welcome` redirigés vers `/`).
→ Chemin d'authentification, en plein conflit avec le lot A (récupération de code). Aucun
défaut démontré ; la motivation était le proxy Netlify (C2). Les écrans d'entrée
(`Welcome.tsx`, `OnboardingSlides.tsx`, `PropositionReconnaissance.tsx`) sont récupérables
pour leur **habillage seulement**.

### C8. Note de coordination de la branche Manus
`coordination/BRANCHE-MANUS.md` : décrit une branche d'intégration parallèle qui n'existe
plus comme base. Remplacée par le présent document et par `docs/MANUS-REGLES.md`.

---

## Corpus multilingue — traité à part

`docs/langues/manus-draft-2026-09-20` (47 fichiers) : 168 clés provisoires par langue pour
19 langues, soit le **lexique** (110 nombres, 26 produits, 17 unités) et **15 intentions**.
Ce n'est pas du code et cela ne recoupe pas les 475 messages du catalogue. Deux réserves
avant tout usage :
- les 15 intentions mélangent écoute et parole sur une même ligne, dont quatre qui sont en
  réalité des phrases dites : elles doivent être scindées ;
- l'une propose une **nouvelle phrase de liste blanche** pour la validation d'encaissement.
  Elle n'entre pas sans validation native et sans le drapeau finance.
Le français marché entrera en surcharges marquées brouillon, jamais automatiquement.

---

## Ordre d'exécution proposé

1. Terminer les lots en cours sur le socle : F (i18n), A (récupération de code), puis B
   (crédit) et C (schéma) après décisions.
2. **Garde-fou permanent d'abord** (point 7) : la CI doit refuser qu'une évolution
   d'interface ou de voix modifie le chemin d'argent sans les invariants correspondants.
   C'est ce garde-fou qui rend les récupérations sûres.
3. Récupérer A par lots courts, dans l'ordre A1, A7, A2, A5, A3, A8, A9, A6, puis A4 après
   le lot F et A10 après le lot B.
4. Traiter B un défaut à la fois, chacun avec sa reproduction et son test.
5. C n'entre pas.
