/**
 * LE MODULE DE L'AGENT — AGENT-A1..A4, 05/10/2026.
 *
 * IMPORTER CE MODULE N'OUVRE RIEN. Il expose des routes, mais aucune ne
 * répond sans un jeton d'agent valide, et aucune écriture n'aboutit sans une
 * délégation que la marchande a accordée par SMS. Et tant que les plafonds
 * ne sont pas renseignés, les écritures sont refusées — décision de Patrick :
 * les montants se choisissent sur des données réelles.
 *
 * `CaisseRestModule` est importé pour une raison précise : réutiliser LE
 * contrôleur de caisse, et donc le seul chemin de vente qui porte
 * l'idempotence, le mouvement de stock et la marge. Aucune ligne de vente
 * n'est recopiée ici.
 */
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AgentService } from './agent.service';
import { JwtAgentStrategy } from './jwt-agent.strategy';
import { AgentGuard } from './agent.guard';
import { AgentCaisseController } from './agent-caisse.controller';
import { AgentDelegationController } from './agent-delegation.controller';
import { SmsModule } from '../sms/sms.module';
import { CaisseRestModule } from '../caisse-rest/caisse-rest.module';

@Module({
  imports: [PassportModule, ConfigModule, SmsModule, CaisseRestModule],
  controllers: [AgentCaisseController, AgentDelegationController],
  providers: [AgentService, JwtAgentStrategy, AgentGuard],
  exports: [AgentService],
})
export class AgentModule {}
