# Addendum à l'audit d'architecture — JULABA

**Ce document ne remplace pas le rapport d'audit du 27/09/2026.** Celui-ci
reste la photographie à l'instant T, avec ses conclusions telles qu'elles ont
été formulées. Le présent addendum est la trace des **vérifications
indépendantes** menées après réception du rapport, et des **corrections
apportées depuis**.

Rien n'y est réécrit en silence. Chaque point porte : ce que l'audit avait
conclu, ce qui a été remesuré, ce qui s'est avéré faux ou incomplet — **des
deux côtés** — et ce qui a été fermé.

| | |
|---|---|
| Rapport initial | Audit d'architecture et de qualité du code, 27/09/2026 |
| Commit audité | `dc6ff1a` |
| Branche | `claude/clever-allen-dnr8by` |
| Commits de réponse | `053d726` (ARG-17), `a16f846` (ARG-18) |
| Rédigé le | 27/09/2026 |

---

## ⚠️ LIMITES DE VALIDATION — à lire avant toute conclusion

**Il ne faut pas écrire « tout est vert », et ce document ne l'écrit pas.**
Trois vérifications n'ont pas pu être rejouées, pour des raisons de gouvernance
et non de complaisance :

1. **`verify` est arrêté par le gel VOICE-01.** Trois fichiers de la parole ont
   changé volontairement (`hooks/useVoiceCore.ts` par VOIX-08,
   `contexts/ObjectifContext.tsx` par VOIX-09, deux points). Le gel fait son
   travail : il signale que le code qui parle n'est plus celui de `3917bb7`.
   **Lever ce gel est une décision de Patrick, jamais d'un agent ni de la CI.**
   Commande : `node scripts/test-voix-trace-source.mjs --regenerer`.

2. **Puis `verify` butera sur l'empreinte d'argent `intentLocal`**
   (`f6c8bc76…` → `86044262…`), conséquence assumée de VOIX-07. Même règle :
   `npx tsx src/app/i18n/voice/validators/empreintesArgent.mts --calculer`,
   puis report **d'une seule ligne** dans `EMPREINTES_BASE`. Si plusieurs
   empreintes bougent, s'arrêter et le signaler.

3. ~~**Les invariants backend n'ont pas été lancés.**~~ **REJOUÉS le 27/09 —
   50 suites, 252 tests, tout passe.** Non pas sur le PostgreSQL partagé, mais
   sur une instance **locale et jetable** montée pour l'occasion
   (`127.0.0.1:55432/julaba_test`, que `assertBaseDeTest()` protège). TEST-05
   n'est donc pas en cause : aucune autre suite ne tournait, et la base naît et
   meurt avec le conteneur. La suite unitaire backend passe également —
   33 suites, 249 tests.

   **Ce passage a coûté une découverte, et elle compte plus que la validation
   elle-même** : trois de ces suites étaient MORTES depuis le 25/09 (voir
   ARG-19 ci-dessous). Elles ne prouvaient plus rien, et personne ne l'avait
   vu — précisément parce que les invariants tournent rarement.

**Les deux premiers points restent ouverts. Tant qu'ils ne sont pas levés,
l'état de la branche est « corrigé, mesuré unitairement et validé sur les
invariants », pas « validé ».** `verify` n'a toujours pas été vu vert de bout
en bout.

---

## ARG-19 — trois invariants d'argent étaient désarmés (découvert le 27/09)

Ce point ne figurait pas dans le rapport d'audit, et n'aurait pas pu y
figurer : il ne se voit qu'en EXÉCUTANT les invariants, ce que l'audit s'était
explicitement interdit (`[NV]`).

`6161dd7` (25/09) a ajouté `uniteDeProduitSaisie`, qui refuse une création de
produit sans unité — « Jamais fabriquée : sans elle, une quantité ne veut rien
dire ». La règle est juste. Mais trois suites d'invariants créaient leurs
produits SANS unité, et n'avaient pas été touchées depuis le 12/08, le 19/09 et
le 12/08 :

| Suite | Ce qu'elle prouvait, et ne prouvait plus |
|---|---|
| `i1-i3-atomicite-stock` | atomicité vente↔stock, survente tracée |
| `i2-idempotence-vente` | une clé rejouée ne décrémente qu'une fois |
| `annulation-remise-stock` | R7, restitution après annulation |

**Les trois invariants les plus critiques sur l'argent, muets pendant deux
jours.**

