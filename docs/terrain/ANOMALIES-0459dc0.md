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
