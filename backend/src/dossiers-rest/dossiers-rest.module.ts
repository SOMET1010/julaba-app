import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DossiersRestController } from './dossiers-rest.controller';
import { Identification } from '../identifications/identification.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Identification, User])],
  controllers: [DossiersRestController],
})
export class DossiersRestModule {}
