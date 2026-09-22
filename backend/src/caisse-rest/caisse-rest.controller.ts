import { BadRequestException, Controller, Get, Post, Put, Patch, Delete, Body, Param, ParseUUIDPipe, NotFoundException, UseGuards, Optional, Logger, Query, ConflictException } from '@nestjs/common';
import { EventsGateway } from '../events/events.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { dateOperationValide } from './date-operation';
import { resumeMargeDesLignes, coutDesLignesCoutees } from './marge-vente';
import { CaisseTransaction, TransactionStatus } from './caisse-transaction.entity';
import { restituerStock } from './stock-restitution';
import { AlertesService } from '../notifications/alertes.service';

// LE LIBELLÉ D'UNE DÉPENSE — DEP-01, 21/09/2026.
//
// UNE SEULE VÉRITÉ : `description` est le nom CANONIQUE du motif d'une dépense.
// C'est celui de la colonne, celui de l'entité, et c'est désormais celui que le
// téléphone envoie.
//
// COMPATIBILITÉ DE TRANSITION, PAS CONTRAT PÉRENNE : `notes` est la forme
// HÉRITÉE. Elle n'est acceptée ici que parce que des files hors ligne écrites
// avec ce nom dorment DÉJÀ sur les téléphones installés — les refuser ferait
// perdre le motif d'une dépense que la marchande a réellement saisie, une
// deuxième fois et pour de bon. Cette lecture disparaît quand ces files se
// seront vidées ; rien de neuf ne doit s'appuyer dessus.
//
// Le canonique gagne. Une chaîne vide n'est pas un motif : elle ne doit pas
// faire perdre celui que la forme héritée transporte.
export function libelleDepense(canonique: unknown, herite: unknown): string {
  const texte = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());
  return texte(canonique) || texte(herite);
}

// LA CATÉGORIE D'UNE DÉPENSE — DEP-02, 22/09/2026.
//
// LE DÉFAUT, même famille que DEP-01 un cran plus loin. À l'écran, la marchande
// TOUCHE une catégorie (« Taxe mairie », « École »…) — c'est le seul geste
// qu'une non-lectrice puisse faire. Ce choix n'arrivait jamais ici : la route
// ne lisait pas `body.categorie`, et la colonne `category`, qui existe depuis
// toujours sur `caisse_transactions`, restait vide sur CHAQUE dépense.
//
// L'écran des dépenses la reconstruisait alors en cherchant des mots-clés
// français dans le libellé — et se trompait sur deux des onze catégories que
// l'écran propose lui-même. C'est ce que l'architecture interdit : une
// information qui pèse sur l'argent est conservée ou nommée perdue, jamais
// reconstruite en aval.
//
// LA LISTE EST FERMÉE, ET ELLE EST VÉRIFIÉE ICI. Un identifiant inconnu n'est
// pas écrit : il vaut mieux une dépense SANS catégorie — cas que l'écran sait
// nommer (« Catégorie pas notée ») — qu'une catégorie inventée par le
// téléphone. Le nom de colonne est `category` (héritage du schéma, figé) ;
// le nom sur le fil est `categorie`. La correspondance se fait ICI, une fois.
export const CATEGORIES_DEPENSE = [
  'transport', 'repas', 'taxe_mairie', 'loyer', 'famille', 'tontine',
  'sante', 'telephone', 'marchandise', 'ecole', 'autre',
] as const;

export function categorieDepense(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null;
  const v = valeur.trim();
  return (CATEGORIES_DEPENSE as readonly string[]).includes(v) ? v : null;
}

@UseGuards(JwtAuthGuard)
@Controller('caisse')
export class CaisseRestController {
  private readonly logger = new Logger(CaisseRestController.name);

  constructor(
    @InjectRepository(CaisseTransaction) private repo: Repository<CaisseTransaction>,
    private dataSource: DataSource,
    @Optional() private alertesService?: AlertesService,
    @Optional() private eventsGateway?: EventsGateway,
  ) {}

  // Liste PLAFONNÉE : sans borne, un historique de plusieurs années revenait en
  // entier à chaque ouverture de la caisse (réponse de plusieurs Mo sur un
  // téléphone 3G). Défaut 500 lignes (≈ plusieurs semaines de ventes), maximum
  // 1000 ; ?page=2 pour remonter plus loin. Les consommateurs front acceptent
  // déjà un tableau simple — le contrat de réponse ne change pas.
  @Get('transactions')
  findAll(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const take = Math.min(Math.max(parseInt(limit ?? '', 10) || 500, 1), 1000);
    const pageNum = Math.max(parseInt(page ?? '', 10) || 1, 1);
    return this.repo.find({
      where: { user_id: user.id },
      order: { created_at: 'DESC' },
      take,
      skip: (pageNum - 1) * take,
    });
  }

  /**
   * Annulation SELF-SERVICE d'une vente par le marchand (#20).
   *
   * Garde-fous : le marchand n'annule que SA PROPRE vente (`user_id`), de type
   * `vente`, en état `validee` (pas déjà annulée / gelée / en litige par un admin),
   * et UNIQUEMENT du JOUR courant — au-delà, seul un admin peut annuler
   * (`PATCH /transactions/:id`). Réutilise la restitution partagée (stock rendu +
   * mouvement inverse `type='annulation'`), atomique et idempotente. L'ARGENT
   * n'est pas touché (argent gelé) : on marque `annulee` + restitue le stock ;
   * le CA du jour exclut les ventes annulées (côté front).
   */
  @Patch('transactions/:id/annuler')
  async annulerVente(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.dataSource.transaction(async (m) => {
      const tx = await m.findOne(CaisseTransaction, { where: { id } });
      // On ne divulgue pas l'existence d'une vente d'autrui : introuvable.
      if (!tx || tx.user_id !== user.id) throw new NotFoundException('Vente introuvable');
      if (tx.type !== 'vente') throw new BadRequestException('Seule une vente peut être annulée.');
      if (tx.statut !== TransactionStatus.VALIDEE) {
        throw new BadRequestException('Cette vente n’est pas annulable (déjà annulée ou en cours de traitement).');
      }
      // Fenêtre : vente du JOUR courant uniquement. Abidjan = UTC → dates alignées.
      const jourVente = new Date(tx.created_at).toISOString().slice(0, 10);
      const aujourdhui = new Date().toISOString().slice(0, 10);
      if (jourVente !== aujourdhui) {
        throw new BadRequestException('Seule une vente du jour peut être annulée. Pour une vente plus ancienne, contacte un responsable.');
      }
      // CAI-02 — annuler, c'est RETIRER de l'argent d'une journée. Si elle est
      // déjà comptée, l'écart devient faux dans l'autre sens.
      await this.exigerJourneeOuverte(user.id);

      tx.statut = TransactionStatus.ANNULEE;
      tx.motif = 'Annulation par le marchand';
      await m.save(tx);
      const restitutions = await restituerStock(m, id);
      return { id, statut: tx.statut, restitutions };
    });
  }

