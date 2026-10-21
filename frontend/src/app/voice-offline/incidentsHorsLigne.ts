import { ENDPOINT_VENTE, operationsEnAttente, type LettreMorte } from "./offlineCaisse";

export function resumeIncidentHorsLigne(incident: LettreMorte): string {
  const type = incident.endpoint.includes("depense") ? "dépense" : incident.endpoint.includes("vente") ? "vente" : "stock";
  const motif = incident.echec.message?.trim() || "L’opération a été refusée.";
  return `Cette ${type} n’a pas été enregistrée : ${motif}`;
}

/**
 * COMBIEN DE VENTES DORMENT DANS LA FILE — HIST-01, lecture seule.
 *
 * L'historique de « Mes ventes » est ENTIÈREMENT serveur : une vente encaissée
 * sans réseau part dans la file et n'apparaît donc NULLE PART sur cet écran. La
 * marchande vend, regarde ses ventes, ne voit rien, et conclut que
 * l'application a perdu son argent. Ce chiffre-là est ce qui manquait pour le
 * lui dire.
 *
 * CE QUE CETTE FONCTION FAIT, ET RIEN D'AUTRE : elle COMPTE. Aucun enfilage,
 * aucun rejeu, aucune purge, aucun réordonnancement, aucune synchronisation
 * déclenchée pour afficher un écran. L'ordre, l'idempotence et le comptage
 * d'`offlineCaisse` sont strictement inchangés.
 *
 * ELLE COMPTE LES VENTES, PAS LES OPÉRATIONS. `nbEnAttente` mélange les
 * natures — vente, dépense, ajustement de stock. Annoncer « 3 ventes en
 * attente » sur une file qui porte deux dépenses serait le mensonge de
 * confirmation qu'OFF-02 a fermé côté voix. Le point de terminaison n'est pas
 * recopié : il vient d'`ENDPOINT_VENTE`, comme `ventesParties` et
 * `ventesEncoreEnFile` le font déjà pour un bilan de rejeu.
 *
 * ELLE VIT ICI, et non dans un module neuf, parce qu'un fichier neuf qui
 * importe la file ENTRE dans le périmètre d'argent
 * (ci/PERIMETRE-ARGENT.json) — et déclarer un périmètre est une décision
 * humaine, pas celle d'un agent. Ce fichier, lui, y est déjà, dans la zone
 * `offline-synchronisation`, qui est exactement la sienne : il dit à la
 * marchande ce que la file contient.
 */
export async function ventesEnAttenteEnvoi(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const ops = await operationsEnAttente(userId);
    return ops.filter((op) => op.endpoint === ENDPOINT_VENTE).length;
  } catch {
    // Ne pas pouvoir lire la file locale ne doit pas empêcher l'écran de
    // s'afficher. On n'affiche alors AUCUN bandeau — on ne dit pas « rien en
    // attente », qui serait la même faute que celle qu'on ferme.
    return 0;
  }
}
