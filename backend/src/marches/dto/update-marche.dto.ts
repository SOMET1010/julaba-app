import { PartialType } from '@nestjs/swagger';
import { CreateMarcheDto } from './create-marche.dto';

export class UpdateMarcheDto extends PartialType(CreateMarcheDto) {}
