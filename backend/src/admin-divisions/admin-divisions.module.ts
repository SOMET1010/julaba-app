import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { District } from './entities/district.entity';
import { Region } from './entities/region.entity';
import { Departement } from './entities/departement.entity';
import { Commune } from './entities/commune.entity';
import { AdminDivisionsController } from './admin-divisions.controller';
import { AdminDivisionsService } from './admin-divisions.service';
import { AdminDivisionsSeedService } from './seed/admin-divisions-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([District, Region, Departement, Commune])],
  controllers: [AdminDivisionsController],
  providers: [AdminDivisionsService, AdminDivisionsSeedService],
  exports: [AdminDivisionsService],
})
export class AdminDivisionsModule {}
