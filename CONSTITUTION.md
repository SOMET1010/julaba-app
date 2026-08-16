# 📜 La Constitution de Jùlaba

> Jùlaba n'est plus une application mobile. C'est en train de devenir un
> **système d'exploitation du commerce informel**. Dans ce contexte, la
> fiabilité n'est pas une qualité parmi d'autres : c'est le **fondement** sur
> lequel toutes les autres fonctionnalités seront construites.

**Le principe fondateur, avant tous les autres :**

> **Une commerçante doit pouvoir faire confiance à Jùlaba pour gérer TOUT son
> argent — avant que Jùlaba apprenne à faire une chose de plus.**

Ce document est la loi du dépôt. Une revue de code qui viole la Constitution
échoue. Un désaccord avec la Constitution se règle par un **ADR** (voir §5), pas
par une exception silencieuse.

---

## 1. Les 8 principes

Chaque principe a un **mécanisme** : sans mécanisme, un principe n'est que
décoration — et c'est l'absence de mécanismes qui a produit le désordre qu'on
répare aujourd'hui.

| # | Principe | Pourquoi | Mécanisme qui le fait tenir |
|---|----------|----------|------------------------------|
| 1 | **Une fonctionnalité = une implémentation.** | Trois écrans d'accueil et trois calculateurs de caisse qui se contredisaient. | Revue de code : tout doublon (`…V2`, `…New`, `…Bis`, `…2`) fait échouer la CI (§4). |
| 2 | **Un concept = une seule source de vérité.** | L'argent était calculé à 3 endroits différents. | Un seul module par concept (argent, session, stock). Interdiction d'un second calcul → ADR obligatoire. |
| 3 | **Fini = testé sur des données réelles.** | « Ça compile » ≠ « ça marche ». Le comptage de fermeture ne s'enregistrait pas. | Definition of Done (§6). Preuve en direct exigée avant de merger un module sacré. |
| 4 | **Dev = Prod.** | Les tables Academy n'existent pas en prod → 500. | Toute table/colonne passe par migration idempotente. Un déploiement sur base neuve ET sur base existante doit réussir. |
| 5 | **Pas de code mort.** | `useAcademy` cassé laissé à côté du service migré. | La CI signale les exports/fichiers non importés. On supprime, on n'archive pas « au cas où ». |
| 6 | **Profondeur avant largeur.** | Beaucoup de surface, peu d'ossature. | Un seul parcours en chantier à la fois (§3). On ne commence pas le suivant tant que le précédent n'est pas parfait. |
| 7 | **L'argent et le hors-ligne sont sacrés.** | C'est l'argent de femmes qui ne savent pas lire. | Modules sacrés (§2 ci-dessous) : jamais modifiés sans tests complets + invariantes. |
| 8 | **Chaque ligne de code doit augmenter la confiance de la commerçante.** | Une fonction spectaculaire qui produit un chiffre faux détruit plus qu'elle n'apporte. | La confiance est **mesurable** : chiffres contradictoires, vente perdue, écart de caisse = **incident** détecté par invariante (§ Confiance mesurable). |

---

## 2. Le modèle de développement : parcours verticaux sur noyau sacré

On ne pense plus « fonctionnalité » (Academy, Crédit, Caisse…). On pense
**parcours** — la journée de la commerçante.

Mais un parcours est **vertical** : « Je fais une vente » traverse la caisse, le
stock, le crédit, l'argent, la synchro. Or l'argent et la synchro sont
**horizontaux** : partagés par tous les parcours. D'où la règle d'architecture :

> **Les parcours sont des tranches verticales posées sur un NOYAU SACRÉ
> horizontal.** Un parcours possède son orchestration et ses écrans ; il
> **consomme** le noyau via un contrat stable, mais n'a **jamais** le droit de le
> modifier. Un besoin de changement du noyau passe par le processus « module
> sacré » (tests complets + ADR).

### Les parcours (unités de travail)

