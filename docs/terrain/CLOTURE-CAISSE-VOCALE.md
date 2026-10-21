# Critère de clôture — dossier « caisse vocale »

> **Pourquoi ce document existe.** Patrick, 01/10 : *« si je n'arrive pas à
> boucler des dossiers ça pose un véritable souci. »*
>
> Le constat est juste, et il est mesurable : depuis le 27/09, **chaque recette
> terrain a ouvert plus de défauts qu'elle n'en a fermé**. Dix-huit lots livrés,
> et toujours pas de moment où l'on puisse dire « c'est fini ». Ce n'est pas un
> problème de code : **il n'y a pas de ligne d'arrivée**, donc on ne peut pas la
> franchir.
>
> **J'y ai contribué.** Chaque mesure que je fais trouve un défaut de plus, et
> je l'ai corrigé dans la foulée à chaque fois. C'est utile, et ça empêche de
> finir. Ce document me contraint autant que lui.

---

## 1. Ce que « caisse vocale » veut dire — tes mots, 29/09

> *« On ferme d'abord la boucle : ouvrir → ajouter → prix → quantité éventuelle
> → vendre → encaisser → entendre correctement. »*

**Sept gestes. Rien d'autre n'est dans ce dossier.** Pas le profil, pas la
caméra, pas les marchés, pas Express, pas les majeurs de dépendances, pas #29.

---

## 2. Ce que la machine prouve déjà — à ne PAS refaire à la main

Une commande, rejouable à chaque SHA, sur base neuve :

```sh
bash frontend/e2e/run-recette-voix.sh
```

| Geste | Prouvé par la machine | Mesure |
|---|---|---|
| ouvrir | recette, étape 1 | la voix n'annonce pas « zéro franc » |
| ajouter | garde `premier-produit` | 3 questions + 4ᵉ facultative |
| prix | garde `premier-produit` | un prix nul n'entre jamais |
| quantité | API, 3 cas | inconnu / 12 / zéro distincts jusqu'en base |
| vendre | recette, étapes 2 et 4 | 2 × 100 F = 200 F au bon produit |
| encaisser | recette, étape 3 | « Elle doit 200 francs. Touche les billets. » |
| entendre | gardes i18n | 1 000 se dit « mille francs » |

Plus : **252 invariants d'argent**, **125 maillons**, **8 invariants offline**.

**Règle : si la machine le prouve, le terrain ne le rejoue pas.** C'est ce qui
rend la recette terrain *finie* au lieu d'*infinie*.

---

## 3. Ce que la machine NE PEUT PAS prouver — et c'est tout ce qui te reste

Cinq familles, parce que cinq choses n'existent pas dans un navigateur :

| # | Famille | Le geste, sur le téléphone |
|---|---|---|
| **T1** | **La transcription** (sherpa-onnx n'existe que dans l'APK) | Dire « encaisser », puis **🐞** · Dire « vends deux tas de piment », puis **🐞** |
| **T2** | **Le son réellement audible** | Une vente → entend-on la phrase, et le montant en LETTRES ? |
| **T3** | **Le micro réel** (bruit, distance, accent) | Une phrase longue au marché : est-elle coupée ? |
| **T4** | **Le hors-ligne réel** | Vendre avion activé, puis rallumer : une seule vente en base ? |
| **T5** | **L'écran réel** | Le panier et le total sont-ils lisibles sans défiler ? |
| **PAN-01** | **Le panier après fermeture de l'app** | Deux articles, fermer l'application pour de bon, rouvrir : le panier et son total sont-ils les mêmes ? |
| **P0.1** | **Deux prix libres distincts** | 500 puis 300 : le total affiche-t-il 800, sur deux lignes ? |

**Sept RELEVÉS, pas dix blocs** — et « relevés », pas « gestes », parce que
« sept gestes » désigne déjà la BOUCLE MÉTIER du §1 (ouvrir → ajouter → prix →
quantité → vendre → encaisser → entendre). Deux sens pour une même expression
finiraient par désigner deux choses dans deux comptes rendus.

Chacun tient en une minute. PAN-01 et P0.1 ont
été ajoutés par Patrick le 01/10 à la liste des gestes terrain ; ils relèvent du
**premier** critère bloquant de la §5 (« écrire un montant faux, ou perdre une
vente »), pas d'un nouveau — la §5 ne bouge pas.

Ces deux-là sont aussi couverts **entièrement** par le banc Maestro (`.maestro/`),
donc la règle du §2 s'applique dès que le banc tourne : **si la machine le prouve,
le terrain ne le rejoue pas.**

---

## 4. Les trois critères de clôture

Le dossier est **FERMÉ** quand les trois sont vrais **sur un même SHA** :

1. **La machine est verte** — recette voix 7/7, 252 invariants, 125 maillons
   verts *sauf* les refigeages en attente, qui sont les tiens.
2. **Les sept relevés (T1→T5, PAN-01, P0.1) sont passés** sur un APK, et le SHA
   est écrit en tête du compte rendu. Ceux que le banc Maestro prouve
   entièrement comptent dès qu'il tourne — règle du §2.
