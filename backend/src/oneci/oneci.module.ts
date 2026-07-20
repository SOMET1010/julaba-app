import { Module } from '@nestjs/common';
import { OneciService } from './oneci.service';
import { OneciController } from './oneci.controller';
@Module({ controllers: [OneciController], providers: [OneciService], exports: [OneciService] })
export class OneciModule {}
