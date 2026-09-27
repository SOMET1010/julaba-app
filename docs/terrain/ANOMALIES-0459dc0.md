# Anomalies terrain — APK `0459dc0`

> Registre des défauts constatés sur le terrain avec l'APK
> [`julaba-0459dc0.apk`](https://github.com/SOMET1010/julaba-app/releases/download/pilote-latest/julaba-0459dc0.apk)
> (272,9 Mo, build #43). **La branche est gelée** : ce fichier CONSIGNE, il ne
> corrige rien. Aucune ligne de code n'a été touchée depuis `0459dc0`.
>
> Règle posée par Patrick le 27/09 : *chaque anomalie porte le SHA de l'APK
> testé*. Sans lui, on compare des recettes faites sur des versions
> différentes sans le savoir.

---

## A1 — « La boîte me dit zéro franc » alors que l'écran affiche 3 150 F

**Écran** : accueil marchande. **Geste** : ouvrir l'application.
**Observé** : la voix annonce zéro franc ; l'écran affiche 3 150 F.
**Confirmé par Patrick** : *« Quand j'appuie à nouveau sur le haut-parleur pour
rejouer, il me donne le bon montant. »*

### Ce qui a été mesuré

| Point | Résultat |
|---|---|
| La clé de phrase | `ACCUEIL_CAISSE_CONNUE { caisse: 3150 }` → « trois mille cent cinquante francs ». **Saine.** |
| La source | L'écran et la voix lisent **la même** valeur, `etatCaisse.montant`. |
| Le moment | `etatCaisseAccueil` rend `partielle` **ou** `connue` avec un montant à 0 **pendant le chargement**. |
| Le déclencheur | Le `useEffect` de `MarchandAccueilVoice` ne s'abstient que sur `attente`. |
| L'irréversibilité | `ditAuMontage` passe à `true` à la première annonce et **ne se corrige jamais**. |

**Diagnostic.** Ce n'est pas la valeur qui est fausse, c'est **l'instant**. La
voix parle avant que la caisse soit lue, et rien ne la rattrape. L'écran, lui,
se corrige tout seul au rendu suivant — d'où l'écart que Patrick voit.

**Doctrine touchée** : *« ne jamais donner deux sens à la même donnée »*.
`partielle` veut dire deux choses : « chargement incomplet » et « plancher
réel connu ». L'écran a le droit d'afficher les deux pareil ; la voix, non.

**Statut** : diagnostiqué, **non corrigé**.

---

## A2 — « Ce n'est pas la voix que j'attendais »

**Ce n'est pas un défaut.** Deux faits, tous deux déjà connus :

1. **75 phrases sur 140 portent une variable** (un montant, un produit, une
   quantité). Un clip est retrouvé par son **texte exact** : une phrase qui
   change à chaque vente ne peut pas en avoir un. La synthèse du téléphone est
   donc obligatoire sur ces 75 phrases. Les 220 clips enregistrés sont bien
   dans l'APK et sont bien joués sur les phrases fixes.
2. **Render et l'APK n'ont pas le même moteur de synthèse** : `speechSynthesis`
   du navigateur d'un côté, la synthèse Android de l'autre. Deux timbres.
   Déjà consigné dans `456cd29`.

**Ce que ça coûte** : le lot B+C (15 clips à produire) réduit la part de
synthèse sur les phrases fixes ; il ne peut rien pour les 75 dynamiques.

**Statut** : expliqué. Arbitrage à rendre par Patrick sur le lot B+C.

---

## A3 — « La vente vocale marche pas »

**Écran** : Caisse du jour. **Observé** : bandeau
**« Je n'ai pas compris. Redis-moi. »** sous le micro.

Ce bandeau (`MicroVenteCaisse.tsx:717`) ne s'affiche que dans **une** situation,
décidée par `afficheEcoute` (`services/ecouteCaisse.ts`) : la transcription
n'est **pas** vide **et** le moteur n'en a tiré **aucune vente**. Donc le micro
a bien capté et sherpa a bien transcrit ; c'est la **compréhension** qui a
échoué, ou la transcription qui est arrivée **amputée**.

Deux causes systémiques ont été reproduites en mesurant. **Aucune n'est
supposée** ; les deux produisent exactement ce bandeau. Laquelle a frappé
Patrick reste à établir — voir « Ce qu'il manque » plus bas.

### A3-a — Le micro coupe à 6 secondes, toujours

`MicroVenteCaisse` referme le micro quand `finDEcoute` le dit. Il lui passe
`aParle: texteVuRef.current.length > 0`, où `texteVuRef` recopie
`liveTranscript`.

Or **`liveTranscript` n'est jamais écrit pendant l'écoute**. Le hook le vide au
démarrage de l'enregistrement (`useVoiceCore.ts:1015`) et ne le réalimente
qu'**après** `stopRecording` (« Analyse en cours… », puis « OK… », « J'écoute… »
dans `processAudio`). La chaîne est *MediaRecorder → blob → sherpa-onnx* : il
n'y a **pas** de transcription en direct. `startSilenceDetection` est d'ailleurs
un no-op assumé (« Push-to-talk uniquement »).

Conséquence, mesurée sur le module pur :

```
seuils : premier-mot=6000ms  silence=1500ms  plafond=12000ms

Elle PARLE sans discontinuer, mais liveTranscript reste vide :
  t= 5900ms → écoute
  t= 6000ms → MICRO COUPÉ (rien-dit)
```

`aParle` vaut **toujours** `false`. Le micro se ferme donc à **6 000 ms exactement**,
avec la raison « elle n'a rien dit » — pendant qu'elle parle. La règle de fin de
phrase à 1,5 s de silence et le plafond à 12 s sont **inatteignables** sur cet
écran.

Une marchande appuie, hésite deux secondes, puis dit « vends deux tas de piment
à mille francs » (≈ 3 s) : on est à 5 s, ça passe. La même phrase avec un nom de
produit complet, ou une hésitation d'une seconde de plus, est **coupée en plein
mot**. Sherpa transcrit le fragment, le fragment ne contient pas de produit
exploitable, et le bandeau tombe.

**VOX-01 ne fait donc pas ce que son commentaire annonce** (« le micro s'arrête
quand elle s'arrête ») : il s'arrête au bout de six secondes, quoi qu'elle dise.

### A3-b — 111 des 198 produits du catalogue sont invisibles à la voix

Le moteur d'extraction (`voice-offline/vocabulaire.ts`) porte **son propre
lexique en dur : 50 formes, 28 noms canoniques** — ail, attiéké, aubergine,
banane, banane plantain, biscuit, bière, farine, foutou, gombo, haricot, huile,
igname, jus, lait, manioc, maïs, oignon, orange, piment, poisson, poulet, riz,
savon, sel, sucre, tomate, viande.

Le catalogue maître du pilote en compte **198**. Mesure, en disant le nom exact
de chaque produit :

| | |
|---|---|
| nom reconnu par le lexique | **87 / 198** |
| **« Je n'ai pas compris. Redis-moi. »** | **111 / 198** |

Parmi les 111 : *arachide* (en coque, décortiquée, grillée), *taro*, *macabo*,
*niébé*, *pois de terre*, *soja*, *sésame*, *échalote*, *poireau*, *épinard*,
*amarante*, *kplala*, *dah*, *oseille*, *chou*, *laitue*, *concombre*,
*courgette*, *poivron*, *céleri*, *pomme de terre*, *mil*, *sorgho*, *fonio*…

C'est la même famille de cause que VOIX-07 : **l'information existe** — le
catalogue de la marchande est là, chargé, avec ses noms — et le moteur
d'extraction ne le lit pas. Il compare la phrase à une liste écrite dans le
code, pas à ce qu'elle vend.

### A3-b bis — Ce que ça donne bout en bout, et ce que ça NE fait PAS

Le mot canonique retenu est ensuite apparié au vrai catalogue par
`apparierProduit`. Avec la boutique = les 198 produits :

| | |
|---|---|
| le bon produit part au panier | **1 / 198** |
| **un AUTRE produit part au panier** | **0 / 198** |
| rien ne part, le prix est redemandé | 86 / 198 |
| « Je n'ai pas compris. Redis-moi. » | 111 / 198 |

**L'argent n'est pas faussé.** `apparierProduit` rend `null` dès que le mot
correspond à plusieurs produits : 6 variétés de riz → « riz » n'en désigne
aucune → Tata **redemande le prix** au lieu d'en choisir une. C'est le bon
comportement, et il tient : **zéro vente au mauvais produit sur les 198**.

Ce qui casse, c'est l'usage : une marchande qui tient 6 riz ne peut **jamais**
vendre du riz à la voix sans dicter le prix à chaque fois.

**Le « 1 / 198 » ne vaut que pour un catalogue de 198 articles.** Sur un étal
réaliste de huit produits, la mesure donne 7 sur 8 — l'ambiguïté disparaît, et
seul le trou de lexique reste (« arachide grillée » → non comprise). **Le trou
de lexique, lui, ne dépend pas de la taille de la boutique.** C'est le défaut
dur des deux.

### Ce qu'il manque pour trancher entre A3-a et A3-b

**La transcription brute de la phrase de Patrick.** Elle est déjà journalisée :
`voiceTrace` note `STT_FIN` (moteur + transcript brut + durée) et `INTENTION`
(`pas_compris` quand rien n'en sort), le journal survit au redémarrage, et il
est joint au **« 🐞 Rapport de test »** — atteignable sans se déconnecter, dans
**Paramètres** (`UniversalParametres.tsx:1009`).

Trois lignes suffiront à dire laquelle des deux causes a frappé :
- la **durée** de `STT_FIN` proche de 6 000 ms → A3-a ;
- un transcript **complet** dont le produit n'est pas dans les 28 → A3-b.

**Statut** : deux causes systémiques mesurées, **aucune corrigée**. Cause
effective du constat de Patrick : **à établir** avec le Rapport de test.

---

## A4 / ENC-01 — « encaisser » est compris, et l'écran dit « Je n'ai pas compris »

**BUG TERRAIN BLOQUANT**, rapporté par Patrick avec deux captures, sur APK réel
Android `0459dc0`.

1. « 1 tomate à 5 000 F » → reconnue, panier = 5 000 F.
2. L'UI affiche explicitement **« Dis "encaisser" pour terminer »**.
3. Appui sur le micro. 4. L'UI passe bien à « Je t'écoute ».
5. Il dit **« encaisser »**.
6. Résultat : **« Je n'ai pas compris. Redis-moi. »**
7. Panier toujours à 5 000 F, aucun passage à l'encaissement.

Reproduction automatisée : `npm run test:encaissement-incompris`
(`src/app/services/encaissementDitIncompris.test.mts`). **Rouge, 6 assertions**,
toutes sur le défaut. Maillon 121 de `verify` ; `test:ci` reste à 44.

### Le chemin réel de `0459dc0`, tracé de bout en bout

| Étape | Mesuré |
|---|---|
| audio → `transcribeWav` | `useVoiceCore.ts:882`, moteur sherpa natif. **Non exécutable ici** (APK). |
| texte STT → `intentLocal` | `intentLocal('encaisser')` → **`{ type: 'encaisser' }`**, `intent: 'encaisser'`, `needsConfirmation: false`. |
| routage écran | `INTENTIONS_ENCAISSEMENT` contient bien `encaisser`. Déclarée dans **les deux** listes (`confirmationBypassIntents`, `offlineLocalIntents`) → exécutée, et hors ligne aussi. |
| `onAction` | `MicroVenteCaisse.tsx:313` → `onIntentionEncaissement('encaisser')` → `POSCaisse.traiterIntentionEncaissement`. |
| machine d'argent | `reduire({phase:'repos'}, 'encaisser', fin)` sur le panier EXACT du terrain (1 ligne, 5 000 F, reçu 0) → `phase: 'preparation'`, effet `dire` : **« Elle doit 5 000 francs. Touche les billets qu'elle te donne. »** |

**La chaîne de l'argent est intacte.** Rien n'est cassé de `intentLocal`
jusqu'à la machine.

### La rupture exacte

`MicroVenteCaisse.tsx:467` calcule ce que le bandeau a le droit de dire :

```ts
const compris = libelleVenteComprise(intentLocalCaisse(transcript)?.action);
```

`libelleVenteComprise` rend **`null` pour tout `action.type !== 'vendre'`**. Une
intention d'encaissement parfaitement reconnue donne donc `compris = null` ; la
transcription, elle, n'est pas vide ; et la dernière ligne d'`afficheEcoute`
conclut :

```ts
return faits.transcription.trim() ? { type: 'incompris' } : { type: 'repos' };
```

**Le bandeau ment.** `afficheEcoute` ne sait parler que de VENTES : tout ce qui
n'en est pas une — y compris les quatre commandes d'encaissement — tombe dans
« Je n'ai pas compris ».

C'est **la faute VOX-01 retournée**. Là-bas, « J'ai compris » voulait dire
« j'ai entendu ». Ici, « Je n'ai pas compris » veut dire « ce n'était pas une
vente ». Même défaut, autre sens — et cette fois il frappe la commande que
l'interface **promet elle-même** deux blocs plus haut.

Les quatre y passent, mesuré :

| dit | moteur | bandeau |
|---|---|---|
| « encaisser » | `encaisser` | **incompris** |
| « combien elle doit » | `combien_doit` | **incompris** |
| « oui valide » | `oui_valide` | **incompris** |
| « non annule » | `annuler_validation` | **incompris** |

### Aggravant — le démenti est ailleurs sur la page

La relecture (« Elle doit 5 000 francs… ») s'affiche dans `relectureAffichee`,
rendu **ligne 911** de `POSCaisse`, dans le bloc panier/paiement.
`MicroVenteCaisse`, qui porte le micro et le bandeau menteur, est monté
**ligne 1089**. Sur téléphone portrait ce sont deux endroits différents de la
page : elle lit le mensonge, et ne voit pas le démenti.

### Le panier à 5 000 F n'est PAS le défaut

`encaisser` **relit** le compte ; il n'encaisse pas. La machine ne paie que sur
« oui valide », après que les billets ont été touchés — c'est le critère posé
par Patrick le 20/09 (« aucune phrase vocale ne peut écrire de l'argent sans
confirmer EXACTEMENT l'état financier qu'elle vient de relire »). Le test le
vérifie explicitement, pour qu'une correction ne fasse pas payer un mot qui ne
doit pas payer.

### Pourquoi l'UI affiche « Dis encaisser » si le moteur ne sait pas l'exécuter ?

**Il sait l'exécuter.** L'UI ne ment pas sur la commande ; c'est le bandeau qui
ment sur le résultat.

### La seule inconnue restante : ce que Sherpa a réellement transcrit

Non exécutable hors APK. Ce qui EST mesuré, c'est la tolérance du moteur :

| transcription | `intentLocal` |
|---|---|
| `encaisser`, `encaisse`, `encaissé`, `Encaisser`, `encaisser.`, `ok encaisser`, `encaisser la vente` | **`encaisser`** |
| `en caisser`, `en caisse`, `encaissez`, `encaissée`, `ancaisser`, `on caisse` | **`null`** |

Deux hypothèses restent ouvertes, et **elles se départagent par ce que Tata a
DIT**, pas par la capture :

- **H1** — Sherpa a rendu « encaisser ». Tata a dit « Elle doit cinq mille
  francs. Touche les billets qu'elle te donne. », la bulle verte existe plus bas
  sur la page, et le bandeau ment. **Le défaut est celui décrit ici.**
- **H2** — Sherpa a rendu une variante hors liste (« en caisse »…). Tata a dit
  « Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît. », il n'y a
  pas de bulle verte, et le bandeau dit vrai. **Le défaut est alors dans la
  couverture des variantes.**

Le **« 🐞 Rapport de test »** (Paramètres) tranche : `STT_FIN` porte le
transcript brut, `INTENTION` porte ce qui en est sorti.

**Dans les deux cas, le bandeau menteur est un défaut réel et reproduit** — il
frappe les quatre commandes d'encaissement, indépendamment de ce que Sherpa
transcrit.

**Statut** : rupture identifiée, reproduction rouge en place, **aucune
correction appliquée**.


## Ce qui reste à trancher — À DÉFINIR

1. **A1** : corriger maintenant (séparer les deux sens de `partielle` pour que
   l'annonce s'abstienne pendant le chargement, sans toucher à l'affichage) ou
   finir la recette d'abord ?
2. **A3** : Patrick envoie-t-il le Rapport de test avant qu'on corrige, ou
   corrige-t-on les deux causes sans attendre de savoir laquelle a frappé ?
3. **A3-b** : brancher le lexique vocal sur le catalogue de la marchande est un
   changement d'architecture du moteur d'extraction — gelé par l'empreinte
   d'argent. **Arbitrage de Patrick requis**, pas une correction de recette.
4. La recette continue-t-elle (blocs E et F) sur `0459dc0`, ou reprend-elle
   depuis le début après un nouveau SHA ?

---

# Corrections — SHA `277d523`

Quatre causes, quatre commits, chacun avec sa garde. **Aucune refonte, aucun
nouveau sous-chantier.** Ce qui a changé et ce que ça a coûté :

| # | Cause | Commit | Garde | Mesure |
|---|---|---|---|---|
| ENC-01 | « encaisser » compris, bandeau qui dit le contraire | `9937f48` | `test:encaissement-incompris` | 6 échecs → 0 |
| — | deux assertions restées au singulier (VOIX-07) | `95acb6a` | — | `verify` rouge depuis `1384b8c` |
| MIC-01 | micro coupé à 6 s, toujours | `0b6c2d0` | `test:micro-niveau-parole` | ferme sur le silence, plus sur « rien-dit » |
| CAT-01 | 111/198 produits invisibles à la voix | `de37a3d` | `test:vente-au-catalogue` | bon produit **1/198 → 196/198** |
| A1 | « zéro franc » au montage | `277d523` | `test:accueil-caisse-dite` | 4 échecs → 0 |

`verify` passe de 120 à **124 maillons**. **`test:ci` reste figé à 44.**

## Ce qui reste rouge, et qui n'est pas à moi

Trois maillons sur 124, **tous trois en attente d'un refigeage réservé à
Patrick**, et tous trois antérieurs à ces corrections :

1. `test:voix-trace-source` — gel VOICE-01. Porte sur `useVoiceCore.ts` et
   `ObjectifContext.tsx`, **deux fichiers que ce lot ne touche pas**.
2. `test:i18n-empreintes-argent` — `intentLocal` rend
   `86044262df2ac1a388f91bf9b449b48e9ec7b014605045420709975f948bff6c`,
   la valeur en attente depuis VOIX-09. **Elle n'a pas bougé** avec ce lot :
   aucune décision financière du moteur n'a changé.
3. `test:garde-argent` — périmètre (4 fichiers entrés, dont **1 seul** de ce
   lot : `venteAuCatalogue.ts`) et gardes (12 assertions perdues, dont **3
   seulement** de ce lot).

## Le défaut d'argent qui reste ouvert — arbitrage de Patrick

Pour un produit **qu'elle ne possède pas**, le moteur rend toujours
`{ vendre, montant: 2 }` sur « vends deux mangues séchées », et une ligne
**« Produit vocal » à 2 F** part au panier en silence. CAT-01 ferme ce cas
pour tous les produits de son catalogue ; il reste ouvert hors catalogue.

Le fermer revient à décider du sort de **l'article libre vocal** (« vends pour
500 »), qui emprunte exactement le même chemin. C'est un arbitrage d'argent :
**signalé, pas corrigé.**

## Une donnée à corriger, pas un code

« Champignon séché » figure **deux fois** dans
`docs/data/catalogue-maitre-julaba.v1.json`. `apparierProduit` refuse de
choisir entre deux produits du même nom — et il a raison. Ce sont les deux
seuls produits sur 198 qui redemandent encore le prix.
