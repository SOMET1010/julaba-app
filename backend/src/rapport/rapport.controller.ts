import { Controller, Get, UseGuards, Request, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@UseGuards(JwtAuthGuard)
@Controller('rapport')
export class RapportController {
  private readonly logger = new Logger(RapportController.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
    private config: ConfigService,
  ) {}

  @Get('hebdo')
  async getRapportHebdo(@Request() req: any) {
    const userId = req.user.id;
    const user = await this.userRepo.findOne({ where: { id: userId } });

    // Dates semaine courante (lundi → dimanche)
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Semaine précédente
    const prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
    const prevSunday = new Date(sunday);
    prevSunday.setDate(sunday.getDate() - 7);

    // Récupérer transactions caisse semaine courante
    let ventesParJour: Record<string, number> = { Lun: 0, Mar: 0, Mer: 0, Jeu: 0, Ven: 0, Sam: 0, Dim: 0 };
    let totalVentes = 0;
    let totalDepenses = 0;
    let ventesSemainePrecedente = 0;

    try {
      // Ventes semaine courante
      const ventesRows = await this.dataSource.query(`
        SELECT DATE(created_at) as jour, SUM(amount) as total
        FROM wallet_transactions
        WHERE user_id = $1
          AND type = 'credit'
          AND created_at >= $2 AND created_at <= $3
        GROUP BY DATE(created_at)
      `, [userId, monday.toISOString(), sunday.toISOString()]);

      const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      for (const row of ventesRows) {
        const d = new Date(row.jour);
        const nomJour = JOURS[d.getDay()];
        ventesParJour[nomJour] = (ventesParJour[nomJour] || 0) + Number(row.total);
        totalVentes += Number(row.total);
      }

      // Dépenses semaine courante
      const depRows = await this.dataSource.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM wallet_transactions
        WHERE user_id = $1 AND type = 'debit'
          AND created_at >= $2 AND created_at <= $3
      `, [userId, monday.toISOString(), sunday.toISOString()]);
      totalDepenses = Number(depRows[0]?.total || 0);

      // Ventes semaine précédente
      const prevRows = await this.dataSource.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM wallet_transactions
        WHERE user_id = $1 AND type = 'credit'
          AND created_at >= $2 AND created_at <= $3
      `, [userId, prevMonday.toISOString(), prevSunday.toISOString()]);
      ventesSemainePrecedente = Number(prevRows[0]?.total || 0);

    } catch (e) {
      this.logger.error('weekly wallet query failed', e instanceof Error ? e.stack : String(e));
    }

    // Meilleur jour
    const meilleurJourNom = Object.entries(ventesParJour).sort((a, b) => b[1] - a[1])[0];
    const meilleurJour = meilleurJourNom[1] > 0 ? {
      date: meilleurJourNom[0],
      montant: meilleurJourNom[1],
      nom: meilleurJourNom[0],
    } : null;

    // Evolution vs semaine précédente
    const evolution = ventesSemainePrecedente > 0
      ? Math.round(((totalVentes - ventesSemainePrecedente) / ventesSemainePrecedente) * 100)
      : 0;

    // Rapport vocal texte
    const prenom = user?.firstName || 'Ma chère';
    const rapportVocal = totalVentes > 0
      ? `Bonjour ${prenom} ! Cette semaine tu as fait ${totalVentes.toLocaleString('fr-FR')} francs CFA de ventes. ` +
        `${evolution >= 0 ? 'C\'est' + evolution + '% de plus' : 'C\'est' + Math.abs(evolution) + '% de moins'} que la semaine dernière. ` +
        (meilleurJour ? `Ton meilleur jour c\'était le ${meilleurJour.nom} avec ${meilleurJour.montant.toLocaleString('fr-FR')} francs CFA. ` : '') +
        `Continue comme ça !`
      : `Bonjour ${prenom} ! Pas encore de ventes enregistrées cette semaine. Ouvre ta journée et commence à vendre !`;

    // TTS ElevenLabs pour le rapport vocal
    let audioBase64 = '';
    try {
      const apiKey = this.config.get('ELEVENLABS_API_KEY');
      const voiceId = this.config.get('ELEVENLABS_VOICE_ID') || 'Z6q6fRauBHtc4E9CUCbD';
      if (apiKey) {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: rapportVocal,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });
        if (res.ok) {
          audioBase64 = Buffer.from(await res.arrayBuffer()).toString('base64');
        }
      }
    } catch (error) {
      this.logger.error('rapport TTS generation failed', error instanceof Error ? error.stack : String(error));
    }

    return {
      semaine: {
        debut: monday.toISOString().split('T')[0],
        fin: sunday.toISOString().split('T')[0],
      },
      ventes: totalVentes,
      depenses: totalDepenses,
      ventesSemainePrecedente,
      evolution,
      meilleurJour,
      ventesParJour,
      objectifsAtteints: 0,
      totalObjectifs: 0,
      rapportVocal,
      audioBase64,
    };
  }
}
