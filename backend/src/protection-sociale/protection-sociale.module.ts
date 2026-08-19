import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProtectionSocialeController } from './protection-sociale.controller';
import { CotisationSociale } from './entities/cotisation-sociale.entity';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [TypeOrmModule.forFeature([CotisationSociale]), WalletsModule],
  controllers: [ProtectionSocialeController],
})
export class ProtectionSocialeModule {}
