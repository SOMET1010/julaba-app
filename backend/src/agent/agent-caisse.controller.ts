/**
 * CE QUE L'AGENT ÉCRIT POUR UNE MARCHANDE — AGENT-A4, 05/10/2026.
 *
 * ── IL N'Y A QU'UN SEUL CHEMIN DE VENTE, ET CE FICHIER NE LE DOUBLE PAS ──
 *
 * La tentation, ici, était de réimplémenter la vente pour un agent. Elle
 * aurait été fatale : `POST /caisse/vente` porte l'idempotence, le mouvement
 * de stock dans la même transaction, la marge ligne par ligne, les bornes de
 * date, la journée ouverte. Un second chemin aurait divergé — et le dépôt a
 * déjà fermé une autre route de vente avec ce message : « une vente
 * s'enregistre par POST /caisse/vente — seule route qui garantit
 * l'idempotence et le mouvement de stock ».
 *
 * Ce contrôleur APPELLE donc le contrôleur de la caisse. Tout ce qui a été
 * prouvé là-bas traverse ici sans qu'une ligne soit recopiée.
 *
 * ── CE QUE LE SERVEUR IMPOSE, ET QUE L'AGENT NE PEUT PAS CHOISIR ─────────
 *
 * 1. `source = 'whatsapp'`. Écrasé APRÈS lecture du corps, jamais lu depuis
 *    lui. Un agent ne peut donc pas faire passer son écriture pour une saisie
 *    de marchande — exigence de Patrick, 05/10.
 * 2. LA MARCHANDE est celle que la garde a validée (`req.marchandDelegue`),
 *    jamais celle que le corps désignerait. Sans cela, une requête viserait
 *    une marchande dans son en-tête et en écrirait une autre dans son corps.
 * 3. LE PLAFOND. Non renseigné = refus. `null` veut dire « pas encore
 *    décidé », jamais « illimité ».
 *
 * CE CONTRÔLEUR N'OFFRE AUCUNE ROUTE DE LECTURE DE COMPTE, ni de changement
 * de numéro, de PIN ou de mot de passe. Ce n'est pas un oubli : c'est
 * l'invariant du lot, et `portee-agent.ts` le nomme.
 */
import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Req, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { CaisseRestController } from '../caisse-rest/caisse-rest.controller';
import { AgentService } from './agent.service';
import { AgentGuard, PorteeRequise } from './agent.guard';
import { montantAutorise } from './delegation-agent';
import type { PrincipalAgent } from './jwt-agent.strategy';
import type { User } from '../users/entities/user.entity';

/** La marchande, vue du contrôleur de caisse. On ne fabrique PAS un faux
 *  utilisateur complet : la caisse n'utilise que `id`, et lui en donner plus
 *  serait prêter à l'agent une identité qu'il n'a pas. */
function marchandeCible(marchandId: string): User {
  return { id: marchandId } as User;
}

