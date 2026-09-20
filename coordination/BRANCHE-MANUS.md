# Branche Manus — stabilisation production Jùlaba

**Branche :** `manus/stabilisation-production`  
**Point de départ :** `claude/clever-allen-dnr8by@b65354fb4be51aa895a905f2d7e0fc408a101d00`  
**Création :** 19 septembre 2026  
**Statut :** branche d’intégration indépendante ; aucun merge direct vers `main` sans revue comparative.

## Point de contrôle — 20 septembre 2026

La branche Manus a intégré explicitement `claude/clever-allen-dnr8by@960b452`, puis ajouté le commit autonome `ad9ca89` : **une vente ou une dépense gardée dans la file hors ligne n'est plus annoncée comme réussie ou enregistrée par le serveur**.

Le contrat partagé retourne désormais `confirmee` ou `en_attente` jusqu'aux écrans tactile et vocal. En attente, Jùlaba affiche un état ambré, dit que l'opération est gardée sur le téléphone et qu'elle n'est pas encore envoyée, n'émet pas la vibration de succès et ne propose pas de reçu comme si la vente était définitive. Les rejets métier 4xx restent des erreurs visibles et ne sont pas maquillés en attente.

**Preuves sur l'arbre combiné Manus + Claude :** installation `npm ci`, typecheck frontend, suite CI frontend, 27 suites / 207 tests unitaires backend, 45 suites / 233 tests d'invariants backend et build frontend/backend réussis. Le build confirme 137 clips vocaux pré-cachés. Aucun déploiement de production n'a été déclenché.

## Point de contrôle UX/UI et voix — 20 septembre 2026

La branche Manus inclut désormais intégralement `claude/clever-allen-dnr8by@482dd7a`. Les améliorations ont été appliquées au code existant, sans créer de seconde application : contrat de dépense et synchronisation honnête, micro réactif, guidage Auto non muet, langues locales incomplètes marquées « en préparation », onboarding sans pseudo-voix Tata, pavé montant XXL partagé, cartes produit entièrement tactiles, pictogrammes offline, accueil pilote sans Keiwa, Tata unique sur mobile et desktop, entrée unique et niveaux vocaux réellement appliqués.

Le pack français historique est maintenant décrit par un registre reproductible : **137 fichiers**, **128 clips mappés**, **9 actifs orphelins**, empreintes SHA-256 et durées. Son statut reste volontairement `audit_requis` : le code ne prouve pas seul le consentement, l'accent ni la compréhension humaine, et les neuf intros restent à enregistrer.

La validation combinée après synchronisation Claude a réussi : `npm ci`, typecheck, toute la suite `test:ci`, **28 suites / 210 tests unitaires backend**, **45 suites / 233 tests d'invariants backend**, build frontend/backend et pré-cache de **137 clips**. La synchronisation Capacitor vers Android réussit. La compilation APK locale s'arrête avant compilation parce que ce sandbox ne possède ni `ANDROID_HOME` ni `android/local.properties`; ce point doit être confirmé par le workflow APK GitHub ou une machine Android équipée, pas interprété comme un défaut du code.

La recette visuelle automatisée à **390 × 844** confirme l'absence de débordement horizontal, des cartes produit d'environ **174 × 244 px** et des touches de montant d'environ **113 × 58 px**. Tata s'ouvre aussi réellement depuis la sidebar à **1280 × 800**. L'écoute par utilisatrices ivoiriennes et la recette sur téléphone Android physique restent les gates humaines obligatoires.

## Objectif

Cette branche permet à Manus de corriger et valider le socle de production Jùlaba sans perturber le travail parallèle de Claude. Elle cible d’abord la fiabilité, l’intégrité financière, l’expérience marchande inclusive et la cohérence web/APK. Les nouvelles fonctions de scoring et de tontine restent hors de cette branche tant que les gates de stabilisation ne sont pas closes.

## Règles de travail

