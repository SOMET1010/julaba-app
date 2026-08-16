# 🔐 Parcours authentification — audit + gaps (marchande peu/non lectrice)

> Question fondatrice : une marchande **peu ou non lectrice** peut-elle
> **s'enrôler, se connecter au quotidien, et récupérer** son compte **sans jamais
> avoir à lire ni dicter un numéro de 10 chiffres** ? Audit du code réel.
> Verdict par brique : ✅ robuste · 🟠 présent mais fragile · 🔴 manquant.

## Réponses factuelles (extraites du code)
- **Login** : `login` par **numéro + PIN 4 chiffres** (principal) ; WebAuthn = biométrie **secondaire** qui exige le **numéro tapé d'abord** (`LoginPassword.tsx:563 authenticateWebAuthn(phone)`).
- **Persistance** : **localStorage** (user + tokens + session). SW cache le shell, **pas** la session.
- **Fallback biométrie** : reste sur l'écran **numéro + PIN** (`LoginPassword.tsx:580-585`).
- **Enrôlement** : identificateur, sur **son** téléphone, **PIN imposé `'0000'`** (`identifications.controller.ts` `create-with-acteur` → `password='0000'`).

---

## 1. ENRÔLEMENT (assisté)
| État | Constat |
|---|---|
| ✅ | Le **numéro est saisi par l'identificateur** (lettré) — la marchande ne tape pas son numéro à l'inscription. |
| 🟠 | **PIN imposé `0000`**, pas choisi par elle. À changer ensuite → étape qui **demande de lire/taper** des chiffres. |
| 🔴 | **Aucun consentement explicite** de la marchande capturé (juste l'action de l'identificateur). |
| 🔴 | **Aucune confirmation d'identité** dans ce chemin (photo/voix/témoin). |
| 🔴 | **Confidentialité du PIN** nulle : l'identificateur connaît numéro **+** PIN `0000` → il **peut se connecter à sa place**. Aucune protection anti-abus. |

## 2. CONNEXION HABITUELLE
| État | Constat |
|---|---|
| ✅ | **Session persistante** (localStorage) : tant qu'elle reste connectée sur SON téléphone, **zéro saisie**. C'est le vrai chemin quotidien. |
| ✅ | WebAuthn **réellement câblé** (backend `@simplewebauthn/server`, colonnes `webauthn_credentials` ; front register + authenticate). |
| 🟠 | WebAuthn **n'est PAS sans-identifiant** : exige le **numéro d'abord** → ne retire pas la barrière. |
| 🟠 | Activation biométrie **enfouie dans Paramètres** (opt-in) → une non-lectrice ne l'activera **jamais seule**. |
| 🔴 | **Credentials découvrables (usernameless)** non utilisés → impossible de « se connecter sans identifiant ». |
| 🔴 | **Téléphone partagé** : pas de « changer de compte » → chaque bascule = **re-saisie du numéro**. |
| 🔴 | Boutons : pas de combinaison **couleur + forme + position + icône + audio** garantie (« bouton vert » seul insuffisant). |

## 3. RÉCUPÉRATION (le scénario dur)
| État | Constat |
|---|---|
| ✅ | Un admin/identificateur peut **réinitialiser** (le reset lève le verrou — corrigé #6) et **débloquer même sans zone** (corrigé #6). |
| 🔴 | **Réinstallation / vidage / nouveau téléphone / SIM changée** → localStorage vide → **déconnectée** → doit **re-saisir numéro + PIN** = la barrière revient en plein. |
| 🔴 | **WebAuthn lié à l'appareil** → perdu avec le téléphone ; aucun ré-enrôlement guidé. |
| 🔴 | **Pas de parcours de récupération guidé par la voix** (Tata). |
| 🔴 | **Pas de code de récupération** ni d'auto-détection du numéro (SIM) pour éviter la re-saisie. |
| 🔴 | Ré-enrôlement = **risque d'abus** de l'identificateur, non encadré (consentement, traçabilité). |

---

## Ce que ça dit, franchement
Le **chemin heureux** (déjà enrôlée + reste connectée sur son propre téléphone) est **accessible** : elle ne saisit rien. **Mais dès qu'on sort du chemin heureux** — première connexion, biométrie non activée, téléphone partagé/perdu/réinstallé — **le système la renvoie à la saisie du numéro à 10 chiffres + PIN**, c.-à-d. exactement la tâche qu'on a dit de retirer. Les **3 parcours ne sont donc pas tous accessibles** : ✅ connexion habituelle (chemin heureux), 🟠 enrôlement, 🔴 récupération.

## Gaps priorisés
| Prio | Gap | Cible |
|---|---|---|
| **P0** | Récupération après réinstallation/téléphone perdu **sans re-saisie** ni lecture | auto-détection SIM + ré-enrôlement assisté tracé |
| **P0** | PIN imposé `0000` + confidentialité nulle → **abus identificateur** | PIN choisi par elle (par position) + consentement + traçabilité |
| **P1** | WebAuthn **usernameless** (credential découvrable) → connexion **sans numéro** | `residentKey` + `allowCredentials` vide |
| **P1** | Activer la biométrie **dans l'enrôlement assisté** (pas dans Paramètres) | étape d'enrôlement |
| **P1** | **Téléphone partagé** : bascule de compte sans re-saisie | liste de comptes locale + biométrie par compte |
| **P2** | Boutons **multi-canal** (couleur+forme+position+icône+audio) partout | design system |
| **P2** | **Récupération guidée par la voix** (clips Tata) | parcours récup |

## Prochaine étape (ton découpage)
Traiter chaque parcours **séparément** comme un chantier prouvé, dans l'ordre :
1. **Récupération P0** (le plus cassé, le plus dur pour elle).
2. **Enrôlement P0** (PIN choisi + consentement + anti-abus).
3. **Connexion P1** (WebAuthn usernameless + biométrie enrôlée + téléphone partagé).
Un parcours n'est « fait » que quand **les 3 sous-cas** (enrôlement, habituel, récupération) sont accessibles **et** testés avec de vraies marchandes.
