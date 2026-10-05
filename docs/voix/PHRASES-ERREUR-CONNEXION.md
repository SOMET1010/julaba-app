# Les erreurs muettes de la connexion — ce qu'il reste à écrire

**26/09/2026.** `LoginPassword` fait `parle(error)` sur chaque message
d'erreur, mais cette porte ne dit que ce qui a une clé dans `entreeVoix.ts`.
Treize messages, zéro clé : l'écran vibrait, affichait, et se taisait.

Trois sont branchés (AUTH_26 ×2, AUTH_30). Voici les dix autres, un par un.

---

> **Fait le 26/09** : les quatre ci-dessous sont branchées, plus `AUTH_35` et
> `AUTH_36` (les réponses à la proposition de Tata), repérées par l'agent de
> contrôle. Les erreurs muettes de cet écran passent de **13 à 6**.

## Quatre ont déjà leur clip — rien à écrire, rien à enregistrer

| Ligne | Ce que l'écran affiche | Clip | Ce qu'on entendra |
|---|---|---|---|
| 686 | « Autorise le micro, ou tape ton numéro 👇 » | `login-16` | « Le micro ne prend pas là. Faut taper ton numéro ici. » |
| 793 | « Le numéro doit contenir 10 chiffres » | `login-11` | « Il manque encore des chiffres dedans. Continue. » |
| 795 | « Entre ton mot de passe » | `login-19` | « Bon, mets les quatre chiffres de ton code secret. » |
| 955 | « Réveil du serveur… patiente 🔄 » | `login-33` | « Ça pèse un peu. Patiente, je suis en train de relancer. » |

Chacune garde le **problème** ET le **geste**. Aucune ne recule.

> **Un effet de bord utile, ligne 795.** L'écran écrit « mot de passe », la voix
> dira « code secret ». Le dépôt hésite : **21 « mot de passe » contre 9 « code
> secret »**. La voix, elle, dit toujours « code secret » (`login-19`,
> `login-23`, `login-34`). Deux mots pour une même chose — c'est la faute qu'on
> poursuit partout. **À trancher, et je propose « code secret »** : c'est ce
> qu'on entend, et c'est le mot du terrain.

---

## Deux ne doivent PAS parler, et c'est un choix

**Ligne 891 — « Mot de passe temporaire, redirection en cours… »**
Ce n'est pas une erreur, c'est une transition : l'écran suivant arrive tout
seul. Une voix qui annonce une redirection en cours parle pour ne rien dire, et
couvre la phrase de l'écran d'après.

**Ligne 905 — « Accès non autorisé. Utilise le portail administrateur… »**
Ce message s'adresse à un administrateur qui s'est trompé d'application. Aucune
marchande ne le verra jamais. Lui donner une voix, c'est faire enregistrer un
clip que personne n'entendra — et allonger l'APK pour rien.

---

## Un cas resté OUVERT, volontairement

**Ligne 475 — « Numéro non reconnu, réessaie ou tape-le »**
Le clip `login-12` dit « Regarde bien, y'a un chiffre qui n'est pas bon
dedans. » Il nomme mieux le défaut, mais **il perd le geste** que la phrase
actuelle donne. Même raison que lors du premier branchement d'AUTH_12 : on ne
remplace pas une consigne par une plus pauvre.

Deux sorties possibles, et c'est ton arbitrage :
- enchaîner deux clips (`login-12` puis `login-14` « Si tu veux, tape ton
  numéro directement ici. ») — plus long à l'oreille ;
- ou réenregistrer `login-12` avec le geste dedans.

---

## Trois à écrire — mes propositions

Le registre : une aînée du marché, tutoiement, phrase courte, **le problème
puis le geste**, aucun mot de technicien. Une marchande ne sait pas ce qu'est
un serveur, une réponse ou un préfixe — et n'a pas à l'apprendre.

### 1. Ligne 833 — la réponse est illisible

L'appli a parlé au serveur, qui a répondu quelque chose qu'elle ne comprend
pas. Ça se retente tout de suite.

| Actuel (muet) | « Réponse inattendue. Réessaie dans un instant. » |
|---|---|
| **Proposé** | **« Ça n'a pas bien répondu. Attends un petit moment, puis reprends. »** |

### 2. Ligne 884 — la réponse ne contient pas le compte

Le serveur a répondu, mais sans le compte de la marchande. Retenter ne suffira
pas : il faut reprendre depuis le début.

| Actuel (muet) | « Réponse serveur invalide » |
|---|---|
| **Proposé** | **« Ça n'a pas marché comme il faut. Reprends depuis le début. »** |

> Pourquoi deux phrases différentes et pas une seule : le **geste** n'est pas le
> même. En 833 on retente ; en 884 on recommence. Une seule phrase pour les deux
> enverrait la moitié des marchandes attendre pour rien.

### 3. Ligne 1014 — le numéro ne commence pas comme un numéro d'ici

Les premiers chiffres ne correspondent à aucun opérateur ivoirien. Le mot
« préfixe » n'apprend rien à personne ; ce qui aide, c'est de dire **où
regarder**.

| Actuel (muet) | « Préfixe invalide » |
|---|---|
| **Proposé** | **« Ce numéro-là ne commence pas comme un numéro d'ici. Regarde bien le début. »** |

---

## Ce que ça donne au total

```
13 messages d'erreur
 ─  7 BRANCHÉS (AUTH_26 ×2, 30, 16, 11, 19, 33) — mesuré : 6 dits sur 12 distincts
 ─  2 qui ne doivent pas parler
 ─  1 ouvert (le geste perdu d'AUTH_12)
 ─  3 à faire enregistrer — les trois ci-dessus
```

**Trois clips à produire, pas dix.** Et pas un seul enregistrement n'a été
nécessaire pour fermer les sept autres : les clips étaient déjà là, il
manquait la clé.

**Trois clips à produire, pas dix.** Et ils rejoindront un lot B avec les
phrases qui manqueront aux autres écrans.
