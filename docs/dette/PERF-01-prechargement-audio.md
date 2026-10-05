# PERF-01 — le préchargement audio au démarrage

> **Constat seul. Aucune correction n'est proposée, aucun mécanisme n'est
> touché.** Arbitrage de Patrick, 01/10 : *« le préchargement massif des clips
> au démarrage mérite vraiment un ticket séparé de performance, pas une
> correction immédiate. […] il faut mesurer sur appareil réel avant de toucher
> au mécanisme. »*

## D'où vient le signal

Il n'a pas été cherché : il est tombé du banc Maestro (runs #6 à #9), qui
faisait tout autre chose. Le logcat d'un émulateur montre, au démarrage :

```
23:29:39  Capacitor: Handling local request: https://localhost/voix/tata/ui-130.mp3
23:29:41  …/ui-128.mp3  …/ui-129.mp3  …/ui-034.mp3  …/ui-011.mp3
23:29:41  …/ui-047.mp3  …/ui-057.mp3  …/ui-073.mp3  …/ui-091.mp3
23:29:41  com.julaba.app: NativeAlloc concurrent copying GC freed 151122 (11MB)
          AllocSpace objects, 28 (1252KB) LOS objects, 49% free,
          4516KB/9033KB, paused 48us, total 127.421ms
```

Et, sur un autre run, la même séquence avec `vente-02`, `vente-03`, `vente-06`,
`vente-14`, `vente-18`, `wlt-01`, `wlt-08`, `ui-131`, `ui-135`, `ui-136`,
`ui-137`…

## Les trois faits mesurés

| Fait | Valeur | Source |
|---|---|---|
| Clips audio dans le dépôt | **842** fichiers `.mp3` / `.wav` | `find` sur l'arbre |
| Taille de l'APK de debug | **~197 Mo** | artefact du workflow APK |
| Collecte mémoire au démarrage | **11 Mo libérés, 151 122 objets, 127 ms** | logcat, run #9 |

Sur le run #9, `launchApp` a mis **26 minutes** et le Pixel Launcher a fini en
ANR. **Ce chiffre ne prouve rien sur l'application** : l'émulateur était
saturé, en CI, sans accélération suffisante. Il est cité pour dire d'où vient
le soupçon, pas comme une mesure du produit.

## Ce qui n'est PAS établi, et qu'il faut mesurer avant toute décision

- **le temps de démarrage sur un vrai téléphone**, et surtout sur un appareil
  modeste — c'est la cible réelle, pas un Samsung S25 ;
- **combien de clips sont réellement chargés** au démarrage contre à la
  demande, et lesquels servent dans la première minute ;
- **si ce préchargement est voulu** (un service worker qui met en cache pour le
  hors-ligne est un choix défendable : au marché, sans réseau, un clip absent
  est une voix muette) ;
- **ce que la marchande perçoit** : un démarrage lent une fois par jour n'a pas
  le même coût qu'une latence à chaque vente.

## Pourquoi on ne corrige pas

Trois raisons, dans cet ordre :

1. **Le chiffre qui a déclenché le soupçon vient d'un émulateur saturé.**
   Agir dessus serait corriger d'après une mesure qu'on sait mauvaise.
2. **Le hors-ligne est la raison d'être de ce préchargement.** Le réduire sans
   comprendre lesquels servent reviendrait à rendre la voix muette au marché —
   exactement ce que le produit s'interdit.
3. **Ce n'est pas de l'argent.** Au sens de `CLOTURE-CAISSE-VOCALE` §5, ce
   n'est ni un montant faux écrit, ni un montant faux dit, ni un geste empêché.
   Donc **non bloquant**, donc nommé et daté, et la recette reste fermable.

## Ce qu'il faudrait pour trancher

Un relevé sur **appareil réel**, deux gammes (le S25 des tests actuels et un
appareil d'entrée de gamme), avec : temps jusqu'au premier écran utile, temps
jusqu'à la première vente possible, nombre de clips chargés, pic mémoire.

Le 🐞 Rapport de test porte déjà le journal : il suffirait d'y ajouter un
horodatage de démarrage. **Ce n'est pas fait, et ce n'est pas demandé ici.**

---

**Ouvert le 01/10/2026** · hors OSS-01 · hors dossier caisse vocale ·
non bloquant au sens §5 · **mesure d'abord, décision ensuite.**
