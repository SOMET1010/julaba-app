# Banc E2E Android — Maestro

> **Ce banc ne corrige rien et ne change rien à l'application.** Il l'ouvre, la
> touche, et dit ce qu'il voit. Si un scénario échoue, **on documente, on ne
> corrige pas** dans ce lot.

---

## Pourquoi il existe

Le 01/10/2026, le rapport terrain **F4NT** a trouvé un défaut d'argent qui était
**inatteignable** par tout ce qu'on avait : `extraction.ts` contenait
`.replace(/['']/g, "'")` dont les deux caractères étaient l'apostrophe **droite**
— un no-op. sherpa-onnx rend l'apostrophe **courbe**, donc « un tas d'oignon »
perdait son produit et le « un » devenait **1 franc**.

Ni les 123 maillons de `verify`, ni les 252 invariants d'argent, ni la recette
navigateur ne pouvaient le voir. Et pas par négligence : **le stub de
transcription de la recette rend ce qu'on y écrit**, donc des apostrophes
droites. Seul sherpa, sur l'appareil, produit la courbe.

C'est le trou que ce banc couvre : **l'application réelle, dans sa WebView, sur
un Android.**

---

## Ce que le banc NE SAIT PAS faire

À lire avant d'interpréter un vert :

| Limite | Conséquence |
|---|---|
| **Maestro ne parle pas** — aucun moyen d'injecter de l'audio dans le micro | **T1, T3** restent des gestes humains |
| **Maestro n'entend pas** — aucun moyen de relever le son sorti | **T2** reste un geste humain |
| Aucun `data-testid` dans l'application | les flows s'appuient sur les **libellés visibles** ; un libellé renommé casse un flow. En ajouter serait **modifier l'application**, ce que ce lot s'interdit |
| `setAirplaneMode` demande une autorisation système | sur certains téléphones, **T4** s'arrête et l'avion doit être basculé à la main |
| Le pavé du montant libre varie selon l'écran | dans **P0.1**, les saisies sont `optional` — mais les assertions de **total** ne le sont pas, donc le flow ne peut pas mentir en vert |

**T1, T2 et T3 sont donc marqués `partiel`.** Ils vérifient tout le chemin sauf
la parole, et chacun le dit dans son en-tête. Les cinq gestes de
`docs/terrain/FICHE-TESTEUR-CAISSE-VOCALE.md` restent nécessaires.

---

## Installer

```sh
curl -fsSL "https://get.maestro.mobile.dev" | bash
export PATH="$PATH":"$HOME/.maestro/bin"
maestro -v
```

> Dans la session de l'agent, cette URL est refusée par le proxy (403) et il n'y
> a ni `/dev/kvm` ni Android SDK : **l'agent ne peut pas jouer ces flows.** Ils
> se jouent sur un poste avec un téléphone, ou en CI.

## Lancer sur un téléphone Android réel

1. **Options développeur** → activer **Débogage USB**. Brancher le téléphone,
   accepter l'autorisation qui s'affiche dessus.
2. Vérifier qu'il est vu : `adb devices` doit lister un appareil en `device`
   (pas `unauthorized`).
3. Installer l'APK à tester — **désinstaller l'ancienne d'abord**, sinon on teste
   l'ancienne sans le savoir :
   ```sh
   adb uninstall com.julaba.app || true
   adb install -r julaba-debug.apk
   ```
4. **La commande exacte**, tout le banc :
   ```sh
   maestro test .maestro/ \
     -e MAESTRO_PHONE=0XXXXXXXXX \
     -e MAESTRO_PIN=XXXX \
     --format junit --output rapport-maestro.xml \
     --debug-output ./maestro-debug
   ```

### Variantes utiles

```sh
# Fumée, sans aucun identifiant : l'APK s'ouvre-t-il ?
maestro test .maestro/01-demarrage.yaml

# Un seul scénario
maestro test .maestro/PAN-01-panier-apres-fermeture.yaml -e MAESTRO_PHONE=… -e MAESTRO_PIN=…

# Par étiquette (voir `tags:` en tête de chaque flow)
maestro test .maestro/ --include-tags=panier  -e MAESTRO_PHONE=… -e MAESTRO_PIN=…
maestro test .maestro/ --exclude-tags=partiel -e MAESTRO_PHONE=… -e MAESTRO_PIN=…

# Inspecter l'arbre de vue quand on ne comprend pas un échec
maestro studio
```

**Les identifiants ne s'écrivent JAMAIS dans un fichier du dépôt** — ALERTE-SEC-01.
`node .maestro/valider.mjs` refuse tout numéro à 10 chiffres ou code à 4 chiffres
écrit en dur dans un flow.

---

## En cas d'échec : capture + état observé

- **Captures** : chaque flow pose des `takeScreenshot` nommés aux points qui
  comptent (`T5-panier-deux-lignes`, `PAN-01-panier-apres-reouverture`…), et
  Maestro en ajoute une automatiquement au point d'échec.
- **État observé** : `--debug-output ./maestro-debug` écrit, pour chaque
  commande, **l'arbre de vue complet** au moment de l'échec. C'est l'équivalent
  du 🐞 Rapport : la trace, pas un récit.
- **Le journal de l'application** se relève en plus, et il dit ce que la machine
  a compris :
  ```sh
  adb shell "run-as com.julaba.app cat /data/data/com.julaba.app/app_webview/Local\ Storage/leveldb/*" 2>/dev/null | strings | grep julaba_journal_voix | head
  ```
  Plus simple sur l'appareil : toucher **🐞 Rapport**, qui copie le même journal
  avec son repère à 4 caractères.

