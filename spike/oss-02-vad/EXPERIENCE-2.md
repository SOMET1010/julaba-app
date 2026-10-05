# OSS-02, expérience #2 — seuil fixe contre seuil adaptatif

**Dernière expérience.** Cadre de Patrick, 02/10/2026 : aucun changement
production, aucun plugin natif, aucun nouveau pipeline, aucun Sherpa VAD
intégré. Pas d'expérience #3.

Rejouer : `node banc-adaptatif.mjs 1500` puis `node banc-adaptatif.mjs 2200`
(après `generer-cas.sh`, qui a besoin des deux clips de voix du dépôt).

## La question

`NIVEAU_PAROLE = 12` est un **seuil fixe**. Le seuil **adaptatif** mesure le
plancher de bruit pendant les 400 premières ms (médiane, pas moyenne : un
claquement isolé ne doit pas relever le plancher de toute la session) puis
prend `plancher + marge`. Marge retenue par calibration : **6**.

En pièce calme le plancher est ~0, donc le seuil tombe **sous 12** — c'est ce
qui rattrape la voix faible. Au marché il monte avec le fond — c'est ce qui
doit supprimer le faux positif.

## Le tableau — `SILENCE_FIN_MS = 2200` (l'arbitrage)

| cas | attendu | seuil FIXE (12) | seuil ADAPTATIF | Sherpa | meilleur |
|---|---|---|---|---|---|
| silence total | aucune parole | —→6,02 `rien-dit` | —→6,02 `rien-dit` | 0 seg | **=** |
| phrase courte | 1,34→2,50 | 1,34→5,28 | 1,31→5,50 | 1,51→2,64 | fixe |
| phrase longue | 1,30→7,82 | 1,31→10,75 | 1,31→10,75 | 1,64→7,56 | **=** |
| hésitation 2 s | 0,84→5,50 | 0,83→8,51 | 0,83→8,51 | 1,00→5,64 | **=** |
| hésitation 4 s | 0,84→7,50 | 0,83→5,02 **COUPÉ** | 0,83→5,02 **COUPÉ** | 1,00→7,53 | **=** |
| bruit constant | aucune parole | 0,00→10,53 **FAUX POSITIF** | —→6,02 `rien-dit` | 0 seg | **ADAPTATIF** |
| bruit + parole | 1,34→2,50 | **0,03**→8,00 | **0,42**→7,78 | 1,48→2,64 | **ADAPTATIF** |
| voix faible | 1,34→2,50 | 1,34→5,02 | 1,34→5,28 | 1,51→2,86 | **=** |

**Défauts cumulés : 5,34 (fixe) contre 2,98 (adaptatif) — −44 %.**

## Les deux gardes demandées avant production

**1 · Une pause de 2 s reste-t-elle dans la même phrase ?** OUI à 2 200 ms.
À 1 500 ms le cas « hésitation 2 s » est **coupé à 4,26 s** alors que la
marchande parle encore jusqu'à 5,50 s — sa phrase part en deux morceaux. À
2 200 ms, plus de coupure : la fin est détectée à 8,51 s, après la vraie fin.

**2 · Une phrase normale donne-t-elle une sensation d'attente excessive ?**
Mesuré sur « phrase courte », du dernier son réel (2,50 s) à la fermeture :

| réglage | fermeture | attente ressentie |
|---|---|---|
| 1 500 ms | 4,77 s | **2,27 s** |
| 2 200 ms | 5,28 s | **2,78 s** |

**Surcoût réel : +0,51 s.** Et il faut savoir pourquoi l'attente n'est pas
égale au réglage : la **queue de voix** (souffle, réverbération) maintient le
niveau au-dessus du seuil ~0,8 s après la dernière syllabe. Un réglage de
2,2 s se ressent donc comme 2,8 s. C'est le vrai chiffre à arbitrer, pas 2,2.

## Ce que l'adaptatif ne règle PAS

**Le cas « bruit + parole » reste imparfait** : le début est relevé à 0,42 s au
lieu de 1,34 s (contre 0,03 s pour le seuil fixe, et 1,48 s pour Sherpa). On
capte donc encore ~0,9 s de bruit avant la voix. Sherpa fait mieux, et c'est
dit — mais ce bruit entre dans la transcription, il ne fabrique pas de montant.

**Le cas « hésitation 4 s » reste coupé** par les deux, et c'est normal : 4 s
d'hésitation dépassent n'importe quel silence de fin raisonnable. Ce n'est pas
un défaut de détection.

## Correction du banc, faite en cours d'expérience

Les premiers passages donnaient des « SANS-FIN » qui étaient des **artefacts** :
les fichiers s'arrêtaient avant que le silence de fin ait eu le temps de
s'écouler. 5 s de silence ont été ajoutés à la fin de chaque cas. Les bornes de
parole de `verite.json` sont inchangées — c'est toujours la vérité **mesurée**
par `bornes-reelles.mjs`, pas la vérité supposée que `generer-cas.sh` réécrit.

## Décision

Le critère posé était : *si l'adaptatif récupère les cas bruit sans régression
notable → Sherpa VAD REJETÉ pour le pilote.*

- cas bruit récupérés : **le faux positif disparaît** (le cas qui compte au
  marché), et le départ sur bruit s'améliore sans être résolu ;
- régressions : latence de fin **+0,2 s** sur deux cas, départ **−0,03 s** sur
  un autre. Rien de notable ;
- défauts cumulés **divisés par près de deux**.

→ **Sherpa VAD : REJETÉ pour le pilote.** Très bon techniquement, mais
surdimensionné : remplacer quatre lignes de seuil par un pipeline de streaming
audio natif n'est pas proportionné. Il reste **candidat post-pilote** si le
terrain montre que le bruit du marché dépasse ce que le seuil adaptatif encaisse.