  @Post('transactions')
  create(@Body() body: any, @CurrentUser() user: User) {
    const montant = parseFloat(body.montant) || 0;
    if (montant <= 0) throw new BadRequestException('montant invalide');
    // 'vente' EST EXCLU D'ICI, ET C'EST LE CORRECTIF — audit du 18/09/2026.
    //
    // Cette route faisait un `repo.save()` NU : ni clé d'idempotence, ni
    // décrément de stock, ni journal de mouvements — rien de ce que garantit
    // POST /caisse/vente. Un simple rejeu réseau d'une vente de 1 500 F la
    // comptait deux fois (3 000 F au chiffre d'affaires) en laissant le stock
    // intact. Aucun écran de JULABA n'appelait cette route en écriture (elle
    // n'est lue qu'en GET), mais elle restait ouverte à tout client authentifié.
    //
    // Une vente n'a qu'UNE porte d'entrée : /caisse/vente, qui tient
    // l'invariant d'argent et d'inventaire dans une seule transaction.
    const TYPES_AUTORISES = ['depense', 'remboursement', 'ajustement'];
    if (body.type === 'vente') {
      throw new BadRequestException(
        "Une vente s'enregistre par POST /caisse/vente — seule route qui garantit l'idempotence et le mouvement de stock.",
      );
    }
    if (!body.type || !TYPES_AUTORISES.includes(body.type)) {
      throw new BadRequestException(`type invalide - valeurs acceptées : ${TYPES_AUTORISES.join(', ')}`);
    }
    return this.repo.save(this.repo.create({
      user_id: user.id,
      marchand_id: user.id,
      type: body.type,
      montant,
      description: body.description || '',
      session_id: body.session_id || '',
      produit: body.produit || '',
      quantite: parseFloat(body.quantite) || 1,
      mode_paiement: body.mode_paiement || 'especes',
      source: body.source || 'kassa',
      category: body.category || '',
      prix_achat: parseFloat(body.prix_achat) || 0,
      prix_vente: parseFloat(body.prix_vente) || 0,
      marge: parseFloat(body.marge) || 0,
      benefice: parseFloat(body.benefice) || 0,
      details: body.details || null,
    }));
  }

  @Get('session/:date')
  async getSession(@Param('date') date: string, @CurrentUser() user: User) {
    const session = await this.dataSource.query(
      'SELECT * FROM caisse_sessions WHERE marchand_id = $1 AND date = $2 LIMIT 1',
      [user.id, date]
    );
    return { session: session[0] || null };
  }

  // `UPDATE ... RETURNING` renvoie `[lignes, nombreAffecté]` sous TypeORM, là
  // où `INSERT ... RETURNING` renvoie les lignes directement. Piège déjà payé
  // une fois (catalogue maître : un compteur qui mentait). On normalise.
  private premiereLigne(resultat: any): any {
    if (!Array.isArray(resultat)) return null;
    const lignes = Array.isArray(resultat[0]) ? resultat[0] : resultat;
    return lignes[0] ?? null;
  }

