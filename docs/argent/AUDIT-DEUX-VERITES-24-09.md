# Audit « où la même donnée a-t-elle deux vérités » — chemin de l'argent

**Demandé par Patrick le 24/09/2026** : « lance cet audit sur tout le chemin de l'argent ».

**Périmètre** : les 91 fichiers du noyau garde-argent (39 backend, 51 frontend), plus
les fichiers qui les importent directement.

**Méthode** : aucune conclusion n'est écrite ici sans mesure. Chaque cas porte sa
reproduction. Un cas non reproduit est marqué comme tel et ne compte pas.

**Ce que l'audit cherchait** : la cause racine identifiée cinq fois le 24/09 —
*une information existe, et quelqu'un en aval la jette ou la re-devine*.

---

## Ce qui a été trouvé

| # | Ce qui a deux vérités | État |
|---|---|---|
| ARG-16 | `productId` : identifiant de catalogue **ou** identifiant de ligne de panier | **FERMÉ** (29612c5) |
| ARG-17 | Les 5 phrases de l'encaissement : forme écran envoyée à la voix | **OUVERT** — signature requise |
| ARG-18 | La confirmation hors ligne : montant figé en forme écran, irrécupérable en aval | **OUVERT** — signature requise |
| ARG-19 | `productId` porte encore les deux sens **côté écran** | **OUVERT** — arbitrage |
| ARG-20 | Un produit introuvable ne décrémente rien, et personne ne le dit | **OUVERT** — arbitrage |
| — | `session/ouvrir` sans `fond_initial` écrit 0 marqué « déclaré » | **HORS PÉRIMÈTRE JUSTIFIÉ** |
| — | `direCoupure` : repli sur `formatF` pour les coupures hors lexique | **FERMÉ par mesure** — pas de défaut |
| — | Colonne `stock` écrite depuis 3 fichiers | **FERMÉ par mesure** — les 3 sont légitimes |

---

## ARG-16 — une vente avec un article libre était refusée. **FERMÉ**

**Reproduit** contre un PostgreSQL 16 réel, avec la requête exacte du décrément :

```
ERROR:  invalid input syntax for type uuid: "libre-1758712345678-42"
```

`produits.id` est de type `uuid`. Le champ `productId` que l'écran envoie ne porte
pas toujours un identifiant de catalogue : pour un article libre — « Autre article »
tapé au doigt (`POSCaisse.tsx:296`), ou un produit dicté que l'appariement n'a pas
reconnu (`vendreVocalUnifie.ts:312`, `MicroVenteCaisse.tsx:211`) — il porte un
identifiant de **ligne de panier**, `libre-1758…`.

**Ce que ça coûtait.** L'erreur tombait dans la transaction de la vente : rollback,
500. Côté écran, `doitEnfiler` classe tout 5xx comme transitoire : la vente partait
dans la file durable hors ligne pour y être rejouée — et y échouer de nouveau,
indéfiniment. Ni l'argent ni le stock n'entraient. La marchande lisait « en attente »
pour toujours.

C'est le symptôme du terrain : **« le tas de gombo n'est pas mis à jour dans le stock »**.

**Date d'apparition** : 18/09/2026 (`853dff7`). Avant, le stock se décrémentait par
nom et ce chemin n'existait pas. C'est une régression de six jours.

**Mesure bout en bout** (PostgreSQL 16, panier « 2 tas de gombo », ligne libre) :

```
SANS correctif → VENTE REFUSÉE (500), stock inchangé : 10
AVEC correctif → VENTE PASSÉE, stock Gombo : 10 → 8
```

**Correctif** : `backend/src/commun/identifiant-produit.ts`. Un identifiant de produit
est un UUID, ou il n'y en a pas ; tout le reste retombe sur le repli par nom déjà en
place. Côté **serveur**, et pas seulement côté écran : les ventes déjà bloquées dans
la file d'un téléphone rejouent leur payload tel quel — seul le serveur les débloque.

---

## ARG-17 — l'encaissement dit ses montants sous leur forme écran. **OUVERT**

