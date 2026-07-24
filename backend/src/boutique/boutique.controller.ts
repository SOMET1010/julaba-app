import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/entities/user.entity";
import { BoutiqueService } from "./boutique.service";
import { SyncMouvementsDto } from "./dto/sync-mouvements.dto";

// Point de synchro offline-first du banc vocal (boucle transactionnelle).
// Prefixe global /api/v1 -> routes /api/v1/boutique/...
@UseGuards(JwtAuthGuard)
@Controller("boutique")
export class BoutiqueController {
  constructor(private readonly service: BoutiqueService) {}

  // Remontee : le telephone envoie ses mouvements hors-ligne accumules.
  @Post("mouvements/sync")
  sync(@CurrentUser() user: User, @Body() dto: SyncMouvementsDto) {
    return this.service.sync(user.id, dto.mouvements);
  }

  // Descente / lecture : etat recalcule (stock + caisse) par rejeu.
  @Get("etat")
  etat(@CurrentUser() user: User) {
    return this.service.etat(user.id);
  }
}
