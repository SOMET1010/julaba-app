# AUDIT — Ajout de produit vocal — 2026-10-19

> **Mission** : auditer le système d'ajout de produit vocal selon `.ai/` et la
> doctrine voice-first.
> **Périmètre** : transcription, interprétation, ligne provisoire, confirmation,
> correction, produit inconnu, panier, offline, Web/APK, tests et documentation.
> **Mode** : lecture seule ; aucun correctif de code réalisé pendant cet audit.

## 1. Référentiel appliqué

- `.ai/WORKFLOWS.md` : user story et invariant testable, revue QA/a11y/perf,
  documentation et routage des bugs.
- `docs/SPEC_VENTE_VOCALE.md` : flux obligatoire
  `écoute → interprétation → ligne provisoire → répétition → confirmation → ajout`.
- `docs/parcours/WORKFLOW-VENTE.md` : comportement attendu pour produit connu,
  inconnu, prix, panier et reprise.
- `.ai/PROJECT_CONTEXT.md` et `.ai/ARCHITECTURE.md` : voice-first, caisse et
  argent comme modules sensibles, Sherpa natif dans l'APK.
- `.ai/TEST_PLAN.md`, `.ai/BUGS.md`, `.ai/REGRESSIONS.md` : stratégie de preuve
  et règles de routage.
- Dernier audit lu : `.ai/AUDITS/AUDIT-COMPLET-ACTEURS-2026-10-19.md`.

## 2. Verdict

**NON CONFORME — blocage avant validation du parcours vocal.**

La transcription et l'interprétation locales fonctionnent, mais le chemin
principal de vente vocale ne respecte pas le contrat financier : il ajoute une
ligne au panier avant confirmation explicite. Les tests ciblés sont verts, mais
plusieurs figent précisément ce comportement contraire à la spécification.

| Domaine | Verdict |
|---|---|
| Transcription / compréhension locale | Partiellement conforme |
| Ligne provisoire | **Non conforme** |
| Confirmation avant panier | **Non conforme** |
| Correction « non, deux » / prix | **Non conforme** |
| Produit inconnu | **Non conforme** |
| Reprise après fermeture | Non prouvée / non branchée |
| Web / APK | Contrat documentaire contradictoire |
| Tests de parcours réel | Insuffisants |

## 3. Constats priorisés

### P0 — Ajout au panier avant confirmation explicite

- **Preuves** : `frontend/src/app/components/marchand/MicroVenteCaisse.tsx:295-308,317-375` ; `frontend/src/app/services/vendreVocalUnifie.ts:279-333`.
- **Écart** : `confirmationBypassIntents: ['vendre', ...]` contourne la confirmation,
  puis `vendreVocalUnifie` appelle directement `deps.addToCart(...)` et annonce
  que l'article est déjà dans le panier.
- **Règle violée** : `docs/SPEC_VENTE_VOCALE.md:12-18,43-47,175-180`.
- **Impact** : une transcription erronée ou ambiguë devient immédiatement une
  ligne financière visible et encaissable, sans « oui » ni bouton vert.
- **Tests insuffisants** : `vendreVocalUnifie.test.mts:62-77` et
  `useVoiceCore.confirmationBypass.test.tsx:89-100` vérifient le bypass au lieu
  d'exiger l'absence d'ajout avant confirmation.
- **Action** : supprimer le bypass pour `vendre`, créer une ligne provisoire,
  puis n'appeler `addToCart` qu'après confirmation explicite.

### P0 — La machine de ligne provisoire n'est pas utilisée par le parcours réel

- **Preuves** : `frontend/src/app/services/vendreVocalUnifie.ts:279-317` ;
  fonctions disponibles dans `ligneProvisoire.ts` mais aucun branchement depuis
  le composant ou le contexte de caisse.
- **Écart** : aucune création de `LigneProvisoire` avec statut `a_confirmer`,
  aucune persistance, aucune reprise après fermeture.