`services/machineEncaissement.ts` : **9 appels à `t(...)`, zéro à `tParle(...)`**.
Cinq portent un montant, et **tous** repartent dans un effet `{ type: 'dire' }`
(lignes 134, 137, 141).

**Mesuré** :

```
TATA_RELECTURE_COMPTE_JUSTE
  écran : Elle doit 2 000 francs. Elle t'a donné 2 000. Compte juste. Je valide ?
  dit   : Elle doit deux mille francs. Elle t'a donné deux mille francs. Compte juste. Je valide ?
TATA_RELECTURE_MONNAIE
  écran : Elle doit 1 500 francs. Elle t'a donné 2 000. Tu rends 500. Je valide ?
  dit   : Elle doit mille cinq cents francs. Elle t'a donné deux mille francs. Tu rends cinq cents francs. Je valide ?
TATA_TOUCHE_LES_BILLETS · TATA_DOIT_DONNE_RENDS · TATA_DOIT — même divergence.
```

(L'espace des milliers est une espace fine insécable U+202F. C'est elle que la
synthèse épelle : « deux zéro zéro zéro ».)

C'est **exactement** le défaut corrigé le 24/09 dans `dialoguesTata`, mais dans le
chemin de l'encaissement — celui de **l'argent rendu à la cliente**. Et c'est la
phrase que la marchande doit confirmer avant de rendre la monnaie.

**Pourquoi ce n'est pas corrigé ici** : `machineEncaissement` est sous **empreinte de
comportement figée** (gate 8, `empreintesArgent.mts`, clé `machine`). Toute correction
de forme parlée fait bouger cette empreinte — **décision de Patrick, jamais de l'agent**.

**La réponse existe déjà dans le dépôt** : `relectureDeuxFormes` / `confirmationDeuxFormes`
— deux formes issues du même appel, l'écran garde « 2 000 », l'oreille reçoit
« deux mille ». C'est la forme que prendrait le correctif.

---

## ARG-18 — la confirmation hors ligne : le montant est jeté avant la voix. **OUVERT**

`voice-offline/localIntent.ts` : **4 appels à `t(...)`, zéro à `tParle(...)`**.

**Mesuré**, sur de vraies phrases :

```
"je vends 2 tomates à 2000"      → "Vente de 2 tomates pour 2 000 francs, c'est bien ça ?"
"j'ai dépensé 2000 francs de riz" → "Dépense de 2 000 francs pour riz, c'est bien ça ?"
```

Cette chaîne est **dite** (`useVoiceCore.ts:600`, `ttsSpeak(data.response…)`) **et
affichée** (typewriter, ligne 582). Elle contient une espace fine insécable — mesuré :
1 occurrence. C'est le chemin **hors ligne**, celui du téléphone au marché.

**Ce cas est plus grave que les autres, et c'est le motif racine en entier.** Le
montant n'est pas seulement rendu sous sa forme écran : il est figé sous cette forme
**dans une sous-clé**, `TATA_PART_POUR_MONTANT`, puis inséré comme **texte** dans la
phrase finale :

```
TATA_PART_POUR_MONTANT  écran " pour 2 000 francs"  ≠  dit " pour deux mille francs"
TATA_CONFIRME_VENTE     IDENTIQUES  ← la phrase composée ne diverge plus : il est trop tard
```

Passer `TATA_CONFIRME_VENTE` à `tParle` **ne corrigerait rien** : quand elle est
composée, la valeur numérique n'existe plus. *Une information existe, et quelqu'un en
aval la jette.*

**Empreinte figée** : clé `intentLocal`. Signature de Patrick requise.

---

## ARG-19 — `productId` porte encore deux sens côté écran. **OUVERT — arbitrage**

ARG-16 protège le serveur. Il ne referme pas la cause : côté écran, le même champ
désigne tantôt un produit du catalogue, tantôt une ligne de panier. C'est une
violation directe de « ne jamais donner deux sens à la même donnée ».