**Le défaut derrière le défaut.** Deux de ces suites ne vérifiaient pas le
statut de leur propre préparation : leur `createProduit` recevait un 400 en
silence, et l'assertion tombait bien plus loin sur un `stockOf()` à `NaN` —
une erreur qui ne dit pas d'où elle vient. `i2`, lui, vérifie et échoue
franchement. Une préparation qui échoue sans le dire est exactement le défaut
que ce dépôt combat partout ailleurs. **Il n'a pas été corrigé** : ajouter un
`expect` à chaque préparation dépasse la réparation minimale, et relève d'un
arbitrage. Les deux suites restent donc capables de mentir de la même façon.

**Vérification faite avant de conclure.** Les 12 échecs portaient sur
vente↔stock et annulation — exactement ce qu'ARG-18 venait de toucher. La même
suite relancée sur le code d'AVANT ARG-18 (`053d726`) échoue à l'identique :
ce n'était pas la régression, et la coïncidence des fichiers ne suffisait pas
à conclure.

**Conséquence pour ARG-18** : les invariants d'atomicité vente↔stock,
d'idempotence et de restitution passent désormais AVEC la modification du
contrôleur. C'est la validation que la suite unitaire seule ne pouvait pas
donner.

---

## Les quatre rectifications

### ARCH-03 — CONFIRMÉ, puis FERMÉ (ARG-17)

**Ce que l'audit concluait.** Sévérité majeure. `machineEncaissement` utilise
`t(...)` — la forme écran — dans un chemin ensuite vocalisé. Montants
potentiellement mal prononcés.

**Ce qui a été revérifié.** L'audit affirmait que `speak()` ne corrige rien en
aval. **Exact**, mais il avait tracé `useVoiceCore.speak` alors que POSCaisse
utilise `useApp().speak`. Le chemin réel a été remesuré : `AppContext.speak` ne
fait qu'un `replace(/[<>]/g, '')`, puis `audioManager.speak` choisit un canal
sans toucher aux nombres. **Conclusion identique, chemin différent.**

Mesure de bout en bout, avant correction :

```
TATA_DOIT → "Elle doit 2 000 francs."   contient U+202F : OUI
```

La synthèse recevait donc un nombre coupé et l'épelait — « 2 zéro zéro zéro » —
au moment précis où la marchande doit entendre **combien on lui doit**. Pour
quelqu'un qui ne lit pas, la voix EST le montant.

**Ce que l'audit avait manqué : il y avait DEUX sites, pas un.**

Numéros de ligne **au commit audité `dc6ff1a`** (ils ont bougé depuis la
correction : 527, 546, 580).

| Ligne | Rôle | Vu par l'audit |
|---|---|---|
| `POSCaisse:527` | l'écran (`setRelectureAffichee`) | oui |
| `POSCaisse:571` | l'oreille, chemin écran | oui |
| `POSCaisse:541` | **l'oreille, chemin de la COMMANDE VOCALE** | **non** |

Le second site est celui qui compte le plus, et son propre commentaire le
disait déjà : « une marchande qui dit "encaisse" et n'entend rien dirait "oui
valide" sans avoir entendu le compte qu'elle confirme ». **C'est la garde
écrite pour ce lot qui l'a trouvé**, pas la relecture humaine.

**Ce qui a été fermé.** `EffetEncaissement` porte désormais `texte` ET
`texteParle`, via `tParle()` — que le dépôt documente comme « la chaîne qui
part au moteur de synthèse » — et le patron `PhraseDeuxFormes` déjà employé par
`dialoguesTata` et `relectureSpontanee`. La machine ne s'en servait pas.

La phrase **composée** (« Le compte a changé… ») enchâsse la relecture dans les
deux formes séparément : réutiliser une chaîne déjà rendue aurait ré-épelé le
montant à l'endroit même où le compte vient de bouger.

```
écran   : « Le compte a changé. Elle doit 3 000 francs. Elle t'a donné 5 000. Tu rends 2 000. Je valide ? »
oreille : « Le compte a changé. Elle doit trois mille francs. Elle t'a donné cinq mille francs. Tu rends deux mille francs. Je valide ? »
```

**La preuve que rien de financier n'a changé : l'empreinte `machine` de la
gate 8 est identique avant et après** — `5e0a499ca8313f72…`. Cette empreinte ne
hache que `effet.texte`, qui n'a pas bougé ; l'ajout est purement additif.
**Aucun refigeage n'est requis pour ce lot.**

