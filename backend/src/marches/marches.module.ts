import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Zone } from '../zones/entities/zone.entity';
import { Marche } from './marche.entity';
import { MarchesService } from './marches.service';
import { MarchesController } from './marches.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Marche, Zone]), AuthModule, NotificationsModule],
  providers: [MarchesService],
  controllers: [MarchesController],
  exports: [MarchesService],
})
export class MarchesModule {}