**Ce n'est pas un correctif, c'est un arbitrage** : `addToCart` fusionne les lignes
**sur ce champ**. Séparer les deux sens (un `productId: string | null` pour le
catalogue, un `ligneId` pour le panier) touche le panier entier, donc l'encaissement.
À faire après l'APK terrain, pas avant.

---

## ARG-20 — un produit introuvable ne décrémente rien, en silence. **OUVERT — arbitrage**

`caisse-rest.controller.ts:713` : `if (!rows[0]) continue;` — produit inconnu, aucun
effet stock, **aucune trace, aucun mot à la marchande**. L'argent entre, le stock ne
bouge pas, et rien ne le dit.

Depuis ARG-16, ce chemin est **plus fréquent** : les lignes libres y retombent
désormais par le nom, et un nom qui ne correspond à rien au catalogue passe par là.

La doctrine posée pour le stock 0 — **« prévenir, ne jamais bloquer »** — dit ce qu'il
faudrait faire : ne pas bloquer la vente (c'est déjà le cas), mais **le dire**. Ce que
« le dire » veut dire ici (une ligne au journal ? un mot de Tata ? les deux ?) est un
arbitrage de Patrick.

---

## Ce qui a été vérifié et s'est révélé sain

**La colonne `stock` est écrite depuis 3 fichiers** — `stocks-rest.controller.ts`
(corrigé le 24/09, STK-06), `caisse-rest.controller.ts` (corrigé en septembre),
`stock-restitution.ts`. Vérifié : `stock-restitution.ts` est **légitime** — il calcule
`stockAvant + net` depuis la base avec `FOR UPDATE`, et ne prend rien du corps de
requête.

**`direCoupure`** (`utils/fcfa.ts:92`) passe un **nom** de lexique (« dix mille »), pas
un nombre : pas de forme écran. Le repli `formatF(valeur)` ne concerne que 10 F et 5 F,
sous le seuil des milliers — **aucune espace fine possible**. Pas un défaut.

**`POST /caisse/vente`** : `parseFloat(body.montant) || 0` est bien suivi d'un refus
`<= 0`. Le zéro fabriqué n'atteint jamais la base.

**`POST /caisse/session/ouvrir`** : `body.fond_initial ?? 0` écrit un fond 0 **marqué
déclaré** (`fond_declare_at = NOW()`), ce qui ferait ensuite refuser la vraie
déclaration de la marchande (`fond_conserve`). Mais le seul appelant est
`caisse-api.ts:392`, dont la signature TypeScript **impose** un nombre.
**HORS PÉRIMÈTRE JUSTIFIÉ** — risque réel si un autre client apparaît, nul aujourd'hui.

---

## Ce que l'audit ne dit pas

La recherche large du motif « zéro fabriqué sur un champ d'argent » ramène une
**surface**, pas une liste de dettes : la plupart de ces `|| 0` sont des lectures pour
affichage, bénignes. Seules les écritures comptent, et elles ont été examinées une par
une ci-dessus. **Le nombre brut n'est pas un décompte de défauts** et ne doit pas être
cité comme tel.

Les 13 dettes stock mesurées le 24/09 n'ont pas été revérifiées ici. BO-06 à BO-09 non
plus. L'audit portait sur le chemin de l'argent.

---

## Ce qui attend une décision de Patrick

1. **ARG-17** — corriger les 5 phrases de l'encaissement en deux formes. Fait bouger
   l'empreinte `machine`. Signature requise.
2. **ARG-18** — corriger la confirmation hors ligne. Fait bouger l'empreinte
   `intentLocal`. Signature requise. **Le correctif est structurel** : il faut cesser
   de composer la phrase à partir de sous-clés déjà rendues.
3. **ARG-19** — séparer les deux sens de `productId` côté écran. Après l'APK terrain.
4. **ARG-20** — que dire à la marchande quand le stock d'un produit vendu n'a pas
   bougé ?

Rappel : **`--figer` / `--figer-perimetre` / `--figer-gardes` sont la décision de
Patrick, jamais celle de la CI ni d'un agent.**
