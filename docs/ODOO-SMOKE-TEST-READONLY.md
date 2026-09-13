# Smoke test Odoo réel — lecture seule

**Le contrat JSON-2 a été validé sur une instance Odoo 19 réelle. Ce document décrit le test d'intégration restant à exécuter via le backend JULABA et la stack Docker officielle.** Il ne modifie aucun code, aucune configuration, aucune infrastructure.

**Déjà acquis, à ne pas redémontrer ici.** L'authentification par clé API, `product.product/search_read`, `product.product/read` via la clé nommée `ids`, la forme de la réponse JSON-2 (liste JSON nue, sans enveloppe `{jsonrpc, result, id}`) et la compatibilité avec `produit-mapper.ts`. Validé contre Odoo Server 19.0 installé depuis les sources, avec les scripts de `infra/odoo-poc/` exécutés sans modification. Détail des résultats : `infra/odoo-poc/README.md`, section « État de validation ».

**Ce qui reste à exécuter, et fait l'objet de ce document.**
1. L'intégration **backend JULABA → Odoo réel**, via les routes `/odoo-poc/*` : `OdooRealClient` réellement branché dans NestJS, et non plus le protocole JSON-2 seul. C'est le passage d'un « client validé par contrat » (mock + fixtures, voir `backend/src/odoo-gateway/`) à un véritable **POC Odoo connecté**.
2. Le **packaging Docker** de la stack de test (`infra/odoo-poc/`), jamais exercé à ce jour : `docker pull` et démarrage de `odoo:19`, healthchecks, comportement de l'entrypoint officiel, parsing des paramètres `db_*`, exécution intégrale de `scripts/init.sh`.

**Deux documents, deux rôles — à ne pas confondre.**

| Document | Rôle |
|---|---|
| `infra/odoo-poc/README.md` | État réel de validation et mode opératoire de la stack POC (Docker, création de la base, clé API, smoke test bas niveau). |
| `docs/ODOO-SMOKE-TEST-READONLY.md` (ce document) | Protocole du backend JULABA connecté à une instance réelle, via les routes `/odoo-poc/*`. |

Portée : **lecture seule uniquement** — catalogue et stock. Aucune écriture réelle n'est exécutée ni autorisée pendant ce test (voir section Prérequis).

---

## 1. Prérequis

