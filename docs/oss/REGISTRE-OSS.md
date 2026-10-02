# Registre des lots OSS

Ce que JULABA **adopte**, **adapte** ou **refuse** de l'écosystème open source,
et sur quelle **preuve**. Un lot n'entre ici qu'avec un run, un commit ou un
fichier de mesure qu'on peut rouvrir.

> Règle du registre : un statut sans lien de preuve n'est pas un statut, c'est
> une opinion. Et « documenter une dette ne la ferme pas » — la colonne
> *Réserve* dit ce qui reste ouvert, elle ne s'efface pas toute seule.

| Lot | Sujet | Statut | Décidé le |
|---|---|---|---|
| **OSS-01** | Maestro — banc E2E Android | **ADOPTÉ / BANC OPÉRATIONNEL** | 02/10/2026 |
| **OSS-02** | Sherpa VAD contre MIC-01 | **SPIKE LIVRÉ — aucune décision de remplacement** | 02/10/2026 |
| **OSS-03** | TanStack Query | NON OUVERT | — |
| **OSS-04** | EventBus | NON OUVERT | — |

---

## OSS-01 — Maestro, banc E2E Android

**Statut : ADOPTÉ / BANC OPÉRATIONNEL.**
**Réserve : 1 flow prouvé vert, 9 flows à qualifier** (secrets + observation
réelle des libellés).

### Ce qui est prouvé

La chaîne entière, de bout en bout, sur un Android qui démarre pour de vrai :

    code → build APK → émulateur → installation → JULABA au premier plan
         → WebView lisible → assertion Maestro → artefacts

### La décision d'architecture, désormais prouvée et non plus supposée

**Maestro lit la WebView Capacitor de JULABA sans aucune instrumentation.**
La sonde du run #11 a relevé 17 textes, 1 nœud `com.julaba.app`, 2 nœuds
WebView, et les libellés HTML de l'application y figurent en clair. L'arbitrage
`data-testid` prévu au cadrage d'OSS-01 **ne se déclenche donc pas** : aucun
attribut de test n'est à ajouter au code de production.

### Les preuves

| | |
|---|---|
| **Run #12** — premier vrai flow exécuté et **passé** | <https://github.com/SOMET1010/julaba-app/actions/runs/36945650656> |
| Commit `e1a49b2` — libellés issus d'une **mesure** | <https://github.com/SOMET1010/julaba-app/commit/e1a49b2415561c9090a18988b5450d4ce29b72e6> |
| Le banc — 10 flows, validateur, script CI | [`.maestro/`](../../.maestro/) |
| Le workflow | [`.github/workflows/maestro.yml`](../../.github/workflows/maestro.yml) |

**Run #11 ≠ run #12, et la distinction compte** : le #11 était la **sonde
d'instrumentation**, qui réussit dès qu'elle rend son verdict — même négatif.
Le premier flow réellement joué et passé est le **#12**. Une preuve de clôture
qui pointerait le #11 pointerait un succès technique du banc, pas un test vert.

### Ce que ce lot ne prouve PAS

