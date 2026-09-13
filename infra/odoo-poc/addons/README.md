# Repertoire d'addons supplementaires (volontairement vide)

Ce repertoire est monte en lecture seule sur `/mnt/extra-addons` dans le
conteneur Odoo. Il est **vide par design**.

## Ne pas y deposer les modules `ifn_odoo_modules`

Les quatre modules du depot `ifn_odoo_modules` (`ifn_core`,
`ifn_portal_common`, `ifn_portal_merchant`, `ifn_portal_producer`) sont
declares en version **17** (`ifn_portal_common/__manifest__.py` :
`"version": "17.0.1.0.0"`). Ils n'ont **pas** ete valides sur Odoo 19 et ne
doivent pas etre installes sur cette instance de POC : une migration 17 vers 19
est un chantier a part entiere, sans rapport avec la validation de l'API JSON-2.

Le POC demarre avec les modules officiels uniquement (voir
`ODOO_INSTALL_MODULES` dans `.env.example`).
