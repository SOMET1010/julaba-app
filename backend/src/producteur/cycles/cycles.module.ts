import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CyclesService } from './cycles.service';
import { Cycle } from './entities/cycle.entity';

// Fusion INIT-011 : le controleur producteur/cycles/cycles.controller.ts etait
// duplique avec cycles-rest.controller.ts (meme prefixe `cycles`). Le
// controleur -rest est desormais canonique (CyclesRestModule importe dans
// app.module.ts). CyclesModule n'est plus importe nulle part ; on conserve
// le service + l'entite pour les relations TypeORM (User.cycles, Recolte.cycle,
// Publication.cycle) et une eventuelle reutilisation future.
@Module({
  imports: [TypeOrmModule.forFeature([Cycle])],
  providers: [CyclesService],
  exports: [CyclesService],
})
export class CyclesModule {}
