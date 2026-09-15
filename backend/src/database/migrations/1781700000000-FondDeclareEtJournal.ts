import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fond de caisse : distinguer « pas encore déclaré » d'un fond réellement à
 * zéro, et tracer toute correction.
 *
 * Défaut réparé : `ensureSessionOuverte` ouvre la journée automatiquement à
 * `fond_initial = 0` quand une marchande vend avant d'avoir ouvert sa caisse
 * (doctrine « la vendeuse n'est jamais bloquée »). Quand elle déclarait
 * ensuite son vrai fond, `session/ouvrir` voyait une ligne existante et la
 * renvoyait telle quelle : le montant saisi n'était JAMAIS enregistré. Son
 * téléphone affichait 5 000, la base gardait 0, et sa caisse théorique était
 * fausse d'autant — chiffres contradictoires, donc incident au sens de la
 * Constitution.
 *
 * Sans cette colonne, impossible de corriger : un `fond_initial = 0` créé par
 * une vente est indiscernable d'un zéro que la marchande a réellement déclaré
 * (elle peut légitimement commencer sa journée sans rien en caisse).
 * `fond_declare_at IS NULL` signifie « le fond n'a pas encore été déclaré ».
 *
 * `caisse_fond_journal` garde l'ancien montant, le nouveau, l'heure et
 * l'autrice de chaque écriture — l'argent d'une marchande ne change jamais
 * sans laisser de trace.
 */
export class FondDeclareEtJournal1781700000000 implements MigrationInterface {
  name = 'FondDeclareEtJournal1781700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE caisse_sessions ADD COLUMN IF NOT EXISTS fond_declare_at timestamptz`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS caisse_fond_journal (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id uuid NOT NULL,
        marchand_id text NOT NULL,
        ancien_fond numeric,
        nouveau_fond numeric NOT NULL,
        origine text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_caisse_fond_journal_session
         ON caisse_fond_journal (session_id, created_at)`,
    );

    // Rattrapage des journées existantes. Seule une saisie manuelle a pu
    // écrire un fond > 0 (l'ouverture automatique n'écrit que 0) : ces
    // journées-là sont donc déjà déclarées. Celles restées à 0 gardent
    // `fond_declare_at` à NULL et seront proposées à la déclaration — c'est
    // le comportement voulu, y compris pour une marchande dont le fond était
    // réellement nul : elle le confirmera une fois.
    await queryRunner.query(`
      UPDATE caisse_sessions
         SET fond_declare_at = COALESCE(heure_ouverture, created_at, now())
       WHERE fond_declare_at IS NULL
         AND COALESCE(fond_initial, 0) > 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_caisse_fond_journal_session');
    await queryRunner.query('DROP TABLE IF EXISTS caisse_fond_journal');
    await queryRunner.query('ALTER TABLE caisse_sessions DROP COLUMN IF EXISTS fond_declare_at');
  }
}
