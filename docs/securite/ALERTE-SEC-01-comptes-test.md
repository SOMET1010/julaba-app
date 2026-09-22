# ALERTE-SEC-01 — identifiants en clair dans `akoun-dev/julaba`

**Ouverte le 22/09/2026.** Relevée en fermant l'audit de données
([`../data/AUDIT-DONNEES.md`](../data/AUDIT-DONNEES.md), §4).

**Aucune modification n'a été faite au second dépôt.** Ce document constate,
inventorie et propose. Il n'agit pas.

---

## 1. Le fait

Le fichier **`COMPTES-TEST.md`**, à la racine du dépôt
**`github.com/akoun-dev/julaba`**, contient des identifiants d'authentification
**en clair**, dans un fichier **versionné**.

| | |
|---|---|
| Entré dans l'historique git | commit `356f1dc`, **21/09/2026** |
| Commits touchant ce fichier | **1** — il n'a jamais été modifié depuis |
| Comptes documentés | **29** avec un secret, + 10 sans secret |

**Ce dépôt n'est pas `SOMET1010/julaba-app`.** C'est la seconde plateforme
JULABA (Next.js + Supabase), identifiée pendant l'audit.

---

## 2. Les secrets concernés — sans aucune valeur

Aucune valeur n'est reproduite ici. Seuls le **type**, la **quantité** et le
**périmètre** sont nommés.

| # | Type de secret | Quantité | Portée | Constat aggravant |
|---|---|---|---|---|
| **S1** | Mot de passe **back-office** | 7 comptes | `super_admin` ×1, `admin_general` ×2, `admin_national` ×1, `gestionnaire_zone` ×2, `operateur_terrain` ×1 | **une seule et même valeur pour les 7 comptes** — mesuré, pas supposé |
| **S2** | PIN marchand (4 chiffres) | 5 comptes | accès caisse | 5 valeurs distinctes |
| **S3** | PIN producteur (4 chiffres) | 5 comptes | espace producteur | 5 valeurs distinctes |
| **S4** | PIN coopérateur (4 chiffres) | 2 comptes | présidence de 2 coopératives | 2 valeurs distinctes |
| **S5** | Codes agent `JID-XXXX` | 10 agents | identificateurs terrain, avec leur **zone** (Adjamé, Cocody, Yopougon, Bouaké, San Pedro, Korhogo, Daloa) | **ne sont pas des secrets** — mais ils identifient des agents et leur affectation |
| **S6** | Adresses e-mail | 7, sur 2 domaines (`julaba.ci`, `dge.ci`) | identifiants de connexion back-office | **`dge.ci` n'est pas un domaine JULABA** |
| **S7** | Numéros de téléphone | 22 | identifiants de connexion acteurs | PII, pas des secrets |

**Ce qui rend S1 le plus grave.** Le fichier lui-même documente, sous la
référence **MODE-961**, que *« la vérification MFA du back-office a été
RETIRÉE — le back-office n'exige plus qu'un email + mot de passe »*. Sept accès
d'administration, **authentification à un seul facteur**, et **un seul mot de
passe partagé**. Compromettre un compte, c'est les compromettre tous.

---

## 3. Ce qui doit être rotaté, et dans quel ordre

| Priorité | Secret | Action | Pourquoi |
|---|---|---|---|
| **1** | **S1** — les 7 mots de passe back-office | **Rotation immédiate, une valeur DIFFÉRENTE par compte** | accès d'administration, mono-facteur, valeur partagée |
| **2** | **S2 + S3 + S4** — les 12 PIN | **Rotation** | donnent accès à des caisses et à des espaces coopératifs |
| **3** | **S6** — le compte sur `dge.ci` | **Vérifier d'abord s'il correspond à une personne réelle**, puis rotation ou suppression | un identifiant sur le domaine d'un tiers ne devrait pas vivre dans un fichier de test |
| **4** | **S5** — codes agent | **Pas de rotation** (ce ne sont pas des secrets) — **revue d'accès** | l'association agent ↔ zone est une information opérationnelle publiée |
| — | **S7** — téléphones | **Pas de rotation** | PII : relève de la protection des données, pas de la rotation |