**Arbitrage associé.** Deux gardes voisines ont rougi, dont
`caisseRelectureAffichee`, qui cite une décision de Patrick du 20/09 : « la
même relecture financière exacte que celle prononcée ». Patrick a tranché le
27/09 : cela signifie **le même snapshot métier**, pas la même chaîne Unicode
caractère par caractère — sinon on imposerait une collision artificielle entre
lisibilité écran et intelligibilité vocale. Les gardes ont donc été
**resserrées, pas affaiblies** : elles exigent `texte` à l'écran et
`texteParle` à la voix, **du même effet**, et interdisent explicitement
d'envoyer la forme écran à la synthèse.

Garde : `services/encaissementDeuxFormes.test.mts`, 16 assertions, quatre
contre-essais, quatre rougissements.

---

### ARCH-04 — RETIRÉ (faux au commit audité)

**Ce que l'audit concluait.** Sévérité majeure. `voice-offline/localIntent.ts`
formate certaines sous-chaînes financières avant composition de la phrase
finale, rendant impossible une conversion tardive en forme vocale.

**Ce qui a été revérifié.** Le fichier ne contient, au commit audité,
**aucun `toLocaleString`, aucun `.texte`, aucun formatage avant composition**.
Il compose par clés de catalogue avec des variables typées.

**Pourquoi l'écart.** La correction (VOIX-07, `1384b8c`) est **antérieure** au
commit audité `dc6ff1a`. L'audit a décrit du code qui n'existait plus à
l'instant qu'il prétendait photographier.

**Statut : à retirer du rapport.** Le constat reste juste en tant que principe
général — ne jamais composer une phrase à partir de fragments déjà rendus — et
il est d'ailleurs consigné comme règle dans `localIntent` depuis VOIX-07.

---

### ARCH-02 — MAINTENU comme dette sémantique, mais BORNÉ

**Ce que l'audit concluait.** Sévérité majeure. `productId` porte deux sens :
identifiant de produit catalogue (UUID) et identifiant artificiel de ligne
(`libre-*`). Impact annoncé : « risque de vente correctement comptée mais stock
incorrect ».

**Ce qui a été revérifié.** Le double sens **existe bien** côté écran :
`POSCaisse:303` fabrique `libre-${Date.now()}-${random}` et l'affecte à
`productId`, qui part au serveur. Sur ce point, l'audit a raison, et c'est une
dette sémantique réelle.

**Ce que l'audit avait manqué : le garde qui borne le risque.** Le dépôt
connaît déjà ce défaut sous le nom **ARG-16**, l'a **reproduit contre un
PostgreSQL 16 réel** le 24/09, et sa documentation porte mot pour mot le
diagnostic de l'audit — « C'est la même donnée avec deux sens ».

`commun/identifiant-produit.ts` filtre au bord : un identifiant de produit est
un UUID, ou il n'y en a pas. Un `libre-*` devient `null`, et la ligne retombe
sur le **repli par nom** déjà en place. La conséquence annoncée par l'audit est
donc précisément ce qui avait été fermé.

Ironie utile : le rapport cite lui-même `identifiant-produit.ts` parmi les
preuves de bonne santé du projet, **sans faire le lien** avec ARCH-02.

**Statut : maintenu, requalifié.** Dette sémantique réelle et non close — le
champ porte toujours deux sens côté frontend. **Risque immédiat borné** par
`identifiantProduit()` et le repli par nom. La correction de fond reste celle
que l'audit propose en P0.1 : séparer `ligneId` et `productId?: UUID`. Elle
n'est pas faite.

---

### ARCH-05 — REFORMULÉ, puis FERMÉ (ARG-18)

**Ce que l'audit concluait.** Sévérité majeure. `caisse-rest.controller.ts:745`
contient `if (!rows[0]) continue;` : un produit non retrouvé est ignoré, la
transaction vente et le stock peuvent diverger silencieusement.

**Ce qui a été revérifié.** L'audit **ne citait pas le commentaire porté par
cette ligne** : « produit inconnu (vente libre/voix) : aucun effet stock ». Le
saut est documenté et voulu — un article libre n'a aucun stock à bouger. Le
code environnant est par ailleurs plus soigné que le rapport ne le laisse
croire : recherche par identifiant puis repli par nom, `marchand_id` toujours
contraint, `FOR UPDATE`, unité figée au mouvement.

**Le défaut réel, et il existe : une ASYMÉTRIE.** Le cas voisin — stock
insuffisant — écrit une ligne avec son `manquant`. Le registre savait dire
« il en manquait 3 », il ne savait pas dire « ce produit-là, je ne l'ai pas
trouvé ».

**Reformulation retenue** (arbitrage de Patrick, 27/09) :

