/**
 * LES ICÔNES DE LA NAVIGATION — UNE SEULE TABLE, POUR LES DEUX VUES.
 *
 * LE DÉFAUT, vu sur l'APK 6f4111d et confirmé par l'agent de test du 25/09 :
 * dans la barre du bas comme dans le menu latéral, « Accueil » et
 * « Commandes » portaient LA MÊME MAISON. Deux portes indiscernables pour une
 * marchande qui ne lit pas.
 *
 * `roleConfig.ts` demandait bien `icon: 'ShoppingBag'`, et `ShoppingBag` était
 * DÉJÀ IMPORTÉ dans les deux fichiers. Il manquait seulement dans leurs deux
 * tables — et le `|| Home` fabriquait une maison, en silence.
 *
 * ET LES DEUX TABLES AVAIENT DÉJÀ DIVERGÉ : `Store` valait l'icône magasin
 * dans la barre du bas, et un CADDIE dans le menu latéral. La même entrée de
 * menu changeait de dessin selon la largeur de l'écran.
 *
 * Deux tables répondaient à une seule question. C'est le motif que ce dépôt
 * traque sur l'argent — « ne jamais donner deux sens à la même donnée » — et
 * il vaut aussi pour ce que la marchande VOIT.
 *
 * `roleConfigIcones.test.mts` refuse qu'une icône demandée manque ici, et que
 * deux onglets d'un même rôle portent le même dessin.
 */
import {
  Home, Store, Package, User, ShoppingBag, ShoppingCart, Warehouse,
  Users, UserCheck, UserPlus, BarChart3, Truck,
  LayoutDashboard, DollarSign, Settings,
} from 'lucide-react';

export const ICONES_NAVIGATION: Record<string, any> = {
  Home,
  Store,
  Package,
  User,
  ShoppingBag,
  ShoppingCart,
  Sprout: Warehouse,
  Users,
  UserCheck,
  UserPlus,
  BarChart3,
  Truck,
  LayoutDashboard,
  DollarSign,
  Settings,
};
