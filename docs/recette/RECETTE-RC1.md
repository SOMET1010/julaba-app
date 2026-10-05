# Recette RC1 — dix gestes sur le Galaxy S24 Ultra

**Qui déroule** : Patrick, téléphone en main. **Durée** : ~25 min, PC branché en USB.
**Il n'existe AUCUNE preview** (`render.yaml` : ni `previews:` ni `previewsEnabled`
— STATUS.md). **L'APK est le seul moyen de constater quoi que ce soit.**

**Les deux APK à préparer AVANT de commencer** — workflow `apk.yml`, à la main,
**deux fois de suite sur le même code** : `branche` = `release/rc1`,
**`variante` = `release`** (le défaut — la seule variante distribuable),
`api_url` par défaut, et `voix_dyu` / `dyu_argent` / `voix_prototype` **laissés à
`false`**. Chaque run publie l'artéfact `julaba-apk-<sha7>-release`, qui contient
`app-release.apk`. Télécharge-les et renomme-les `julaba-rc1-A.apk` et
`julaba-rc1-B.apk` (étape 9). *(`.github/workflows/apk.yml`)*

> ### ⚠ À FAIRE AVANT L'ÉTAPE 1 : DÉSINSTALLER JULABA DU TÉLÉPHONE
>
> RC1 est le **premier** APK signé avec le keystore du pilote. Tous les APK
> précédents étaient signés avec la **clé de debug du runner**, régénérée à
> chaque construction. Pour Android, deux certificats différents = **deux
> applications étrangères** : il refuse l'installation par-dessus
> (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`), et la seule issue est de désinstaller
> — **ce qui efface les données locales**.
>
> **Donc : `adb uninstall com.julaba.app` avant l'étape 1.** Sans ça, l'étape 1
> échouera pour cette raison, et on croira à un défaut de RC1.
>
> **C'est une fois pour toutes** : après RC1 l'identité de signature est stable,
> et les mises à jour se posent par-dessus sans rien effacer (c'est exactement ce
> que les étapes 9 et 10 vérifient).
>
> **Toute marchande déjà équipée perd sa caisse locale à ce passage, et doit en
> être prévenue DE VIVE VOIX** — elle ne lit pas, et aucune information
> importante ne tient uniquement dans un texte.

---

## Bilan — à remplir en déroulant

| # | Étape | PASS / FAIL | Trace |
|---|---|---|---|
| 1 | Installation de RC1 | ☐ | `rc1-01-identite.txt` |
| 2 | Connexion par SMS | ☐ | `rc1-02-rapport.txt` |
| 3 | « Cinq piments » | ☐ | `rc1-03-logcat.txt` |
| 4 | Le prix demandé, puis donné | ☐ | `rc1-04-rapport.txt` |
| 5 | Retour à l'accueil, bon montant | ☐ | `rc1-05-rapport.txt` |
| 6 | **Aucun faux zéro (ACC-03)** | ☐ | `rc1-06-rapport.txt` |
| 7 | Ajout d'un produit à la voix | ☐ | `rc1-07-logcat.txt` |
| 8 | Données conservées (fermer/rouvrir) | ☐ | `rc1-08-rapport.txt` |
| 9 | Build suivant par-dessus | ☐ | `rc1-09-identite.txt` |
| 10 | Données toujours là | ☐ | `rc1-10-rapport.txt` |

**Un seul FAIL à l'étape 6 arrête la recette.** C'est le défaut déjà payé.

---

## Le harnais — à coller une fois, avant l'étape 1

```bash
mkdir -p ~/julaba-traces/RC1 && cd ~/julaba-traces/RC1
adb devices                      # le S24 doit apparaître « device »
adb logcat -c                    # on part d'un journal vide
adb logcat -v time > logcat-rc1-brut.txt 2>&1 &
```

Le filtre de lecture est **celui du projet** (`.maestro/ci/jouer.sh:241`) :

```bash
grep -aE "julaba|chromium|Capacitor|sherpa|AndroidRuntime|FATAL" \
  ~/julaba-traces/RC1/logcat-rc1-brut.txt > ~/julaba-traces/RC1/logcat-rc1.txt
```

**La voix tourne-t-elle en natif ?** Les traces vocales (`STT_FIN`, `TTS_MOTEUR`,
`LOGIN_HTTP`…) sont **en mémoire, pas sur la console** (`utils/voiceDebug.ts:74`,
`utils/voiceTrace.ts`) : elles sortent par le bouton **« Rapport de test »** des
Paramètres (`components/shared/UniversalParametres.tsx:1021`). C'est **là** qu'on
lit, en clair :

- `plugins natifs: SherpaStt=true SherpaTts=true` (`utils/voiceDebug.ts:136`) ;
- `TTS_MOTEUR: native-sherpa` — **seule** preuve que c'est Sherpa qui a parlé.
  `speechSynthesis: true` dans le rapport ne prouve rien : le moteur du
  navigateur est **muet en WebView**.

Côté logcat, les plugins natifs ne parlent **que quand ça casse** (`Log.e`/`Log.w`
sur `SherpaStt`, `SherpaTts`, `RoutageAudio` —
`android/app/src/main/java/com/julaba/app/SherpaSttPlugin.kt:89,140`,
`SherpaTtsPlugin.kt:148,166,176,200,291`, `RoutageAudioPlugin.kt:74`). Donc :

```bash
grep -aE "SherpaStt|SherpaTts|RoutageAudio" ~/julaba-traces/RC1/logcat-rc1.txt
```
→ **doit rester vide**, sauf la ligne d'information `SherpaTts: phonétisation
posée dans …` (`SherpaTtsPlugin.kt:224`), qui est bon signe. La console de la
WebView, elle, sort sous l'étiquette **`Capacitor/Console`**
(`@capacitor/android/.../BridgeWebChromeClient.java:428`).

**Vraiment hors réseau ?** Une seule commande tranche :

```bash
adb shell settings get global airplane_mode_on    # doit afficher 1
```

**Identité d'un APK** (les trois commandes de `apk.yml`, étapes 1 et 9) :

```bash
sha256sum julaba-rc1-A.apk
apksigner verify --verbose --print-certs julaba-rc1-A.apk
aapt2 dump badging julaba-rc1-A.apk | grep -E "^package"
```

**Raccourci : le résumé de chaque run `apk.yml` donne déjà tout ça** — un tableau
avec **branche**, **versionCode**, **versionName**, **empreinte SHA-256 du
certificat** et **sha256 du fichier APK**. Les traces `rc1-01-identite.txt` et
`rc1-09-identite.txt` se remplissent donc **sans brancher le téléphone**. Les
trois commandes ci-dessus ne servent plus qu'à vérifier le fichier **réellement
téléchargé**.

**Où ranger** : `~/julaba-traces/RC1/`, noms du tableau ci-dessus.
**Ne JAMAIS committer ces fichiers** : le dépôt est public, et un logcat de
connexion peut porter un numéro de téléphone (ALERTE-SEC-01).

---

## 1 — Installer RC1

**Geste** : `adb uninstall com.julaba.app` (voir l'avertissement ci-dessus), puis
`adb install julaba-rc1-A.apk`
**Entendre / voir** : l'icône Jùlaba apparaît ; à l'ouverture, l'écran de connexion.
**PASS** : `aapt2 dump badging` affiche `package: name='com.julaba.app'` avec un
`versionCode` à **huit chiffres** (~24 000 000) et `versionName='1.0-<sha7>'`, et
`apksigner verify` affiche un certificat dont le sujet **n'est PAS**
`CN=Android Debug` — c'est la signature du pilote.
**FAIL** : « problème avec le fichier de l'application » ; un `name=` différent de
`com.julaba.app` ; ou `CN=Android Debug` (on aurait construit la variante `debug`,
qui n'est pas distribuable).
**Trace** : le tableau du résumé du run + la sortie des trois commandes →
`rc1-01-identite.txt`.

## 2 — Se connecter par SMS

**Geste** : dis ton numéro au gros bouton micro (ou tape-le), puis saisis le code
à 4 chiffres reçu **par SMS**.
**Entendre / voir** : Tantie dit la consigne à chaque écran ; après le code,
l'accueil marchand s'ouvre. **Relève maintenant le montant de « Ma caisse
aujourd'hui »** — appelons-le **M₀**. Il sert aux étapes 5 et 10.
**PASS** : le rapport contient `LOGIN_HTTP` avec `status: 200`
(`components/auth/LoginPassword.tsx:754`) **et** l'accueil est atteint.
**FAIL** : un `status` autre que 200, ou `LOGIN_JSON_FAIL`, ou aucune voix sur les
deux écrans. **Trace** : Rapport de test → `rc1-02-rapport.txt`.
*(Le code n'arrive que par SMS, sans aucun repli — SEC-2. Ne le note nulle part.)*

## 3 — Dire « cinq piments »

**Geste** : touche le micro de la caisse (« Appuie pour parler ») et dis
**« cinq piments »**.
**Entendre / voir** : Tantie demande le prix — au journal `e758a37` :
**« Piment. Quel est ton prix ? »** — puis **le micro se rouvre tout seul**
(`docs/passation/SESSION-2026-10-03.md` §3.3).
**PASS** : une question sur le prix est **entendue**, et le micro se rouvre **sans
que tu le touches**. **FAIL** : rien n'est dit ; ou le panier se remplit **avant**
qu'un prix ait été demandé ; ou il faut retoucher le micro.
**Trace** : `logcat-rc1.txt` de l'instant → `rc1-03-logcat.txt`.

## 4 — Donner le prix

**Geste** : dis **« cinq cents francs »**.
**Entendre / voir** : le panier affiche **5 Piments** et **2 500 F** (5 × 500 —
c'est le parcours du journal `e758a37`). Encaisse.
**PASS** : le panier vaut **exactement 2 500 F**, et le rapport montre
`TTS_MOTEUR: native-sherpa`. **FAIL** : tout autre montant — 500 F, 5 000 F, ou un
montant qu'aucune de tes deux phrases ne contient.
**Trace** : Rapport de test → `rc1-04-rapport.txt`.

## 5 — Retour à l'accueil, avec le bon montant

**Geste** : reviens à l'accueil.
**Entendre / voir** : Tantie dit **« Ta caisse aujourd'hui : … »**
(`i18n/voice/catalog.ts:218`), et le chiffre **dit** est le chiffre **affiché**.
**PASS** : montant dit = montant affiché = **M₀ + 2 500 F**, à l'unité.
**FAIL** : un écart, même de 1 F, entre ce qui est dit et ce qui est affiché ; ou
un total qui n'a pas monté de 2 500 F.
**Trace** : Rapport de test → `rc1-05-rapport.txt`.

## 6 — AUCUN FAUX ZÉRO  *(ACC-03 — l'étape qui compte le plus)*

> Le défaut déjà payé : **« Ta caisse aujourd'hui : zéro franc »** dit à une
> marchande qui avait 100 F. **Une phrase dite ne se reprend pas.**

**Geste** : active le **mode avion**, force l'arrêt de l'application, rouvre-la,
et **écoute la première phrase sur la caisse**.
**Entendre / voir** — une seule de ces deux phrases est permise
(`services/etatCaisseAccueil.ts`, `i18n/voice/catalog.ts:219-220`) :

- **« Je n'ai pas pu lire ta caisse. Ce n'est pas zéro : je n'ai pas pu demander.
  Ton argent est là. »** — et l'écran affiche **« — »**, pas `0` ;
- **« Ta caisse aujourd'hui : au moins {montant}. Ce n'est pas tout : des ventes
  attendent encore sur ton téléphone. »** — le mot **« au moins »** doit
  s'entendre.

**PASS** : la phrase entendue est **mot pour mot** l'une des deux, et **aucun
chiffre de caisse n'est prononcé** dans le premier cas.
**FAIL — immédiat et bloquant** : le mot **« zéro »** est prononcé sur la caisse,
ou l'écran affiche `0 F`, alors que M₀ + 2 500 F n'est pas nul. Toute phrase qui
annonce un total **sans** « au moins » hors réseau est aussi un FAIL.
**Trace** : `adb shell settings get global airplane_mode_on` (doit rendre `1`)
+ Rapport de test → `rc1-06-rapport.txt`.

## 7 — Ajouter un produit à la voix

**Geste** : mode avion **désactivé**. Va au stock, touche le micro et dis
**« puis cinq piments »**, puis réponds aux questions.
**Entendre / voir** — le parcours du journal `NE7E` du 03/10, quatre phrases et pas
une de plus (`docs/passation/SESSION-2026-10-03.md` §3.3) :
« piment, tu le vends comment ? » → *« le tas »* → « Le tas, à combien ? » →
*« deux cents »* → « Tu en as combien ? Si tu ne sais pas, passe. » →
**« piment, deux cents francs le tas. C'est sur ton étal. »**
**PASS** : le produit apparaît sur l'étal à **200 F le tas**, **sans recharger**, et
la phrase de confirmation est entendue. **FAIL** : un prix prérempli, un prix autre
que 200 F, une question de plus, ou rien d'ajouté.
**Trace** : `rc1-07-logcat.txt`.

## 8 — Les données tiennent la fermeture

**Geste** : ferme l'application (`adb shell am force-stop com.julaba.app`), rouvre-la.
**Entendre / voir** : l'accueil revient **sans redemander de poser l'étal** ; le
piment à 200 F est là ; la caisse du jour porte toujours la vente de 2 500 F.
**PASS** : les **trois** présents. **FAIL** : un seul des trois manque.
**Trace** : Rapport de test → `rc1-08-rapport.txt`.

## 9 — Installer le build suivant PAR-DESSUS, sans désinstaller

**Geste** :
```bash
adb install -r julaba-rc1-B.apk     # -r = réinstalle, garde les données
```
**Entendre / voir** : l'installation réussit (`Success`), et l'application
**ne redemande pas** de tout reconfigurer.
**PASS** : trois conditions ensemble —
1. `Success` ;
2. `aapt2 dump badging` montre que **B porte un `versionCode` STRICTEMENT
   SUPÉRIEUR** à celui de A. C'est la preuve que B est bien le build **suivant** :
   le `versionCode` est le nombre de secondes depuis le 01/01/2026 UTC, donc il
   avance à chaque construction même à code identique ;
3. les deux APK portent la **même identité de signature** — le même
   `Signer #1 certificate SHA-256 digest` dans les deux sorties
   `apksigner verify --print-certs`. Le `sha256sum` reste la preuve d'identité
   **du fichier** : il doit différer entre A et B.

**FAIL** : `INSTALL_FAILED_UPDATE_INCOMPATIBLE` (= signatures différentes, donc A
n'était pas une release) ; `INSTALL_FAILED_VERSION_DOWNGRADE` (= B est plus
ancien que A, tu les as inversés) ; ou l'obligation de désinstaller.
**Trace** : les deux tableaux de résumé de run + les deux sorties `apksigner`,
`sha256sum` et `aapt2 dump badging | grep ^package` → `rc1-09-identite.txt`.

> **B est une RECONSTRUCTION DU MÊME CODE** — même branche, même sha, aucun
> correctif. Arbitrage tranché : cette étape ne teste **qu'une seule variable**,
> « une mise à jour s'installe par-dessus sans effacer les données ». Si B portait
> un changement fonctionnel, un échec serait ambigu — le correctif, ou
> l'installation ? On isole. Les deux APK restent distincts et identifiables :
> `versionCode` et `sha256sum` diffèrent, `versionName` est le même
> (`1.0-<sha7>`), puisque c'est le même code.

## 10 — Les données sont toujours là

**Geste** : ouvre l'application après l'installation de B.
**Entendre / voir** : la connexion **n'est pas redemandée** ; le piment à **200 F
le tas** est sur l'étal ; la caisse du jour vaut toujours **M₀ + 2 500 F**, dit et
affiché pareil.
**PASS** : les trois, **et** le stockage de la WebView est intact :
```bash
adb shell "run-as com.julaba.app ls -l '/data/data/com.julaba.app/app_webview/Default/Local Storage/leveldb'"
```
→ des fichiers, avec des dates **antérieures** à l'installation de B.
**FAIL** : l'écran de connexion revient, ou l'étal est vide, ou le dossier est vide
ou recréé à l'instant.
**Trace** : la sortie ci-dessus + Rapport de test → `rc1-10-rapport.txt`.

---

## Connu — ne JAMAIS déclarer FAIL dessus

Consignés le 03/10, **non bloquants** (`docs/passation/SESSION-2026-10-03.md` §5) :

1. **Aucun bip** sur le chemin `BoutonDirePrix` : rien ne signale à la marchande
   que c'est à elle de parler. `playBip` n'existe que dans `useVoiceCore`.
2. **L'écoute dure 11 s** même quand le prix est compris en 2 s
   (`secondesAudio: 11.9` au journal) ; `SILENCE_FIN_MS = 2200` ne coupe pas.

Également connu et voulu :

- **Trois rouges de `npm run verify`** — `test:voix-trace-source`,
  `test:i18n-empreintes-argent`, `test:garde-argent` : empreintes **en attente de
  refigeage par Patrick**, pas des régressions (STATUS.md).
- `speechSynthesis` du navigateur est **muet en WebView** : seul Sherpa natif
  parle. `speechSynthesis: true` au rapport n'est pas une promesse de son.
- Le bandeau « Derniers produits gardés sur ce téléphone » peut passer
  **brièvement à l'ouverture** : c'est voulu.

## Hors périmètre de cette recette

Le crédit (`CAISSE_CREDIT_ACTIF = false`), la voix dioula et les clips prototypes
(éteints au build), le back-office, Odoo.

## À DÉFINIR — une seule chose, et elle bloque l'étape 0

**Les secrets de signature doivent être posés dans le dépôt avant le premier
run.** La variante `release` s'arrête **dans sa première minute** si l'un des
quatre manque, sans aucun repli sur la clé de debug (`apk.yml`, étape « Exiger
les secrets de signature »). Et tant que `ANDROID_SIGNING_CERT_SHA256` n'est pas
posé, le run ne fait qu'un **avertissement** : l'identité de signature n'est pas
verrouillée, et un futur APK signé par une autre clé passerait — en condamnant la
mise à jour de tous les téléphones déjà équipés. **À poser par Patrick** ; l'APK
de RC1 n'existe pas avant.

*(Le SHA construit et le sha256 de chaque APK se lisent dans le résumé du run et
dans le nom de l'artéfact `julaba-apk-<sha7>-release` : à recopier en tête du
bilan, rien à décider.)*
