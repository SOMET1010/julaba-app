# Audit du parcours vocal d'une marchande non-lectrice — 29/10/2026

- Branche auditée : `dev`
- Périmètre : onboarding, authentification, Tata Nanti Lou, création produit, caisse, mode hors ligne, accessibilité.
- Références : ` .ai/TEST_PLAN.md`, `.ai/ACCESSIBILITY_GUIDE.md`, `.ai/CHANGELOG.md`, `.ai/AUDITS/LOT-50-CONNEXION-VOIX-2026-10-26.md`, `maestro/README.md`.
- Nature : audit documentaire et statique via les fichiers du dépôt. Aucun APK n'a été exécuté pendant cet audit.

## Verdict

La branche contient des mécanismes voice-first importants et plusieurs scénarios de navigateur documentés. Cela ne prouve pas encore qu'une marchande qui ne lit ni n'écrit peut effectuer seule toutes les opérations sur un téléphone Android réel.

Formulation produit à conserver pour l'authentification : **« Tout se dit, sauf le secret. »** Le code secret reste tactile par décision de sécurité; les consignes et erreurs doivent être vocalisées et rendre le pavé compréhensible.

## Constats étayés

### Authentification
- Le lot 50 décrit la dictée du numéro et les commandes vocales « oui », « recommencer » et « utiliser les chiffres ».
- Le code secret n'est pas dicté à voix haute, intentionnellement.
- La recette Android réelle reste ouverte. Il faut tester le parcours sur APK, pas seulement dans le navigateur.

### Ajout de produit
- Le CHANGELOG du 26/10 décrit une recette navigateur qui dicte le nom, l'unité, le prix et la quantité, avec relances et relecture.
- Le stock inconnu est représenté par `null`, et non par zéro, selon cette même entrée.
- La preuve navigateur n'est pas une preuve de reconnaissance Sherpa-ONNX sur appareil dans le bruit d'un marché.

### Caisse et opérations
- Des tests d'invariants et des recettes E2E couvrent une partie des opérations financières et de l'idempotence.
- Les cinq flux Maestro existants sont des sentinelles de version / interface. Le README précise qu'ils n'ont jamais été exécutés.
- Le flux hors ligne photographie avant et après; son propre commentaire indique que le contrôle de l'absence de doublon reste humain.

### Accessibilité
- Le guide fixe WCAG 2.1 AA, des cibles tactiles d'au moins 44 px et une exigence voice-first.
- Le guide signale l'absence de tests a11y automatisés en CI, plusieurs systèmes de modales et des chaînes d'interface principalement en français malgré les préférences de langue exposées.
- Une interface qui parle uniquement français n'est pas suffisante pour les marchandes qui comprennent mieux le dioula ou le bambara.

## Écarts prioritaires

| ID | Priorité | Écart / risque | Critère d'acceptation |
|---|---|---|---|
| VOICE-AUD-01 | P1 | Authentification non validée sur appareil réel | Un parcours complet est réussi sur APK : numéro dicté, confirmation vocale, accès au code, saisie privée du secret, arrivée dans l'espace marchand; erreurs et reprises entendues. |
| VOICE-AUD-02 | P1 | Compréhension des annonces audio non prouvée en environnement réel | Sur appareil réel, chaque étape annonce quoi faire, attend la réponse, relance après silence/incompréhension et confirme le résultat sans chevauchement. |
| VOICE-AUD-03 | P1 | Ajout de produit validé surtout par recette navigateur | Le nom, l'unité, le prix et la quantité sont dictés dans l'APK; la donnée persistée est relue et comparée à la base. « Je ne sais pas » conserve un stock inconnu, sans fausse alerte de rupture. |
| VOICE-AUD-04 | P1 | Parcours vente vocal complet non prouvé ici | Une marchande peut choisir un produit, annoncer la quantité, entendre le montant total, confirmer avant encaissement et entendre un succès uniquement après persistance. |
| VOICE-AUD-05 | P1 | Recette hors ligne manuelle et Maestro non exécuté | Après une vente hors ligne, fermeture/réouverture et reconnexion, exactement une vente est persistée et le total caisse est cohérent. |
| VOICE-AUD-06 | P1 | Compréhension par les utilisatrices non-lectrices inconnue | Au moins trois utilisatrices cibles réalisent les parcours prioritaires sans aide; chaque hésitation, action erronée et demande d'assistance est consignée. Ce nombre est un minimum de recette, pas une preuve statistique. |
| VOICE-AUD-07 | P1 | Langues locales pas garanties sur tous les écrans | Inventaire des annonces et chaînes critiques; aucune étape critique ne repose sur une langue que l'utilisatrice ne comprend pas. Valider les traductions audio avec des locutrices natives. |
| VOICE-AUD-08 | P2 | Pas de contrôle a11y automatisé documenté en CI | Ajouter des tests automatisés ciblés aux parcours Web critiques, sans prétendre qu'ils remplacent l'essai vocal sur Android. |

## Plan de recette à exécuter sur appareil Android

1. Installer l'APK construit depuis le SHA exact de `dev`; noter SHA, version, appareil et moteur vocal actif.
2. Premier lancement avec données effacées : vérifier qu'un retour audio compréhensible arrive sans devoir lire.
3. Authentification : dictée du numéro, confirmation vocale, recommencer, pavé de secours, code secret saisi en privé, erreurs de numéro et de code.
4. Ajouter un produit au nom libre : dicter nom, unité, prix et quantité; tester silence, réponse incomprise, quantité dite d'avance, « passe » et « je ne sais pas ».
5. Vente : écouter le récapitulatif, corriger avant confirmation, vérifier montant et persistance.
6. Mode hors ligne : effectuer une opération, fermer et rouvrir l'app, rétablir le réseau, vérifier l'absence de doublon dans la caisse et la base.
7. Répéter dans un environnement calme puis bruyant; vérifier les consignes, les relances et l'absence de voix qui se chevauchent.
8. Faire exécuter les mêmes parcours par des utilisatrices non-lectrices qui comprennent la langue audio utilisée.
9. Consigner chaque résultat comme PASS / FAIL / BLOCKED avec preuve (vidéo ou capture, logs non sensibles, SHA de l'APK). Ne jamais enregistrer le code secret dans les preuves.

## Règle de sortie

Ne pas annoncer « parcours entièrement vocal validé » avant que les étapes 1 à 8 soient terminées. Les tests navigateur, les tests unitaires et les fichiers Maestro écrits mais non exécutés ne remplacent pas cette recette.

## Limites de cet audit

Aucun code applicatif n'a été modifié par ce document. Aucune commande de test, installation APK, reconnaissance micro sur appareil réel, ni consultation de base de données n'a été exécutée dans cette session. Les constats ci-dessus s'appuient sur les documents et descriptions de tests présents sur `dev`; les états runtime restent à établir.
