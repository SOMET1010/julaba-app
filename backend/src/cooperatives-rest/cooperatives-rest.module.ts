import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CooperativesRestController } from './cooperatives-rest.controller';
import { Cooperative } from './cooperative.entity';
import { CooperativeMembre } from './cooperative-membre.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cooperative, CooperativeMembre, User])],
  controllers: [CooperativesRestController],
})
export class CooperativesRestModule {}
