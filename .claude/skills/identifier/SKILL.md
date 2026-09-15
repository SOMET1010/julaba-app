---
name: identifier
description: Crée un compte réel (identification) pour un acteur Jùlaba — marchand, producteur ou cooperateur — via l'API publique d'inscription, sans script bricolé à chaque fois. Utiliser quand on demande de créer/identifier/enrôler un ou plusieurs testeurs, marchandes, producteurs ou coopérateurs, ou de générer leurs identifiants de connexion.
---

# Identifier un acteur Jùlaba

Cette skill couvre le geste répété dans ce projet : créer un compte réel (pas
un compte de démo/seed) pour une marchande, un producteur ou une coopérative,
et fournir un message prêt à envoyer avec ses identifiants.

## Ce qu'il faut avant de commencer

Pour chaque personne à identifier, il faut : **prénom, nom, numéro de
téléphone ivoirien (10 chiffres), et rôle** (`marchand`, `producteur` ou
`cooperateur`). Si l'un manque, demande-le — ne pas inventer de numéro ou de
nom.

Seuls ces trois rôles sont créables par ce chemin (règle de sécurité fermée
côté backend, `SELF_SIGNUP_ROLES` dans `backend/src/auth/auth.service.ts`) :
`marchand`, `producteur`, `cooperateur`. Pour `identificateur`, `institution`
ou un rôle back-office (`admin_general`, `super_admin`...), ce chemin ne
marche PAS — ce sont des comptes administrés (voir « Rôles hors périmètre »
plus bas).

## Où ça tape

- **Serveur officiel de production** : `https://julaba-api.onrender.com/api/v1`
  — confirmé en le retrouvant codé en dur dans le bundle JS de l'APK
  (`android/app/src/main/assets/public/assets/index-*.js`, chaîne
  `julaba-api.onrender.com/api/v1`). Ne jamais deviner une autre URL — si un
  doute existe sur l'environnement cible (prod vs un autre déploiement),
  demander à l'utilisateur plutôt que de supposer.
- Si tu es dans une session dont le réseau sortant vers `onrender.com` est
  bloqué (proxy d'agent, politique d'organisation), tu ne peux PAS appeler
  l'API toi-même. Ne pas contourner ce blocage. Dans ce cas donne à
  l'utilisateur la commande prête à coller (voir plus bas), à exécuter de son
  côté (n'importe quel ordinateur avec accès internet normal suffit).

## L'appel

`POST /auth/signup`, endpoint public (aucune authentification requise) :

```json
{
  "phone": "+225XXXXXXXXXX",
  "firstName": "Prénom",
  "lastName": "Nom",
  "role": "marchand"
}
```

Champs optionnels utiles si connus (région, commune, activité, marché...) —
voir `backend/src/auth/dto/signup.dto.ts` pour la liste complète ; aucun n'est
requis pour créer un compte fonctionnel.

**Le mot de passe envoyé est ignoré et écrasé côté serveur** (politique
canonique du projet) : il sera **toujours `0000`** pour ces trois rôles,
avec `mustChangePassword=true` (changement forcé à la première connexion).
Ne jamais essayer d'envoyer un autre mot de passe pour ces rôles — inutile,
le serveur ne le retient pas.

### Si tu peux appeler l'API toi-même (réseau non restreint)

Appelle directement `POST https://julaba-api.onrender.com/api/v1/auth/signup`
pour chaque personne, vérifie que la réponse contient bien `success` et un
`user`, puis passe au message final.

### Si tu ne peux PAS (réseau bloqué depuis ta session)

Donne à l'utilisateur, pour CHAQUE personne, une commande prête à coller —
les deux variantes ci-dessous couvrent bash/macOS/Linux et PowerShell
(beaucoup d'utilisateurs de ce projet sont sous Windows ; ne donne QUE la
commande adaptée si tu connais leur OS, sinon donne les deux) :

```bash
curl -X POST https://julaba-api.onrender.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phone":"+225XXXXXXXXXX","firstName":"Prenom","lastName":"Nom","role":"marchand"}'
```

```powershell
Invoke-RestMethod -Uri "https://julaba-api.onrender.com/api/v1/auth/signup" -Method POST -ContentType "application/json" -Body '{"phone":"+225XXXXXXXXXX","firstName":"Prenom","lastName":"Nom","role":"marchand"}'
```

Sur PowerShell, la commande doit tenir sur UNE seule ligne — ne pas utiliser
`\` pour la couper (ça casse `Invoke-WebRequest`/`curl` alias PowerShell).

Demande à l'utilisateur de coller le résultat pour confirmer la création
avant d'annoncer que c'est fait.

## Message final à fournir

Une fois le compte confirmé créé, donne un message prêt à transmettre à la
personne concernée (comme on l'a fait pour les testeurs pilotes) :

```
Bonjour {Prénom},

Ton compte Jùlaba est prêt.

🔗 Lien : https://julaba-web.onrender.com
📱 Numéro : {phone}
🔑 Code : 0000

L'appli te demandera de changer ce code dès la première connexion.
```

Pour plusieurs personnes d'un coup, regrouper : un message par personne, pas
un message générique — chacun a son propre numéro et donc son propre accès.

## Rôles hors périmètre (identificateur, institution, back-office)

Si on te demande de créer un compte `identificateur`, `institution`, ou un
rôle back-office (`admin_general`, `super_admin`...), ce n'est PAS cette
skill : ces comptes ne passent pas par l'inscription publique par design
(chaîne de sécurité fermée `anonyme → identificateur → super_admin`, ADR-002
et fix #217). Deux chemins possibles selon le cas, à traiter au cas par cas
avec l'utilisateur plutôt qu'en suivant une recette automatique :

- Un `super_admin` déjà existant peut créer ces comptes depuis le
  back-office (`/backoffice/login` puis écran Utilisateurs BO / Acteurs).
- S'il n'existe encore AUCUN `super_admin` (bootstrap), il faut un accès
  direct à la base (ex. Shell Render du service `julaba-api`, qui a déjà les
  variables `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME` et
  `node_modules` avec `pg`+`bcryptjs`) pour insérer la ligne directement —
  voir l'historique de ce projet pour un script déjà éprouvé de ce type.