**Et on ne corrige pas l'application.** Un échec se consigne — scénario, geste,
attendu, observé, capture — **jamais la cause supposée** : une cause supposée
oriente la correction avant qu'on ait mesuré, et deux jours y sont déjà passés.

---

## Les scénarios

| Flow | Geste | Automatisable | Identifiants |
|---|---|---|---|
| `01-demarrage.yaml` | l'APK s'ouvre et montre sa connexion | **entièrement** | aucun |
| `00-login.yaml` | connexion : numéro puis code, au clavier | **entièrement** | requis |
| `02-caisse-ouverture.yaml` | la caisse s'ouvre, un total lisible, aucun NaN | **entièrement** | requis |
| `T1-transcription.yaml` | le micro s'arme et se relâche | **partiel** (ne parle pas) | requis |
| `T2-montant-en-lettres.yaml` | le montant **écrit** est juste | **partiel** (n'entend pas) | requis |
| `T3-phrase-longue.yaml` | l'écoute tient ≥ 8 s sans se refermer | **partiel** (ne parle pas) | requis |
| `T4-hors-ligne.yaml` | une vente hors ligne reste **une** vente | **entièrement** | requis |
| `T5-ecran-lisible.yaml` | total et panier visibles **sans défiler** | **entièrement** | requis |
| `PAN-01-…yaml` | le panier survit à la fermeture de l'app | **entièrement** | requis |
| `P0-1-…yaml` | deux articles libres = deux lignes, total juste | **entièrement** | requis |

`T3` porte **la seule attente fixe du banc** (8 000 ms) — et c'est le sujet du
test : au-dessus des 6 000 ms du défaut MIC-01, en dessous des 12 000 ms de
`ECOUTE_MAX_MS`. Partout ailleurs on attend un **élément**, jamais une durée : un
`sleep` fixe passe au vert sur un téléphone rapide et rouge sur celui de la
marchande.

---

## Le jouer en CI (`.github/workflows/maestro.yml`)

Le job construit l'APK, démarre un émulateur Android (API 34, `google_apis`,
x86_64, KVM activé), installe l'APK et joue les flows.

### ⚠️ Un blocage à lever UNE FOIS

GitHub ne permet de déclencher un `workflow_dispatch` que si le fichier du
workflow existe **sur la branche par défaut**. `maestro.yml` est sur
`claude/clever-allen-dnr8by` : l'API répond donc `404 Not Found`, et le workflow
n'apparaît pas dans la liste des workflows déclenchables (vérifié : les dix
workflows listés pointent tous sur `main`).

**Tant que `maestro.yml` n'est pas sur `main`, personne ne peut lancer ce job** —
ni l'agent, ni le bouton « Run workflow » de l'interface. Une fois le fichier sur
`main`, il se lance normalement, **sur n'importe quelle branche** via l'entrée
`branche`.

### Lancer

Actions → *Banc E2E Android — Maestro* → **Run workflow**, puis :

| Entrée | Valeur |
|---|---|
| `branche` | la branche à tester (défaut `main`, doctrine REL-01 comme `apk.yml`) |
| `flows` | `.maestro/01-demarrage.yaml` par défaut — le **seul** flow sans identifiant |
| `api_level` | `34` |
| `api_url` | `https://julaba-api.onrender.com/api/v1` |

### Pour jouer la caisse, deux secrets

`Settings → Secrets and variables → Actions` :

- `MAESTRO_PHONE` — le numéro du compte de test
- `MAESTRO_PIN` — son code

**Sans eux, le job ne rougit pas** : il joue l'étiquette `sansCompte` et écrit
dans son résumé pourquoi les autres n'ont pas tourné. Neuf flows sur dix ont
besoin d'un compte, et neuf échecs à la connexion ne diraient rien sur la caisse.

> Les identifiants ne vont **jamais** dans un fichier du dépôt — ALERTE-SEC-01.
> Les secrets d'Actions sont faits pour ça, et `valider.mjs` refuse activement
> tout numéro ou code écrit en dur dans un flow.

### Ce que le run publie, même en échec

L'artefact `maestro-<sha>` contient :

- les **captures nommées** des flows, plus une capture de l'**écran final** quel
  qu'il soit — quand un flow tombe sur un écran inattendu, c'est la première
  chose à regarder ;
- `rapports/debug/` — l'**arbre de vue complet** à chaque commande, l'équivalent
  du 🐞 Rapport ;
- `rapports/logcat.txt` et un extrait filtré (`julaba`, `chromium`, `Capacitor`,
  `sherpa`, `AndroidRuntime`, `FATAL`) — une exception Java n'apparaît dans aucun
  arbre de vue ;
- `rapports/junit.xml`.

Le script retient le code de sortie de `maestro test`, **collecte, puis échoue** :
sinon on perdrait les traces exactement quand elles servent.

---

## Validation sans appareil

```sh
node .maestro/valider.mjs
```

Vérifie trois choses, et la troisième est la plus importante :
1. chaque commande appartient au vocabulaire Maestro (une faute de frappe comme
   `assertVisble` échoue **ici**, pas après dix minutes d'émulateur) ;
2. chaque `runFlow` pointe sur un fichier existant ;
3. **aucun identifiant n'est écrit en dur.**

Ce validateur est un maillon de `verify`, donc rejoué à chaque lot. Il ne
remplace pas l'exécution : **la validité sur appareil ne se prouve qu'en jouant
les flows.**
