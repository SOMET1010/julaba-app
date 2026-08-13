import { Module } from '@nestjs/common';
import { CooperativeResolverService } from './cooperative-resolver.service';

/**
 * Petit module dedie qui expose le resolveur de cooperative active, sans tirer
 * le controleur cooperatives-rest. Le service ne depend que de DataSource
 * (fourni globalement par TypeOrmModule.forRoot), donc aucun forFeature ici.
 */
@Module({
  providers: [CooperativeResolverService],
  exports: [CooperativeResolverService],
})
export class CooperativeResolverModule {}
