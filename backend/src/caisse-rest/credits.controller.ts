import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { encaisserCredit, EncaissementInvalide } from './encaisser-credit';
import { exigerJourneeOuverte } from './journee-ouverte';
import { CaisseTransaction } from './caisse-transaction.entity';

// ── C-04 / MARCHAND-01 — LE GEL DU CRÉDIT DEVIENT UNE PROTECTION SERVEUR ────
//
// Le gel du crédit n'était qu'une CONSTANTE UI (`POSCaisse.tsx`) : les routes
// restaient appelables en API directe, création de dette non idempotente en
// tête (audit MARCHAND-01 du 19/10/2026, constat C-04 de l'audit comptable du
// 12/10). Le serveur ferme désormais lui-même la porte.
//
// LA RÈGLE : dev/prod sont FAIL-CLOSED — le crédit n'existe que si
// `CAISSE_CREDIT_SERVEUR_ACTIF === 'true'` (voir backend/.env.example : ne
// l'ouvrir qu'après verdissement des invariants I4/I6). Le harnais
// d'invariants, lui (`NODE_ENV='test'`, forcé par test/invariants/env.ts, base
// jetable contrôlée par test-db.ts), reste EXERÇABLE par défaut : c'est lui
// qui prouve I4/I5/I6 contre un vrai postgres — l'ouvrir au test ne change
// rien pour l'argent réel ; le fermer explicitement y reste possible
// (`CAISSE_CREDIT_SERVEUR_ACTIF='false'`).
export const MESSAGE_CREDIT_DESACTIVE =
  'Crédit client désactivé côté serveur (pilote espèces)';

export function creditServeurActif(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'test') return env.CAISSE_CREDIT_SERVEUR_ACTIF !== 'false';
  return env.CAISSE_CREDIT_SERVEUR_ACTIF === 'true';
}

@UseGuards(JwtAuthGuard)
@Controller('caisse/credits')
export class CreditsController {
  constructor(@InjectDataSource() private ds: DataSource) {}

  // Course perdue : deux requêtes concurrentes écrivent la même clé → la 2ᵉ
  // viole l'unicité partielle de `caisse_transactions.idempotency_key`. Même
  // motif que la vente (`caisse-rest.controller.ts`).
  private estViolationUnicite(e: any): boolean {
    return e?.code === '23505' || /duplicate key|unique/i.test(e?.message || '');
  }

  // ── GET tous les crédits du marchand ──────────────────
  @Get()
  async findAll(@CurrentUser() user: User) {
    const rows = await this.ds.query(
      `SELECT * FROM credits_avec_statut
       WHERE marchand_id = $1
       ORDER BY echeance ASC`,
      [user.id]
    );
    const total_du = rows
      .filter((r: any) => r.statut !== 'paye')
      .reduce((s: number, r: any) => s + parseFloat(r.montant_restant || 0), 0);
    return { credits: rows, total_du };
  }

