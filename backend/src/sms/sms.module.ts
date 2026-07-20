import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsService } from './sms.service';

// ============================================================
// JULABA — Module SMS/OTP
// Intègre : CI ANSUT pour l'envoi de SMS
//           Table otp_codes pour stocker les codes temporaires
// ============================================================

@Module({
  imports: [
    TypeOrmModule.forFeature([]),  // Ajouter l'entité OtpCode ici
  ],
  controllers: [],
  providers:   [SmsService],
  exports:     [SmsService],
})
export class SmsModule {}
