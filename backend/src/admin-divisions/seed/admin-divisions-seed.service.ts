import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { District } from '../entities/district.entity';
import { Region } from '../entities/region.entity';
import { Departement } from '../entities/departement.entity';
import { Commune } from '../entities/commune.entity';
import {
  DISTRICTS_SEED,
  REGIONS_SEED,
  DEPARTEMENTS_SEED,
  COMMUNES_ABIDJAN_SEED,
} from './admin-divisions.seed';

@Injectable()
export class AdminDivisionsSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminDivisionsSeedService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(District) private districtRepo: Repository<District>,
    @InjectRepository(Region) private regionRepo: Repository<Region>,
    @InjectRepository(Departement) private departementRepo: Repository<Departement>,
    @InjectRepository(Commune) private communeRepo: Repository<Commune>,
  ) {}

  private async ensureTables() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS districts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(20) NOT NULL UNIQUE
      );
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS regions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE
      );
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS departements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE
      );
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS communes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nom VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        departement_id UUID NOT NULL REFERENCES departements(id) ON DELETE CASCADE
      );
    `);
  }

  async onApplicationBootstrap() {
    try {
      await this.ensureTables();
      const districtCount = await this.districtRepo.count();
      if (districtCount === 0) {
        this.logger.log('Seed admin-divisions: insertion en cours');
        const districts = await this.districtRepo.save(
          DISTRICTS_SEED.map((d) => this.districtRepo.create(d)),
        );
        const districtMap = new Map(districts.map((d) => [d.code, d.id]));

        const regions = await this.regionRepo.save(
          REGIONS_SEED.map((r) =>
            this.regionRepo.create({
              code: r.code,
              nom: r.nom,
              districtId: districtMap.get(r.districtCode)!,
            }),
          ),
        );
        const regionMap = new Map(regions.map((r) => [r.code, r.id]));

        const departements = await this.departementRepo.save(
          DEPARTEMENTS_SEED.map((d) =>
            this.departementRepo.create({
              code: d.code,
              nom: d.nom,
              regionId: regionMap.get(d.regionCode)!,
            }),
          ),
        );
        const departementMap = new Map(departements.map((d) => [d.code, d.id]));

        await this.communeRepo.save(
          COMMUNES_ABIDJAN_SEED.map((c) =>
            this.communeRepo.create({
              code: c.code,
              nom: c.nom,
              departementId: departementMap.get(c.departementCode)!,
            }),
          ),
        );

        this.logger.log(
          `Seed admin-divisions termine: ${DISTRICTS_SEED.length} districts, ${REGIONS_SEED.length} regions, ${DEPARTEMENTS_SEED.length} departements, ${COMMUNES_ABIDJAN_SEED.length} communes Abidjan`,
        );
      } else {
        this.logger.log(`Seed admin-divisions deja effectue (${districtCount} districts en BD)`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error('Erreur seed admin-divisions: ' + message);
    }
  }
}
