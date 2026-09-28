import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('cycles')
export class CyclesRestController {
  constructor(private dataSource: DataSource) {}

  @Get()
  async findAll(@CurrentUser() user: User, @Query() query: any) {
    const cycles = await this.dataSource.query(
      'SELECT * FROM cycles WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );
    return { cycles };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const result = await this.dataSource.query(
      'SELECT * FROM cycles WHERE id = $1 AND user_id = $2 LIMIT 1', [id, user.id]
    );
    return { cycle: result[0] || null };
  }

  @Post()
  async create(@Body() body: any, @CurrentUser() user: User) {
    const result = await this.dataSource.query(
      `INSERT INTO cycles (user_id, culture, surface, parcelle, date_plantation, date_recolte_estimee, quantite_estimee, notes, photo_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [user.id, body.culture, body.surface, body.parcelle || null,
       body.date_plantation, body.date_recolte_estimee, body.quantite_estimee,
       body.notes || null, body.photo_url || null, body.status || 'active']
    );
    return { cycle: result[0] };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    const fields = [];
    const values = [];
    let i = 1;
    const allowed = ['culture', 'surface', 'parcelle', 'date_recolte_estimee', 'date_recolte_reelle',
                     'quantite_estimee', 'quantite_reelle', 'status', 'notes', 'photo_url'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return { success: false };
    fields.push(`updated_at = NOW()`);
    values.push(id);
    values.push(user.id);
    const result = await this.dataSource.query(
      `UPDATE cycles SET ${fields.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
      values
    );
    return { cycle: result[0] || null };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.dataSource.query('DELETE FROM cycles WHERE id = $1 AND user_id = $2', [id, user.id]);
    return { success: true };
  }

  // Fusion INIT-011 : route ajoutée depuis producteur/cycles/cycles.controller.ts
  // (supprimé). Le frontend (cycles-api.ts) appelle cette opération via
  // PATCH /:id avec status='completed', mais on conserve la route explicite
  // POST /:id/complete pour compatibilité ascendante et sémantique métier.
  @Post(':id/complete')
  async complete(
    @Param('id') id: string,
    @Body() body: { dateRecolteReelle: string; quantiteReelle: number },
    @CurrentUser() user: User,
  ) {
    const result = await this.dataSource.query(
      `UPDATE cycles
       SET status = 'completed',
           date_recolte_reelle = $3,
           quantite_reelle = $4,
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, user.id, body.dateRecolteReelle, body.quantiteReelle],
    );
    return { cycle: result[0] || null };
  }
}
