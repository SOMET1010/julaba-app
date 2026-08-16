import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ActivationService } from './activation.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { ActivationCode } from './entities/activation-code.entity';
import { Cooperative } from '../cooperatives-rest/cooperative.entity';
import { WalletsModule } from '../wallets/wallets.module';
import { FeedbakSmsModule } from '../feedbak-sms/feedbak-sms.module';
import { AuditModule } from '../audit/audit.module';
import { PinCryptoService } from './pin-crypto.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, RefreshToken, Cooperative, ActivationCode]),
    WalletsModule,
    FeedbakSmsModule,
    AuditModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '24h') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, ActivationService, JwtStrategy, Reflector, PinCryptoService],
  exports: [AuthService, ActivationService, JwtModule, Reflector],
})
export class AuthModule {}