  // ── POST créer un crédit ───────────────────────────────
  @Post()
  async create(@Body() body: any, @CurrentUser() user: User) {
    // C-04 — le serveur ferme la porte tant que le pilote n'a pas rouvert le
    // crédit (voir `creditServeurActif` en tête de fichier).
    if (!creditServeurActif()) throw new ForbiddenException(MESSAGE_CREDIT_DESACTIVE);

    const {
      client_nom, client_phone = '', montant_total,
      acompte = 0, echeance, articles = [], notes = '', transaction_id = null
    } = body;

    if (!client_nom?.trim()) throw new BadRequestException('client_nom requis');
    if (!montant_total || isNaN(parseFloat(montant_total))) throw new BadRequestException('montant_total invalide');
    if (!echeance) throw new BadRequestException('echeance requise');

    const acompteParsed = parseFloat(String(acompte));
    const montantParsed = parseFloat(montant_total);
    if (acompteParsed > montantParsed) throw new BadRequestException('L\'acompte ne peut pas dépasser le montant total');

    // C-04 / I4 — IDEMPOTENCE DE LA CRÉATION, SANS MIGRATION.
    //
    // La table `credits` n'a AUCUNE colonne de clé d'idempotence (lecture de
    // BaselineSchema.ts / db-init.service.ts : id, marchand_id, client_nom,
    // montant_total, acompte, echeance, articles, notes, transaction_id… —
    // aucune contrainte unique d'idempotence, et poser une colonne exigerait
    // une migration dont le périmètre est confisqué). La clé vit donc sur la
    // TRACE DE DETTE en caisse (voir `tracerCreationCredit`) :
    // `caisse_transactions.idempotency_key` porte déjà un index unique partiel
    // (ux_caisse_tx_idempotency_key) qui devient la contrainte
    // anti-doublon de la création.
    //
    // MOTIF (copié de la vente) : pré-check + écriture + rattrapage 23505.
    // DEUX verrous en plus, parce que la création écrit PLUSIEURS tables
    // (clients, credits, trace) : un verrou pessimiste applicatif
    // (pg_advisory_xact_lock — posé dans la transaction, libéré à sa fin, ne
    // touche aucun schéma) sérialise deux créations concurrentes de MÊME clé
    // AVANT tout écrit ; le rattrapage 23505 reste en ceinture de sécurité.
    // La clé est PRÉFIXÉE (`credit-trace-…`) pour ne jamais croiser les
    // espaces des autres natures (`credit-acompte-…`, `credit-reglement-…`,
    // et la clé nue des ventes) sur l'index global.
    const cleTrace = body.idempotency_key
      ? `credit-trace-${String(body.idempotency_key)}`
      : null;

    // ARGENT-4 — CRÉATION ET PREMIER ENCAISSEMENT, D'UN SEUL TENANT.
    //
    // L'acompte versé à la création écrivait `credits.acompte` et baissait le
    // `montant_du` du client, mais ne produisait AUCUNE ligne de caisse :
    // l'argent réellement reçu en main propre n'existait nulle part dans le
    // journal. Le crédit est donc désormais créé SANS acompte, puis l'acompte
    // passe par la primitive — la seule qui écrive la caisse.
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // I4 — SELECT DE DÉDOUBLONNAGE, SOUS VERROU PESSIMISTE. Une création
      // rejouée (même clé) retourne le crédit DÉJÀ créé sans rien réécrire :
      // ni dette doublée sur le client, ni crédit en plus, ni acompte
      // re-encaissé. Le verrou sérialise la course ; la lecture rend la
      // réponse du rejeu bonne dès le premier tour.
      if (cleTrace) {
        await qr.query(
          'SELECT pg_advisory_xact_lock(hashtextextended($1, 42))',
          [cleTrace],
        );
        const [deja] = await qr.query(
          'SELECT details FROM caisse_transactions WHERE idempotency_key = $1 LIMIT 1',
          [cleTrace],
        );
        const idDeja = deja?.details?.creditId;
        if (idDeja) {
          const [existant] = await qr.query(
            'SELECT * FROM credits WHERE id = $1 AND marchand_id = $2',
            [idDeja, user.id],
          );
          if (existant) {
            // Rien n'a été écrit ici : on clôt une transaction vide.
            await qr.commitTransaction();
            return { credit: existant, rejeu: true };
          }
        }
      }

      // Le client naît avec la dette ENTIÈRE. C'est l'encaissement qui la
      // réduit ensuite, et lui seul : deux endroits qui décrémentent la même
      // dette, c'est deux chances de la décrémenter deux fois.
      await qr.query(
        `INSERT INTO clients (marchand_id, nom, phone, nb_credits, montant_du, derniere_visite)
         VALUES ($1, $2, $3, 1, $4, now())
         ON CONFLICT (marchand_id, nom)
         DO UPDATE SET
           nb_credits = clients.nb_credits + 1,
           montant_du = clients.montant_du + $4,
           phone = COALESCE(NULLIF($3,''), clients.phone),
           derniere_visite = now(),
           updated_at = now()`,
        [user.id, client_nom.trim(), client_phone, montantParsed],
      );

      const result = await qr.query(
        `INSERT INTO credits
           (marchand_id, client_nom, client_phone, montant_total, acompte, echeance, articles, notes, transaction_id)
         VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8)
         RETURNING *`,
        [
          user.id, client_nom.trim(), client_phone, montantParsed,
          echeance, JSON.stringify(articles), notes, transaction_id,
        ],
      );
      const credit = result[0];

      // I6 — LA TRACE DE DETTE. Une vente à crédit laisse une ligne en caisse,
      // écrite ICI, dans la même transaction : type `credit`, montant 0 —
      // noter une dette ne déplace aucun franc d'espèce, et la clôture ne la
      // compte pas (voir `caisseTheorique`). Elle porte la clé d'idempotence
      // de la création (celle du corps, sinon dérivée de l'id du crédit) :
      // c'est ELLE qui rend le rejeu détectable, y compris pour une création
      // sans acompte. Écrite via l'entité TypeORM sur le manager de la
      // transaction — ce contrôleur n'écrit jamais la caisse par SQL direct
      // (garde ARGENT-4, prouvée par argent-4-encaissement-unique.spec.ts).
      await this.tracerCreationCredit(qr, user.id, credit, client_nom.trim(), montantParsed, cleTrace);

      if (acompteParsed > 0) {
        // CAI-09 — UN ACOMPTE À LA CRÉATION EST UN ENCAISSEMENT COMME UN AUTRE.
        //
        // Il produit une ligne `acompte_credit`, donc une des natures que la
        // clôture additionne. La journée fermée le refuse, exactement comme
        // elle refuse une vente. Le crédit LUI-MÊME reste créable sans acompte :
        // une dette qui naît ne déplace pas d'argent, et interdire de la noter
        // ferait perdre l'information plutôt que la protéger.
        await exigerJourneeOuverte(qr, user.id);

        // Clé dérivée du crédit : un rejeu hors connexion de la MÊME création
        // ne peut pas encaisser l'acompte initial une seconde fois.
        await encaisserCredit(qr, {
          creditId: credit.id,
          marchandId: user.id,
          montant: acompteParsed,
          idempotencyKey: body.idempotency_key
            ? `credit-creation-${body.idempotency_key}`
            : `credit-creation-${credit.id}`,
        });
      }

      await qr.commitTransaction();
      // On relit : `acompte` et `statut` ont pu bouger dans la transaction.
      const [frais] = await this.ds.query(
        `SELECT * FROM credits WHERE id = $1`, [credit.id],
      );
      return { credit: frais ?? credit };
    } catch (e: any) {
      await qr.rollbackTransaction();
      if (e instanceof EncaissementInvalide) throw new BadRequestException(e.message);
      // I4 — course de rejeu : la 2ᵉ création a perdu la course sur l'index
      // unique de la trace → renvoyer le crédit déjà enregistré (motif de la
      // vente, 23505-safe).
      if (this.estViolationUnicite(e) && cleTrace) {
        const [trace] = await this.ds.query(
          'SELECT details FROM caisse_transactions WHERE idempotency_key = $1 LIMIT 1',
          [cleTrace],
        );
        const idExistant = trace?.details?.creditId;
        if (idExistant) {
          const [existant] = await this.ds.query(
            'SELECT * FROM credits WHERE id = $1 AND marchand_id = $2',
            [idExistant, user.id],
          );
          if (existant) return { credit: existant, rejeu: true };
        }
      }
      throw e;
    } finally {
      await qr.release();
    }
  }

  /**
   * I6 — la trace de dette en caisse (voir l'appelant).
   * @param cleTrace  La clé de l'appelant (`credit-trace-…`), sinon dérivée de
   *                  l'id du crédit — les créations sans clé restent tracées,
   *                  mais un rejeu SANS clé ne peut pas être dédoublonné
   *                  (aucune information stable pour reconnaître le rejeu) :
   *                  c'est le contrat du client d'envoyer sa clé, comme pour
   *                  la vente.
   */
  private async tracerCreationCredit(
    qr: QueryRunner,
    marchandId: string,
    credit: any,
    clientNom: string,
    montantTotal: number,
    cleTrace: string | null,
  ): Promise<void> {
    const repo = qr.manager.getRepository(CaisseTransaction);
    await repo.save(repo.create({
      user_id: marchandId,
      marchand_id: marchandId,
      session_id: '',
      type: 'credit',
      montant: 0,
      description: `Crédit — ${clientNom}`,
      source: 'kassa',
      mode_paiement: 'especes',
      details: {
        creditId: credit.id,
        clientNom,
        montantTotal,
        echeance: credit?.echeance ?? null,
      },
      idempotency_key: cleTrace ?? `credit-trace-${credit.id}`,
    } as any));
  }

  // ── PATCH marquer payé ────────────────────────────────
  //
  // ARGENT-4 / ARG-10 — CE CHEMIN N'ÉCRIVAIT RIEN EN CAISSE.
  //
  // Il posait `statut='paye'`, baissait le `montant_du` du client… et laissait
  // `credits.acompte` à son ancienne valeur. La table disait donc « elle a
  // versé X » pendant que la vue disait « il ne reste rien » : deux vérités
  // pour la même dette. Et le règlement final — souvent le plus gros montant
  // du crédit — n'apparaissait dans aucune caisse.
  //
  // C'est un encaissement comme les autres : il passe par la primitive, qui en
  // déduira d'elle-même la nature `reglement_credit` puisque le reste tombe à
  // zéro. Rien ici ne nomme cette nature.
  @Patch(':id/payer')
  async marquerPaye(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    // C-04 — même porte fermée que la création (voir `creditServeurActif`).
    if (!creditServeurActif()) throw new ForbiddenException(MESSAGE_CREDIT_DESACTIVE);

    const [credit] = await this.ds.query(
      `SELECT id, montant_total, COALESCE(acompte,0) AS acompte, statut
         FROM credits WHERE id=$1 AND marchand_id=$2`,
      [id, user.id],
    );
    if (!credit) throw new NotFoundException('Crédit introuvable');

    const reste = Math.round(Number(credit.montant_total) - Number(credit.acompte));
    if (reste <= 0) {
      // Déjà soldé : on ne refuse pas, on ne réencaisse pas. Répondre une
      // erreur ferait réessayer pour rien quelqu'un qui a déjà tout payé.
      return { success: true, deja_solde: true };
    }

    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // CAI-09 — la lecture de la journée vit DANS la transaction qui écrit :
      // hors d'elle, il reste une fenêtre où la clôture tombe entre le contrôle
      // et l'INSERT, et l'argent passe quand même.
      await exigerJourneeOuverte(qr, user.id);

      const r = await encaisserCredit(qr, {
        creditId: id,
        marchandId: user.id,
        montant: reste,
        idempotencyKey: body?.idempotency_key
          ? `credit-reglement-${body.idempotency_key}`
          : `credit-reglement-${id}`,
      });
      await qr.commitTransaction();
      return { success: true, nature: r.nature, reste_apres: r.resteApres, rejeu: r.rejeu };
    } catch (e) {
      await qr.rollbackTransaction();
      if (e instanceof EncaissementInvalide) throw new BadRequestException(e.message);
      throw e;
    } finally {
      await qr.release();
    }
  }

  // ── PATCH paiement partiel ────────────────────────────
  //
  // ARGENT-4 — C'ÉTAIT LE SEUL CHEMIN QUI ÉCRIVAIT LA CAISSE, ET IL LE FAISAIT
  // MAL : l'INSERT vivait dans un `try/catch` qui avalait l'erreur, hors
  // transaction. L'acompte pouvait donc être enregistré sans sa contrepartie
  // en caisse, silencieusement. Le commentaire d'alors l'assumait — « on ne
  // refuse pas un paiement déjà reçu en main propre » — mais le remède était
  // pire : l'argent restait reçu ET invisible. La bonne réponse est que les
  // deux écritures tiennent ou tombent ensemble.
  //
  // Le calcul de la nature a disparu d'ici avec le reste : un paiement partiel
  // qui termine exactement la dette devient `reglement_credit`, et c'est la
  // primitive qui le décide.
  @Patch(':id/acompte')
  async ajouterAcompte(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    // C-04 — même porte fermée que la création (voir `creditServeurActif`).
    if (!creditServeurActif()) throw new ForbiddenException(MESSAGE_CREDIT_DESACTIVE);

    const montant = parseFloat(body?.montant);
    if (isNaN(montant) || montant <= 0) throw new BadRequestException('montant invalide');
    if (!body?.idempotency_key) {
      throw new BadRequestException(
        'idempotency_key requise : sans elle, un même paiement peut être encaissé deux fois',
      );
    }

    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // CAI-09 — même règle, même place : dans la transaction.
      await exigerJourneeOuverte(qr, user.id);

      const r = await encaisserCredit(qr, {
        creditId: id,
        marchandId: user.id,
        montant,
        // ARGENT-4b — LE SERVEUR NE DEVINE PLUS LA CLÉ.
        //
        // Il fabriquait `credit-acompte-<id>-<montant>-<Date.now()>` quand le
        // client n'en envoyait pas. C'était pire qu'un refus : deux envois de
        // la MÊME tentative recevaient deux clés différentes et encaissaient
        // deux fois — tout en donnant l'apparence d'un système idempotent.
        // L'invariant I5 ne le voyait pas : il fournissait la clé lui-même.
        //
        // Une clé absente est désormais un refus (voir la validation plus
        // haut). Le crédit est gelé pour le pilote, et il ne reviendra qu'avec
        // un client qui envoie sa clé : c'est le moment de l'exiger plutôt que
        // de compenser.
        idempotencyKey: `credit-acompte-${body.idempotency_key}`,
      });
      await qr.commitTransaction();
      return { success: true, solde: r.soldé, nature: r.nature, reste_apres: r.resteApres, rejeu: r.rejeu };
    } catch (e) {
      await qr.rollbackTransaction();
      if (e instanceof EncaissementInvalide) {
        if (/introuvable/i.test(e.message)) throw new NotFoundException(e.message);
        throw new BadRequestException(e.message);
      }
      throw e;
    } finally {
      await qr.release();
    }
  }

  // ── GET clients récents ────────────────────────────────
  @Get('clients')
  async getClients(@CurrentUser() user: User) {
    const rows = await this.ds.query(
      `SELECT * FROM clients
       WHERE marchand_id = $1
       ORDER BY derniere_visite DESC
       LIMIT 10`,
      [user.id]
    );
    return { clients: rows };
  }

  // ── GET crédits d'un client spécifique ────────────────
  @Get('clients/:nom')
  async getClientCredits(@Param('nom') nom: string, @CurrentUser() user: User) {
    const client = await this.ds.query(
      `SELECT * FROM clients WHERE marchand_id=$1 AND nom ILIKE $2`,
      [user.id, `%${nom}%`]
    );
    const credits = await this.ds.query(
      `SELECT * FROM credits WHERE marchand_id=$1 AND client_nom ILIKE $2
       ORDER BY created_at DESC`,
      [user.id, `%${nom}%`]
    );
    return { client: client[0] || null, credits };
  }
}
