# Architecture de données JULABA — la cible

**Document de cible. Aucune migration n'est engagée par ce fichier.**
État des lieux : [`AUDIT-DONNEES.md`](./AUDIT-DONNEES.md) · Inventaire :
[`CATALOGUE-DONNEES.csv`](./CATALOGUE-DONNEES.csv)

---

## 1. Les sept classes, et ce qu'elles veulent dire ici

| Classe | Définition retenue | Règle qui la gouverne |
|---|---|---|
| **RAW** | La donnée telle qu'elle arrive, jamais réécrite | on ne corrige pas une source ; on corrige en aval et on le dit |
| **STAGING** | Un artefact de transfert entre deux mondes | a une date et une empreinte ; n'est jamais lu par un écran |
| **MASTER** | Un référentiel qui a **une** source de vérité | tout le reste en est un **dérivé**, jamais un double |
| **OPERATIONAL** | Ce que l'application écrit et lit pour fonctionner | ne se reconstruit pas ; se sauvegarde |
| **ANALYTICS** | Ce qui sert à comprendre, jamais à décider d'un montant | peut se recalculer ; ne fait jamais autorité sur l'argent |
| **AI** | Corpus, voix, modèles | porte une chaîne de consentement |
| **QUARANTINE** | Existe, mais personne ne sait qui le lit ni s'il est vrai | **ne s'affiche jamais à une marchande** tant qu'il y est |

Répartition mesurée : OPERATIONAL 12 · MASTER 8 · QUARANTINE 6 · STAGING 5 ·
RAW 5 · ANALYTICS 3 · AI 3.

---

## 2. Les deux principes, et ils viennent du code existant

### 2.1 — Une donnée a une source de vérité, ou elle est marquée perdue

> « Toute information qui a une incidence sur l'argent doit être soit
> conservée, soit explicitement marquée comme perdue ; jamais reconstruite
> implicitement en aval. »

Ce n'est pas un principe importé : c'est celui que ferment ACC-02, CAI-01,
HIS-01, DEP-02, STK-01 et BO-01. Appliqué aux données, il donne :

- une donnée **MASTER** a **un** producteur, et un seul ;
- tout autre exemplaire est un **dérivé daté**, qui sait d'où il vient ;
- une donnée qu'on n'a **pas pu lire** ne devient jamais une valeur par défaut
  — ni `0`, ni `[]`, ni « Autre ».

### 2.2 — Le miroir ne ment pas sur sa fraîcheur

`catalogue_maitre` porte déjà `synced_at`. C'est le bon modèle : un cache dit
**quand** il a été rafraîchi, et l'écran peut dire « ces chiffres datent de… »
au lieu de faire croire qu'ils sont d'aujourd'hui.

---

## 3. Le flux cible

```
  ┌─ RAW ──────────────┐   ┌─ STAGING ────────────┐   ┌─ MASTER ─────────────┐
  │ Odoo (VPS)         │   │ kit CSV référentiel  │   │ catalogue_maitre     │
  │ 198 produits       │──▶│ (198, sha256 vérifié)│──▶│ miroir + synced_at   │
  │ SOURCE DE VÉRITÉ   │   │ artefact d'injection │   │ 0 ligne aujourd'hui  │
  └────────────────────┘   └──────────────────────┘   └──────────┬───────────┘
                                                                  │ adoption
  ┌─ MASTER ───────────┐                             ┌─ OPERATIONAL ─────────┐
  │ unités locales     │────────────────────────────▶│ produits              │
  │ (JULABA, 198 jeux) │   tas, bassine, botte…      │ prix de la marchande  │
  │ jamais chargées    │                             └──────────┬────────────┘
  └────────────────────┘                                        │
                                                     ┌─ OPERATIONAL ─────────┐
  ┌─ MASTER ───────────┐                             │ caisse_transactions   │
  │ catalog.ts         │────▶ écran + voix           │ LE CHEMIN D'ARGENT    │
  │ 548 clés, 5 locales│                             └──────────┬────────────┘
  └─────────┬──────────┘                                        │
            │ export                                 ┌─ ANALYTICS ───────────┐
  ┌─ STAGING ──────────┐                             │ résumés, BO, audit    │
  │ CSV de langue      │                             │ jamais autorité $     │
  └────────────────────┘                             └───────────────────────┘
```

