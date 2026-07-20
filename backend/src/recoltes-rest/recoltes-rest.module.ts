import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecoltesRestController } from "./recoltes-rest.controller";
import { Recolte } from "../producteur/recoltes/entities/recolte.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Recolte])],
  controllers: [RecoltesRestController],
})
export class RecoltesRestModule {}