  // L'argent d'une marchande ne change jamais sans laisser de trace : ancien
  // montant, nouveau, heure, autrice. L'échec du journal ne fait PAS perdre sa
  // déclaration (la session est déjà écrite) mais il est bruyant — un trou
  // dans la piste d'audit doit se voir.
  private async journaliserFond(
    sessionId: string,
    marchandId: string,
    ancien: number | null,
    nouveau: number,
    origine: 'declaration' | 'correction',
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO caisse_fond_journal (session_id, marchand_id, ancien_fond, nouveau_fond, origine)
         VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, marchandId, ancien, nouveau, origine],
      );
    } catch (e: any) {
      this.logger.error(
        `[CAISSE] journal du fond NON écrit (session ${sessionId}, ${ancien} → ${nouveau}) : ${e?.message}`,
      );
    }
  }

  private montantValide(valeur: any): number {
    const montant = Number(valeur);
    if (!Number.isFinite(montant) || montant < 0) {
      throw new BadRequestException('Montant du fond de caisse invalide');
    }
    return montant;
  }

  // Ouvrir la journée = DÉCLARER son fond de caisse (« Combien tu as en caisse
  // ce matin ? »). Trois situations, une seule règle :
  //
  //  1. Aucune journée aujourd'hui → on la crée avec son fond.
  //  2. Journée déjà créée mais fond JAMAIS déclaré — c'est le cas d'une
  //     journée ouverte automatiquement à 0 par une première vente : cette
  //     saisie EST la déclaration, elle remplace le 0. C'est le défaut
  //     réparé : avant, le montant saisi était silencieusement perdu.
  //  3. Fond déjà déclaré → il ne change PAS ici. Toute correction passe par
  //     « Modifier le fond » (PATCH session/fond), qui la journalise. La
  //     réponse le dit explicitement (`fond_conserve`) pour que l'écran cesse
  //     d'afficher un montant que le serveur n'a pas retenu.
  //
  // Rouvrir une journée fermée reste permis dans tous les cas : doctrine déjà
  // en place (voir ensureSessionOuverte) — on ne bloque jamais la vendeuse.
  @Post('session/ouvrir')
  async ouvrirSession(@Body() body: any, @CurrentUser() user: User) {
    const today = new Date().toISOString().split('T')[0];
    const fond = this.montantValide(body.fond_initial ?? 0);
    const existing = await this.dataSource.query(
      'SELECT * FROM caisse_sessions WHERE marchand_id = $1 AND date = $2 LIMIT 1',
      [user.id, today]
    );

    if (!existing[0]) {
      const result = await this.dataSource.query(
        `INSERT INTO caisse_sessions (marchand_id, date, fond_initial, ouvert, heure_ouverture, notes, fond_declare_at)
         VALUES ($1, $2, $3, true, NOW(), $4, NOW()) RETURNING *`,
        [user.id, today, fond, body.notes || '']
      );
      const creee = this.premiereLigne(result);
      if (creee) await this.journaliserFond(creee.id, user.id, null, fond, 'declaration');
      return { session: creee };
    }

    const session = existing[0];

    if (!session.fond_declare_at) {
      const maj = await this.dataSource.query(
        `UPDATE caisse_sessions
            SET fond_initial = $1, fond_declare_at = NOW(), ouvert = true,
                heure_ouverture = COALESCE(heure_ouverture, NOW()),
                heure_fermeture = NULL, updated_at = NOW()
          WHERE id = $2 RETURNING *`,
        [fond, session.id]
      );
      await this.journaliserFond(session.id, user.id, Number(session.fond_initial ?? 0), fond, 'declaration');
      return { session: this.premiereLigne(maj) ?? { ...session, fond_initial: fond, ouvert: true } };
    }

    if (!session.ouvert) {
      const reouverte = await this.dataSource.query(
        `UPDATE caisse_sessions
            SET ouvert = true, heure_fermeture = NULL, updated_at = NOW()
          WHERE id = $1 RETURNING *`,
        [session.id]
      );
      return { session: this.premiereLigne(reouverte) ?? { ...session, ouvert: true }, fond_conserve: true };
    }

    return { session, fond_conserve: true };
  }

  // « Modifier le fond » : le seul chemin pour changer un fond déjà déclaré.
  // Journalisé systématiquement. Avant, cet écran ne persistait RIEN — il
  // changeait l'affichage et le montant revenait au rechargement.
  @Patch('session/fond')
  async corrigerFond(@Body() body: any, @CurrentUser() user: User) {
    const today = new Date().toISOString().split('T')[0];
    const fond = this.montantValide(body.fond_initial);
    const existing = await this.dataSource.query(
      'SELECT * FROM caisse_sessions WHERE marchand_id = $1 AND date = $2 LIMIT 1',
      [user.id, today]
    );
    // Aucune journée aujourd'hui : cette saisie EST sa déclaration du matin, on
    // crée la journée avec. C'est le seul chemin qu'une marchande a vraiment :
    // son accueil (MarchandAccueilVoice) n'expose PAS de bouton « Ouvrir ma
    // journée » — elle passe par le résumé du jour puis « Modifier le fond ».
    // Avant, elle recevait un 404 : son écran affichait le montant, la base ne
    // gardait rien, et tout était perdu au rechargement. Même défaut que celui
    // réparé sur session/ouvrir, sur la seule voie réellement empruntée.
    if (!existing[0]) {
      const creee = this.premiereLigne(await this.dataSource.query(
        `INSERT INTO caisse_sessions (marchand_id, date, fond_initial, ouvert, heure_ouverture, fond_declare_at)
         VALUES ($1, $2, $3, true, NOW(), NOW()) RETURNING *`,
        [user.id, today, fond],
      ));
      if (creee) await this.journaliserFond(creee.id, user.id, null, fond, 'declaration');
      return { session: creee };
    }

    const session = existing[0];
    const maj = await this.dataSource.query(
      `UPDATE caisse_sessions
          SET fond_initial = $1, fond_declare_at = COALESCE(fond_declare_at, NOW()), updated_at = NOW()
        WHERE id = $2 RETURNING *`,
      [fond, session.id]
    );
    // Une journée ouverte automatiquement par une première vente porte un fond
    // à 0 JAMAIS déclaré : la saisie qui arrive est donc sa DÉCLARATION, pas une
    // correction. Le distinguer n'est pas cosmétique — « Modifier le fond » est
    // le seul chemin qu'une marchande a, donc c'est ce libellé qui apparaîtra
    // en pratique dans la piste d'audit. Un journal qui se trompe sur ce qui
    // s'est passé ne vaut pas mieux que pas de journal.
    const origine = session.fond_declare_at ? 'correction' : 'declaration';
    await this.journaliserFond(session.id, user.id, Number(session.fond_initial ?? 0), fond, origine);
    return { session: this.premiereLigne(maj) ?? { ...session, fond_initial: fond } };
  }

  // Ce que la caisse DEVRAIT contenir, calculé par le serveur à partir de ses
  // propres écritures : fond déclaré + ventes encaissées − dépenses. Les ventes
  // ANNULÉES sont exclues (le back-office ne supprime pas une vente, il pose
  // statut='annulee' — les compter surestimerait la recette).
  //
  // Volontairement calculé ici et non repris du téléphone : un écart n'a de
  // valeur que s'il est établi par celui qui n'a pas intérêt à le lisser, et un
  // appareil hors ligne depuis des heures n'a pas le compte juste.
  private async caisseTheorique(marchandId: string, fondInitial: number, date: string): Promise<number> {
    const [somme] = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'vente'          THEN montant ELSE 0 END), 0) AS ventes,
         COALESCE(SUM(CASE WHEN type IN ('acompte_credit', 'reglement_credit')
                           THEN montant ELSE 0 END), 0) AS encaissements_credit,
         COALESCE(SUM(CASE WHEN type = 'depense'        THEN montant ELSE 0 END), 0) AS depenses
       FROM caisse_transactions
      WHERE marchand_id = $1 AND statut <> 'annulee' AND created_at::date = $2::date`,
      [marchandId, date],
    );
    // LES ENCAISSEMENTS DE CRÉANCE SONT DE L'ARGENT DANS LA BOÎTE.
    //
    // Premier correctif (19/09/2026) : les acomptes n'étaient comptés nulle
    // part côté serveur alors que le téléphone les comptait ; la clôture
    // journalisait un écart fantôme, du montant exact des acomptes du jour.
    //
    // SECOND CORRECTIF, ARGENT-4b — LE MÊME DÉFAUT REVENU PAR L'AUTRE MOITIÉ.
    // ARGENT-4 a introduit `reglement_credit` pour le paiement qui SOLDE la
    // dette, et cette somme ne l'a pas suivi : elle ne lisait que
    // `acompte_credit`. Un règlement final de 6 000 F entrait physiquement
    // dans la caisse, était correctement journalisé… et la clôture l'ignorait,
    // recréant un écart fantôme de 6 000 F. Le test d'ARGENT-4 vérifiait que la
    // ligne existait et ne gonflait pas la recette — il ne fermait jamais la
    // journée après un règlement, donc il ne pouvait pas le voir.
    //
    // La leçon, pour la prochaine nature qu'on ajoutera : une écriture d'argent
    // n'est pas finie quand elle est écrite, mais quand la CLÔTURE la comprend.
    //
    // Ce n'est PAS de la recette (elle a été comptée à la vente à crédit) —
    // c'est de l'encaissement, et la caisse théorique est un compte d'espèces,
    // pas un compte de résultat.
    return fondInitial
      + Number(somme?.ventes ?? 0)
      + Number(somme?.encaissements_credit ?? 0)
      - Number(somme?.depenses ?? 0);
  }

  // Fermer la journée = déclarer ce qu'on a RÉELLEMENT en main, et confronter.
  //
  // Défaut réparé : l'application envoie `comptage_reel`, cette méthode lisait
  // `body.fond_final`. Les noms ne correspondaient pas, donc `|| 0` écrivait
  // ZÉRO à chaque fermeture, quel que soit le montant compté — et les notes de
  // clôture étaient perdues de même. L'écart, lui, n'était stocké nulle part.
  // C'est pourtant la mesure même du pilote : un incident qu'on ne conserve pas
  // ne se détecte jamais.
  @Post('session/fermer')
  async fermerSession(@Body() body: any, @CurrentUser() user: User) {
    const today = new Date().toISOString().split('T')[0];
    // `fond_final` reste accepté : ancien nom du même montant, des clients
    // hors ligne peuvent encore le rejouer.
    const comptage = this.montantValide(body.comptage_reel ?? body.fond_final ?? 0);

    const [existante] = await this.dataSource.query(
      'SELECT * FROM caisse_sessions WHERE marchand_id = $1 AND date = $2 LIMIT 1',
      [user.id, today],
    );
    if (!existante) throw new NotFoundException('Aucune journée à fermer');

    const theorique = await this.caisseTheorique(user.id, Number(existante.fond_initial ?? 0), today);
    const ecart = comptage - theorique;

    const maj = await this.dataSource.query(
      `UPDATE caisse_sessions
          SET ouvert = false, heure_fermeture = NOW(),
              fond_final = $1, caisse_theorique = $2, ecart = $3,
              notes = COALESCE($4, notes), updated_at = NOW()
        WHERE id = $5 RETURNING *`,
      [comptage, theorique, ecart, body.notes ?? null, existante.id],
    );
    if (ecart !== 0) {
      // Un écart de caisse est un INCIDENT (Constitution, § confiance mesurable) :
      // il doit se voir dans les journaux, pas seulement dormir en base.
      this.logger.warn(
        `[CAISSE] écart de fermeture ${ecart > 0 ? '+' : ''}${ecart} F ` +
        `(compté ${comptage}, théorique ${theorique}) — marchande ${user.id}, ${today}`,
      );
    }
    return { session: this.premiereLigne(maj) ?? existante, caisse_theorique: theorique, ecart };
  }

  // Idempotence : si la clé a déjà été traitée (rejeu offline), renvoyer la
  // transaction existante SANS en créer une nouvelle. Garde-fou anti double-comptage.
  private async transactionExistante(idemKey: string | null, userId: string) {
    if (!idemKey) return null;
    return this.repo.findOne({ where: { idempotency_key: idemKey, user_id: userId } as any });
  }
  // Course : deux requêtes concurrentes avec la même clé -> la 2e viole l'unicité,
  // on renvoie alors la transaction déjà enregistrée au lieu de propager l'erreur.
  private estViolationUnicite(e: any): boolean {
    return e?.code === '23505' || /duplicate key|unique/i.test(e?.message || '');
  }

  // Journée toujours ouverte : si aucune journée n'est ouverte aujourd'hui, on
  // l'ouvre automatiquement (choix produit : la vendeuse n'est jamais bloquée,
  // l'argent reste toujours rattaché à une journée). Idempotent via l'index
  // unique (marchand_id, date).
  /**
   * CAI-02 — CETTE FONCTION RESSUSCITAIT UNE JOURNÉE FERMÉE, EN SILENCE.
   *
   * Elle faisait `ON CONFLICT … DO UPDATE SET ouvert = true`, et elle est
   * appelée à CHAQUE vente et CHAQUE dépense. La marchande fermait sa journée,
   * comptait son argent devant elle, et la clôture gravait trois nombres :
   * `caisse_theorique`, `fond_final` (ce qu'elle a compté en main) et leur
   * `ecart`. La vente suivante remettait `ouvert = true` — sans toucher ces
   * trois nombres. Ils restaient figés sur leurs anciennes valeurs pendant que
   * l'argent continuait d'entrer. `ecart = 0` voulait dire « tout est juste »
   * avant, et ne voulait plus rien dire après.
   *
   * La recette terrain l'avait vu deux fois (MAR-CAI-002, MAR-CAI-003), les
   * deux marqués BLOQUANTS.
   *
   * L'INTENTION D'ORIGINE EST BONNE, ET ELLE EST CONSERVÉE : « on ne bloque
   * jamais la vendeuse ». Une marchande qui n'a jamais ouvert sa journée doit
   * pouvoir vendre — c'est ce que l'INSERT fait, et il reste. Ce qui disparaît,
   * c'est le `DO UPDATE` : créer une journée absente n'est pas la même chose
   * que défaire une clôture que quelqu'un a décidée.
   *
   * Rouvrir reste possible, par `POST /session/ouvrir`, et c'est un geste
   * EXPLICITE — parce qu'il invalide un comptage.
   */
  /**
   * CAI-02 — UNE JOURNÉE FERMÉE N'ACCEPTE PLUS D'ÉCRITURE D'ARGENT.
   *
   * QUELLES ROUTES, ET POURQUOI CELLES-LÀ. La frontière n'est pas arbitraire :
   * ce sont exactement les natures que `caisseTheorique` additionne — `vente`,
   * `depense`, `acompte_credit`, `reglement_credit` — plus l'annulation, qui
   * retire une ligne du compte (`statut <> 'annulee'`). Une écriture de ces
   * natures après la clôture rend les trois nombres du soir faux, en silence.
   *
   * Le fichier enseigne déjà la moitié de cette leçon, plus haut :
   * « une écriture d'argent n'est pas finie quand elle est écrite, mais quand
   * la CLÔTURE la comprend ». Voici l'autre moitié — une clôture n'est pas
   * finie tant qu'une écriture peut la contredire.
   *
   * ON NE BLOQUE PAS LA VENDEUSE, ON LUI DIT QUOI FAIRE. Le message nomme le
   * geste : rouvrir la journée. C'est un clic, et c'est explicite — parce que
   * rouvrir invalide un comptage qu'elle a fait devant son argent.
   */
  private async exigerJourneeOuverte(marchandId: string) {
    const today = new Date().toISOString().split('T')[0];
    const [session] = await this.dataSource.query(
      'SELECT ouvert FROM caisse_sessions WHERE marchand_id = $1 AND date = $2 LIMIT 1',
      [marchandId, today],
    );
    // Pas de journée du tout : `ensureSessionOuverte` la crée. Une marchande
    // qui n'a jamais ouvert sa caisse n'est pas une marchande qui l'a fermée.
    if (!session) return;
    if (session.ouvert === false) {
      throw new ConflictException(
        'Ta journée de caisse est fermée. Rouvre-la pour continuer.',
      );
    }
  }

  private async ensureSessionOuverte(marchandId: string) {
    const today = new Date().toISOString().split('T')[0];
    await this.dataSource.query(
      `INSERT INTO caisse_sessions (marchand_id, date, fond_initial, ouvert, heure_ouverture)
       VALUES ($1, $2, 0, true, NOW())
       ON CONFLICT (marchand_id, date) DO NOTHING`,
      [marchandId, today],
    ).catch((e: any) => this.logger?.warn(`[CAISSE] ensureSession: ${e.message}`));
  }

  @Post('vente')
  async enregistrerVente(@Body() body: any, @CurrentUser() user: User) {
    // Idempotence (rejeu offline) : ne jamais compter deux fois la même vente.
    const idemKey = body.idempotency_key || null;
    const deja = await this.transactionExistante(idemKey, user.id);
    if (deja) return { transaction: deja };

    // Validation stricte — rejeter si montant manquant ou invalide
    const montantParsed = parseFloat(body.montant);
    if (!body.montant || isNaN(montantParsed) || montantParsed <= 0) {
      throw new BadRequestException('montant invalide ou manquant');
    }
    // Extraire nom produit depuis le tableau produits si présent
    const lignes = Array.isArray(body.produits) ? body.produits
      : (body.produits && typeof body.produits === 'object' ? [body.produits] : []);
    const nomProduit = body.produit || body.description ||
      (lignes.length > 0
        ? lignes.map((p: any) => p.nom || p.name || '').filter(Boolean).join(', ')
        : '');
    const qteTotale = body.quantite || lignes.reduce((s: number, p: any) => s + (Number(p.quantite) || 1), 0) || 1;

    // Validation montant
    const prixVente = parseFloat(body.montant) || 0;
    if (prixVente <= 0) throw new BadRequestException('Le montant doit être positif');
    // LA MARGE SE CALCULE LIGNE PAR LIGNE — ARGENT-1, 19/09/2026.
    //
    // Ce bloc agrégeait le coût sur TOUTES les lignes (une ligne sans coût y
    // contribuant 0) puis soustrayait du montant de TOUTE la vente. Sur un
    // panier Riz (acheté 400, vendu 500) + Piment (vendu 300, coût inconnu) :
    // 800 − 400 = 400. Le prix de vente ENTIER du Piment devenait du bénéfice,
    // comme s'il avait été offert. La bonne réponse est 100.
    //
    // La règle vit désormais dans `marge-vente.ts`, et elle est tenue par un
    // test qui traverse jusqu'à la ligne persistée.
    const resume = resumeMargeDesLignes(lignes);
    // `prix_achat` reste le coût des lignes COÛTÉES : c'est une information
    // vraie et utile. Mais `prix_vente − prix_achat` n'est PLUS la marge dès
    // qu'une ligne manque de coût — et c'est justement le point.
    let prixAchat = resume.lignesCoutees > 0
      ? coutDesLignesCoutees(lignes)
      : (parseFloat(body.prix_achat) || 0);
    // UNE PERTE EST UNE PERTE — arbitrage de Patrick, 19/09/2026.
    //
    // `Math.max(0, …)` rendait une vente à perte IMPOSSIBLE à voir : produit
    // acheté 1 000 F, vendu 800 F, résultat stocké 0 au lieu de −200. Ses
    // bénéfices cumulés étaient surévalués d'autant, et rien ne le signalait.
    // Sa doctrine : ne jamais masquer une réalité économique. Une marchande
    // qui vend à perte doit le savoir le jour même, pas à l'inventaire.
    //
    // Le plancher à 0 reste pour un COÛT INCONNU : là, ce n'est pas une perte,
    // c'est une absence d'information — et inventer une perte serait aussi
    // faux qu'inventer un gain.
    // Des lignes détaillées ⇒ la règle par ligne. Aucune ligne (vente libre
    // ancienne, coût global envoyé par le téléphone) ⇒ l'ancien calcul global,
    // qui reste juste quand il n'y a qu'un seul article.
    const marge = resume.lignesCoutees > 0
      ? resume.montant
      : (prixAchat > 0 ? prixVente - prixAchat : 0);

    // Journée toujours ouverte (vente jamais bloquée, argent rattaché au jour).
    await this.exigerJourneeOuverte(user.id);
    await this.ensureSessionOuverte(user.id);

    // Lignes vendues (produits appariés). Vente libre/voix : aucune ligne stock.
    // L'IDENTIFIANT DU PRODUIT EST RETENU — correctif du 18/09/2026. Le panier
    // l'envoyait déjà (POSCaisse construit `productId` pour chaque ligne) et il
    // était jeté ici : le stock se décrémentait ensuite par NOM. Deux articles
    // nommés « Tomate » — l'un au kilo, l'autre au tas, cas documenté du
    // catalogue adopté — et c'est l'inventaire du MAUVAIS article qui bougeait.
    const lignesVendues = lignes.length > 0
      ? lignes.map((p: any) => ({
          nom: p.nom || p.name || '',
          qte: Number(p.quantite) || 1,
          id: p.productId || p.produit_id || p.id || null,
        }))
      : (nomProduit ? [{ nom: nomProduit, qte: Number(qteTotale) || 1, id: null }] : []);

    // TRANSACTION UNIQUE (I1) : la vente ET tous ses effets d'inventaire sont
    // atomiques — tout-ou-rien. Toutes les lectures/écritures de l'invariant
    // passent par le MANAGER transactionnel (aucun repository extérieur au
    // milieu du flux). Verrou de ligne (FOR UPDATE) puis, pour chaque produit,
    // trace d'un mouvement de stock (I3 : jamais de clamp silencieux — le
    // manquant est explicitement journalisé dans le ledger, dans la MÊME
    // transaction). Toute erreur d'inventaire annule la vente (rien n'est avalé).
    // Évaluée UNE fois (elle l'était deux fois de suite — fonction pure, sans
    // conséquence, mais on lit mieux une intention qu'un appel répété).
    const dateVente = dateOperationValide(body.date_operation);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    let result: CaisseTransaction;
    try {
      const txRepo = qr.manager.getRepository(CaisseTransaction);
      const created = txRepo.create({
        user_id: user.id, marchand_id: user.id,
        session_id: body.session_id || '', montant: body.montant,
        type: 'vente', produit: nomProduit, source: body.source || 'kassa', details: body.details || null,
        quantite: qteTotale, mode_paiement: body.mode_paiement || 'especes',
        description: nomProduit,
        prix_vente: prixVente, prix_achat: prixAchat, marge, benefice: marge,
        category: body.category || '', idempotency_key: idemKey,
        // Vente rejouée depuis la file hors-ligne : elle appartient au jour où
        // elle a EU LIEU, pas au jour où le réseau est revenu. Bornée côté
        // serveur (voir date-operation.ts) — on ne laisse pas un client
        // réécrire le passé. Absente ou hors bornes : `created_at` par défaut.
        ...(dateVente ? { created_at: dateVente } : {}),
      } as any) as unknown as CaisseTransaction;
      result = await txRepo.save(created);

      for (const l of lignesVendues) {
        if (!l.nom || !(l.qte > 0)) continue;
        // On vise l'identifiant QUAND ON L'A : c'est la seule désignation qui
        // ne confond pas deux produits homonymes. Le nom reste le repli, pour
        // les ventes vocales/libres qui n'ont jamais d'identifiant.
        // `marchand_id` est conservé dans les deux cas : on ne touche jamais au
        // stock d'une autre marchande, même avec un identifiant fourni.
        const rows = l.id
          ? await qr.manager.query(
              `SELECT id, COALESCE(stock, 0) AS stock, unite FROM produits
               WHERE marchand_id = $1::text AND id = $2 AND actif = true
               LIMIT 1 FOR UPDATE`,
              [user.id, l.id],
            )
          : await qr.manager.query(
              `SELECT id, COALESCE(stock, 0) AS stock, unite FROM produits
               WHERE marchand_id = $1::text AND lower(nom) = lower($2) AND actif = true
               LIMIT 1 FOR UPDATE`,
              [user.id, l.nom],
            );
        if (!rows[0]) continue; // produit inconnu (vente libre/voix) : aucun effet stock
        const stockAvant = Number(rows[0].stock) || 0;
        const demandee = l.qte;
        const retranchee = Math.min(demandee, Math.max(0, stockAvant));
        const manquant = demandee - retranchee;
        await qr.manager.query(
          `UPDATE produits SET stock = $1, updated_at = NOW() WHERE id = $2`,
          [stockAvant - retranchee, rows[0].id],
        );
        await qr.manager.query(
          // `unite` est FIGÉE ICI, au moment où le mouvement a lieu. Elle
          // était relue du catalogue à l'affichage : changer l'unité d'un
          // produit réécrivait alors tout son historique.
          `INSERT INTO stock_mouvements
             (marchand_id, transaction_id, produit_id, produit_nom, stock_avant, quantite_demandee, quantite_retranchee, manquant, unite)
           VALUES ($1::text, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [user.id, result.id, rows[0].id, l.nom, stockAvant, demandee, retranchee, manquant, rows[0].unite ?? null],
        );
      }

      await qr.commitTransaction();
    } catch (e: any) {
      await qr.rollbackTransaction();
      // Rejeu concurrent (même clé) : la 2e insertion viole l'unicité → renvoyer
      // la vente déjà enregistrée au lieu de propager l'erreur (I2).
      if (this.estViolationUnicite(e)) {
        const existante = await this.transactionExistante(idemKey, user.id);
        if (existante) return { transaction: existante };
      }
      throw e;
    } finally {
      await qr.release();
    }

    // Effets de bord post-commit (hors transaction).
    this.eventsGateway?.emitTransactionCreated({ ...result, type: 'vente', userId: user.id });
    this.alertesService?.checkStockApreVente(user.id, nomProduit).catch((e: any) => this.logger?.warn(`[CAISSE] checkStock: ${e.message}`));
    return { transaction: result };
  }

  @Post('depense')
  async enregistrerDepense(@Body() body: any, @CurrentUser() user: User) {
    // Idempotence (rejeu offline) : ne jamais compter deux fois la même dépense.
    const idemKey = body.idempotency_key || null;
    const deja = await this.transactionExistante(idemKey, user.id);
    if (deja) return { transaction: deja };

    if (!body.montant || parseFloat(body.montant) <= 0) throw new BadRequestException('Le montant doit être positif');
    // Journée toujours ouverte (dépense rattachée au jour, comme la vente).
    await this.exigerJourneeOuverte(user.id);
    await this.ensureSessionOuverte(user.id);
    // LA DÉPENSE APPARTIENT AU JOUR OÙ ELLE A ÉTÉ FAITE — ARGENT-1, 19/09/2026.
    //
    // Le commentaire trois lignes plus haut l'affirmait déjà (« dépense
    // rattachée au jour, comme la vente ») mais ce bloc ne lisait jamais
    // `date_operation`. `caisseTheorique` = fond + ventes − dépenses, filtré
    // sur `created_at::date` : une dépense de 2 000 F faite à 23h55 sans réseau
    // et remontée à 00h05 laissait la caisse d'hier trop HAUTE de 2 000 F, et
    // celle d'aujourd'hui trop BASSE d'autant. C'est le chiffre qu'on confronte
    // à ce que la marchande a réellement en main le soir : le correctif du jour
    // comptable avait été fait pour le protéger, et il le laissait faux par
    // l'autre côté du livre.
    //
    // Mêmes bornes que la vente (`date-operation.ts`) : 10 minutes dans le
    // futur, 14 jours dans le passé. Hors bornes, la dépense est enregistrée
    // sur aujourd'hui — on n'écrit jamais dans un mois clos sur la foi de
    // l'horloge d'un téléphone.
    const dateDepense = dateOperationValide(body.date_operation);

    let result;
    try {
      result = await this.repo.save(this.repo.create({
        user_id: user.id, marchand_id: user.id,
        session_id: body.session_id || '', montant: body.montant,
        // DEP-01 : le motif saisi par la marchande DOIT arriver ici. Le
        // téléphone envoie `description` ; les files hors ligne déjà posées
        // envoient `notes` (transition — voir `libelleDepense` en tête de
        // fichier). Avant ce correctif, seul `description` était lu : tout
        // motif partait dans le vide, sans la moindre erreur.
        type: 'depense', description: libelleDepense(body.description, body.notes), source: body.source || 'kassa',
        // DEP-02 : la catégorie TOUCHÉE par la marchande. `null` quand le
        // téléphone n'en envoie pas (file hors ligne d'avant ce correctif) ou
        // quand l'identifiant n'est pas des onze — et `null` est une réponse,
        // que l'écran affiche « Catégorie pas notée ». Aucun repli sur
        // « autre » : « autre » est un choix qu'elle peut faire, lui donner
        // aussi le sens de « on ne sait pas » serait donner deux sens à la
        // même donnée.
        category: categorieDepense(body.categorie ?? body.category),
        mode_paiement: body.mode_paiement || 'especes', idempotency_key: idemKey,
        ...(dateDepense ? { created_at: dateDepense } : {}),
      } as any));
    } catch (e: any) {
      if (this.estViolationUnicite(e)) {
        const existante = await this.transactionExistante(idemKey, user.id);
        if (existante) return { transaction: existante };
      }
      throw e;
    }
    this.eventsGateway?.emitTransactionCreated({ ...result, type: 'depense', userId: user.id });
    return { transaction: result };
  }

  // ── PRODUITS ──────────────────────────────────────────────────────────────

  @Get('produits')
  async getProduits(@CurrentUser() user: User) {
    const produits = await this.dataSource.query(
      'SELECT * FROM produits WHERE marchand_id = $1::text AND actif = true ORDER BY nom ASC',
      [user.id]
    );
    return { produits };
  }

  @Post('produits')
  async createProduit(@Body() body: any, @CurrentUser() user: User) {
    const result = await this.dataSource.query(
      'INSERT INTO produits (marchand_id, nom, prix, prix_achat, categorie, stock, unite, image, seuil_alerte, date_peremption, prix_promo, promo_fin) VALUES ($1::text, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [user.id, body.nom, body.prix || 0, Number(body.prix_achat) || 0, body.categorie || 'Général', body.stock || 0, body.unite || 'unité', body.image || null,
       body.seuil_alerte != null ? Number(body.seuil_alerte) : 10, body.date_peremption || null,
       body.prix_promo != null && body.prix_promo !== '' ? Number(body.prix_promo) : null, body.promo_fin || null]
    );
    return { produit: result[0] };
  }

  @Put('produits/:id')
  async updateProduit(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    const result = await this.dataSource.query(
      `UPDATE produits SET nom=$1, prix=$2, prix_achat=$3, categorie=$4, stock=$5, unite=$6,
       seuil_alerte=COALESCE($7, seuil_alerte), date_peremption=COALESCE($8, date_peremption),
       prix_promo=$9, promo_fin=$10, updated_at=NOW()
       WHERE id=$11 AND marchand_id=$12::text RETURNING *`,
      [body.nom, body.prix, Number(body.prix_achat) || 0, body.categorie, body.stock, body.unite,
       body.seuil_alerte != null ? Number(body.seuil_alerte) : null, body.date_peremption || null,
       body.prix_promo != null && body.prix_promo !== '' ? Number(body.prix_promo) : null, body.promo_fin || null,
       id, user.id]
    );
    return { produit: result[0] };
  }

  @Delete('produits/:id')
  async deleteProduit(@Param('id') id: string, @CurrentUser() user: User) {
    await this.dataSource.query(
      'UPDATE produits SET actif = false WHERE id = $1 AND marchand_id = $2::text',
      [id, user.id]
    );
    return { success: true };
  }
}



