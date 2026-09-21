# Recette technique — lot B sur téléphone réel

**Ce n'est pas la recette terrain avec les vendeuses** (`docs/RECETTE-TERRAIN-GROUPEE.md`,
qui reste la référence pour l'usage). Celle-ci est **technique** : elle vérifie
huit comportements que ni une base de données, ni un navigateur, ni un test
Node ne peuvent prouver, et qui sont tous nés des lots B1 à B7.

Compter **35 minutes**, un téléphone Android, un endroit à réseau mauvais ou le
mode avion, et de quoi noter.

Périmètre arrêté par Patrick le 21/09/2026. **Aucune nouvelle fonctionnalité
pendant cette passe.** Si un défaut apparaît : on le reproduit, on corrige
**uniquement ce défaut**, on reteste.

---

## Avant de commencer — deux avertissements qui comptent

### 1. Cet APK n'est PAS construit sur `main`, et c'est une exception assumée

`docs/RECETTE-TERRAIN-GROUPEE.md` dit de construire `main`, et il a raison :
c'est la règle **REL-01**, `main` est la seule référence qui ait traversé la
chaîne de preuve complète.

Mais **B2, B3, B4 et B6 ne sont pas sur `main`**. Un APK de `main` ne testerait
aucun des huit points ci-dessous. La construction se fait donc sur
`claude/clever-allen-dnr8by`, en **construction exploratoire explicite**.

Conséquence à tenir : **cette passe ne vaut pas GO pilote.** Elle vaut
GO/NO-GO *technique* sur le lot B. Le GO pilote reste attaché à un APK de
`main`. Noter le SHA exact construit, et ne pas laisser cet APK circuler comme
s'il était la version auditée.

### 2. Ce que cette passe ne peut pas prouver

- Le comportement sur **un autre modèle** de téléphone que celui testé.
- Le comportement sur un téléphone **réellement saturé** (moins de 300 Mo
  libres) si l'appareil de test ne l'est pas.
- La **durée de vie** d'une file hors ligne sur plusieurs jours.
- Tout ce qui dépend du **bruit réel du marché** — noter que le scénario 4
  s'en approche, sans le remplacer.

---

## Étape 0 — Obtenir l'APK

Onglet **Actions** du dépôt → **« APK pilote — construction à la demande »** →
**Run workflow**.

- **Branche** : remplacer `main` par **`claude/clever-allen-dnr8by`**.
- **URL de l'API** : laisser la valeur par défaut.

Compter ~3 minutes. Télécharger l'artefact.

**Noter maintenant, avant d'installer** : le SHA du commit construit (visible
dans le récapitulatif du workflow). Tout le reste de cette feuille s'y
rapporte.

---

## 1. Installation et premier lancement

**Préparation** : désinstaller toute version précédente de Jùlaba. Noter
l'espace libre du téléphone **avant** installation.

**Gestes**
1. Installer l'APK (« sources inconnues » à autoriser).
2. Noter l'espace libre **après** installation.
3. Lancer l'application, **réseau actif**, et laisser le premier écran
   s'afficher complètement sans rien toucher.

**Résultat attendu**
- L'installation aboutit sans erreur.
- Le premier écran s'affiche avec la **bonne police** (pas la police système
  du téléphone).
- Aucun écran blanc de plus de quelques secondes.

**Compte comme défaut** : installation refusée ; écran blanc persistant ;
police visiblement différente de la maquette ; plantage au lancement.

**Noter** : espace occupé (après − avant), en Mo.

---

## 2. Coût réel d'installation

### Référence arrêtée le 21/09/2026

```
Commit             : e7e7cad
Fichier            : app-debug.apk
Taille exacte      : 269 207 362 octets — 256,74 MiB / 269,21 MB
SHA-256            : efe72521cb55de15ae7b495de94cf98f1c1c8ab210992cb9462a06393efa0de0
ZIP de CI          : ~193,09 MB (compressé — ce n'est PAS la taille de l'APK)
Occupation installée : À MESURER SUR TÉLÉPHONE
```

**D'où viennent les 269 Mo** (lu dans `android/scripts/installer-voix.sh` et
`android/app/build.gradle`) :

| Élément | Taille |
|---|---|
| Bibliothèque native sherpa-onnx (AAR, **4 architectures**) | ~100 Mo |
| Modèle d'**écoute** FR « Kroko » (STT) | ~71 Mo |
| Modèle de **parole** FR siwis / Piper (TTS) | ~79 Mo |
| Application web (bundle + 137 clips + polices) | ~18 Mo |

**Ce n'est pas du gras : c'est le prix de « Tantie parle et entend sans
réseau ».** Ne pas le traiter comme un défaut.

