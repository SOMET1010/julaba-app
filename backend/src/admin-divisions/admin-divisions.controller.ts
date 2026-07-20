import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { AdminDivisionsService } from './admin-divisions.service';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';

@Controller('admin-divisions')
export class AdminDivisionsController {
  constructor(private readonly service: AdminDivisionsService) {}

  @Get('districts')
  async getDistricts() {
    return this.service.findAllDistricts();
  }

  @Get('regions')
  async getRegions(@Query('district_id') districtId: string) {
    if (!districtId) throw new BadRequestException('district_id requis');
    return this.service.findRegionsByDistrict(districtId);
  }

  @Get('departements')
  async getDepartements(@Query('region_id') regionId: string) {
    if (!regionId) throw new BadRequestException('region_id requis');
    return this.service.findDepartementsByRegion(regionId);
  }

  @Get('communes')
  async getCommunes(@Query('departement_id') departementId: string) {
    if (!departementId) throw new BadRequestException('departement_id requis');
    return this.service.findCommunesByDepartement(departementId);
  }

  @Post('reverse-geocode')
  async reverseGeocode(@Body() body: ReverseGeocodeDto) {
    if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
      throw new BadRequestException('lat et lng (number) requis');
    }
    return this.service.reverseGeocode(body.lat, body.lng);
  }
}
