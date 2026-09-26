# Prompt pour Genspark — cartographier les moments du script de connexion

**Dépôt** : `SOMET1010/julaba-app` · **branche** : `claude/clever-allen-dnr8by`
(accès GitHub en lecture ; ne rien pousser)

---

## Ce qu'on te demande

Le lot A a livré 82 clips. **Deux seulement jouent aujourd'hui**, parce que
les 34 autres `login-*` correspondent à des moments du parcours de connexion
qui n'ont **aucun point d'appel** dans le code.

Ton travail : **trouver ces points d'appel**. Pour chacun des 34 moments, dire
où, dans quel fichier et à quelle ligne, cet état survient réellement.

C'est du repérage, pas du code. Tu ne modifies rien.

## Comment un clip est joué — à comprendre avant de chercher

Sur l'écran de connexion, la parole passe par `parle(texte)`
(`components/auth/LoginPassword.tsx`), qui appelle `direEntreeTexte(texte)`
(`services/entreeVoix.ts`). Cette fonction cherche le texte dans une table de
clés. **S'il n'y est pas, rien n'est dit** — pas de repli, et c'est
volontaire : donner une voix de secours ici ferait prononcer le numéro de
téléphone de la marchande à voix haute, au marché.

Donc un moment est « branchable » s'il existe un endroit du code où :
- l'état survient (une erreur affichée, un bouton pressé, une bascule…),
- et où l'on pourrait appeler `parle(...)`.

Deux cas déjà traités te servent d'exemple :
- `AUTH_21` / `AUTH_22` (passage chiffres ⇄ images) → `LoginPassword.tsx`,
  fonction `basculerPinEnImages` : il y avait déjà un `parle(...)`, il suffisait
  d'ajouter la clé.
- `AUTH_24` (effacement) → `LoginPassword.tsx`, `handleKeyDelete` : il y a
  `parle('Effacé.')`.

## Les fichiers à lire

```
frontend_src/src/app/components/auth/LoginPassword.tsx      (l'écran principal)
frontend_src/src/app/components/auth/UnregisteredPhone.tsx
frontend_src/src/app/components/auth/ActivationScreen.tsx
frontend_src/src/app/components/auth/ChangePasswordScreen.tsx
frontend_src/src/app/components/auth/PropositionReconnaissance.tsx
frontend_src/src/app/components/auth/EntryGate.tsx
frontend_src/src/app/components/auth/Welcome.tsx
frontend_src/src/app/services/entreeVoix.ts                 (la table de clés)
frontend_src/src/app/services/loginVoiceScript.ts           (les 37 moments)
docs/voix/LOT-A-ENREGISTRER.csv                             (les textes enregistrés)
```

## Ce que tu rends — un CSV, rien d'autre

```csv
auth_id,moment,fichier,ligne,ce_que_le_code_fait_deja,parle_deja,confiance
AUTH_11,Numéro incomplet,components/auth/LoginPassword.tsx,660,"setError('Il manque des chiffres : touche le micro pour redire, ou complète')",non,haute
AUTH_31,Accès bloqué,,,,"aucun état correspondant trouvé",,nulle
```

- **`parle_deja`** : `oui` s'il y a déjà un appel de parole à cet endroit
  (c'est le cas le plus facile à brancher), `non` sinon.
- **`confiance`** : `haute` si tu as lu le code et que l'état est sans
  ambiguïté ; `moyenne` si tu déduis ; `nulle` si tu n'as rien trouvé.
  **Une ligne à confiance nulle vaut mieux qu'une ligne inventée.**

Ne propose pas de formulation, ne réécris aucun texte. Les textes sont déjà
enregistrés : c'est `LOT-A-ENREGISTRER.csv` qui fait foi.

## Trois pièges à éviter

1. **Ne conclus pas d'une absence de `speak(`** qu'il n'y a pas de parole. Cet
   écran utilise `parle`, `parleSuite`, `direConsigne`, `parlerAvantConnexion`.
2. **Un `setError(...)` n'est pas une parole.** C'est un texte affiché. Note-le
   quand même : c'est exactement l'endroit où une parole manque.
3. **Certains moments n'existent pas dans le code**, et c'est une réponse
   valable. « Passage aux images » existait ; « Accès bloqué » peut-être pas.
   Dis-le plutôt que de forcer une correspondance.

## Et une petite chose à part

Réécoute `frontend_src/public/voix/tata/ui-085.mp3`. Il avait été transcrit
« Ouverture des détails de **l'opération** ». Or le fichier qui dit cette
famille de phrases (`components/shared/DocumentsCertificationsModalUniversal.tsx`)
n'en a que trois : la carte d'identité, la certification JULABA, et
**l'attestation d'activité**. Dis-nous si le clip dit cette dernière — si oui,
un clip humain de plus revient en service sans rien enregistrer.
