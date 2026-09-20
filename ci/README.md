# CI — filet d'intégration (`.github/workflows/ci.yml`)

Ce dossier porte le **filet d'intégration continue** de Julaba. Objectif : offrir
une **garantie automatique minimale** (install, build, tests, non-régression
TypeScript) sur chaque `pull_request` et `push` vers `main`, **avant** d'ouvrir
les chantiers financiers (stock, crédit, idempotence).

## CI ≠ CD — et cible de production **NON VÉRIFIÉE**

Ce filet **ne déploie rien**. Il **ne choisit aucune cible de production**.

Le dépôt contient **deux chaînes de déploiement concurrentes** :

- **Render** (site statique + API, `render.yaml`) ;
- **serveur SSH/Docker `julaba.online`** (`.github/workflows/deploy.yml`).

Rien, dans le dépôt ou la documentation interne consultée, ne prouve **laquelle
sert réellement la production**. Tant que ce n'est pas tranché par une **preuve
d'infrastructure ou d'administration** (pas par inférence depuis le dépôt), la
cible de prod reste **Non vérifiée** et **aucun auto-déploiement n'est branché**.

- `deploy.yml` et `mirror-azure.yml` restent en **déclenchement manuel**
  (`workflow_dispatch`) — voir lot L2 de ce chantier.
- Aucun push sur `main` ne déclenche de déploiement.

## Ce que le filet vérifie

