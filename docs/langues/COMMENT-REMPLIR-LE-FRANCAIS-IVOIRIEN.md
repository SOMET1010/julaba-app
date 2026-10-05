# Mettre les textes en français ivoirien — mode d'emploi

**25/09/2026.** Fichier à remplir : `docs/langues/TEXTES-A-TRADUIRE.csv`
(525 phrases, ouvrable dans Excel ou LibreOffice).

## Le champ existait déjà

Le catalogue vocal (`i18n/voice/catalog.ts`) porte depuis le début deux
colonnes par phrase :

```
frActuel : '…'      ce qui est dit aujourd'hui
frMarche : null     ce qu'on dirait au marché   ← VIDE sur les 527 entrées
```

Rien n'était prévu à inventer : la place attendait. Ce fichier sert à la
remplir.

## Comment remplir

Une seule colonne à compléter : **`FRANCAIS_IVOIRIEN`**. Laisse tout le reste
tel quel. Une ligne vide = on garde la phrase actuelle.

### Les trois règles qui comptent

**1. Les accolades ne se traduisent pas.** `{montant}`, `{produit}`,
`{caisse}`, `{devise}` sont remplacés à l'exécution par de vraies valeurs. Ils
doivent se retrouver **à l'identique** dans ta version, orthographe comprise.

```
actuel    « Ta caisse aujourd'hui : {caisse}. »
ivoirien  « Ton argent là aujourd'hui, c'est {caisse}. »     ✅
ivoirien  « Ton argent là aujourd'hui, c'est {la caisse}. »  ❌ casse la phrase
```

La colonne `variables` te dit lesquelles la phrase attend.

**2. Les phrases marquées `argent = oui` sont les plus délicates** (156 sur
525). Elles annoncent un montant, un rendu de monnaie, un stock. Le sens ne
doit pas bouger d'un franc : on peut changer les mots, jamais ce qu'ils
comptent.

**3. C'est fait pour être DIT, pas lu.** La marchande n'ouvre pas l'écran pour
lire : elle écoute. Écris ce que Tantie dirait à voix haute, comme au marché —
pas une traduction écrite.

## Par où commencer

Le fichier est **trié par ce que la marchande entend le plus** :

| Priorité | Ce que c'est | Phrases |
|---|---|---|
| **1** | la caisse, la vente, le guidage | **110** |
| **2** | le stock, les dépenses | **52** |
| 3 | crédit et divers marchand | 44 |
| 4 | partage et messages du moteur | 186 |
| 5 | connexion | 84 |
| 6 à 9 | marché, Keiwa, coopérative, producteur, back-office | 49 |

**Les priorités 1 et 2 font 162 phrases** — c'est tout ce que la marchande
entend dans sa journée de travail. Si tu ne fais que celles-là, l'essentiel
est fait.

Les priorités 7 à 9 ne la concernent pas : Keiwa est hors pilote, la
coopérative et le producteur ont leurs propres écrans, le back-office est pour
l'équipe.

## Quand tu me rends le fichier

Je fais trois choses, dans cet ordre :

1. **Je vérifie mécaniquement** chaque ligne remplie : toutes les variables
   attendues sont présentes, aucune n'a été inventée, aucune phrase d'argent
   n'a perdu son montant. Une ligne qui échoue est écartée et signalée — elle
   n'entre pas dans l'application.
2. **Je remplis `frMarche`** dans le catalogue, sans toucher à `frActuel`.
3. **Je te dis ce que ça change**, phrase par phrase, avant de basculer quoi
   que ce soit.

## Ce qui reste à décider — et qui n'est pas dans ce fichier

Remplir `frMarche` ne suffit pas à changer ce qu'on entend : il faut ensuite
décider **qui sert quoi**. Trois voies, et c'est ton arbitrage :

- **basculer tout le monde** sur la version marché ;
- **la proposer en réglage** (« français d'ici » / « français d'école ») ;
- **la servir aux clips seulement** — la voix en marché, l'écrit en standard.

Chacune a une conséquence sur les empreintes de comportement (gate 8) et
demandera ta signature. On en parle quand le fichier revient.

## Et les clips déjà enregistrés

137 clips portent la voix de Tata Nanti Lou **sur les phrases actuelles**.
Changer une phrase rend son clip faux : elle s'afficherait autrement qu'elle
ne se dit. Je te dirai lesquelles sont dans ce cas quand tu me rendras le
fichier — et il faudra les réenregistrer, ou garder la phrase d'origine.
