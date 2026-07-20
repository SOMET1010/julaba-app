import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TransactionStatus } from '../../caisse-rest/caisse-transaction.entity';

export class UpdateTransactionStatusDto {
  @IsEnum(TransactionStatus)
  statut: TransactionStatus;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  motif?: string;
}