- Une instance Odoo 19 accessible en HTTPS depuis ce backend (test/démo — jamais une instance de production).
- Le nom de la base Odoo, si l'instance en héberge plusieurs sur le même domaine.
- Une **clé API dédiée au POC**, créée spécifiquement pour ce test, et **traitée comme un secret d'écriture**. La restriction lecture seule est imposée par `OdooRealClient` (allowlist `product.product/search_read` et `product.product/read`) et par `ODOO_REAL_WRITE_ENABLED=false` — **pas par les droits Odoo de la clé elle-même**. Le groupe standard `stock.group_stock_user`, nécessaire pour que `qty_available` soit seulement lisible, confère par ailleurs des permissions d'écriture Odoo sur `stock.move`, `stock.picking`, `stock.quant` et d'autres objets stock : constaté sur Odoo 19 réel, voir `infra/odoo-poc/README.md`, section « Limitation de sécurité ». Ne jamais réutiliser une clé API personnelle ou une clé déjà utilisée ailleurs.
- Confirmation que l'environnement d'exécution du backend peut effectivement atteindre cette URL en sortant (réseau sortant autorisé vers l'hôte Odoo).

## 2. Variables backend nécessaires

Toutes ces variables sont **backend uniquement** — jamais exposées au frontend JULABA, jamais commitées. À définir uniquement dans l'environnement où le test est exécuté (pas en production), et à retirer/réinitialiser une fois le test terminé.

| Variable | Valeur pour ce test | Rôle |
|---|---|---|
| `ODOO_CLIENT_MODE` | `real` | Bascule le Gateway sur `OdooRealClient` au lieu du mock (voir `odoo-gateway.module.ts`). |
| `ODOO_BASE_URL` | URL de l'instance de test | Cible des appels `POST /json/2/<model>/<method>`. |
| `ODOO_API_KEY` | Clé API dédiée au POC — pas intrinsèquement read-only, voir §1 | Jamais loggée, jamais retournée dans une réponse d'erreur (déjà testé unitairement, voir `odoo-real.client.spec.ts`). |
| `ODOO_DB` | Nom de la base, si nécessaire | Envoyée en en-tête `X-Odoo-Database` uniquement si définie. |
| `ODOO_REAL_WRITE_ENABLED` | `false` | **Doit rester `false` pendant tout ce test.** Sans ça, seules `product.product/search_read` et `product.product/read` sont exécutables — voir l'allowlist dans `odoo-real.client.ts`. |
| `ODOO_POC_ENABLED` | `true` **uniquement pendant le test contrôlé** | Sans elle, `/odoo-poc/*` répond 404 (`OdooPocEnabledGuard`). À repasser à `false`/absente dès le test terminé. |

## 3. Préparer les données de test dans Odoo

> **Vérifier d'abord la devise de la société Odoo.** Elle doit être **XOF**. Les bases de démonstration d'Odoo 19 sont en **USD** (constaté en base : les trois sociétés de démo sont en USD), et `produit-mapper.ts` fait `prix: p.list_price` **sans aucune notion de devise** — ni `currency_id` demandé, ni conversion, ni contrôle. Un produit à `400.00` dans une instance en USD arriverait donc dans le catalogue JULABA comme **400 FCFA** au lieu d'environ 260 000. Tant que le garde-fou de devise n'existe pas dans le Gateway, une instance de test dans une autre devise que XOF produit des chiffres faux sans rien signaler.

Créer **2 ou 3 produits de test clairement identifiables** dans Odoo (nom explicite du type `JULABA-TEST-1`, référence dédiée), **en contexte vivrier et à des prix FCFA réalistes** — par exemple ceux que JULABA utilise déjà dans `backend/src/database/seed-demo.service.ts` : Tomate 200, Banane 100, Riz (sac) 15000. Jamais des produits réels déjà utilisés par un autre usage de l'instance, et jamais le catalogue de démonstration d'Odoo, qui est générique, occidental et libellé en USD. Noter, pour chacun, tel qu'affiché **directement dans Odoo** :
- nom (`name`)
- prix (`list_price`)
- référence (`default_code`)
- stock disponible (`qty_available`)

Ces valeurs relevées à la source serviront de référence de comparaison aux étapes 7-8.

## 4. Déroulé du test

1. Démarrer le backend avec les variables de la section 2.
2. Appeler `GET /odoo-poc/catalogue` (JWT valide requis — `JwtAuthGuard` reste actif).
3. Vérifier que les produits de test créés à l'étape 3 apparaissent, mappés au format JULABA (`versJulaba`, voir `produit-mapper.ts`) : `nom`, `prix`, `stock`, `odooProductId`, `codeOdoo` correspondent aux valeurs relevées dans Odoo.
4. Appeler `GET /odoo-poc/stock/:odooProductId` pour chacun des produits de test.
5. Comparer le stock reçu à celui relevé directement dans Odoo (étape 3).
6. Appeler manuellement (hors UI, ex. `curl`/Postman contre `POST /odoo-poc/mouvement-stock`, ou tout autre modèle/méthode hors allowlist) et vérifier que l'appel est **refusé avant tout accès réseau réel à Odoo** — l'allowlist (`product.product/search_read`, `product.product/read`) doit tenir même contre une vraie instance.
7. Inspecter les logs backend produits pendant tout le test et confirmer qu'**aucune valeur de `ODOO_API_KEY` n'apparaît nulle part** (ni en clair, ni dans un message d'erreur, ni dans une trace de requête).

## 5. Critères GO

- Authentification réelle fonctionnelle (`Authorization: bearer <clé>` accepté par l'instance).
- `search_read` réel fonctionnel : le catalogue JULABA reflète exactement les produits de test créés dans Odoo.
- `read` réel fonctionnel : le stock reçu par `/odoo-poc/stock/:id` correspond à celui relevé dans Odoo.
- Mapping JULABA ↔ Odoo conforme (aucun champ manquant, mal typé, ou décalé).
- Aucune écriture n'a eu lieu sur l'instance Odoo à aucun moment du test.
- Aucune fuite de secret dans les logs.
- Aucun comportement différent de ce que les tests par contrat (`odoo-gateway.contract.spec.ts`, `odoo-real.client.spec.ts`) avaient anticipé.
- Si l'instance de test est hébergée par la stack `infra/odoo-poc/` : `./scripts/init.sh` puis `./scripts/smoke-test.sh` passent de bout en bout dans cette stack Docker, qui n'a encore jamais été exercée.

## 6. Critères NO-GO

- La forme réelle de la réponse JSON-2 diffère de ce qui a été **observé sur Odoo 19** : le corps de la réponse **est** directement le résultat de la méthode, sans enveloppe façon ancien JSON-RPC `{jsonrpc, result, id}`. Ce n'est plus une hypothèse, mais le critère reste listé comme **non-régression** : l'instance cible peut différer (version, proxy intercalé, passerelle qui ré-enveloppe).
- Échec d'authentification ou de sélection de base (`X-Odoo-Database`).
- Divergence de champs Odoo par rapport à ceux attendus par `produit-mapper.ts` (`id`, `name`, `list_price`, `qty_available`, `default_code`).
- Stock incohérent entre ce que JULABA affiche et ce qu'Odoo affiche réellement.
- **Prix incohérent, ou devise de l'instance différente de XOF.** `produit-mapper.ts` recopie `list_price` tel quel : si la société Odoo n'est pas en XOF, le catalogue JULABA affiche un montant faux sans aucun signal. Un prix affiché par JULABA qui ne correspond pas, au franc près, à celui relevé dans Odoo est un NO-GO — c'est de l'argent de commerçante, et la CONSTITUTION (principe 8) traite un chiffre faux comme un incident, pas comme un détail.
- Un appel hors allowlist (`create`, `write`, `unlink`, une méthode métier type `action_*`, ou toute combinaison `model/method` non listée) parvient malgré tout jusqu'au réseau.

## 7. Après le test

Quel que soit le résultat :
- Retirer/réinitialiser `ODOO_POC_ENABLED` (repasser à `false`/absente) et supprimer la clé API de test créée pour l'occasion.
- Si GO : mettre à jour ce document avec la date du test et le résultat, avant d'envisager un lot d'écriture réelle (qui nécessitera sa propre allowlist d'écriture explicite — voir la réserve laissée ouverte sur `ODOO_REAL_WRITE_ENABLED` dans `odoo-real.client.ts`).
- Si NO-GO : consigner précisément l'écart observé (section 6) avant toute nouvelle tentative — ne pas ajuster le code à l'aveugle sans comprendre la cause exacte de la divergence.
