import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { District } from './entities/district.entity';
import { Region } from './entities/region.entity';
import { Departement } from './entities/departement.entity';
import { Commune } from './entities/commune.entity';

const normalize = (s: string | undefined | null): string => {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[-'`]/g, ' ')
    .replace(/\s+/g, ' ');
};

@Injectable()
export class AdminDivisionsService {
  private readonly logger = new Logger(AdminDivisionsService.name);

  constructor(
    @InjectRepository(District) private districtRepo: Repository<District>,
    @InjectRepository(Region) private regionRepo: Repository<Region>,
    @InjectRepository(Departement) private departementRepo: Repository<Departement>,
    @InjectRepository(Commune) private communeRepo: Repository<Commune>,
  ) {}

  async findAllDistricts() {
    return this.districtRepo.find({ order: { nom: 'ASC' } });
  }

  async findRegionsByDistrict(districtId: string) {
    return this.regionRepo.find({ where: { districtId }, order: { nom: 'ASC' } });
  }

  async findDepartementsByRegion(regionId: string) {
    return this.departementRepo.find({ where: { regionId }, order: { nom: 'ASC' } });
  }

  async findCommunesByDepartement(departementId: string) {
    return this.communeRepo.find({ where: { departementId }, order: { nom: 'ASC' } });
  }

  async reverseGeocode(lat: number, lng: number) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=fr`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'JULABA/1.0' },
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`Nominatim a retourne ${res.status}`);
        return { district: null, region: null, departement: null, commune: null, raw: null };
      }
      const data: any = await res.json();
      const address = data.address || {};

      const stateName = normalize(address.state || '');
      const countyName = normalize(address.county || '');
      const cityName = normalize(address.city || address.town || address.municipality || '');
      const candidates = [
        address.suburb,
        address.neighbourhood,
        address.city_district,
        address.city,
        address.town,
        address.village,
        address.hamlet,
        address.municipality,
        address.county,
      ].filter(Boolean).map((value: string) => normalize(value));

      const allRegions = await this.regionRepo.find({ relations: ['district'] });
      const allDepartements = await this.departementRepo.find({ relations: ['region', 'region.district'] });
      const allCommunes = await this.communeRepo.find({
        relations: ['departement', 'departement.region', 'departement.region.district'],
      });

      let matchedCommune = null as Commune | null;
      let matchedVia: 'commune_match' | 'state_only' | 'none' = 'none';
      for (const cand of candidates) {
        const found = allCommunes.find((c) => normalize(c.nom) === cand);
        if (found) {
          matchedCommune = found;
          matchedVia = 'commune_match';
          break;
        }
      }

      const matchedRegion = allRegions.find((r) =>
        normalize(r.nom) === stateName || stateName.includes(normalize(r.nom)),
      );
      const matchedDepartement = allDepartements.find((d) =>
        normalize(d.nom) === countyName ||
        normalize(d.nom) === cityName ||
        countyName.includes(normalize(d.nom)) ||
        cityName.includes(normalize(d.nom)),
      );

      let finalDepartement = matchedDepartement || null;
      let finalRegion = matchedRegion || matchedDepartement?.region || null;
      let finalDistrict = matchedDepartement?.region?.district || matchedRegion?.district || null;

      if (matchedCommune) {
        finalDepartement = matchedCommune.departement || null;
        finalRegion = finalDepartement?.region || null;
        finalDistrict = finalRegion?.district || null;
      } else if (finalDepartement || finalRegion || finalDistrict) {
        matchedVia = 'state_only';
      }

      this.logger.log(
        `[reverseGeocode] lat=${lat}, lng=${lng}, matched_via=${matchedVia}, commune=${matchedCommune?.nom || 'none'}`,
      );

      return {
        district: finalDistrict ? { id: finalDistrict.id, nom: finalDistrict.nom, code: finalDistrict.code } : null,
        region: finalRegion ? { id: finalRegion.id, nom: finalRegion.nom, code: finalRegion.code } : null,
        departement: finalDepartement ? { id: finalDepartement.id, nom: finalDepartement.nom, code: finalDepartement.code } : null,
        commune: matchedCommune ? { id: matchedCommune.id, nom: matchedCommune.nom, code: matchedCommune.code } : null,
        matched_via: matchedVia,
        raw: { ...address, commune_candidates: candidates },
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error('Erreur reverse-geocode: ' + message);
      return { district: null, region: null, departement: null, commune: null, raw: null };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
