# Campagne de test — 3 testeurs, caisse vocale

> Document de passation. **Aucun identifiant réel ne doit JAMAIS être écrit
> ici, ni dans aucun fichier du dépôt** — ALERTE-SEC-01 : 29 identifiants en
> clair dorment déjà dans un dépôt public, on ne recommence pas.

---

## Ce qui est prêt

| Quoi | Où |
|---|---|
| APK à tester | run #52, artefact `julaba-apk-d3cb6ce` — expire le **15/10/2026** |
| Version affichée dans l'appli | `d3cb6ce` (ligne du bas sur l'écran de connexion) |
| Ce que le testeur doit faire | `docs/terrain/FICHE-TESTEUR-CAISSE-VOCALE.md` |
| Quand le dossier se ferme | `docs/terrain/CLOTURE-CAISSE-VOCALE.md` |

## Ce qui manque — À DÉFINIR

Pour chacun des 3 testeurs, il faut **prénom, nom, numéro ivoirien à 10
chiffres**. Je n'invente ni nom ni numéro : un numéro inventé crée un compte
qui n'appartient à personne et que personne ne peut déverrouiller.

| # | Prénom | Nom | Téléphone | Rôle |
|---|---|---|---|---|
| 1 | À DÉFINIR | À DÉFINIR | À DÉFINIR | `marchand` |
| 2 | À DÉFINIR | À DÉFINIR | À DÉFINIR | `marchand` |
| 3 | À DÉFINIR | À DÉFINIR | À DÉFINIR | `marchand` |

## Créer les comptes — commande à coller

**Je ne peux pas le faire depuis ma session** : le réseau sortant de l'agent
refuse `julaba-api.onrender.com` (tunnel 403). Ce n'est pas contournable et ça
ne se contourne pas. La création se fait donc depuis n'importe quel ordinateur
avec un accès internet normal, une commande par personne.

Serveur de production, endpoint public, aucune authentification :

```bash
curl -X POST https://julaba-api.onrender.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"phone":"+225XXXXXXXXXX","firstName":"Prenom","lastName":"Nom","role":"marchand"}'
```

```powershell
Invoke-RestMethod -Uri "https://julaba-api.onrender.com/api/v1/auth/signup" -Method POST -ContentType "application/json" -Body '{"phone":"+225XXXXXXXXXX","firstName":"Prenom","lastName":"Nom","role":"marchand"}'
```

PowerShell : **une seule ligne**, ne pas couper avec `\`.

Le mot de passe est **ignoré et écrasé côté serveur** : il vaudra toujours
`0000`, avec changement forcé à la première connexion. Inutile d'en envoyer un
autre.

## Message à transmettre — un par personne, jamais un message groupé

```
Bonjour {Prénom},

Ton compte Jùlaba est prêt.

📱 Numéro : {phone}
🔑 Code : 0000

L'appli te demandera de changer ce code dès la première connexion.
```

Chacun a son numéro, donc son propre accès : un message collectif donnerait à
chacun l'accès des deux autres.

## Distribuer l'APK — le point qu'on oublie

L'artefact d'un run GitHub **n'est pas téléchargeable par quelqu'un qui n'a
pas accès au dépôt**, et le dépôt est privé. Les trois testeurs ne pourront
donc pas cliquer sur le lien du run.

Il faut télécharger l'APK une fois, puis le leur envoyer par un canal qu'ils
ont déjà (WhatsApp, Drive, transfert direct). Et leur redire les deux choses
que la fiche répète :

1. **désinstaller l'ancienne JULABA d'abord** — sinon ils testent l'ancienne
   sans le savoir ;
2. **relever les 7 caractères `d3cb6ce`** en bas de l'écran de connexion — un
   compte rendu sans version est inutilisable, on l'a déjà payé une fois.

## Ce qu'on attend en retour

Les cinq gestes T1→T5 de la fiche testeur, et pour chaque anomalie : le
repère à 4 caractères du rapport 🐞, le geste, l'attendu, l'observé. **Jamais
la cause supposée** — une cause supposée oriente la correction avant qu'on ait
mesuré.
