// AUTH-14 (audit UI auth 05/10/2026) — le diagnostic parle en dev, se tait en prod.
//
// LE CONSTAT. Les écrans d'entrée journalisent leurs incidents techniques
// (localStorage illisible, réponse HTTP inanalysable, rôle inconnu) via
// `console.warn`. L'audit a vérifié qu'aucun ne porte de PIN, de mot de passe
// ni de montant (§7.1 — conforme §8.7), mais treize avertissements dans la
// console d'une version livrée, c'est du bruit que personne ne lit — et un
// signal de plus pour qui cherche des failles.
//
// LA DÉCISION. Les messages RESTENT en développement (c'est l'outil de
// diagnostic voulu par §8.7) et deviennent silencieux dans le build livré :
// `import.meta.env.DEV` est résolu AU BUILD par Vite — le branchement est
// éliminé du bundle de production, il ne reste rien à désactiver à l'exécution.
//
// CE QUE ÇA N'EST PAS. Un remplacement de `console.error` (les erreurs ne
// concernent pas ce lot) ni un gestionnaire de logs : c'est un robinet, pas
// un égoutier.

/** Avertit en développement uniquement ; no-op dans le build livré. */
export function warnDev(...arguments_: unknown[]): void {
  if (import.meta.env.DEV) {
    console.warn(...arguments_);
  }
}