1. Manus ne pousse ni sur `main` ni sur `claude/clever-allen-dnr8by`.
2. Chaque correction correspond à un défaut démontré, à un test rouge avant correction et à un commit autonome.
3. Les modifications d’argent, de crédit, de stock, d’authentification et de synchronisation exigent un test d’intégration ou d’invariant.
4. Les changements UX doivent préserver un parcours utilisable par une vendeuse peu alphabétisée : libellés visibles, cibles tactiles suffisantes, messages honnêtes et actions risquées confirmées.
5. Une opération hors ligne mise en attente ne doit jamais être annoncée comme confirmée par le serveur.
6. Les promesses vocales doivent distinguer clip humain Tata Nanti Lou, synthèse vocale générique et absence de couverture.
7. Aucun résultat local n’est présenté comme livré tant que le web, l’API et l’APK ne sont pas rattachés au même manifeste de release.

## Découpage recommandé

Les corrections seront développées en petits lots, idéalement sur des branches filles `manus/fix-*` fusionnées ensuite dans `manus/stabilisation-production` après validation :

1. **Contention financière :** blocage serveur temporaire des routes crédit et BPay dangereuses.
2. **Crédit fiable :** transaction unique, idempotence, dette réconciliée et contrôle de concurrence.
3. **Offline honnête :** statuts distincts « confirmé », « en attente » et « refusé ».
4. **UX pilote espèces :** onboarding explicite, confirmations sûres et cibles tactiles.
5. **Release unique :** versions, SHA, manifest et artefacts web/API/APK corrélés.
6. **Tata Nanti Lou :** contrat de couverture par clé et séparation stricte des clips humains et de la TTS.

## Synchronisation avec Claude

Avant chaque lot Manus :

```bash
git fetch origin
git log --oneline --left-right --cherry-pick \
  origin/claude/clever-allen-dnr8by...origin/manus/stabilisation-production
```

Si Claude a modifié le même domaine, la décision est prise avant de coder : reprendre son correctif, conserver le correctif Manus, ou combiner les deux. Les changements de Claude sont intégrés dans la branche Manus par un merge explicite à un point de contrôle, jamais par copie manuelle invisible.

À la fin de chaque lot, les preuves minimales sont : installation propre, typecheck, build, tests unitaires, invariants PostgreSQL pertinents, état Git propre et résumé des fichiers modifiés.

## Comparaison finale

La décision finale ne consiste pas à fusionner automatiquement les deux branches. Elle repose sur trois vues :

```bash
# Commits propres à chaque ligne
git log --left-right --cherry-pick --oneline \
  origin/claude/clever-allen-dnr8by...origin/manus/stabilisation-production

# Diff fonctionnel complet
git diff --stat origin/claude/clever-allen-dnr8by...origin/manus/stabilisation-production
git diff origin/claude/clever-allen-dnr8by...origin/manus/stabilisation-production

# Risque de fusion sans toucher aux branches
git merge-tree $(git merge-base \
  origin/claude/clever-allen-dnr8by \
  origin/manus/stabilisation-production) \
  origin/claude/clever-allen-dnr8by \
  origin/manus/stabilisation-production
```

Chaque différence sera classée en **garder Claude**, **garder Manus**, **combiner**, **abandonner** ou **arbitrage produit nécessaire**. Le merge final vers une branche de release ne sera proposé qu’après tests de la combinaison retenue.

## Interdictions pendant la stabilisation

- Pas de force-push sur une branche partagée.
- Pas de fusion directe vers `main`.
- Pas de déploiement de production depuis la branche Manus sans décision explicite.
- Pas de réactivation crédit/BPay par simple drapeau frontend.
- Pas de claim « corrigé en production » sur la base d’un build local.
- Pas d’ajout scoring/tontine dans les lots de stabilisation.

## Références

[1]: https://github.com/SOMET1010/julaba-app/tree/manus/stabilisation-production "Branche Manus de stabilisation Jùlaba"
[2]: https://github.com/SOMET1010/julaba-app/tree/claude/clever-allen-dnr8by "Branche Claude active Jùlaba"
