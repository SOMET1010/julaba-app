import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BoutiqueMouvement } from "./boutique-mouvement.entity";
import { BoutiqueController } from "./boutique.controller";
import { BoutiqueService } from "./boutique.service";

@Module({
  imports: [TypeOrmModule.forFeature([BoutiqueMouvement])],
  controllers: [BoutiqueController],
  providers: [BoutiqueService],
})
export class BoutiqueModule {}