1. **Install reproductible** — `npm ci` à la **racine** (npm workspaces + lock
   racine ; les sous-dossiers `frontend_src/` et `backend/` n'ont pas de lock).
2. **Build** — frontend (`vite build`) et backend (`nest build`).
3. **Tests frontend** — 11 harnais `tsx` (`npm run test:ci -w frontend_src`).
4. **Déterminisme du manifeste voix** — auto-activant : régénère et vérifie que
   `docs/voix/` est inchangé, **quand** `voix:manifest` est présent (après merge
   de Studio Voix). S'ignore proprement sinon.
5. **Gate TypeScript à baseline** — `ci/check-tsc-baseline.mjs`.

## Gate TypeScript — baseline = plafond **temporaire**

`ci/tsc-baseline.txt` fixe le **plafond** d'erreurs `tsc` toléré. C'est un
**cliquet** :

| Mesure vs baseline | Résultat |
|---|---|
| `> baseline` | **échec** — régression : la PR introduit des erreurs |
| `< baseline` | **échec** — progrès à entériner : **abaisse la baseline dans la même PR** |
| `= baseline` | OK |

**La baseline n'est pas un niveau acceptable permanent.** Elle vaut aujourd'hui
**0** : sur une install **propre** (`npm ci` à la racine), TypeScript ne remonte
**aucune** erreur — `@types/leaflet` et `@types/qrcode` sont des dépendances
déclarées et se résolvent. Le « 10 » observé un temps venait d'un `node_modules`
local **incomplet** (types non installés), pas d'une vraie dette : c'est
précisément le run CI à froid qui a rétabli la vérité, et le cliquet qui a forcé
l'abaissement à `0`. Toute erreur future doit donc être corrigée **avant** merge,
et non « absorbée » par la baseline. Le câblage des tests backend reste **hors du
périmètre** de ce filet.

## Node

**Node 22 LTS** — base stable et durable. Aucune dépendance n'exige Node 24 et
aucun `engines.node` n'est déclaré ; si une contrainte réelle apparaissait, il
faudrait la **documenter** ici plutôt que la deviner.

---

# GARDE-ARGENT — le chemin d'argent (`ci/garde-argent.mjs`)

**Règle d'or (Patrick)** : « UNE caisse. UNE logique métier. UNE source de
vérité. L'UI et la voix viennent se poser dessus sans le réinventer. »

Une refonte d'interface a modifié `handlePay`, réécrit `enregistrerVente`,
touché le contrôleur de caisse backend et **affaibli un garde-fou existant**
(`caisseUnSeulMicro.test.mts`) pour passer. Rien, mécaniquement, ne l'en
empêchait. Ce gate existe pour que ce soit impossible **sans le dire**.

## Trois mécanismes, pas un glob de chemins

| # | Mécanisme | Fichier | Ce qu'il interdit |
|---|---|---|---|
| 1 | **Périmètre dérivé** | `ci/PERIMETRE-ARGENT.json` | La liste approximative de fichiers : `noyau` est **recalculé** depuis `symboles` à chaque exécution et comparé au fichier committé. Un fichier qui entre ou sort **se fait nommer**. |
| 2 | **Détection sur diff** | `--base <ref>` | Une modification UI/UX/voix qui touche le noyau (ou **importe directement** un de ses fichiers) sans faire tourner les invariants de sa zone. |
| 3 | **Anti-assouplissement** | `ci/EMPREINTE-GARDES.json` | Retirer, renommer ou désarmer une assertion d'un garde existant. Ajouter reste permis. |

## Les onze zones

`machine-encaissement`, `grammaire-intention-financiere`, `local-intent`,
`caisse-context`, `paiement`, `enregistrement-vente`, `api-caisse`, `stock`,
`offline-synchronisation`, `idempotence`, `calcul-financier` — chacune armée
par au moins un invariant **existant** (un invariant fantôme est un refus).

## Commandes

```
node ci/garde-argent.mjs                       périmètre + gardes + test:ci gelée
node ci/garde-argent.mjs --base <ref>          + détection sur le diff
node ci/garde-argent.mjs --base <ref> --liste-invariants   (requête, pour la CI)
node ci/garde-argent.mjs --base <ref> --preuve <fichier>   (verdict)
npm run test:garde-argent -w frontend_src      les 8 scénarios, sur dépôts jetables
```

## `--figer-perimetre` / `--figer-gardes` — **humain seulement**

Comme `--figer` de `scripts/schema-pilote.mjs`, ces deux commandes **refusent de
s'exécuter en CI** (`CI` ou `GITHUB_ACTIONS` posé), et le refus est **dans le
script**, pas dans le workflow — un autre workflow pourrait l'appeler. Un gel
est une **décision** : il dit « ce périmètre-là est celui qu'on protège ».
Quand le gate rougit parce que le périmètre a bougé, c'est le **signal
attendu** : on relance localement, on relit le diff du JSON, on committe.

## L'échappatoire, et sa borne

Un garde peut légitimement perdre une assertion devenue fausse. Le commit doit
alors porter, dans son message, la ligne :

```
GARDE-ASSOUPLIE: <raison>
```

Le gate imprime alors l'alerte **en évidence** — et **échoue quand même** si le
même diff touche le noyau : *on ne desserre pas un garde-fou dans le commit qui
change l'argent.*

`it.failing(...)` promu en `it(...)` n'est **pas** un assouplissement : c'est
une assertion qui devient réelle. Le gate le reconnaît et l'imprime comme une
promotion. L'inverse — une assertion vivante rangée sous `it.failing` /
`it.skip` — est un refus.

## Ce que ce gate NE protège PAS

C'est un contrôle **statique**, de texte et de fichiers. Il ne sait pas si
`handlePay` calcule juste — il sait qu'on y a touché et qui doit alors repasser
au vert. Il ne suit les imports **qu'à une profondeur** (à deux, `CaisseContext`
étant monté dans `App.tsx`, l'application entière serait « argent » et le gate
se ferait désarmer). Il ne voit ni les appels dynamiques, ni le SQL construit à
l'exécution, ni un symbole d'argent écrit sous un autre nom. Il ne **remplace**
aucun invariant : il les **exige**.

## `test:ci` reste **GELÉE**

Aucun contrôle de ce gate n'entre dans `test:ci`. La chaîne est comparée à
celle de `f0c965c` **valeur contre valeur** (et relue dans git quand la
référence est joignable). `test:garde-argent` vit dans `verify` — et le gate
vérifie qu'il y est toujours : débranché, il ne dirait plus rien, et c'est lui
qui aurait dû le dire.