- **Règle violée** : `docs/SPEC_VENTE_VOCALE.md:56-80`.
- **Impact** : interruption, démontage de modal ou fermeture de l'écran perd la
  décision intermédiaire ; le contrat documenté n'est assuré que par un module
  pur isolé.
- **Tests manquants** : fermeture/réouverture, abandon d'une ligne non confirmée,
  reprise d'une ligne confirmée non encore ajoutée, et vérification que le panier
  reste inchangé pendant `a_confirmer`.

### P0 — Produit inconnu injecté comme ligne libre sans adoption guidée

- **Preuves** : `frontend/src/app/services/vendreVocalUnifie.ts:306-316` ;
  `docs/parcours/WORKFLOW-VENTE.md:72-100,123-143`.
- **Écart** : lorsqu'un prix est résolu, un nom absent du catalogue devient
  directement une ligne `libre-*` dans le panier.
- **Règle violée** : un produit inconnu doit ouvrir une saisie préremplie,
  demander le prix, répéter la ligne et confirmer l'adoption au catalogue/panier.
- **Impact** : absence d'adoption métier, de validation du nom/unité/prix et de
  confirmation ; une vente peut garder un historique insuffisamment qualifié.
- **Tests insuffisants** : `vendreVocalUnifie.test.mts:89-99,135-145,160-176`
  attend explicitement l'ajout immédiat d'un produit inconnu.

### P1 — Correction vocale non raccordée

- **Preuves** : `MicroVenteCaisse.tsx:295-375` ; primitives disponibles dans
  `ligneProvisoire.ts:153-193` et `grammaireCorrection.test.mts:15-60`.
- **Écart** : le parcours vocal ne possède pas de transition réelle
  `CONFIRMATION_ATTENDUE → CORRECTION`. « Non, deux » ou une correction de prix
  ne modifie donc pas une ligne vocale provisoire.
- **Règle violée** : `docs/SPEC_VENTE_VOCALE.md:91-107`.
- **Impact** : la vendeuse doit repartir sur une nouvelle commande ou modifier
  le panier autrement ; « non » n'est pas garanti comme refus/correction et peut
  conduire à une seconde vente.
- **Test manquant** : composant réel avec correction de quantité, correction de
  prix, suppression, « non » et « annule », sans mutation du panier avant oui.

### P1 — Aucun test d'intégration du câblage réel

- **Preuves** : `POSCaisse.tsx:27-30,252-307` et
  `MicroVenteCaisse.tsx:238-272` ; couverture actuelle principalement par
  services purs et hook isolé.
- **Écart** : aucun test ne traverse `POSCaisse → MicroVenteCaisse →
  CaisseContext → panier` avec catalogue vide/produit connu/produit inconnu,
  prix ambigu, refus, double appui et encaissement.
- **Règle violée** : `.ai/WORKFLOWS.md:41-44,127-133` et
  `.ai/TEST_PLAN.md:137-145`.
- **Impact** : props, context ou branche de rendu peuvent casser le parcours
  réel tout en laissant les tests purs verts.

### P1 — Reprise de ligne provisoire non démontrée

- **Preuves** : sérialisation/désérialisation dans `ligneProvisoire.ts:205-239` ;
  aucun appel depuis le parcours réel ; ajout direct dans
  `vendreVocalUnifie.ts:279-317`.
- **Écart** : le module pur sait persister/reproposer, mais l'interface et le
  contexte ne l'utilisent pas.
- **Règle violée** : `docs/SPEC_VENTE_VOCALE.md:74-80`.
- **Impact** : fermeture ou interruption peut perdre la ligne intermédiaire ;
  `cartStorage` ne prouve pas la reprise d'une ligne non ajoutée.

### P2 — Contrat `unite` incomplet dans le type partagé

- **Preuves** : `frontend/src/app/voice-offline/localIntent.ts:36-40,223-231` ;
  `frontend/src/app/hooks/useVoiceCore.ts:37-45`.
