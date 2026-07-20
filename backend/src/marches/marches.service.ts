import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Zone } from '../zones/entities/zone.entity';
import { Marche, MarcheTypeEnum } from './marche.entity';
import { CreateMarcheDto } from './dto/create-marche.dto';
import { UpdateMarcheDto } from './dto/update-marche.dto';

export interface MarcheListFilters {
  zoneId?: string;
  region?: string;
  actif?: boolean;
}

@Injectable()
export class MarchesService {
  private readonly logger = new Logger(MarchesService.name);

  constructor(
    @InjectRepository(Marche)
    private readonly marcheRepo: Repository<Marche>,
    @InjectRepository(Zone)
    private readonly zoneRepo: Repository<Zone>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters: MarcheListFilters): Promise<Marche[]> {
    const qb = this.marcheRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.zone', 'z')
      .orderBy('m.nom', 'ASC');
    if (filters.zoneId) {
      qb.andWhere('m.zone_id = :zoneId', { zoneId: filters.zoneId });
    }
    if (filters.actif !== undefined) {
      qb.andWhere('m.actif = :actif', { actif: filters.actif });
    }
    if (filters.region) {
      qb.andWhere('z.region = :region', { region: filters.region });
    }
    return qb.getMany();
  }

  async findOne(id: string): Promise<Marche> {
    const m = await this.marcheRepo.findOne({
      where: { id },
      relations: ['zone'],
    });
    if (!m) {
      throw new NotFoundException('Marché introuvable');
    }
    return m;
  }

  async create(dto: CreateMarcheDto): Promise<Marche> {
    const zone = await this.zoneRepo.findOne({ where: { id: dto.zoneId } });
    if (!zone) {
      throw new NotFoundException('Zone introuvable');
    }
    try {
      const row = this.marcheRepo.create({
        nom: dto.nom,
        zone,
        adresse: dto.adresse ?? null,
        latitude: dto.latitude != null ? Number(dto.latitude) : null,
        longitude: dto.longitude != null ? Number(dto.longitude) : null,
        marcheType: dto.type ?? MarcheTypeEnum.autre,
        description: dto.description ?? null,
        actif: dto.actif !== undefined ? dto.actif : true,
      });
      return await this.marcheRepo.save(row);
    } catch (e) {
      this.logger.warn(
        `Échec création marché : ${e instanceof Error ? e.message : String(e)}`,
      );
      throw e;
    }
  }

  async update(id: string, dto: UpdateMarcheDto): Promise<Marche> {
    const existing = await this.marcheRepo.findOne({
      where: { id },
      relations: ['zone'],
    });
    if (!existing) {
      throw new NotFoundException('Marché introuvable');
    }
    if (dto.zoneId && dto.zoneId !== existing.zone?.id) {
      const zone = await this.zoneRepo.findOne({ where: { id: dto.zoneId } });
      if (!zone) {
        throw new NotFoundException('Zone introuvable');
      }
      existing.zone = zone;
    }
    if (dto.nom !== undefined) existing.nom = dto.nom;
    if (dto.adresse !== undefined) existing.adresse = dto.adresse ?? null;
    if (dto.latitude !== undefined) {
      existing.latitude = dto.latitude != null ? Number(dto.latitude) : null;
    }
    if (dto.longitude !== undefined) {
      existing.longitude = dto.longitude != null ? Number(dto.longitude) : null;
    }
    if (dto.type !== undefined) existing.marcheType = dto.type;
    if (dto.description !== undefined) {
      existing.description = dto.description ?? null;
    }
    if (dto.actif !== undefined) existing.actif = dto.actif;
    try {
      return await this.marcheRepo.save(existing);
    } catch (e) {
      this.logger.warn(
        `Échec mise à jour marché : ${e instanceof Error ? e.message : String(e)}`,
      );
      throw e;
    }
  }

  async remove(id: string): Promise<{ deleted: boolean } | { deactivated: boolean }> {
    const existing = await this.marcheRepo.findOne({
      where: { id },
      relations: ['zone'],
    });
    if (!existing) {
      throw new NotFoundException('Marché introuvable');
    }
    const zoneId = existing.zone?.id;
    if (!zoneId) {
      this.logger.warn('Marché sans zone associée, suppression directe');
      await this.marcheRepo.delete(id);
      return { deleted: true };
    }
    try {
      const rows = await this.dataSource.query(
        `SELECT COUNT(*)::int AS c FROM users WHERE zone_id = $1::uuid`,
        [zoneId],
      );
      const n = Number(rows[0]?.c ?? 0);
      if (n > 0) {
        await this.marcheRepo.update({ id }, { actif: false });
        return { deactivated: true };
      }
      await this.marcheRepo.delete(id);
      return { deleted: true };
    } catch (e) {
      this.logger.warn(
        `Échec suppression marché : ${e instanceof Error ? e.message : String(e)}`,
      );
      throw e;
    }
  }
}
