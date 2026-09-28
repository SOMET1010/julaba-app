import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recolte } from './entities/recolte.entity';

// Fusion INIT-011 : le controleur producteur/recoltes/recoltes.controller.ts
// etait duplique avec recoltes-rest.controller.ts (meme prefixe `recoltes`).
// Le controleur -rest est desormais canonique (RecoltesRestModule importe dans
// app.module.ts). RecoltesModule n'est plus importe nulle part ; on conserve
// TypeOrmModule.forFeature([Recolte]) pour l'entite (relations Recolte.cycle,
// Publication.recolte) et une eventuelle reutilisation future.
@Module({
  imports: [TypeOrmModule.forFeature([Recolte])],
  providers: [],
  exports: [TypeOrmModule],
})
export class RecoltesModule {}
