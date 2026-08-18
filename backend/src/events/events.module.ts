import { Module, Global } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        // Jamais de secret de repli en dur : un fallback publié dans le code
        // rendrait les jetons WebSocket falsifiables. Même exigence que
        // l'AuthModule (même secret, même provenance).
        if (!secret) {
          throw new Error("JWT_SECRET manquant — requis pour signer/vérifier les jetons (aucun repli).");
        }
        return { secret };
      },
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
