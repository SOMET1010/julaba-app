# Registre des lots OSS

Ce que JULABA **adopte**, **adapte** ou **refuse** de l'écosystème open source,
et sur quelle **preuve**. Un lot n'entre ici qu'avec un run, un commit ou un
fichier de mesure qu'on peut rouvrir.

> **Règle du registre** : un statut sans lien de preuve n'est pas un statut,
> c'est une opinion. Et « documenter une dette ne la ferme pas » — ce qui reste
> ouvert est écrit, et ne s'efface pas tout seul.

> ## RÈGLE D'ARRÊT DES SPIKES — Patrick, 02/10/2026
>
> **Preuve en 1 à 3 expériences. Ensuite : ADOPTER / REJETER / BACKLOG.**
> Pas dix itérations pour perfectionner un spike.
>
> **Un spike OSS a un budget d'essai ET une condition d'arrêt.** Sans elles, on
> passe deux jours à prouver qu'un outil de test fonctionne pendant que la
> vendeuse n'a rien gagné. C'est exactement ce qui est arrivé à OSS-01 entre
> les runs #13 et #16.
>
> **Et le critère d'entrée, qui prime sur tout le reste** : aucun nouveau
> framework ni harnais sans **démonstration préalable d'un gain produit ou de
> code supprimé**. Un composant open source n'entre que là où JULABA a
> développé maison quelque chose qu'une brique éprouvée remplace **et** où le
> produit s'en trouve concrètement amélioré.

| Lot | Sujet | Statut | Décidé le |
|---|---|---|---|
| **OSS-01** | Maestro — banc E2E Android | **SUFFISANT / GELÉ** — validé techniquement, non industrialisé | 02/10/2026 |
| **OSS-02** | Sherpa VAD contre MIC-01 | **REJETÉ pour le pilote** — candidat post-pilote | 02/10/2026 |
| **OSS-03** | TanStack Query | NON OUVERT | — |
| **OSS-04** | EventBus | NON OUVERT | — |

---

## OSS-01 — Maestro, banc E2E Android

**Statut : SUFFISANT / GELÉ** — décision de Patrick, 02/10/2026.
Validé **techniquement**, **non industrialisé**. On conserve le flow vert comme
preuve que la technologie fonctionne. **On ne cherche pas 10/10 flows.** Les
autres scénarios sont du **backlog d'industrialisation**, pas un préalable au
produit.

> **Pourquoi le gel, et la raison est juste** : à partir du run #13, le travail
> a basculé du produit vers l'outil. Apprendre comment Maestro tape sur chaque
> écran n'améliore pas la caisse de la marchande. Les runs #14, #15 et #16 ont
> servi à perfectionner l'instrument ; le #16 a été **annulé** le jour même.

| ce qui est prouvé | |
|---|---|
| build APK en CI | ✅ |
| émulateur Android | ✅ |
| WebView accessible à Maestro, **sans `data-testid`** | ✅ |
| interaction UI (tap qui atteint l'application) | ✅ |
| **premier flow E2E vert** | ✅ run #12 |
| extension aux autres parcours | **backlog** |

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

**Statut : REJETÉ pour le pilote.** Candidat post-pilote.
Décision de Patrick, 02/10/2026, après **deux** expériences — la règle d'arrêt
a été tenue.

**Pourquoi le rejet, et ce n'est pas un rejet technique** : Sherpa VAD est très
bon. Mais « la détection vocale maison » fait **quatre lignes** — un seuil fixe
`NIVEAU_PAROLE = 12` dans `ecouteCaisse.ts`. Le remplacer demanderait un
pipeline de **streaming audio natif** : `parleMaintenant` est temps réel, et la
chaîne actuelle est `MediaRecorder → blob → sherpa`, sans flux continu. Quatre
lignes supprimées contre un chantier d'architecture : le critère d'entrée du
registre ne passe pas.

**Et une relecture du code a corrigé la lecture du spike #1** : sur les trois
défauts mesurés de MIC-01, deux viennent du **seuil fixe** (le bruit déclenche,
le bruit masque le début) et le troisième — l'hésitation coupe la phrase — vient
de `SILENCE_FIN_MS`, un **nombre**, pas de l'analyseur. Aucun VAD ne corrige un
nombre. Le « 7 sur 8 » du spike #1 est juste ; sa lecture était incomplète.

### Expérience #2 — seuil adaptatif, et c'est elle qui tranche

Le plancher de bruit est mesuré sur les 400 premières ms (médiane), le seuil
devient `plancher + 6`. Résultat sur les 8 mêmes cas, même vérité terrain :

- le **faux positif sur bruit constant disparaît** — le cas qui coûte une vente
  au marché ;
- régressions mesurées : latence de fin **+0,2 s**, départ **−0,03 s**. Rien de
  notable ;
- **défauts cumulés 5,34 → 2,98**, soit −44 %.

Détail, tableau complet et limites : [`spike/oss-02-vad/EXPERIENCE-2.md`](../../spike/oss-02-vad/EXPERIENCE-2.md).

### Arbitrage produit pris au passage : `SILENCE_FIN_MS` 1500 → 2200 ms

Décision de Patrick. Pour une marchande qui hésite, regarde son étal ou cherche
son prix, 1,5 s est agressif — et le banc le prouve : à 1 500 ms une hésitation
de 2 s **coupe la phrase en deux** (fermeture à 4,26 s alors qu'elle parle
jusqu'à 5,50 s). À 2 200 ms, plus de coupure.

`AVANT_PREMIER_MOT_MS = 6000` et `ECOUTE_MAX_MS = 12000` **ne changent pas** :
6 s pour commencer → 2,2 s pour hésiter → 12 s au plafond.

**Les deux gardes demandées avant production sont mesurées** :

| garde | résultat |
|---|---|
| une pause de 2 s reste dans la même phrase | **oui** à 2 200 ms |
| attente après une phrase normale | 2,27 s → **2,78 s** (+0,51 s) |

Et le chiffre qui compte n'est pas 2,2 s : la **queue de voix** maintient le
niveau ~0,8 s après la dernière syllabe, donc le réglage **se ressent comme
2,8 s**. C'est ce chiffre-là qu'on arbitre.

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
