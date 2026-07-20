import { Module } from '@nestjs/common';
import { SmsModule } from '../sms/sms.module';
import { FeedbakSmsService } from './feedbak-sms.service';

@Module({
  imports: [SmsModule],
  providers: [FeedbakSmsService],
  exports: [FeedbakSmsService],
})
export class FeedbakSmsModule {}