### La règle qui décide de tout le reste

> **Supprimer le fichier ne suffit pas.**

Les valeurs sont entrées dans l'historique git au commit `356f1dc`. Un
`git rm` les laisse intactes dans l'historique, et dans chaque copie déjà
clonée. **La rotation est obligatoire, que le fichier soit retiré ou non.**
Réécrire l'historique (`filter-repo`, BFG) est une opération lourde, qui casse
tous les clones existants, et qui **ne dispense pas** de la rotation — parce
qu'on ne peut jamais prouver qu'aucune copie n'a circulé.

**Ordre correct :** *rotater d'abord, nettoyer ensuite.* L'inverse laisse une
fenêtre pendant laquelle les anciens secrets sont encore valides et déjà
connus.

---

## 4. Ce que je n'ai pas pu établir, et qui change la gravité

**Le dépôt `akoun-dev/julaba` est-il public ou privé ?**

Je ne peux pas le déterminer depuis cette session : son accès GitHub est
limité à `SOMET1010/julaba-app`. C'est pourtant **la première chose à
vérifier**, parce qu'elle change tout :

- **dépôt public** → les secrets sont publiés. Rotation **immédiate**, et il
  faut supposer qu'ils sont déjà connus de tiers ;
- **dépôt privé** → l'exposition se limite aux personnes ayant accès au dépôt.
  Rotation quand même — mais le calendrier peut être discuté.

Une commande, depuis un navigateur ou un terminal connecté :

```bash
gh repo view akoun-dev/julaba --json visibility
```

**Tant que la réponse n'est pas connue, traiter comme public.** C'est
l'hypothèse la moins coûteuse à révoquer.

---

## 5. Le même défaut, dans CE dépôt — et pourquoi il est sous contrôle

`SOMET1010/julaba-app` porte un cas voisin, et sa gestion sert de modèle :

| Où | Quoi | État |
|---|---|---|
| `render.yaml` | `SEED_DEMO_PASSWORD: "1234"` en clair | **inerte** : `SEED_DEMO="false"`, le compte n'est jamais créé |
| `render.yaml` | `SEED_DEMO_BO_PASSWORD` | **délibérément sans valeur**, `sync: false` — à poser au tableau de bord Render uniquement |

Le commentaire de `render.yaml` rappelle que **c'est déjà arrivé une fois** :
un mot de passe d'administration avait été publié dans un dépôt, et
`SEED_DEMO=false` n'efface pas ce qu'un `true` a créé. La règle retenue depuis
— *pas de variable, pas de compte back-office* — est exactement ce qu'il
faudrait appliquer dans le second dépôt : **les comptes de test se créent par
une variable d'environnement, jamais par un fichier versionné.**

C'est aussi, aujourd'hui, ce qui bloque la synchronisation du référentiel
maître sur le pilote — et c'est un bon blocage.

---

## 6. Ce qui n'a PAS été fait, et volontairement

- Aucune modification du dépôt `akoun-dev/julaba` — instruction explicite.
- Aucune valeur de secret recopiée, ni dans ce document, ni dans un commit,
  ni dans une sortie de commande.
- Aucun accès tenté avec l'un de ces identifiants.

---

## 7. Décisions attendues

1. **Le dépôt est-il public ?** (§4) — détermine l'urgence.
2. **Qui rotate S1 ?** Sept mots de passe d'administration, une valeur
   différente chacun.
3. **Le compte `dge.ci` correspond-il à une personne réelle ?**
4. **Les comptes de test du second dépôt doivent-ils migrer vers une variable
   d'environnement**, comme `SEED_DEMO_BO_PASSWORD` ici ?
