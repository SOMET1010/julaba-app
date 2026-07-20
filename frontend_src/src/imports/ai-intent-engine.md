OBJECTIF
Implémenter un moteur de raisonnement IA basé sur OpenAI GPT pour analyser les messages texte de l’utilisateur et détecter l’action métier demandée.

L’intégration doit utiliser **AI SDK de Vercel**.

Cette IA servira de moteur d’interprétation pour **Tantie Sagesse**.

Elle doit :

* analyser les messages texte
* comprendre l’intention
* déterminer l’action métier
* renvoyer une action structurée exploitable par l’application

────────────────
1️⃣ ARCHITECTURE GÉNÉRALE
────────────────

Créer une **API serverless Vercel** dédiée :

/api/ai/interpret

Rôle de cette route :

1. recevoir le message utilisateur
2. envoyer le message à OpenAI GPT
3. détecter l’intention métier
4. retourner une action structurée JSON

Flux :

Utilisateur
→ Interface Chat Tantie Sagesse
→ API /api/ai/interpret
→ OpenAI GPT
→ Analyse intention
→ JSON Action
→ Application exécute action

────────────────
2️⃣ UTILISER AI SDK DE VERCEL
────────────────

Installer :

ai
@ai-sdk/openai

Utiliser :

generateObject()

car l’IA doit retourner **une structure JSON stricte**, pas seulement du texte.

Exemple logique :

import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"

Le modèle recommandé :

gpt-4o-mini
ou
gpt-4.1

────────────────
3️⃣ STRUCTURE DE LA RÉPONSE IA
────────────────

L’IA doit toujours retourner un JSON standardisé.

Structure obligatoire :

{
"intent": "create_order | check_stock | show_dashboard | create_ticket | update_profile | unknown",
"entity": "commande | stock | profil | support | récolte | coopérative",
"action": "create | read | update | delete",
"confidence": 0.0-1.0,
"parameters": {
"product": "",
"quantity": "",
"targetUser": "",
"zone": ""
},
"requiresConfirmation": true/false,
"message": "réponse naturelle pour l'utilisateur"
}

Exemple :

Utilisateur :

"Je veux vendre 200kg de cacao"

Réponse IA :

{
"intent": "create_order",
"entity": "commande",
"action": "create",
"confidence": 0.93,
"parameters": {
"product": "cacao",
"quantity": "200kg"
},
"requiresConfirmation": true,
"message": "Tu veux créer une vente de 200 kg de cacao. Dois-je continuer ?"
}

────────────────
4️⃣ CONTEXTE À ENVOYER À L’IA
────────────────

La requête envoyée à GPT doit inclure :

* message utilisateur
* rôle utilisateur
* écran actuel
* données contextuelles

Exemple payload :

{
message: "je veux voir mes commandes",
role: "marchand",
screen: "dashboard",
userId: "uuid"
}

Le rôle est essentiel pour que l’IA comprenne les permissions.

────────────────
5️⃣ PROMPT SYSTÈME GPT
────────────────

Le prompt système doit expliquer clairement le rôle de l’IA.

Exemple logique :

"Tu es un assistant IA nommé Tantie Sagesse.
Tu aides les utilisateurs d'une plateforme agricole et commerciale.
Ton rôle est d'analyser les messages et de détecter l'action métier demandée.
Tu dois toujours répondre en JSON structuré selon le schéma fourni.
Ne réponds jamais en texte libre."

Le langage doit rester simple et compréhensible pour des utilisateurs peu instruits.

────────────────
6️⃣ INTENTS MÉTIER À SUPPORTER
────────────────

Créer un système extensible d’intentions.

Intent minimum :

create_order
update_order
cancel_order

create_harvest
update_stock
check_stock

create_identification
validate_identification

view_dashboard
view_wallet

create_support_ticket

update_profile

unknown

Chaque intent sera ensuite mappé vers une action dans l’application.

────────────────
7️⃣ SÉCURITÉ
────────────────

L’IA ne doit jamais :

* exécuter directement une action critique
* modifier des données sensibles sans confirmation

Règles :

delete
suspend_account
transactions
paiement

→ confirmation obligatoire.

────────────────
8️⃣ INTÉGRATION AVEC L’APPLICATION
────────────────

Dans l’interface Tantie Sagesse :

Message utilisateur
→ appel API /api/ai/interpret

Réponse :

* affichage message IA
* si intent détecté
  → proposer bouton action

Exemple :

“Créer la commande”

────────────────
9️⃣ PERFORMANCE
────────────────

Limiter la taille du contexte envoyé à GPT.

Ne jamais envoyer :

* listes complètes de commandes
* données massives

Envoyer uniquement :

* résumé
* identifiants
* contexte écran

────────────────
🔟 OBJECTIF FINAL
────────────────

Créer un moteur IA capable de :

* comprendre les demandes utilisateur
* détecter l’action métier
* renvoyer une action structurée
* s’intégrer avec Supabase
* alimenter l’agent Tantie Sagesse

Le système doit être :

modulaire
extensible
sécurisé
et compatible avec l’architecture Vercel + Supabase.

────────────────
1️⃣1️⃣ RAPPORT DEMANDÉ
────────────────

À la fin de l’implémentation fournir :

1. fichiers créés
2. route API créée
3. schéma JSON utilisé
4. intents implémentés
5. exemples de requêtes / réponses
6. instructions pour ajouter de nouvelles actions.
