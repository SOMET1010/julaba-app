# Corpus préparatoire — abidji (`abi`)

**Statut global : DRAFT.** Ce livrable couvre uniquement l’**abidji**, langue individuelle vivante de Côte d’Ivoire identifiée par le code ISO 639-3 `abi`.[1] Il n’apporte aucune traduction non attestée, ne génère aucun audio et ne modifie ni dépôt, moteur, règles métier, ni logique financière.

## Décision linguistique : aucune variété ne peut être présumée

Les références consultées distinguent explicitement deux variétés de l’abidji : **Enyembe** et **Ogbru**.[2] Un répertoire de ressources orales les traite également comme deux variétés distinctes sous le même code `abi`; la fiche Enyembe porte la balise de variété `abi-x-HIS06623`.[3] La documentation accessible montre en outre des différences lexicales entre ces variétés, notamment pour des mots de marché tels que le gombo, le poisson, le prix et le sel.[2]

Aucune communauté cible, variété de déploiement, orthographe communautaire de référence, corpus conversationnel de marché ni validation native n’a été fourni. Il serait donc infondé de choisir Enyembe plutôt qu’Ogbru, ou d’utiliser des lexèmes isolés pour fabriquer des énoncés. Conformément à la consigne de prudence, `VARIETY`, `TTS_CANONICAL` et `STT_VARIANTS` sont **vides sur les 168 lignes**. Ce vide est intentionnel : il empêche qu’une forme d’une variété soit présentée comme naturelle dans l’autre.

> Le code `abi` est confirmé au niveau de la langue. Il ne confirme pas une forme unique exploitable pour TTS/STT : la variété doit être fixée avec la communauté cible avant toute rédaction.

## Couverture du CSV

Le fichier conserve les **168 clés provisoires** source, les catégories, les contextes, les phrases françaises de référence et de marché, les criticités, ainsi que tous les placeholders existants. Les placeholders `{montant}`, `{recu}`, `{monnaie}` et `{total}` restent strictement inchangés dans les champs français. Aucune clé n’est renommée ou ajoutée. Les 10 lignes `CRITICAL`, les 6 lignes `HIGH`, les 110 lignes `MEDIUM` et les 42 lignes `LOW` sont conservées à l’identique.

| Élément | Lignes | Traitement dans `18-abidji.csv` |
|---|---:|---|
| Intentions prioritaires | 15 | `TTS_CANONICAL` et `STT_VARIANTS` vides; aucune phrase d’argent n’est inventée. |
| Nombres | 110 | Cellules linguistiques vides; les tons, la numération et les formes commerciales restent à collecter par variété. |
| Unités et monnaie | 17 | Cellules linguistiques vides; aucune équivalence locale de « franc », FCFA ou unité de vente n’est supposée. |
| Produits | 26 | Cellules linguistiques vides; aucun lexème d’une variété n’est généralisé à l’autre. |

Toutes les lignes ont `STATUS=DRAFT` et `VALIDATION_NATIVE_REQUISE=true`. Il n’existe donc aucune revendication de `NATIVE_VALIDATED` ou de `FIELD_VALIDATED`.

## Contrat et prochaines conditions de remplissage

Le CSV ajoute quatre colonnes de traçabilité : `LANGUAGE_CODE` (`abi`), `VARIETY` (vide), `VALIDATION_NATIVE_REQUISE` (`true`) et `RISK_NOTE`. Les colonnes existantes restent dans leur ordre et leur contenu source est conservé à l’exception des deux cellules de production linguistique, volontairement vides. `VALIDATION_NOTE` est uniformisé pour signaler le blocage de variété et la validation exigée.

Avant de remplir une cellule, il faut désigner explicitement **une** variété cible — Enyembe ou Ogbru — avec une locutrice ou un locuteur de la communauté visée. Il faut ensuite constituer les formulations par situation réelle de marché, et non par traduction mot à mot. Les lignes d’argent doivent rester extrêmement courtes, ne comporter qu’un seul sens financier, conserver les placeholders inchangés et être validées séparément par **au moins deux locuteurs natifs** de la même variété. Un test d’écoute et de reconnaissance STT dans un marché cible est également nécessaire avant toute utilisation.

## Risques documentés

Le risque principal est **dialectal** : Enyembe et Ogbru sont reconnues comme variétés séparées, et les données accessibles attestent des divergences lexicales.[2] Employer sans attribution une forme observée dans une liste comparative créerait un faux standard et pourrait nuire à la compréhension TTS/STT.

Le risque suivant concerne la **fiabilité des ressources**. Les sources consultées confirment le code et l’existence des variétés, mais ne constituent pas un corpus validé de dialogue commercial. La page de dictionnaire accessible se présente comme une plateforme contributive et ne fournit pas, dans la page consultée, de dictionnaire ou de provenance éditoriale permettant de soutenir des phrases de marché.[4] Les formes isolées ne permettent ni de dériver une syntaxe, ni d’assurer les tons, ni de calibrer les variantes de reconnaissance.

Enfin, les lignes monétaires présentent un risque **opérationnel élevé**. Une ambiguïté de négation, de montant, de dette, de monnaie rendue ou de validation est inacceptable. Le présent corpus ne fournit donc aucune forme abidji pour ces lignes; les garde-fous métier existants restent hors périmètre et inchangés.

## Sources consultées

La fiche officielle ISO 639-3 confirme que `abi` désigne Abidji, langue individuelle vivante.[1] Glottolog confirme le même code et la localisation en Côte d’Ivoire.[5] La description de référence accessible distingue Enyembe et Ogbru et donne des exemples de divergences lexicales, mais indique elle-même que certaines sections ne sont pas sourcées; elle sert ici uniquement à constater la pluralité des variétés, non à produire des traductions.[2] La fiche Global Recordings Network confirme séparément Enyembe et Ogbru comme variétés sous `abi`.[3] L’archive OLAC recense des ressources descriptives pour `abi`, sans fournir de corpus commercial exploitable dans la page consultée.[6]

## Références

[1]: https://iso639-3.sil.org/code/abi "ISO 639-3 Identifier Documentation: Abidji [abi]"
[2]: https://en.wikipedia.org/wiki/Abidji_language "Abidji language"
[3]: https://globalrecordings.net/fr/language/6623 "Abidji: Enyembe — Global Recordings Network"
[4]: https://lughayangu.com/abidji "Abidji Language — Lughayangu"
[5]: https://glottolog.org/resource/languoid/id/abid1235 "Glottolog: Abidji"
[6]: http://language-archives.org/language/abi "OLAC resources in and about Abidji"
