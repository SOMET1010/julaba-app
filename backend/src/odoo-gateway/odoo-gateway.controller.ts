import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MouvementStockCommand, OdooGatewayService } from './odoo-gateway.service';

/**
 * Endpoints POC — catalogue + stock consolidé uniquement, JAMAIS appelés par
 * le frontend JULABA dans ce lot. Namespace `odoo-poc` délibérément séparé
 * de `/caisse` et `/stocks` : aucune route de production n'est touchée.
 */
@UseGuards(JwtAuthGuard)
@Controller('odoo-poc')
export class OdooGatewayController {
  constructor(private readonly gateway: OdooGatewayService) {}

  @Get('catalogue')
  catalogue() {
    return this.gateway.listerCatalogue();
  }

  @Get('stock/:odooProductId')
  stock(@Param('odooProductId') odooProductId: string) {
    return this.gateway.lireStock(Number(odooProductId));
  }

  @Post('mouvement-stock')
  mouvement(@Body() body: MouvementStockCommand) {
    return this.gateway.simulerMouvementStock(body);
  }

  @Get('journal')
  journal() {
    return this.gateway.listJournal();
  }

  @Get('journal/:operationId')
  journalUn(@Param('operationId') operationId: string) {
    return this.gateway.getJournal(operationId) ?? null;
  }
}
