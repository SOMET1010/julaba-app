/**
 * CAI-09 — LA MÊME RÈGLE, ÉCRITE UNE SEULE FOIS.
 *
 * CAI-02 avait posé la règle : « une journée fermée n'accepte plus d'écriture
 * d'argent ». Elle vivait dans `CaisseRestController`, en méthode privée. Les
 * ventes, les dépenses et les annulations la respectaient. Les crédits, servis
 * par un AUTRE contrôleur du même module, ne la voyaient pas — et ils écrivent
 * exactement les natures que la clôture additionne (`acompte_credit`,
 * `reglement_credit`).
 *
 * La marchande fermait sa journée, comptait son argent, la clôture gravait
 * `caisse_theorique`, `fond_final` et `ecart`. Un acompte encaissé après
 * remettait de l'argent dans le compte sans toucher ces trois nombres : `ecart`
 * disait encore « tout est juste » alors qu'il ne mesurait plus rien.
 *
 * UNE RÈGLE À DEUX ENDROITS, C'EST DEUX RÈGLES. Le trou n'est pas venu d'un
 * oubli d'attention mais d'une règle rangée dans un objet : ce qui vit dans une
 * classe ne protège que cette classe. Elle est donc sortie ici, sans
 * dépendance à Nest, et les deux contrôleurs appellent la même fonction.
 *
 * ELLE PREND SON EXÉCUTEUR. Un `DataSource` pour une lecture simple, un
 * `QueryRunner` pour la lire DANS la transaction qui va écrire — sinon il
 * existe une fenêtre entre le contrôle et l'écriture où la journée peut se
 * fermer, et l'écriture passe quand même.
 */
import { ConflictException } from '@nestjs/common';

/** Tout ce dont la règle a besoin : savoir poser une question à la base. */
export interface ExecuteurSql {
  query(sql: string, params?: any[]): Promise<any>;
}

/** Le message nomme le geste : on ne bloque pas la vendeuse, on lui dit quoi faire. */
export const MESSAGE_JOURNEE_FERMEE =
  'Ta journée de caisse est fermée. Rouvre-la pour continuer.';

export async function exigerJourneeOuverte(
  executeur: ExecuteurSql,
  marchandId: string,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const [session] = await executeur.query(
    'SELECT ouvert FROM caisse_sessions WHERE marchand_id = $1 AND date = $2 LIMIT 1',
    [marchandId, today],
  );
  // Pas de journée du tout : `ensureSessionOuverte` la crée. Une marchande qui
  // n'a jamais ouvert sa caisse n'est pas une marchande qui l'a fermée.
  if (!session) return;
  if (session.ouvert === false) {
    throw new ConflictException(MESSAGE_JOURNEE_FERMEE);
  }
}