@UseGuards(AuthGuard('jwt-agent'), AgentGuard)
@Controller('agent/caisse')
export class AgentCaisseController {
  constructor(
    private readonly caisse: CaisseRestController,
    private readonly agents: AgentService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * CE QUE L'AGENT A LE DROIT DE DIRE SUR LA CAISSE DU JOUR — étape (b).
   *
   * LA LEÇON LA PLUS CHÈRE DE CE PROJET EST ICI. Le 03/10, la voix de
   * l'accueil a annoncé « Ta caisse aujourd'hui : zéro franc » à une
   * marchande qui avait 100 F : la journée de caisse n'était pas encore lue,
   * le fond initial manquait, et le calcul rendait un zéro parfaitement
   * formé. L'écran s'est corrigé tout seul au rendu suivant. La phrase dite,
   * non — et un agent vocal ne se reprend pas davantage.
   *
   * `montant` EST DONC ABSENT quand il n'est pas affirmable. Pas `null`, pas
   * `0` : absent. C'est le même dessin que `etatCaisseAccueil.ts` côté
   * application — « la forme de la réponse est la garantie » : l'agent ne
   * peut pas prononcer un chiffre qu'il n'a pas reçu.
   *
   * `journeeOuverte: false` NE VEUT PAS DIRE « zéro ». Il veut dire « elle
   * n'a pas ouvert sa journée » — et dans ce cas le fond initial est
   * réellement absent, pas inconnu : la caisse vaut ce que valent les ventes.
   * C'est une réponse, et elle se dit.
   */
  @Get('aujourdhui')
  @PorteeRequise('lecture')
  async aujourdhui(@Req() req: any) {
    const marchandId: string = req.marchandDelegue;
    const [session] = await this.dataSource.query(
      `SELECT fond_initial FROM caisse_sessions
        WHERE marchand_id = $1 AND date = CURRENT_DATE LIMIT 1`,
      [marchandId],
    );
    const [totaux] = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'vente'   THEN montant ELSE 0 END), 0) AS ventes,
         COALESCE(SUM(CASE WHEN type = 'depense' THEN montant ELSE 0 END), 0) AS depenses,
         COUNT(*) FILTER (WHERE type = 'vente') AS nb_ventes
       FROM caisse_transactions
       WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
      [marchandId],
    );

    // `|| 0` EST INTERDIT ICI, ET C'EST TOUT L'OBJET DU LOT ACC-03.
    //
    // Ce bloc l'a d'abord utilisé, et un test l'a pris en défaut : avec un
    // `fond_initial` illisible, `Number(x) || 0` rendait 0, le total devenait
    // 0, et l'état se disait `connue`. C'est MOT POUR MOT le défaut du
    // 03/10 — « Ta caisse aujourd'hui : zéro franc » pour 100 F réels. Un
    // `|| 0` ne répare pas une donnée manquante, il la déguise en réponse.
    //
    // Ici, ce qui n'est pas un nombre fini rend l'état ILLISIBLE, et `montant`
    // est alors absent de la réponse. L'agent ne peut pas prononcer un
    // chiffre qu'il n'a pas reçu.
    const nombreOuRien = (v: unknown): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const journeeOuverte = !!session;
    const ventes = nombreOuRien(totaux?.ventes);
    const depenses = nombreOuRien(totaux?.depenses);
    // Journée non ouverte : le fond est réellement ABSENT, pas illisible — il
    // vaut zéro parce qu'elle n'a pas ouvert sa caisse. C'est une réponse.
    const fond = journeeOuverte ? nombreOuRien(session.fond_initial) : 0;
    const nbVentes = nombreOuRien(totaux?.nb_ventes) ?? 0;

    if (ventes === null || depenses === null || fond === null) {
      return { etat: 'illisible', journeeOuverte, nbVentes };
    }
    const montant = fond + ventes - depenses;
    if (!Number.isFinite(montant)) {
      return { etat: 'illisible', journeeOuverte, nbVentes };
    }
    return { etat: 'connue', montant, ventes, depenses, journeeOuverte, nbVentes };
  }

  /**
   * Les dernières ventes du jour, pour que l'agent puisse répondre « tu as
   * vendu quoi aujourd'hui ? ». PLAFONNÉE à 20 : une note vocale ne lit pas
   * cent lignes, et une réponse longue est une réponse que personne n'écoute.
   */
  @Get('ventes-du-jour')
  @PorteeRequise('lecture')
  async ventesDuJour(@Req() req: any) {
    const lignes = await this.dataSource.query(
      `SELECT montant, description, quantite, created_at
         FROM caisse_transactions
        WHERE user_id = $1 AND type = 'vente' AND created_at::date = CURRENT_DATE
        ORDER BY created_at DESC LIMIT 20`,
      [req.marchandDelegue],
    );
    return { ventes: lignes };
  }

  /** Le plafond, vérifié avant toute écriture. Rend le montant lu. */
  private async verifierPlafond(agent: PrincipalAgent, marchandId: string, brut: unknown): Promise<number> {
    const montant = Number(brut);
    const cumul = await this.agents.cumulDuJour(marchandId);
    const verdict = montantAutorise(agent.plafonds, montant, cumul);
    if (verdict.permis === false) {
      // Le refus NOMME sa raison : « non défini » doit se distinguer d'un
      // dépassement, sinon personne ne saura qu'il manque un arbitrage.
      const messages = {
        'non-defini': "Plafond d'agent non défini : aucune écriture n'est autorisée tant qu'il ne l'est pas",
        operation: "Montant au-dessus du plafond par opération",
        journalier: "Plafond journalier atteint pour cette marchande",
      } as const;
      throw new ForbiddenException(messages[verdict.raison]);
    }
    return montant;
  }

  @Post('vente')
  @PorteeRequise('ventes:ecrire')
  async vente(@Body() body: any, @Req() req: any) {
    const agent: PrincipalAgent = req.user;
    const marchandId: string = req.marchandDelegue;
    if (!body?.idempotency_key) {
      // Sans clé, un rejeu est indiscernable d'une vente neuve. Pour un agent
      // qui reçoit des messages pouvant arriver deux fois, ce n'est pas une
      // commodité : c'est la condition pour ne pas compter deux fois.
      throw new BadRequestException('idempotency_key requise pour une écriture d’agent');
    }
    await this.verifierPlafond(agent, marchandId, body.montant);
    return this.caisse.enregistrerVente(
      { ...body, source: 'whatsapp' },
      marchandeCible(marchandId),
    );
  }

  @Post('depense')
  @PorteeRequise('depenses:ecrire')
  async depense(@Body() body: any, @Req() req: any) {
    const agent: PrincipalAgent = req.user;
    const marchandId: string = req.marchandDelegue;
    if (!body?.idempotency_key) {
      throw new BadRequestException('idempotency_key requise pour une écriture d’agent');
    }
    await this.verifierPlafond(agent, marchandId, body.montant);
    return this.caisse.enregistrerDepense(
      { ...body, source: 'whatsapp' },
      marchandeCible(marchandId),
    );
  }
}
