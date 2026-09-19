import { Injectable, Logger } from '@nestjs/common';
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
export class AdminDivisionsSeedService {
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

  // ── SEED-01 : CHAQUE NIVEAU EST IDEMPOTENT POUR LUI-MÊME ─────────────────
  //
  // CE QU'IL Y AVAIT. Une seule garde pour toute la cascade :
  //     if (districtCount === 0) { …districts, régions, départements, communes… }
  // « La table districts n'est pas vide » y tenait lieu de « tout le découpage
  // est en place ». Un district créé à la main, ou un premier démarrage
  // interrompu après le premier INSERT, et les communes n'étaient JAMAIS
  // posées — sans erreur, sans trace, et `recoltes-prevues` perdait ses
  // données en silence.
  //
  // CE QU'ON FAIT À LA PLACE. On compare, niveau par niveau, les codes du jeu
  // de seed à ceux déjà en base, et on n'insère que ce qui manque. Aucun
  // niveau ne décide pour un autre. Le seed n'est pas refondu : mêmes données,
  // même ordre, mêmes entités — seule la condition d'insertion change.
  //
  // Les cartes parent sont relues EN BASE après chaque insertion, pas
  // construites à partir des seules lignes qu'on vient d'écrire : sur une base
  // partiellement remplie, les parents existants doivent servir de points
  // d'accroche aux enfants manquants.
  async runSeed() {
    try {
      await this.ensureTables();

      const codesPresents = async (repo: Repository<any>): Promise<Set<string>> =>
        new Set((await repo.find()).map((r: any) => String(r.code)));
      const carteParCode = async (repo: Repository<any>): Promise<Map<string, string>> =>
        new Map((await repo.find()).map((r: any) => [String(r.code), r.id]));

      const poses = { districts: 0, regions: 0, departements: 0, communes: 0 };

      // 1. Districts
      const dPresents = await codesPresents(this.districtRepo);
      const dManquants = DISTRICTS_SEED.filter((d) => !dPresents.has(d.code));
      if (dManquants.length) {
        await this.districtRepo.save(dManquants.map((d) => this.districtRepo.create(d)));
        poses.districts = dManquants.length;
      }
      const districtMap = await carteParCode(this.districtRepo);

      // 2. Régions
      const rPresents = await codesPresents(this.regionRepo);
      const rManquantes = REGIONS_SEED.filter(
        (r) => !rPresents.has(r.code) && districtMap.has(r.districtCode),
      );
      if (rManquantes.length) {
        await this.regionRepo.save(
          rManquantes.map((r) =>
            this.regionRepo.create({ code: r.code, nom: r.nom, districtId: districtMap.get(r.districtCode)! }),
          ),
        );
        poses.regions = rManquantes.length;
      }
      const regionMap = await carteParCode(this.regionRepo);

      // 3. Départements
      const dpPresents = await codesPresents(this.departementRepo);
      const dpManquants = DEPARTEMENTS_SEED.filter(
        (d) => !dpPresents.has(d.code) && regionMap.has(d.regionCode),
      );
      if (dpManquants.length) {
        await this.departementRepo.save(
          dpManquants.map((d) =>
            this.departementRepo.create({ code: d.code, nom: d.nom, regionId: regionMap.get(d.regionCode)! }),
          ),
        );
        poses.departements = dpManquants.length;
      }
      const departementMap = await carteParCode(this.departementRepo);

      // 4. Communes
      const cPresentes = await codesPresents(this.communeRepo);
      const cManquantes = COMMUNES_ABIDJAN_SEED.filter(
        (c) => !cPresentes.has(c.code) && departementMap.has(c.departementCode),
      );
      if (cManquantes.length) {
        await this.communeRepo.save(
          cManquantes.map((c) =>
            this.communeRepo.create({ code: c.code, nom: c.nom, departementId: departementMap.get(c.departementCode)! }),
          ),
        );
        poses.communes = cManquantes.length;
      }

      const total = poses.districts + poses.regions + poses.departements + poses.communes;
      if (total === 0) {
        this.logger.log('Seed admin-divisions : rien à poser, tout est déjà en place');
      } else {
        this.logger.log(
          `Seed admin-divisions : ${poses.districts} districts, ${poses.regions} regions, ` +
          `${poses.departements} departements, ${poses.communes} communes Abidjan posés`,
        );
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error('Erreur seed admin-divisions: ' + message);
    }
  }
}
