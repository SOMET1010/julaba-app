import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsRestController } from './transactions-rest.controller';
import { CaisseTransaction } from '../caisse-rest/caisse-transaction.entity';
import { AuditModule } from '../audit/audit.module';
import { TransactionsExportService } from './transactions-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CaisseTransaction]),
    AuditModule,
  ],
  controllers: [TransactionsRestController],
  providers: [TransactionsExportService],
})
export class TransactionsRestModule {}
