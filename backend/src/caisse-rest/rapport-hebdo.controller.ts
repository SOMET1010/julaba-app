import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { OpenAIService } from '../voice/openai.service';
import { Logger } from '@nestjs/common';

@Controller('rapport')
@UseGuards(JwtAuthGuard)
export class RapportHebdoController {
  private readonly logger = new Logger(RapportHebdoController.name);

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private config: ConfigService,
    private openaiService: OpenAIService,
  ) {}

  @Get('hebdo')
  async getRapportHebdo(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const now = new Date();

    // Semaine courante (lundi → dimanche)
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Semaine précédente
    const prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
    const prevSunday = new Date(monday);
    prevSunday.setDate(monday.getDate() - 1);
    prevSunday.setHours(23, 59, 59, 999);

    // Transactions semaine courante
    const txCurrent = await this.dataSource.query(`
      SELECT type, montant, created_at, DATE(created_at) as jour
      FROM caisse_transactions
      -- UNE VENTE ANNULÉE NE COMPTE DANS AUCUN AGRÉGAT FINANCIER. Cette règle
      -- est tenue partout ailleurs (statsVente.venteComptee, VentesPassees,
      -- AppContext.getFinancialSummary) ; ce rapport était le SEUL à l'ignorer.
      -- Relevé le 18/09 : une vente de 15 000 F annulée le lundi restait dans
      -- le chiffre d'affaires ANNONCÉ À LA VOIX, et pouvait faire élire un
      -- « meilleur jour » qui n'a pas eu lieu. L'écran, lui, disait juste : la
      -- marchande entendait donc un chiffre que rien ne venait contredire.
      -- L'exclusion est faite EN SQL et non en JS : elle vaut ainsi pour TOUS
      -- les calculs de ce fichier, y compris ceux qu'on ajoutera demain.
      WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
        AND COALESCE(statut::text, 'validee') <> 'annulee'
      ORDER BY created_at DESC
    `, [userId, monday.toISOString(), sunday.toISOString()]);

    // Transactions semaine précédente
    const txPrev = await this.dataSource.query(`
      SELECT type, montant FROM caisse_transactions
      -- Même exclusion que la semaine courante : sans elle, la COMPARAISON
      -- entre les deux semaines serait faussée dans un sens ou dans l'autre.
      WHERE user_id = $1 AND created_at >= $2 AND created_at <= $3
        AND COALESCE(statut::text, 'validee') <> 'annulee'
    `, [userId, prevMonday.toISOString(), prevSunday.toISOString()]);

    // Objectifs semaine courante
    let objectifs: any[] = [];
    try {
      objectifs = await this.dataSource.query(`
        SELECT objectif, date FROM objectifs_journaliers
        WHERE "userId" = $1 AND date >= $2 AND date <= $3
      `, [userId, monday.toISOString().split('T')[0], sunday.toISOString().split('T')[0]]);
    } catch (e: any) {
      this.logger.warn(`[RAPPORT] objectifs_journaliers: ${e.message}`);
    }

    // Calculs
    const ventesCurrent = txCurrent.filter((t: any) => t.type === 'vente').reduce((s: number, t: any) => s + Number(t.montant), 0);
    const depensesCurrent = txCurrent.filter((t: any) => t.type === 'depense').reduce((s: number, t: any) => s + Number(t.montant), 0);
    const ventesPrev = txPrev.filter((t: any) => t.type === 'vente').reduce((s: number, t: any) => s + Number(t.montant), 0);

    // Meilleur jour
    const ventesParJour: Record<string, number> = {};
    txCurrent.filter((t: any) => t.type === 'vente').forEach((t: any) => {
      ventesParJour[t.jour] = (ventesParJour[t.jour] || 0) + Number(t.montant);
    });
    const meilleurJourEntry = Object.entries(ventesParJour).sort((a: any, b: any) => b[1] - a[1])[0];
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    // Objectifs atteints
    const objectifsAtteints = objectifs.filter((o: any) => {
      const venteJour = ventesParJour[o.date] || 0;
      return venteJour >= Number(o.objectif) && Number(o.objectif) > 0;
    }).length;

    // Evolution vs semaine précédente
    const evolution = ventesPrev > 0 ? Math.round(((ventesCurrent - ventesPrev) / ventesPrev) * 100) : 0;

    // Générer texte avec OpenAI GPT-4o
    let rapportVocal = '';
    try {
      const prompt = `Tu es Tata Nanti Lou, assistante vocale JULABA pour marchands ivoiriens.
Génère un rapport vocal hebdomadaire chaleureux et motivant en français ivoirien simple.
Données de la semaine:
- Total ventes: ${ventesCurrent.toLocaleString('fr-FR')} FCFA
- Total dépenses: ${depensesCurrent.toLocaleString('fr-FR')} FCFA
- Comparaison semaine précédente: ${evolution > 0 ? '+' : ''}${evolution}%
- Meilleur jour: ${meilleurJourEntry ? `${jours[new Date(meilleurJourEntry[0]).getDay()]} avec ${Number(meilleurJourEntry[1]).toLocaleString('fr-FR')} FCFA` : 'aucune vente cette semaine'}
- Objectifs atteints: ${objectifsAtteints} sur ${objectifs.length}
Le rapport doit faire 4-6 phrases max, être encourageant, mentionner les chiffres clés, et terminer par un conseil ou encouragement pour la semaine suivante.`;

      const openaiKey = this.config.get('OPENAI_API_KEY');
      if (!openaiKey) throw new Error('OPENAI_API_KEY non configurée');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        this.logger.error(`[RAPPORT] OpenAI ${res.status}: ${errBody}`);
        throw new Error(`OpenAI error ${res.status}`);
      }
      const data = await res.json() as any;
      rapportVocal = data.choices?.[0]?.message?.content || '';
    } catch (e: any) {
      this.logger.error(`[RAPPORT] GPT-4o échoué: ${e.message}`);
      rapportVocal = ventesCurrent > 0
        ? `Cette semaine tu as fait ${ventesCurrent.toLocaleString('fr-FR')} FCFA de ventes. Continue comme ça !`
        // "Ouvre ta journée..." sous-entendait que la caisse était bloquée sans ça —
        // trompeur : vendre n'a jamais été bloqué, l'ouverture est automatique
        // (cf. UniversalAccueil.tsx, MarchandAlertes.tsx).
        : `Pas encore de ventes cette semaine. Commence à vendre dès que tu veux !`;
    }

    // TTS via ElevenLabs
    let audioBase64 = '';
    if (rapportVocal) {
      try {
        const audioBuffer = await this.openaiService.synthesize(rapportVocal);
        audioBase64 = Buffer.from(audioBuffer).toString('base64');
      } catch (e: any) {
        this.logger.error(`[RAPPORT] TTS ElevenLabs échoué: ${e.message}`);
      }
    }

    return {
      semaine: { debut: monday.toISOString().split('T')[0], fin: sunday.toISOString().split('T')[0] },
      ventes: ventesCurrent,
      depenses: depensesCurrent,
      ventesSemainePrecedente: ventesPrev,
      evolution,
      meilleurJour: meilleurJourEntry ? { date: meilleurJourEntry[0], montant: Number(meilleurJourEntry[1]), nom: jours[new Date(meilleurJourEntry[0]).getDay()] } : null,
      ventesParJour,
      objectifsAtteints,
      totalObjectifs: objectifs.length,
      rapportVocal,
      audioBase64,
    };
  }
}