Maestro ne **parle** pas (aucune injection d'audio dans le micro) et
n'**entend** pas (aucun relevé du son sorti). **T1, T2 et T3 restent des gestes
humains** — voir `docs/terrain/FICHE-TESTEUR-CAISSE-VOCALE.md`.

Ce n'est **pas** une impossibilité, et la nuance est de Patrick (01/10) : un
dispositif complémentaire — injection audio côté émulateur, ou banc physique
jouant un fichier devant le micro — les rendrait automatisables. Lot nommé et
daté, **après** la clôture de la caisse vocale. Écrire « jamais » inscrirait
une impossibilité là où il y a une limite de périmètre, et plus personne ne
chercherait la solution.

### Ce qui reste à qualifier

**9 flows sur 10 portent le tag `avecCompte`** et ne peuvent pas être joués
sans les secrets `MAESTRO_PHONE` / `MAESTRO_PIN` (Settings → Secrets →
Actions). Seul `01-demarrage` est `sansCompte` : c'est celui du run #12.

Leurs libellés sont encore **supposés**, écrits avant la sonde. La discipline
retenue, et c'est elle qui a manqué aux six premiers runs :

> **un flow par run tant que son écran n'a pas été vu.** On sonde, on lit
> l'arbre de vue, on corrige les sélecteurs **sur preuve**, puis on asserte.

Les lancer tous ensemble redonnerait plusieurs rouges simultanés sans cause
isolable. Séquence prévue : `00-login` seul en SONDE → corriger
`02-caisse-ouverture` sur cette mesure → un flow à la fois.

### Arbitrages ouverts — ils appartiennent à Patrick

1. **Gate permanente** : déclencheur (chaque push ? avant chaque APK ?
   nocturne ?) et rouge **bloquant ou informatif**. Aujourd'hui le workflow est
   en `workflow_dispatch` seul, délibérément, et ne remplace ni `ci.yml` ni
   `apk.yml`. Recommandation posée : non bloquante et déclenchée avant chaque
   APK, jusqu'à 10 flows verts deux fois de suite, puis bloquante.
2. **Compte joué par le banc** : `VITE_API_URL` vaut par défaut la
   **production**. Les flows `P0-1` et `PAN-01` y écriraient de vraies lignes
   d'argent. Trois sorties — compte de test dédié / API de recette
   (**À DÉFINIR** : existe-t-elle ?) / gate limitée aux flows sans écriture.

### Erreur à ne pas refaire, inscrite ici exprès

Un flow attendait le mot **« Akwaba »**. L'application le **prononce**
(sherpa TTS, visible au logcat du run #6) mais ne l'**écrit jamais**. Une
phrase **entendue** avait été prise pour un texte **affiché**, puis une
assertion bâtie dessus. Sur un produit dont la moitié de l'information passe
par la voix, c'est l'erreur à ne pas faire. De même, l'écran dit
« Mon commerce » et non « Mon compte ».

---

## OSS-02 — Sherpa VAD contre MIC-01

**Statut : SPIKE LIVRÉ. Aucune décision de remplacement.**
Aucun fichier de production touché, conformément au cadrage.

**Résultat mesuré : Sherpa VAD gagne 7 cas sur 8, égalité sur le huitième.
MIC-01 n'en gagne aucun.** Trois défauts de MIC-01, mesurés : le bruit
*déclenche* la parole (faux positif à 0 s), le bruit *masque* le vrai début,
l'hésitation *coupe* la phrase. Latence de fin 2,27 s contre 0,14 s.

**Mais le remplacement n'est pas un pour un** : le VAD remplacerait
`parleMaintenant`, **pas** `finDEcoute`. C'est une décision produit, elle n'est
pas prise.

Preuves : [`spike/oss-02-vad/README.md`](../../spike/oss-02-vad/README.md),
mesures image par image dans `spike/oss-02-vad/resultats.json`, banc rejouable
(`banc-vad.mjs`, `bornes-reelles.mjs`). Les clips sont de la **vraie voix** du
dépôt, et la vérité terrain a été **mesurée** (`bornes-reelles.mjs`) après
qu'une vérité supposée eut rendu MIC-01 artificiellement meilleur.

---

## OSS-03 — TanStack Query · OSS-04 — EventBus

**NON OUVERTS.** Repris par Patrick de son côté, maintenant que Maestro est une
brique validée et non plus une inconnue. **À DÉFINIR** : périmètre, cadrage,
critères d'adoption.

---

## Hors registre, mais né d'OSS-01

**PERF-01 — préchargement audio.** Constat seul, non bloquant :
[`docs/dette/PERF-01-prechargement-audio.md`](../dette/PERF-01-prechargement-audio.md).
842 clips dans le dépôt, APK de 197 Mo, collecte mémoire de 11 Mo au démarrage.
Le signal n'a pas été cherché, il est tombé du banc. Ce qui n'est **pas** établi
y est écrit noir sur blanc — dont : ce préchargement est peut-être **voulu**
(sans réseau au marché, un clip absent est une voix muette).
