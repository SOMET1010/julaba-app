import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CyclesService } from './cycles.service';
import { CyclesController } from './cycles.controller';
import { Cycle } from './entities/cycle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cycle])],
  controllers: [CyclesController],
  providers: [CyclesService],
  exports: [CyclesService],
})
export class CyclesModule {}