| Ordre | Parcours | État visé |
|------|----------|-----------|
| 1 | Je commence ma journée (ouverture caisse) | Parfait de bout en bout |
| 2 | Je fais une vente | Parfait de bout en bout |
| 3 | Je vends à crédit | Parfait de bout en bout |
| 4 | Je ferme ma caisse | Parfait de bout en bout |
| 5 | Je me fais rembourser un crédit | — |
| 6 | Je gère mon stock | — |
| 7 | Je demande un crédit (financement) | — |
| … | (Academy, promos, news = modules évolutifs, après le cœur) | — |

### Un propriétaire par parcours

> « Cette semaine, on travaille **uniquement** sur le parcours Vente. »
> Personne ne modifie un autre parcours. Le propriétaire du parcours ne modifie
> pas le noyau — il le **consomme** (ou demande un changement via §2 sacré).

C'est la règle anti-régression numéro un.

---

## 3. Modules sacrés vs modules évolutifs

### 🔒 Modules SACRÉS (le noyau)
Authentification · Caisse · Crédit · Fermeture · Synchronisation · **Argent**

> **Règle : ils ne changent jamais sans tests complets ET sans invariantes
> vertes.** Un changement de leur contrat exige un ADR.

### 🌱 Modules ÉVOLUTIFS
Academy · Tutoriels · News · Promotions · Gamification …

> On peut innover, itérer vite, casser et refaire. Ils **consomment** le noyau,
> ils ne le redéfinissent pas.

---

## 4. Interdiction de duplication (règle à dents)

Une seule version. Toujours. La CI **échoue** si un nom introduit un doublon :

```
MarchandAccueilV2   ❌      AcademyNew   ❌      HomeBis   ❌      FinancialSummary2   ❌
```

Suffixes interdits : `V2`, `V3`, `New`, `Bis`, `Old`, `Copy`, `2`, `_new`, `_old`.
Corollaire : deux composants/fonctions qui font la même chose = un à supprimer,
pas à garder « en secours ».

---

## 5. Les données sont le produit → tout se dérive d'un journal

Julaba passait de « une caisse » à « une intelligence financière ». Conséquence
directe : **la donnée prime sur l'écran**. L'argent est un **journal
append-only** — chaque mouvement est un événement immuable — et **toutes** les
vues (caisse, résumé, marge, bénéfice) en sont **dérivées**, jamais stockées en
parallèle. C'est le remède définitif aux « calculateurs qui se contredisent ».

> C'est l'objet de **ADR-001** (`docs/adr/ADR-001-source-unique-argent.md`).

### Le registre des décisions (ADR)
Chaque grande décision d'architecture est **écrite** dans `docs/adr/`, parce que
dans six mois quelqu'un voudra, de bonne foi, recréer un deuxième calcul.
Un ADR dit : le **contexte**, la **décision**, les **conséquences**, le **statut**.

---

## 6. Definition of Done (« Fini »)

Un travail n'est **fini** que si :

1. Il n'existe **qu'une** implémentation (pas de doublon laissé).
2. Le **code mort** associé est supprimé.
3. Il a été **prouvé sur des données réelles** (pour un module sacré : en direct).
4. Les **migrations** tournent sur base neuve **et** existante.
5. Les **invariantes** d'argent sont vertes.
6. Le **typecheck** ne régresse pas.
7. Le parcours concerné fonctionne **de bout en bout**, hors-ligne compris.

---

## Confiance mesurable (le 8ᵉ principe, opérationnel)

La confiance n'est pas un ressenti. On définit les **événements qui la brisent**,
et le système les détecte tout seul :

- **Chiffres contradictoires** entre deux écrans pour la même journée.
- **Vente perdue** (une vente encaissée qui n'apparaît pas).
- **Écart de caisse** non expliqué (caisse ≠ fond + entrées − sorties).

Chacun devient une **invariante** vérifiable (idéalement en continu, pas seulement
au dev). Exemple d'invariante fondamentale :

> `caisse == fond_initial + Σ(mouvements du journal)` — toujours vrai, partout.

Si une invariante casse, c'est un **incident**, pas un détail.

---

*Cette Constitution est vivante. On la modifie par ADR, jamais par exception
silencieuse.*
