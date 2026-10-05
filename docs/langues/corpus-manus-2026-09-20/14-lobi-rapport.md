# Rapport de préparation — Lobi / Lobiri

## Conclusion

Le fichier `14-lobi.csv` contient **168 lignes**, toutes au statut **DRAFT** et avec `VALIDATION_NATIVE_REQUISE=true`. Les cellules `TTS_CANONICAL` et `STT_VARIANTS` sont volontairement vides pour les **168 lignes**. Cette abstention inclut les **10 lignes CRITICAL** et les **6 lignes HIGH** relatives à l’argent. Elle respecte la consigne de ne pas inventer de formulations lorsqu’une base linguistique raisonnable et directement contrôlable fait défaut.

Le code indicatif est confirmé : **`lob`** est le code **ISO 639-3 individuel, vivant et actif** du lobi. Les noms **Lobi**, **Lobiri** et **Miwa** renvoient à cette langue dans les répertoires linguistiques. Le corpus ne revendique ni `NATIVE_VALIDATED` ni `FIELD_VALIDATED`, et aucun audio n’a été produit.

## Variété identifiée et limite de périmètre

La variété ivoirienne explicitement documentée dans la description grammaticale de référence est le **lobiri, parler de Bouna (Côte d’Ivoire)**. Elle constitue donc la variété de référence documentaire proposée, sous l’étiquette `lob` — **et non une garantie qu’elle corresponde au marché cible**. WALS associe ses données lobi à la grammaire de Becuwe sur le parler de Bouna, et la notice INIST décrit cette thèse de 479 pages comme une étude de phonologie et grammaire du lobiri de Bouna.[1] [2]

Cette variété ne résout pas seule le problème de production. L’étude sociolinguistique de Sib distingue à Bouna un parler rural, plus conservateur, et un parler urbain, enrichi par le contact avec d’autres langues.[3] Les ressources lexicales publiques consultables confirment l’existence de matériel en Lobiri, mais le petit lexique Burkina Langues est explicitement situé dans le sud-ouest du Burkina Faso et n’expose pas, sur sa fiche publique, les entrées, la variété exacte, les tons, ni des tours transactionnels de marché.[4] Il ne peut donc pas justifier le transfert de mots ou de syntaxe au contexte ivoirien de Bouna, a fortiori pour l’argent.

> **Décision de périmètre :** utiliser `lob` et documenter « lobiri de Bouna, Côte d’Ivoire » comme variété de référence à confirmer avec la communauté du marché. Avant tout remplissage, choisir explicitement le profil ciblé : parler urbain de Bouna, parler rural voisin, ou autre communauté lobi ivoirienne.

## Décision de corpus

Les `PROVISIONAL_KEY`, catégories, contextes, niveaux de `MONEY_CRITICALITY`, textes `FR_SOURCE`, adaptations `FR_MARCHE` et placeholders ont été repris du CSV français sans modification. Seules les deux colonnes à produire en langue cible, `TTS_CANONICAL` et `STT_VARIANTS`, sont vides. La colonne `VALIDATION_NATIVE_REQUISE` est ajoutée et vaut `true` pour chaque ligne. `STATUS` vaut strictement `DRAFT` pour chaque ligne.

Cette décision ne substitue pas du français, du dioula, du lobiri burkinabè ou une forme inférée au lobiri ivoirien. Elle évite aussi de confondre un énoncé lu dans une ressource religieuse avec une formulation naturelle entre commerçantes. La ressource Scripture Earth atteste du matériel textuel et audio en Lobiri sous le code `lob` dans plusieurs pays, dont la Côte d’Ivoire, mais elle ne documente pas des tours de marché ou des unités commerciales.[5]

## Risques et conditions de complétion

Le premier risque est la **variation interne**. La littérature accessible identifie les contrastes urbain/rural à Bouna et l’influence de langues en contact ; un corpus de marché doit donc être co-construit dans la communauté effectivement visée. Une graphie, un emprunt ou une variante STT qui convient dans une autre zone ne doit pas être propagé automatiquement.

Le deuxième risque est **tonal et orthographique**. Les sources de référence confirment une description grammaticale détaillée, mais son texte intégral est restreint dans l’archive consultée.[6] Les fiches publiques ne donnent pas un jeu contrôlable de formes portant sur les nombres 0–100, centaines, milliers, unités et produits du CSV. Il serait imprudent de compléter ces 152 lignes lexicales par régularité supposée.

Le troisième risque concerne les **16 lignes financières CRITICAL/HIGH**. Toute formulation future doit être une intention de marché simple et non ambiguë, conserver exactement `{montant}`, `{recu}`, `{monnaie}` et `{total}` là où ils apparaissent, et être validée indépendamment par au moins deux locuteurs natifs adultes qui réalisent des transactions orales. La validation doit comprendre une écoute TTS et une reconnaissance STT en bruit de marché ; elle ne doit jamais être interprétée comme une modification de la confirmation métier du paiement.

La suite requise est la sélection documentée de la communauté de référence, suivie d’un atelier avec au moins deux locutrices ou locuteurs natifs compétents de cette variété. L’atelier doit produire des réponses situationnelles — et non des traductions mot à mot — pour les 15 intentions prioritaires, les nombres, unités et produits. Seules les formes concordantes, avec leur graphie et variantes orales explicitement décidées, pourront remplir les cellules aujourd’hui laissées vides. Tous les résultats devront rester `DRAFT` jusqu’à la validation native prévue par le processus.

## Sources consultées

Le fichier de mission et le CSV français de marché ont été lus pour conserver les identifiants, la criticité, les placeholders et les contraintes de validation. Le code `lob` et le statut de langue individuelle vivante ont été vérifiés dans le registre ISO 639-3.[7] Glottolog confirme le code, les noms alternatifs et l’implantation en Côte d’Ivoire, au Burkina Faso et au Ghana.[8] La variété de Bouna est documentée par WALS, INIST et la fiche de thèse de Becuwe.[1] [2] [6] La variation urbaine/rurale est documentée par Sib.[3] Les ressources numériques consultées — dictionnaire Burkina Langues et Scripture Earth — ont été utilisées uniquement pour évaluer la disponibilité et les limites des ressources ; elles n’ont servi à produire aucune phrase du corpus.[4] [5]

## Références

[1]: https://wals.info/languoid/lect/wals_code_lob "WALS Online: Language Lobi — sources Becuwe 1982 et Kambou 2000"
[2]: https://pascal-francis.inist.fr/vibad/index.php?action=getRecordDetail&idt=12403406 "INIST-CNRS: Éléments de phonologie et de grammaire du lobiri (parler de Bouna, Côte-d'Ivoire)"
[3]: https://shs.cairn.info/parlers-urbains-africains-au-prisme-du-plurilinguisme-description-sociolinguistique--9782953729931-page-327?lang=fr "Sié Justin Sib, Étude comparative des parlers lobiri urbain et rural"
[4]: https://play.google.com/store/apps/details?id=com.english.francais.lobiri.dic&hl=fr "Google Play: Lobiri dictionary — lexique Lobiri-français-anglais de Burkina Langues"
[5]: https://www.scriptureearth.org/00eng.php?iso=lob "Scripture Earth: Lobiri — ressources textuelles et audio sous le code lob"
[6]: https://pure.mpg.de/view/item_406138_4 "Max Planck Pure: Becuwe, Éléments de phonologie et de grammaire du Lobiri — texte intégral restreint"
[7]: https://iso639-3.sil.org/code/lob "ISO 639-3 Identifier Documentation: Lobi [lob]"
[8]: https://glottolog.org/resource/languoid/id/lobi1245 "Glottolog 5.3: Lobi"