3. **Zéro défaut BLOQUANT ouvert** au sens de la §5.

Rien d'autre ne bloque. Ni le nombre de défauts non bloquants, ni la dette, ni
les audits, ni les lots suivants.

---

## 5. LA RÈGLE QUI PERMET DE FINIR

Un défaut trouvé pendant la recette de clôture est **BLOQUANT** s'il coche une
de ces trois cases, et **seulement** dans ce cas :

- il fait **écrire un montant faux** (ou perdre une vente) ;
- il fait **dire un montant faux** à une marchande qui ne lit pas ;
- il **empêche** l'un des sept gestes d'aboutir.

**Tout le reste est NON BLOQUANT.** Un libellé mal tourné, une icône, un
encombrement, une lenteur, une dette, une CVE modérée : c'est **nommé, daté,
rangé dans un lot** — et le dossier reste fermable.

**Et ça me contraint moi :** pendant une recette de clôture, un défaut non
bloquant que je trouve, **je le consigne et je ne le corrige pas.** Même s'il
est petit. Même si ça me prend cinq minutes. C'est exactement ce que j'ai fait
dix-huit fois, et c'est pour ça qu'on n'a jamais fini.

---

## 6. Explicitement HORS de ce dossier — nommés et datés

| Lot | Statut | Décidé le |
|---|---|---|
| **Profil** (caméra, marchés, communes) | après la caisse vocale | 29/09, par toi |
| **Express 4/5** | constat écrit, chantier à ouvrir | 29/09, par toi |
| **#29 / audio-TTS sur appareil** | ta matrice en cours | 30/09, par toi |
| **exceljs 4.x, @capacitor/cli 9.x** | majeurs, arbitrage produit | 28/09 |
| **I4 / I5 / I6** (invariants crédit) | absents, à écrire | contre-audit |
| **CONC-01** (vente concurrente) | à écrire | contre-audit |
| **STK-03** — l'identifiant désigne 3 dettes | à trancher | contre-audit |

Aucun de ces lots ne bloque la clôture de la caisse vocale.

---

## 7. Où on en est aujourd'hui — après le rapport F4NT (01/10)

**Le premier geste T1 a été joué, et il a trouvé deux bloquants.** Rapport
terrain F4NT, APK `d3cb6ce`, Samsung SM-S938B sous Android 16. Trois phrases
dites sur la caisse, **toutes transcrites correctement par sherpa-onnx**,
toutes « je n'ai pas bien compris ».

| # | Défaut | Critère §5 | État |
|---|---|---|---|
| **F4NT-A** | l'apostrophe typographique (U+2019) de sherpa faisait perdre le produit, et le « un » de « un tas » devenait **1 franc** | montant faux | **corrigé** |
| **F4NT-B** | « Tomate mille francs » jeté : `extraire` avait produit ET montant, les deux portes en aval exigeaient une **quantité** | geste « vendre » bloqué | **corrigé** |

| Critère | État |
|---|---|
| 1. Machine verte | **OUI** — 7/7 recette, 252 invariants, **125 maillons** dont 122 verts — les 3 rouges sont tes refigeages |
| 2. Sept relevés | **T1 joué une fois, deux bloquants trouvés et corrigés** — à rejouer sur `85f6ea6`, puis T2→T5, PAN-01, P0.1 |
| 3. Zéro bloquant ouvert | **OUI** après ce lot |

Par la règle §8.1, les deux défauts étant bloquants : nouveau SHA, et **les cinq
gestes se rejouent**.

### Ce que F4NT a appris sur la MÉTHODE, et ça compte plus que les deux correctifs

**F4NT-A était inatteignable par tout ce qu'on avait.** Ni les 123 maillons
d'alors, ni
les 252 invariants, ni la recette navigateur ne pouvaient la voir, et pas par
négligence : le stub de transcription de la recette rend **ce qu'on y écrit**,
donc des apostrophes droites. Seul sherpa, sur l'appareil, produit la courbe.

Le constat qui en découle, et qui rejoint l'audit du 01/10 : **il manque un banc
E2E sur APK réel.** Un émulateur Android ne peut pas tourner dans la session de
l'agent (pas de `/dev/kvm`, pas de `vmx/svm`, pas de SDK — vérifié) ; le chemin
est la CI, où `apk.yml` tourne déjà sur `ubuntu-latest`. **Arbitrage en attente
de Patrick**, pas ouvert ici.

## 8. Ce que je fais si tu trouves un défaut pendant ces relevés

1. **Bloquant** (§5) → je corrige, nouveau SHA, et **tu rejoues les sept**.
2. **Non bloquant** → je l'écris dans un lot nommé, **je ne le corrige pas**,
   et **la clôture continue**.

C'est moi qui applique ce tri et qui te le dis à chaque fois, en nommant la
case cochée. Si tu n'es pas d'accord avec mon tri, tu tranches — mais le tri
est fait **avant** qu'une seule ligne de code soit écrite.