**Ce qui change par rapport à aujourd'hui** : trois flèches manquent.
Odoo → `catalogue_maitre` (jamais parcourue), unités locales → `produits`
(jamais chargées), et `catalog.ts` → CSV (aujourd'hui les deux coexistent sans
lien).

---

## 4. Les quatre référentiels MASTER, et leur propriétaire

| Référentiel | Propriétaire | Dérivés autorisés | État |
|---|---|---|---|
| **Produits** | Odoo | `catalogue_maitre` → cache téléphone → `produits` | flèche 1 à brancher |
| **Unités locales de vente** | JULABA | colonne `unite` de `produits`, alias vocaux | **sans domicile** — n'existent qu'en CSV |
| **Découpage administratif CIV** | **à créer** | seed backend, `geo.json`, zones BO | 3 exemplaires, **aucune clé commune** |
| **Phrases et voix** | `catalog.ts` | CSV de langue (export), clips audio | ✅ tenu par 5 gardes |

**Le cas des unités locales mérite d'être nommé** : Odoo ne les porte pas — par
construction, et c'est correct. JULABA ne les charge pas — par omission. Elles
n'ont donc **aucun domicile**, alors qu'elles sont la moitié de ce qui rend le
catalogue utilisable au marché : on ne vend pas un igname « à l'unité », on le
vend au **tas**.

---

## 5. Les trois règles pour sortir de QUARANTINE

Un dataset quitte la quarantaine quand il peut répondre aux trois :

1. **Qui l'écrit ?** — un producteur nommé, pas « historiquement ».
2. **Qui le lit ?** — un chemin de code, pas une intention.
3. **Que vaut-il quand il manque ?** — une réponse, jamais un défaut silencieux.

Les six en quarantaine aujourd'hui, et ce qui leur manque :

| Dataset | Manque |
|---|---|
| `CATALOGUE` en dur (21 produits) | question 1 : le code n'est pas un producteur de référentiel |
| Academy (3 tables) | question 2 : aucun contrôleur ne les lit |
| `voice_provider_config` | question 1 : la config voix vit aussi en variables d'environnement |
| `raccourcis_vocaux` | question 2 : lecture non trouvée |
| Comptes de démo en dur (15) | question 2 : jamais créés en production |
| `COMPTES-TEST.md` (34) | question 3 — **et un problème de sécurité** : identifiants en clair |

---

## 6. Ce qu'il ne faut PAS faire

- **Ne pas charger le CSV directement dans `catalogue_maitre`.** Décision du
  22/09 : Odoo reste la source de vérité. Le CSV est un artefact d'injection,
  pas une source.
- **Ne pas activer `SEED_DEMO` pour obtenir un compte d'administration.** Le
  drapeau a fait tomber l'API au boot le 18/09, et `SEED_DEMO=false` n'efface
  jamais ce qu'un `true` a créé. Promouvoir **un** compte existant suffit.
- **Ne pas exporter `users` ni `identifications` vers une couche analytique**
  sans avoir séparé la PII et la sécurité. 63 colonnes sur une table, dont le
  NIN et trois formes de secret.
- **Ne pas fusionner les deux bases sans décision produit.** JULABA (59 tables,
  Postgres) et akoun-dev (128 tables, Supabase) se recouvrent largement. C'est
  une décision de produit, pas une opération technique.

---

## 7. L'ordre dans lequel ça se ferme

Chaque étape est mesurable, et aucune ne dépend de la suivante.

| # | Étape | Qui | Mesure de réussite |
|---|---|---|---|
| 1 | Variables `ODOO_*` sur Render + un compte ADMIN | **Patrick** | l'API redémarre ; `POST /synchroniser` répond 200 |
| 2 | Synchroniser | script `verifier-catalogue-maitre-pilote.sh` | `total=198`, puis 2ᵉ passe `creees=0 majs=198` |
| 3 | La caisse consomme `catalogue_maitre` | code | les 21 en dur disparaissent |
| 4 | Domicilier les unités locales | code | `tas`, `bassine`, `botte` proposées à l'adoption |
| 5 | Une clé commune pour le découpage CIV | code | `geo.json` et `regions` se joignent |
| 6 | Vider la quarantaine | décisions | 6 datasets classés ou retirés |
| 7 | Séparer PII et sécurité dans `users` | audit dédié | export analytique possible sans PII |

Les étapes 1 et 2 sont **prêtes** : le script existe, la cible est connue, les
198 sont vérifiés. Il manque deux gestes qui n'appartiennent qu'à Patrick.