- **Écart** : `localIntent` produit `unite`, mais `VoiceAction` ne le déclare
  pas. Les consommateurs doivent caster et peuvent perdre l'unité entre voix,
  ligne et panier.
- **Impact** : « cinq sacs de riz » peut être compris localement puis perdre
  `sacs` lors du câblage ou de l'affichage.
- **Test manquant** : test typé de bout en bout vérifiant `unite` dans l'action,
  la ligne panier et le payload final.

### P2 — Web/APK : documentation contradictoire

- **Contrat publié** : `docs/SPEC_VENTE_VOCALE.md:153-159` déclare le Web sans
  reconnaissance et avec repli tactile.
- **Comportement courant** : `webReco.ts:2-68` et son branchement dans le hook
  utilisent `SpeechRecognition`/`webkitSpeechRecognition` sur Web.
- **Impact** : la fonctionnalité Web est maintenant vocalement active sur les
  navigateurs compatibles, alors que la documentation promet l'inverse ; le
  navigateur peut également employer son propre service de reconnaissance.
- **Action** : arbitrer explicitement Web vocal (et ses garanties de données),
  puis mettre à jour la spécification, le plan de tests et les messages UX dans
  une même décision. Ne pas laisser code et contrat diverger.

### P3 — Les 14 scénarios terrain ne sont pas prouvés par le parcours réel

La spécification exige vente simple, plusieurs articles, prix unitaire/total,
correction, suppression, interruption, bruit, produit inconnu,
fermeture/reprise, offline, double appui et reprise panier
(`docs/SPEC_VENTE_VOCALE.md:161-173`). Les bancs actuels couvrent surtout les
fonctions pures ; ils ne prouvent pas la séquence complète dictée → relecture →
confirmation → panier → encaissement.

## 4. Preuves exécutées et limites

Les tests ciblés annoncés sont verts :

- `npm run test:vendre-unifie`
- `npm run test:provisoire`
- `npm run test:prix-ambigu`
- `npm run test:prix-catalogue`
- `npm run test:web-reco`

Ils démontrent le fonctionnement des briques isolées, mais certains tests
attendent l'ajout immédiat et valident donc l'écart P0 au lieu de la
spécification. Aucun test E2E réel du parcours vocal complet n'a été trouvé.

## 5. Plan de remise en conformité

1. Décider et documenter le contrat Web (repli tactile ou reconnaissance Web)
   avant de modifier les messages et les tests.
2. Introduire/brancher une machine de ligne provisoire dans le parcours réel,
   avec état `a_confirmer`, persistance et reprise.
3. Retirer `confirmationBypassIntents: ['vendre']` et interdire toute mutation
   du panier avant confirmation.
4. Brancher les corrections vocales (`non`, quantité, prix, suppression,
   annule) sur la même ligne provisoire.
5. Traiter le produit inconnu par saisie guidée préremplie et adoption explicite.
6. Ajouter les tests composant/E2E des 14 scénarios et promouvoir les tests qui
   figent actuellement le mauvais comportement.
7. Ajouter `unite` au contrat `VoiceAction` et prouver sa conservation.
8. Après correction : revue Reviewer, validation a11y/perf, QA E2E, mise à jour
   de `BUGS.md`, `CHANGELOG.md`, `TASKS.md` et, si la décision Web est majeure,
   un ADR conformément à `.ai/WORKFLOWS.md`.

## 6. Conclusion

Le moteur vocal n'est pas le point bloquant principal : la compréhension locale
est testée. Le blocage est transactionnel et UX : le parcours vocal n'applique
pas la frontière entre interpréter une commande et engager une ligne dans le
panier. Tant que les trois P0 ne sont pas fermés et prouvés par un test de
parcours réel, l'ajout vocal ne doit pas être déclaré conforme ni élargi en
production.