> **Correction d'une erreur de la première version de cette feuille.** Elle
> demandait un ordre de grandeur « cohérent avec les 10,45 Mo » mesurés par
> B6. C'était faux : B6 n'a mesuré que la **couche web**. Le coût
> d'installation réel est dix fois supérieur et vit côté Android.

### Ce qui se mesure vraiment

**Le chiffre décisif n'est pas la taille de l'APK, ce sont les deux
suivants : l'espace libre AVANT installation, et l'espace restant APRÈS.**
Android a besoin de marge **au-delà** des 269 Mo pour décompresser et
optimiser l'application ; l'empreinte installée peut donc dépasser la taille
du fichier. C'est pourquoi un téléphone à **300 Mo libres est un cas limite**,
où l'installation peut échouer — et c'est exactement le téléphone visé.

**Préparation** : application fraîchement installée, jamais lancée hors ligne.

**Gestes**
1. Réseau actif, lancer l'application et attendre **2 minutes** sans rien
   toucher (le service worker finit de remplir son cache).
2. Réglages Android → Applications → Jùlaba → **Stockage**. Noter la taille de
   l'application **et** celle des données.
3. Fermer complètement l'application (la retirer des applications récentes).
4. **Passer en mode avion.**
5. Relancer l'application.

**Résultat attendu**
- L'installation **aboutit** — c'est déjà un résultat en soi sur un téléphone
  peu garni.
- L'application se lance hors ligne, **avec ses polices**, sans écran blanc.

**Compte comme défaut** : installation refusée faute de place ; lancement hors
ligne impossible ; polices de repli.

**Noter, dans cet ordre** :
1. espace libre **avant** installation ;
2. espace libre **après** installation ;
3. taille application et taille données (Réglages → Applications → Jùlaba →
   Stockage) ;
4. temps de lancement hors ligne.

La différence entre 1 et 2 est **le chiffre qui manquait au projet**. C'est
lui qui dit si Jùlaba s'installe chez une marchande, pas la taille du fichier.

---

## 3. Le micro au démarrage (B3)

**Ce qu'on vérifie** : avant B3, la sonde du moteur vocal partait **avant**
l'enregistrement du plugin natif, et le « non » était gardé pour toute la
session — micro mort jusqu'au prochain lancement. B3 dit que le rattrapage
fonctionne. **Le chronométrage réel n'a pas pu être testé ici : c'est le point
le plus incertain de toute cette passe.**

**Préparation** : application **complètement fermée** (retirée des récentes).
Ce scénario ne vaut que sur un démarrage à froid.

**Gestes**
1. Lancer l'application et aller **immédiatement** à la caisse, sans attendre.
2. Appuyer sur le micro et dire un article simple (« deux tomates »).
3. Si rien ne se passe : **ne pas relancer l'application**. Attendre 5
   secondes, réappuyer, redire la même chose.

**Résultat attendu**
- Le micro répond dès la première tentative ; **ou**, au pire, à la seconde,
  sans avoir relancé l'application.

**Compte comme défaut — et c'est le défaut de B3 :** le micro reste muet
jusqu'à un redémarrage complet de l'application.

**Noter** : première tentative OK / seconde OK / redémarrage nécessaire.
Refaire **trois fois**, à froid à chaque fois — c'est une course, un seul essai
ne conclut rien.

---

## 4. Vente hors ligne → attente → reconnexion → OFF-02

**C'est le scénario central.** Il enchaîne B2 et OFF-02.

**Préparation** : **mode avion activé.** Panier vide.

**Gestes**
1. Composer une vente ordinaire (2 ou 3 articles), encaisser en espèces.
2. **Téléphone dans la main, attention à la vibration.**
3. Observer l'écran de fin, écouter ce que dit Tata.
4. Partager le reçu (WhatsApp ou copie) et **lire le texte du reçu**.
5. Revenir à l'accueil. Faire **une dépense** hors ligne également.
6. **Couper le mode avion** et attendre que le réseau revienne.
7. Observer l'écran, écouter, et **sentir** la vibration.

**Résultat attendu**

| Moment | Attendu |
|---|---|
| Après l'encaissement hors ligne | L'écran dit **« Vente gardée sur le téléphone »**, pas « Vente réussie ». Icône de nuage barré, pas la coche verte. |
| Voix | Tata dit que la vente est gardée et pas encore envoyée. **Jamais « enregistrée ».** |
| Vibration | **Une seule impulsion courte** (90 ms) — pas la double du succès, pas la longue de l'erreur. |
| Reçu partagé | Contient **« Vente enregistrée sur ce téléphone — synchronisation en attente. »** Montant, lignes et numéro inchangés. |
| À la reconnexion | Une notification dit que **la vente** est partie. Vibration **encore différente** des trois précédentes. |
| La dépense | **N'est jamais annoncée comme une vente.** |

