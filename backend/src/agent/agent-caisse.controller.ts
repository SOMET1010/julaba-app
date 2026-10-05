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
import { BadRequestException, Body, Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common';
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
  ) {}

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