// ═══════════════════════════════════════════════════════════════════
// CATALOGUE PRODUITS GLOBAL — accessible sans filtre marchand
// ═══════════════════════════════════════════════════════════════════

const CATALOGUE = [
  { nom: 'Riz',           categorie: 'cereales',    unite: 'kg',     prixAchat: 400,  prixVente: 500,  mots_cles: ['riz', 'rice'] },
  { nom: 'Tomate',        categorie: 'legumes',     unite: 'kg',     prixAchat: 300,  prixVente: 400,  mots_cles: ['tomate', 'tomato'] },
  { nom: 'Aubergine',     categorie: 'legumes',     unite: 'kg',     prixAchat: 700,  prixVente: 800,  mots_cles: ['aubergine', 'eggplant'] },
  { nom: 'Piment',        categorie: 'legumes',     unite: 'tas',    prixAchat: 100,  prixVente: 150,  mots_cles: ['piment', 'pepper'] },
  { nom: 'Gombo',         categorie: 'legumes',     unite: 'tas',    prixAchat: 120,  prixVente: 150,  mots_cles: ['gombo', 'okra'] },
  { nom: 'Manioc',        categorie: 'tubercules',  unite: 'kg',     prixAchat: 150,  prixVente: 200,  mots_cles: ['manioc', 'cassava'] },
  { nom: 'Igname',        categorie: 'tubercules',  unite: 'kg',     prixAchat: 350,  prixVente: 400,  mots_cles: ['igname', 'yam'] },
  { nom: 'Maïs',          categorie: 'cereales',    unite: 'kg',     prixAchat: 200,  prixVente: 250,  mots_cles: ['mais', 'maïs', 'corn'] },
  { nom: 'Banane',        categorie: 'fruits',      unite: 'régime', prixAchat: 500,  prixVente: 700,  mots_cles: ['banane', 'banana'] },
  { nom: 'Plantain',      categorie: 'fruits',      unite: 'régime', prixAchat: 600,  prixVente: 800,  mots_cles: ['plantain', 'alloco'] },
  { nom: 'Oignon',        categorie: 'legumes',     unite: 'kg',     prixAchat: 300,  prixVente: 400,  mots_cles: ['oignon', 'onion'] },
  { nom: 'Avocat',        categorie: 'fruits',      unite: 'pièce',  prixAchat: 100,  prixVente: 150,  mots_cles: ['avocat', 'avocado'] },
  { nom: 'Huile de palme',categorie: 'condiments',  unite: 'L',      prixAchat: 1400, prixVente: 1500, mots_cles: ['huile', 'palm oil'] },
  { nom: 'Mangue',        categorie: 'fruits',      unite: 'kg',     prixAchat: 200,  prixVente: 300,  mots_cles: ['mangue', 'mango'] },
  { nom: 'Ananas',        categorie: 'fruits',      unite: 'pièce',  prixAchat: 300,  prixVente: 400,  mots_cles: ['ananas', 'pineapple'] },
  { nom: 'Arachide',      categorie: 'cereales',    unite: 'kg',     prixAchat: 600,  prixVente: 700,  mots_cles: ['arachide', 'peanut'] },
  { nom: 'Cacao',         categorie: 'agriculture', unite: 'kg',     prixAchat: 1100, prixVente: 1200, mots_cles: ['cacao', 'cocoa'] },
  { nom: 'Café robusta',  categorie: 'agriculture', unite: 'kg',     prixAchat: 800,  prixVente: 900,  mots_cles: ['cafe', 'café', 'robusta'] },
  { nom: 'Anacarde',      categorie: 'agriculture', unite: 'kg',     prixAchat: 600,  prixVente: 650,  mots_cles: ['anacarde', 'cajou', 'cashew'] },
  { nom: 'Attiéké',       categorie: 'transformation', unite: 'kg',  prixAchat: 400,  prixVente: 500,  mots_cles: ['attieke', 'attiéké'] },
  { nom: 'Gari',          categorie: 'transformation', unite: 'kg',  prixAchat: 350,  prixVente: 450,  mots_cles: ['gari'] },
];

@UseGuards(JwtAuthGuard)
@Controller('catalogue')
export class CatalogueController {

  @Get()
  findAll(
    @Query('categorie') categorie?: string,
    @Query('q') q?: string,
  ) {
    let result = CATALOGUE;
    if (categorie) result = result.filter(p => p.categorie === categorie);
    if (q) {
      const lq = q.toLowerCase();
      result = result.filter(p =>
        p.nom.toLowerCase().includes(lq) ||
        p.mots_cles.some(mc => mc.includes(lq))
      );
    }
    return { produits: result, total: result.length };
  }

  @Get('categories')
  getCategories() {
    const cats = [...new Set(CATALOGUE.map(p => p.categorie))].sort();
    return { categories: cats };
  }
}
