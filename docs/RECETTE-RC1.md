# Recette terrain RC1 — Galaxy S24 Ultra

Objectif : prouver qu'une RC1 s'installe, fonctionne de bout en bout et accepte une mise à jour signée par-dessus sans perte de données.

## Préconditions
- APK construit depuis `release/rc1`, SHA noté.
- Même clé de signature release pour les deux builds.
- Téléphone : Galaxy S24 Ultra, Android 16.
- Ne pas désinstaller l'application entre les deux builds.

## Parcours A — fonctionnel
1. Installer le premier APK RC1.
2. Ouvrir JULABA et se connecter par SMS.
3. Dire : **« cinq piments »**.
4. Renseigner / confirmer le prix demandé.
5. Revenir à l'accueil.
6. Vérifier que la caisse annonce/affiche le **montant réel** et jamais un faux zéro.
7. Ajouter un produit à la voix.
8. Fermer complètement l'application puis la rouvrir.
9. Vérifier que les données créées sont toujours présentes.

PASS = aucune perte, aucun faux zéro, aucun crash, opération enregistrée une seule fois.

## Parcours B — mise à jour
1. Sans désinstaller le premier build, installer un second APK RC1 signé avec la même clé.
2. Ouvrir l'application.
3. Vérifier que la session et les données métier du parcours A sont conservées.
4. Rejouer une lecture de caisse et une saisie vocale.

PASS = Android accepte la mise à jour par-dessus et les données locales sont conservées.

## Logs utiles
Avec ADB disponible :

```sh
adb devices
adb shell dumpsys package com.julaba.app | grep -E "versionCode|versionName"
adb logcat -c
adb logcat | grep -iE "julaba|capacitor|SherpaStt|AndroidRuntime"
```

En cas d'échec d'installation :

```sh
adb install -r julaba-latest.apk
```

Conserver : SHA Git, SHA-256 de l'APK, résultat PASS/FAIL des deux parcours et extrait de log uniquement en cas d'échec.
