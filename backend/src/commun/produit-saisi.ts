/**
 * CE QU'UN PRODUIT DOIT PORTER POUR ENTRER DANS L'ÉTAL — STK-21.
 *
 * LE DÉFAUT, vu par l'agent de test du 25/09 : un produit nommé « A », 0 kg,
 * en rupture. Une saisie ratée — sans doute une dictée mal comprise — entrée
 * telle quelle dans l'étal de la marchande.
 *
 * `POST /caisse/produits` n'exigeait RIEN : `body.nom` partait directement en
 * base, et `body.unite || 'unité'` fabriquait une unité quand elle manquait.
 *
 * ARBITRAGE DE PATRICK, 25/09 : « un nom d'au moins 2 caractères et une unité
 * obligatoire, pour éviter que ça se reproduise en production. »
 *
 * POURQUOI L'UNITÉ COMPTE AUTANT QUE LE NOM. Dans ce dépôt, l'unité n'est pas
 * un détail d'affichage : c'est ce qui donne son sens à une quantité. « 3 »
 * ne veut rien dire ; « 3 tas » veut dire quelque chose. Un article entré sans
 * unité force tout le reste de la chaîne à en deviner une — et deviner est
 * précisément ce qu'on refuse.
 *
 * ON NE REFUSE QUE CE QUI EST VIDE OU ABSURDE. Un nom d'une seule lettre n'est
 * pas un produit du marché ; deux caractères suffisent pour « ka » ou « ri ».
 */
import { BadRequestException } from '@nestjs/common';

const NOM_MINIMUM = 2;

const propre = (v: unknown): string =>
  typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim();

/** Le nom retenu, ou un refus explicite que l'écran peut redire à la marchande. */
export function nomDeProduitSaisi(v: unknown): string {
  const nom = propre(v);
  if (nom.length < NOM_MINIMUM) {
    throw new BadRequestException(
      `Le nom du produit est trop court. Dis-le en entier — au moins ${NOM_MINIMUM} lettres.`,
    );
  }
  return nom;
}

/** L'unité retenue. Jamais fabriquée : sans elle, une quantité ne veut rien dire. */
export function uniteDeProduitSaisie(v: unknown): string {
  const unite = propre(v);
  if (unite === '') {
    throw new BadRequestException(
      "Dis comment tu vends ce produit — au tas, au kilo, à l'unité.",
    );
  }
  return unite;
}
