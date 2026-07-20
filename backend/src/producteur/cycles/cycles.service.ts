import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cycle, CycleStatus } from './entities/cycle.entity';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';

@Injectable()
export class CyclesService {
  constructor(
    @InjectRepository(Cycle)
    private readonly cycleRepository: Repository<Cycle>,
  ) {}

  async create(userId: string, createCycleDto: CreateCycleDto): Promise<Cycle> {
    const cycle = this.cycleRepository.create({
      ...createCycleDto,
      userId,
      status: CycleStatus.ACTIVE,
    });

    return this.cycleRepository.save(cycle);
  }

  async findAll(userId: string): Promise<Cycle[]> {
    return this.cycleRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Cycle> {
    const cycle = await this.cycleRepository.findOne({
      where: { id, userId },
      relations: ['recoltes', 'publications'],
    });

    if (!cycle) {
      throw new NotFoundException('Cycle introuvable');
    }

    return cycle;
  }

  async update(
    id: string,
    userId: string,
    updateCycleDto: UpdateCycleDto,
  ): Promise<Cycle> {
    await this.findOne(id, userId); // Vérifier l'existence
    await this.cycleRepository.update({ id, userId }, updateCycleDto);
    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const cycle = await this.findOne(id, userId);
    await this.cycleRepository.remove(cycle);
  }

  async complete(
    id: string,
    userId: string,
    dateRecolteReelle: Date,
    quantiteReelle: number,
  ): Promise<Cycle> {
    await this.findOne(id, userId);
    await this.cycleRepository.update(
      { id, userId },
      {
        status: CycleStatus.COMPLETED,
        dateRecolteReelle,
        quantiteReelle,
      },
    );
    return this.findOne(id, userId);
  }
}