> Une vente peut être ACCEPTÉE alors qu'aucun produit n'a été retrouvé pour le
> mouvement de stock, et cette non-réconciliation ne laisse aucune trace. Le
> `continue` n'en est que le symptôme local.

**Ce qui a été fermé.** `commun/reconciliation-stock.ts` — module pur, testable
sans base — décide quel mouvement écrire. **Deux silences distincts**, parce
que les confondre les rendrait illisibles : les ventes libres sont nombreuses
et normales, l'anomalie s'y noierait.

| Cas | Type écrit | Nature |
|---|---|---|
| Produit trouvé | `vente` | inchangé |
| Stock insuffisant | `vente` + `manquant` | inchangé |
| UUID visé, introuvable | **`non_reconcilie`** | **ANOMALIE** — identifiant visé conservé |
| Aucun identifiant visé | **`sans_catalogue`** | attendu (article libre, dictée) |

Ce que la règle **ne fait pas**, et c'est la moitié de la décision : elle ne
bloque pas la vente, ne fabrique aucun stock, ne retombe jamais en silence sur
un autre produit. `stockApres === null` porte cette garantie **dans le type** —
le contrôleur n'a plus à la redécider. Résultat financier rigoureusement
inchangé.

**Aucune migration.** `stock_mouvements` portait déjà `produit_id` nullable,
`produit_nom` nullable et une colonne `type` (`'vente'`, `'annulation'`). Ni
clé étrangère sur `produit_id`, ni contrainte sur `type`. La trace entre dans
le registre existant plutôt que d'en ouvrir un second.

Garde : `test/unit/reconciliation-stock.spec.ts`, 9 cas, quatre contre-essais,
quatre rougissements.

**Reste ouvert, et c'est une décision à prendre :** ces anomalies doivent-elles
remonter à la marchande, au back-office, ou rester à l'audit seul ? Rien n'a
été décidé — la trace existe, sa destination non.

---

## Ce que l'agent de développement a eu faux, et c'est consigné aussi

Un addendum qui ne corrigerait que l'auditeur serait malhonnête. Dans la même
journée, trois verdicts rendus à Patrick étaient **faux**, tous pour la même
raison : avoir sondé la mauvaise porte.

| Verdict annoncé | Réalité |
|---|---|
| « #5 (« encaisser encaisser ») OUVERT » | **Fermé.** `estIntentionEncaissement` reçoit un TYPE d'action, jamais une phrase. Erreur de ciblage reproduite depuis le retour terrain au lieu d'être détectée. |
| « #7 (ajout stock vocal) OUVERT » | **Fermé depuis le 24/09.** Le chemin mort avait été retiré ; `produitDit` comprend « ajoute 10 kilos de tomate à 500 ». |
| « #4 : un seul résidu » | **Dix sites.** Le grep employé ne franchissait pas les sauts de ligne. |

Deux autres erreurs, du même ordre :

- Un commit a annoncé « typecheck : 0 » **sans l'avoir relancé** après la
  dernière modification. `verify` a cassé au premier maillon.
- La correction VOIX-08 a **introduit** une régression — « pas d'accord »
  compté comme OUI — parce que la liste déclarée était plus pauvre que la liste
  en dur qu'elle remplaçait. **Trouvée par contre-essai, pas par lecture.**

C'est la raison d'être des contre-essais systématiques : à trois reprises
aujourd'hui, ils ont attrapé ce que la relecture avait laissé passer.

---

## Classification

**C — DETTE STRUCTURELLE IMPORTANTE.** Inchangée, et la nuance compte :

Les deux défauts P0 les plus concrets du rapport ont désormais une réponse
structurée et gardée — ARG-17 pour la voix de l'argent, ARG-18 pour la
traçabilité du stock. **Le débat se déplace donc des risques immédiats
d'argent silencieusement faux vers les hotspots architecturaux** : `POSCaisse`
(1 661 lignes, 33 imports), `CaisseContext` (1 008), `useVoiceCore` (1 129).

Ce déplacement ne vaut pas amélioration de la note. Les God modules n'ont pas
bougé, `productId` porte toujours deux sens, et **rien de tout cela n'a encore
été vu sur le terrain** — ni ARG-17, ni ARG-18, ni les lots VOIX-07 à VOIX-09.

Le conseil final du rapport reste le bon, et il est confirmé par cette
journée : **normaliser les modèles aux frontières avant de découper les gros
fichiers.** ARG-17 et ARG-18 sont deux normalisations de frontière ; aucune
n'a exigé de toucher à un God module.
