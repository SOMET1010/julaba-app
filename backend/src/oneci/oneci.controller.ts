import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { OneciService } from './oneci.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
@Controller('oneci')
@UseGuards(JwtAuthGuard)
export class OneciController {
  constructor(private readonly svc: OneciService) {}
  @Get('lookup/:nni')
  lookup(@Param('nni') nni: string) { return this.svc.lookupByNni(nni); }
  @Get('quota')
  quota() { return this.svc.getQuota(); }
}
