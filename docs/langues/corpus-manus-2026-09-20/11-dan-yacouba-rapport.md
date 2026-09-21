# Rapport de préparation — Dan/Yacouba

**Statut de livraison : DRAFT uniquement.** Le fichier `11-dan-yacouba.csv` conserve les 168 clés provisoires, les catégories, la criticité, le français marché et les placeholders de la source. Il ajoute le champ `VALIDATION_NATIVE_REQUISE`, fixé à `true` sur chaque ligne. Les cellules **TTS_CANONICAL** et **STT_VARIANTS** sont volontairement vides sur les 168 lignes. Aucun audio n’a été généré et aucune logique métier, aucun moteur ni dépôt n’a été modifié.

## Identification linguistique et décision de portée

Le code **ISO 639-3 `dnj`** est confirmé pour **Dan** : il est actif, individuel et désigne une langue vivante [1]. En Côte d’Ivoire, le nom **Yacouba** est associé au Dan, mais cette étiquette et ce code ne suffisent pas à sélectionner une variété opérationnelle unique.

Le dictionnaire de référence du Dan de l’Est identifie le **Dan Gweetaawu/Gouèta** comme base de la norme littéraire de la zone nord-est, et le **Dan Blowo** comme norme retenue pour la zone sud-ouest [2]. Les ressources disponibles distinguent aussi explicitement Dan Blowo/Western [3] et Dan Gweetaawu/Eastern [4]. Le catalogue SIL recense en outre des matériaux distincts pour Blowo et Gwɛɛtaawʋ, ainsi qu’une enquête d’intelligibilité dialectale [5].

> **Décision de sûreté :** en l’absence de variété, de lieu de déploiement ou d’un groupe cible explicitement choisi, aucune formulation Dan ne peut être généralisée sans risque. Les deux champs linguistiques sont donc laissés vides, conformément à la consigne de ne pas inventer lorsqu’une langue recouvre plusieurs variétés ou lorsque la fiabilité est insuffisante.

## Contrôles du CSV

| Contrôle | Résultat |
|---|---:|
| Lignes conservées | 168 |
| Lignes avec TTS_CANONICAL vide | 168 |
| Lignes avec STT_VARIANTS vide | 168 |
| Lignes `STATUS=DRAFT` | 168 |
| Lignes `VALIDATION_NATIVE_REQUISE=true` | 168 |
| Lignes de criticité `CRITICAL` conservées | 10 |
| Placeholders strictement conservés | `{monnaie}`, `{montant}`, `{recu}`, `{total}` |
| Clés provisoires conservées et uniques | oui |
| `NATIVE_VALIDATED` ou `FIELD_VALIDATED` revendiqué | non |

Les dix lignes financières critiques restent donc sans texte Dan. C’est intentionnel : une phrase d’argent entre variétés ou sans contrôle tonal et pragmatique local présenterait un risque de montant, de sens d’action ou de confirmation. Les notes de validation de chaque ligne exigent une sélection de variété et une validation native avant tout remplissage.

## Risques et prérequis de reprise

Le risque principal est la **confusion de variété** : le code `dnj` couvre des normes distinctes, et les ressources consultées ne permettent pas de choisir à la place du commanditaire entre Gweetaawu/Est et Blowo/Ouest. Le Dan possède également une orthographe avec marquage tonal étendu ; le dictionnaire du Dan de l’Est marque les tons lexicaux et grammaticaux, ce qui interdit d’omettre ou de reconstituer ces formes à partir d’un français ou d’une autre variété [2].

Avant de compléter le corpus, il faut fixer une seule variété de déploiement — **Dan Gweetaawu (Est, Gouèta)** ou **Dan Blowo (Ouest)** — avec la zone/marché cible. Une locutrice native compétente dans la variété choisie devra proposer les formulations de marché, puis les tester oralement. Les dix intentions financières critiques devront être contrôlées séparément par au moins deux locutrices de la variété retenue. Les placeholders `{montant}`, `{recu}`, `{monnaie}` et `{total}` devront être préservés à l’identique dans chaque texte validé. Aucun statut ne doit dépasser `DRAFT` avant ces validations.

## Sources consultées

La vérification s’appuie sur le registre ISO 639-3, le dictionnaire et l’esquisse grammaticale du Dan de l’Est, les ressources Dan Blowo et Dan Gweetaawu, ainsi que le catalogue d’archives SIL. Ces sources servent à établir le code et la pluralité des normes ; elles ne constituent pas une validation native de formulations de marché.

## References

[1]: https://iso639-3.sil.org/code/dnj "ISO 639-3 — Dan [dnj]"
[2]: https://www.jstor.org/stable/j.ctvgc6162 "Dictionnaire Dan-Français (dan de l'Est) avec une esquisse de grammaire du dan de l'Est"
[3]: https://www.scriptureearth.org/00i-Scripture_Index.php?iso=dnj&rod=9097 "The Bible in Dan Blowo"
[4]: https://play.google.com/store/apps/details?id=org.ipsapps.cotedivoire.dnj1.dan.gweetaawu.est.bible&hl=en_US "Bible in Dan Gweetaawu-Yacouba"
[5]: https://www.sil.org/language/dnj "SIL Language & Culture Archives — Dan [dnj]"
