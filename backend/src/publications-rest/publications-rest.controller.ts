import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, NotFoundException, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Publication } from '../producteur/publications/entities/publication.entity';
import { RepublierPublicationDto } from './dto/republier-publication.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('publications')
export class PublicationsRestController {
  private readonly logger = new Logger(PublicationsRestController.name);

  constructor(
    @InjectRepository(Publication) private repo: Repository<Publication>,
    private dataSource: DataSource,
    private notifService: NotificationsService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@CurrentUser() user: User) {
    const publications = await this.dataSource.query(
      `SELECT p.* FROM publications p WHERE p.user_id = $1 ORDER BY p.created_at DESC`,
      [user.id]
    );
    return { publications };
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  async findAllAdmin(@CurrentUser() user: User) {
    const allowedRoles = ['admin_general', 'super_admin'];
    if (!allowedRoles.includes(String(user?.role || '').toLowerCase())) {
      throw new ForbiddenException('Accès réservé aux rôles admin/super_admin');
    }
    const publications = await this.dataSource.query(
      `SELECT p.*, u.first_name as user_prenom, u.last_name as user_nom, u.role as user_role
       FROM publications p
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`
    );
    return { publications };
  }

  @UseGuards(JwtAuthGuard)
  @Get('marche')
  async getMarche(@CurrentUser() user: User) {
    const baseSelect =
      `SELECT p.*, u.first_name as producteur_prenom, u.last_name as producteur_nom, u.role as user_role, u.commune as producteur_commune
       FROM publications p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.statut = 'disponible' AND p.active = true`;
    const orderBy = ` ORDER BY p.created_at DESC`;

    const role = String(user?.role || '').toLowerCase();

    // Coopérateur : comportement inchangé (vue marché actuelle)
    if (role === 'cooperateur') {
      const publications = await this.dataSource.query(
        `${baseSelect} AND u.role IN ('producteur', 'cooperateur')${orderBy}`,
      );
      return { publications };
    }

    // Marchand : cloisonnement par sous-profil
    if (role === 'marchand') {
      const sousProfil = user?.sousProfilMarchand || null;

      // Grossiste : marché producteur global (aucune jointure coopérative)
      if (sousProfil === 'grossiste') {
        const publications = await this.dataSource.query(
          `${baseSelect} AND p.type_marche = 'producteur'${orderBy}`,
        );
        return { publications };
      }

      // Demi-grossiste : marché coopératif scopé sur sa coopérative active
      if (sousProfil === 'demi_grossiste') {
        const coop = await this.dataSource.query(
          `SELECT cooperative_id FROM cooperative_membres WHERE membre_id = $1 AND actif = true LIMIT 1`,
          [user.id],
        );
        const coopId = coop?.[0]?.cooperative_id || null;
        if (!coopId) return { publications: [] };
        const publications = await this.dataSource.query(
          `${baseSelect} AND p.type_marche = 'cooperative' AND p.cooperative_id = $1${orderBy}`,
          [coopId],
        );
        return { publications };
      }

      // Détaillant ou sous-profil non défini : aucun marché
      return { publications: [] };
    }

    // Tout autre rôle authentifié : aucun marché (défaut sûr)
    return { publications: [] };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: any, @CurrentUser() user: User) {
    const result = await this.dataSource.query(
      `INSERT INTO publications (user_id, produit, culture, quantite_disponible, quantite_initiale, unite, prix_unitaire, qualite, localisation, active, statut, date_recolte, description, photo_url, date_publication)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,true,'disponible',$9,$10,$11,NOW())
       ON CONFLICT (user_id, LOWER(TRIM(produit)))
       DO UPDATE SET
         quantite_disponible = EXCLUDED.quantite_disponible,
         quantite_initiale   = EXCLUDED.quantite_initiale,
         prix_unitaire       = EXCLUDED.prix_unitaire,
         localisation        = EXCLUDED.localisation,
         description         = EXCLUDED.description,
         photo_url           = EXCLUDED.photo_url,
         date_recolte        = EXCLUDED.date_recolte,
         statut              = 'disponible',
         active              = true,
         updated_at          = NOW()
       RETURNING *`,
      [user.id, body.produit, body.culture || body.produit, body.quantite_disponible,
       body.unite, body.prix_unitaire, body.qualite || 'standard', body.localisation || '',
       body.date_recolte || null, body.description || '', body.photo_url || null]
    );
    // Passer la récolte en 'validee' si recolte_id fourni
    if (body.recolte_id) {
      await this.dataSource.query(
        `UPDATE recoltes SET statut = 'validee', updated_at = NOW() WHERE id = $1 AND user_id = $2 AND statut = 'declaree'`,
        [body.recolte_id, user.id]
      );
    }
    const created = result[0];
    try {
      await this.notifService.sendToRole('marchand', {
        type: 'nouvelle_publication',
        titre: 'Nouvelle offre disponible',
        message: `${created.produit} est disponible sur le marché.`,
        priority: 'medium',
        category: 'marche',
        icon: '🛍️',
      }, this.userRepo);
    } catch (error) {
      this.logger.error('sendToRole notification failed', error instanceof Error ? error.stack : String(error));
    }
    return { publication: created };
  }

  @UseGuards(JwtAuthGuard)
  @Post('republier')
  async republier(@Body() body: RepublierPublicationDto, @CurrentUser() user: User) {
    // Garde sous-profil : seuls les grossistes republient vers le marché coopératif
    const role = String(user?.role || '').toLowerCase();
    if (role !== 'marchand' || user?.sousProfilMarchand !== 'grossiste') {
      throw new ForbiddenException('Republication réservée aux grossistes');
    }

    // Coopérative active dérivée serveur (jamais fournie par le client)
    const coop = await this.dataSource.query(
      `SELECT cooperative_id FROM cooperative_membres WHERE membre_id = $1 AND actif = true LIMIT 1`,
      [user.id],
    );
    const coopId = coop?.[0]?.cooperative_id || null;
    if (!coopId) {
      throw new ConflictException('Aucune coopérative active : republication impossible');
    }

    // type_marche et cooperative_id forcés serveur ; user_id = utilisateur courant.
    // Pas de ON CONFLICT : une collision de produit doit échouer franchement, pas écraser.
    const result = await this.dataSource.query(
      `INSERT INTO publications (user_id, produit, culture, quantite_disponible, quantite_initiale, unite, prix_unitaire, qualite, localisation, active, statut, description, photo_url, type_marche, cooperative_id, date_publication)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,true,'disponible',$9,$10,'cooperative'::marche_virtuel_type_enum,$11,NOW())
       RETURNING *`,
      [user.id, body.produit, body.culture || body.produit, body.quantite_disponible,
       body.unite, body.prix_unitaire, body.qualite || 'standard', body.localisation || '',
       body.description || '', body.photo_url || null, coopId],
    );
    // Notif ciblée : demi-grossistes actifs de la coopérative concernée
    try {
      const cibles = await this.dataSource.query(
        `SELECT u.id
           FROM cooperative_membres cm
           JOIN users u ON u.id = cm.membre_id
          WHERE cm.cooperative_id = $1
            AND cm.actif = true
            AND u.role = 'marchand'
            AND u.sous_profil_marchand = 'demi_grossiste'`,
        [coopId],
      );
      const created = result[0];
      await this.notifService.sendToUserIds(
        cibles.map((c: { id: string }) => c.id),
        {
          type: 'republication_cooperative',
          titre: 'Nouvelle offre sur votre marché coopératif',
          message: `${created.produit} est disponible sur le marché de votre coopérative.`,
          priority: 'medium',
          category: 'marche',
          icon: '🛍️',
        },
      );
    } catch (error) {
      this.logger.error('notif republication ciblée échouée', error instanceof Error ? error.stack : String(error));
    }
    return { publication: result[0] };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: User) {
    // Vérifier que la publication appartient à l'utilisateur
    const existing = await this.dataSource.query(
      `SELECT id FROM publications WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );
    if (!existing || existing.length === 0) {
      throw new ForbiddenException('Publication non trouvée ou accès refusé');
    }

    // Construire la mise à jour dynamique
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.prix_unitaire !== undefined) { fields.push(`prix_unitaire = $${idx++}`); values.push(body.prix_unitaire); }
    if (body.quantite_disponible !== undefined) { fields.push(`quantite_disponible = $${idx++}`); values.push(body.quantite_disponible); }
    if (body.description !== undefined) { fields.push(`description = $${idx++}`); values.push(body.description); }
    if (body.localisation !== undefined) { fields.push(`localisation = $${idx++}`); values.push(body.localisation); }
    if (body.photo_url !== undefined) { fields.push(`photo_url = $${idx++}`); values.push(body.photo_url); }
    if (body.statut !== undefined) { fields.push(`statut = $${idx++}`); values.push(body.statut); }
    if (body.active !== undefined) { fields.push(`active = $${idx++}`); values.push(body.active); }

    if (fields.length === 0) return { publication: existing[0] };

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await this.dataSource.query(
      `UPDATE publications SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
      [...values, user.id]
    );
    return { publication: result[0] };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.dataSource.query(
      `DELETE FROM publications WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/toggle')
  async toggle(@Param('id') id: string, @CurrentUser() user: User) {
    const existing = await this.dataSource.query(
      `SELECT id, active, statut FROM publications WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );
    if (!existing || existing.length === 0) throw new NotFoundException('Publication non trouvée');
    const newActive = !existing[0].active;
    const newStatut = newActive ? 'disponible' : 'suspendu';
    const result = await this.dataSource.query(
      `UPDATE publications SET active = $1, statut = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING *`,
      [newActive, newStatut, id, user.id]
    );
    return { publication: result[0] };
  }
}