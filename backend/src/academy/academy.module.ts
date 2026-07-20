import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyController } from './academy.controller';
import { AcademyModule as AcademyModuleEntity } from './academy-module.entity';
import { AcademyQuestion } from './academy-question.entity';
import { AcademyProgress } from './academy-progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AcademyModuleEntity, AcademyQuestion, AcademyProgress])],
  controllers: [AcademyController],
})
export class AcademyModule {}