**Compte comme défaut** : le mot « réussie » ou « enregistrée » sur la vente
hors ligne ; la double vibration du succès ; un reçu muet sur l'attente ;
aucune annonce à la reconnexion ; une annonce de vente alors que seule la
dépense est partie.

**Noter** : la vibration d'attente est-elle **distinguable** de celle du
succès, sans regarder l'écran ? C'est la question que B2 n'a pas pu trancher
ici, et elle appartient au terrain.

---

## 5. Une action de commande hors ligne (B4)

**Préparation** : **mode avion.**

**Gestes**
1. Aller dans **Mes commandes**.
2. Déclencher n'importe quelle action (accepter, refuser, contre-offre…).
3. Écouter.

**Résultat attendu**
- Tata dit en français clair qu'il n'y a **pas de réseau**, que **rien n'a été
  envoyé**, et qu'il faut recommencer quand le réseau revient.
- **Jamais** « Failed to fetch » ni aucun message technique en anglais.
- La commande reste **dans l'état où elle était** — rien n'a bougé à l'écran.

**Compte comme défaut** : message technique ou anglais ; la commande change
d'état alors que rien n'est parti.

**Ensuite, couper le mode avion et refaire la même action.** Elle doit
fonctionner normalement. **Point de vigilance B4** : si le refus se déclenche
alors que le réseau est bon, c'est le défaut inverse — le noter, il est aussi
grave.

---

## 6. La voix sans réseau

**Préparation** : **mode avion**, application relancée à froid.

**Gestes**
1. Déclencher plusieurs annonces parlées : ajouter un article, demander un
   total, encaisser.
2. Écouter la **qualité** : est-ce la voix habituelle, ou une voix de repli
   du système ?

**Résultat attendu** : la voix parle hors ligne, avec la voix attendue. Les
137 clips sont pré-cachés (B6) — ils doivent être là.

**Compte comme défaut** : silence hors ligne ; voix système de qualité
visiblement inférieure ; latence qui rend la caisse inutilisable.

---

## 7. Le mute global

**Ce qu'on vérifie** : Patrick a tranché — **le mute est un silence total
volontaire, argent compris.** C'est une décision, pas un défaut.

**Gestes**
1. Couper la voix.
2. Faire une vente complète, y compris une relecture de montant.
3. Réactiver la voix, refaire une vente.

**Résultat attendu**
- Mute activé : **aucun son**, y compris sur les montants. C'est voulu.
- Mute désactivé : tout revient.
- **Les vibrations continuent de fonctionner dans les deux cas** — c'est ce qui
  rend le silence acceptable.

**Compte comme défaut** : un son qui passe malgré le mute ; les vibrations qui
disparaissent avec le son ; le réglage qui ne tient pas après redémarrage.

---

## 8. Aucun doublon après reconnexion

**Le plus important sur l'argent. À faire en dernier, et avec soin.**

**Préparation** : mode avion. **Noter le total du jour affiché avant de
commencer.**

**Gestes**
1. Faire **trois ventes** hors ligne, de montants **différents et notés**
   (ex. 1 500 / 2 750 / 900).
2. Faire **deux dépenses** hors ligne, montants notés.
3. **Fermer complètement l'application.**
4. Couper le mode avion, attendre le réseau.
5. Rouvrir l'application, attendre la synchronisation.
6. Vérifier **Mes ventes** et le total du jour.

**Résultat attendu**
- **Exactement trois** ventes, aux montants notés. Pas quatre, pas six.
- **Exactement deux** dépenses.
- Total du jour = total avant + somme des trois ventes.

**Compte comme défaut — et c'est un arrêt immédiat** : une vente en double ;
un total qui ne tombe pas ; une vente disparue.

**Variante à faire si tout est propre** : refaire une vente hors ligne, couper
puis rétablir le réseau **deux fois de suite** pendant la synchronisation. La
vente doit rester **unique**.

---

## Ce qu'on rend à la fin

```
APK / commit testé   : e7e7cad — app-debug.apk, 269,21 MB
Téléphone / Android  : <modèle> / Android <version>
Espace libre avant   : <Mo>
Espace libre après   : <Mo>          ← le chiffre décisif
Occupation installée : <app + données, Mo>
Résultats            : 1..8, OK ou défaut
Défauts trouvés      : <lesquels, à quel scénario, reproductibles ou non>
Défauts corrigés     : <SHA des correctifs>
Verdict technique    : GO / NO-GO
```

**Règle de verdict** : un défaut au scénario **8** (doublon ou total faux) est
un **NO-GO** sans discussion. Un défaut au **3** (micro mort jusqu'au
redémarrage) est un NO-GO tant qu'il est reproductible. Les autres se
discutent au cas par cas.
