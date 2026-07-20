import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, ShieldAlert, AlertTriangle, Info, CheckCircle2,
  Clock, X, Check, CheckCheck, Filter, Trash2, RefreshCw,
  Eye, MapPin, Users, Wallet, Activity, UserPlus, BookOpen,
  Zap, Volume2, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';

type NotifLevel = 'critical' | 'warning' | 'info' | 'success';
type NotifCategory = 'all' | 'fraude' | 'dossiers' | 'systeme' | 'transactions' | 'academy';

interface Notification {
  id: string;
  level: NotifLevel;
  category: NotifCategory;
  titre: string;
  desc: string;
  region: string;
  temps: string;
  lu: boolean;
  icon: any;
  action?: string;
  actionLabel?: string;
}

const NOTIF_CONFIG: Record<NotifLevel, { bg: string; border: string; text: string; dot: string; label: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: '#EF4444', label: 'Critique' },
  warning: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: '#F97316', label: 'Avertissement' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: '#3B82F6', label: 'Information' },
  success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: '#10B981', label: 'Succès' },
};

const CATEGORY_LABELS: Record<NotifCategory, string> = {
  all: 'Toutes',
  fraude: 'Fraude',
  dossiers: 'Dossiers',
  systeme: 'Système',
  transactions: 'Transactions',
  academy: 'Academy',
};

export function BONotifications() {
  const navigate = useNavigate();
  const { speak: appSpeak } = useApp();
  const speak = (text: string) => (typeof appSpeak === 'function' ? appSpeak(text) : Promise.resolve());
  const _boCtx = useBackOffice();
  const dossiers = Array.isArray(_boCtx.dossiers) ? _boCtx.dossiers : [];
  const zones = Array.isArray(_boCtx.zones) ? _boCtx.zones : [];
  const acteurs = Array.isArray(_boCtx.acteurs) ? _boCtx.acteurs : [];
  const auditLogs = Array.isArray(_boCtx.auditLogs) ? _boCtx.auditLogs : [];
  const { boUser, hasPermission } = _boCtx;

  // Générer les notifications depuis les vraies données
  const generatedNotifs = React.useMemo((): Notification[] => {
    const list: Notification[] = [];
    let idCounter = 1;

    // Dossiers en attente
    const pending = dossiers.filter(d => d.statut === 'pending');
    if (pending.length > 0) {
      list.push({
        id: `gen_${idCounter++}`,
        level: 'warning',
        category: 'dossiers',
        lu: false,
        icon: Clock,
        titre: `${pending.length} dossier${pending.length > 1 ? 's' : ''} en attente de validation`,
        desc: `${pending.length} dossier${pending.length > 1 ? 's' : ''} nécessite${pending.length === 1 ? '' : 'nt'} votre validation.`,
        region: 'National',
        temps: 'maintenant',
        action: '/backoffice/enrolement',
        actionLabel: 'Traiter maintenant',
      });
    }

    // Acteurs suspendus
    const suspendus = acteurs.filter(a => a.statut === 'suspendu');
    if (suspendus.length > 0) {
      list.push({
        id: `gen_${idCounter++}`,
        level: 'critical',
        category: 'fraude',
        lu: false,
        icon: ShieldAlert,
        titre: `${suspendus.length} acteur${suspendus.length > 1 ? 's' : ''} suspendu${suspendus.length > 1 ? 's' : ''}`,
        desc: `${suspendus.map(a => `${a.prenoms} ${a.nom}`).slice(0, 3).join(', ')}${suspendus.length > 3 ? ` et ${suspendus.length - 3} autre(s)` : ''} - comptes suspendus.`,
        region: 'National',
        temps: 'maintenant',
        action: '/backoffice/acteurs',
        actionLabel: 'Voir acteurs',
      });
    }

    // Zones inactives
    const zonesInactives = zones.filter(z => z.statut === 'inactive');
    if (zonesInactives.length > 0) {
      list.push({
        id: `gen_${idCounter++}`,
        level: 'warning',
        category: 'systeme',
        lu: true,
        icon: MapPin,
        titre: `${zonesInactives.length} zone${zonesInactives.length > 1 ? 's' : ''} inactive${zonesInactives.length > 1 ? 's' : ''}`,
        desc: `Zone${zonesInactives.length > 1 ? 's' : ''} désactivée${zonesInactives.length > 1 ? 's' : ''} : ${zonesInactives.map(z => z.nom).slice(0, 3).join(', ')}.`,
        region: 'National',
        temps: 'maintenant',
        action: '/backoffice/zones',
        actionLabel: 'Voir zones',
      });
    }

    // Dossiers approuvés récemment (succès)
    const approuves = dossiers.filter(d => d.statut === 'approved');
    if (approuves.length > 0) {
      list.push({
        id: `gen_${idCounter++}`,
        level: 'success',
        category: 'dossiers',
        lu: true,
        icon: CheckCircle2,
        titre: `${approuves.length} dossier${approuves.length > 1 ? 's' : ''} approuvé${approuves.length > 1 ? 's' : ''}`,
        desc: `${approuves.length} acteur${approuves.length > 1 ? 's' : ''} validé${approuves.length > 1 ? 's' : ''} avec succès sur la plateforme.`,
        region: 'National',
        temps: 'récemment',
        action: '/backoffice/enrolement',
        actionLabel: 'Voir dossiers',
      });
    }

    // Derniers audit logs significatifs
    const recentLogs = auditLogs.slice(0, 3);
    recentLogs.forEach(log => {
      list.push({
        id: `gen_${idCounter++}`,
        level: 'info',
        category: 'systeme',
        lu: true,
        icon: Activity,
        titre: log.action,
        desc: `${log.utilisateurBO} - ${log.acteurImpacte || log.module}`,
        region: 'National',
        temps: new Date(log.date).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
        action: '/backoffice/audit',
        actionLabel: 'Voir logs',
      });
    });

    // Si aucune notification, afficher un message positif
    if (list.length === 0) {
      list.push({
        id: 'gen_empty',
        level: 'success',
        category: 'systeme',
        lu: true,
        icon: CheckCircle2,
        titre: 'Tout est en ordre',
        desc: 'Aucune alerte active. La plateforme fonctionne normalement.',
        region: 'National',
        temps: 'maintenant',
      });
    }

    return list;
  }, [dossiers, zones, acteurs, auditLogs]);

  const [notifs, setNotifs] = useState<Notification[]>([]);

  // Synchroniser avec les données générées
  React.useEffect(() => {
    setNotifs(generatedNotifs);
  }, [generatedNotifs]);

  const [category, setCategory] = useState<NotifCategory>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const filtered = notifs.filter(n => {
    const matchCat = category === 'all' || n.category === category;
    const matchRead = !showUnreadOnly || !n.lu;
    return matchCat && matchRead;
  });

  const unreadCount = notifs.filter(n => !n.lu).length;
  const criticalCount = notifs.filter(n => n.level === 'critical' && !n.lu).length;

  const markAsRead = async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
    } catch { }
  };

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })));
    try {
      await fetch(`${API_URL}/notifications/read-all`, { method: 'PATCH', credentials: 'include' });
    } catch { }
    toast.success('Toutes les notifications marquées comme lues');
  };

  const deleteNotif = async (id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    try {
      await fetch(`${API_URL}/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
    } catch { }
    toast.info('Notification supprimée');
  };

  const clearRead = () => {
    setNotifs(prev => prev.filter(n => !n.lu));
    toast.success('Notifications lues supprimées');
  };

  // Catégories avec compteurs
  const categoryCounts: Record<NotifCategory, number> = {
    all: notifs.filter(n => !n.lu).length,
    fraude: notifs.filter(n => n.category === 'fraude' && !n.lu).length,
    dossiers: notifs.filter(n => n.category === 'dossiers' && !n.lu).length,
    systeme: notifs.filter(n => n.category === 'systeme' && !n.lu).length,
    transactions: notifs.filter(n => n.category === 'transactions' && !n.lu).length,
    academy: notifs.filter(n => n.category === 'academy' && !n.lu).length,
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto space-y-5 overflow-hidden">

      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Centre de notifications</h1>
            {unreadCount > 0 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                className="px-2.5 py-1 rounded-full text-white text-xs font-black"
                style={{ backgroundColor: criticalCount > 0 ? '#EF4444' : BO_PRIMARY }}>
                {unreadCount}
              </motion.div>
            )}
          </div>
          <p className="text-sm text-gray-500">{unreadCount} non lues - {notifs.length} au total</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button onClick={() => speak(`Vous avez ${unreadCount} notifications non lues. ${criticalCount > 0 ? `Dont ${criticalCount} critiques nécessitant votre attention immédiate.` : ''}`)}
            className="w-10 h-10 rounded-2xl border-2 flex items-center justify-center"
            style={{ borderColor: `${BO_PRIMARY}40` }}
            whileTap={{ scale: 0.9 }}>
            <motion.div animate={isSpeaking ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}>
              <Volume2 className="w-5 h-5" style={{ color: BO_PRIMARY }} />
            </motion.div>
          </motion.button>
          {unreadCount > 0 && (
            <motion.button onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 font-bold text-sm text-gray-700 border-gray-200 hover:border-gray-300 transition-all"
              whileTap={{ scale: 0.97 }}>
              <CheckCheck className="w-4 h-4" /> Tout lire
            </motion.button>
          )}
          <motion.button onClick={clearRead}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm text-white shadow-lg"
            style={{ backgroundColor: BO_DARK }}
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            <Trash2 className="w-4 h-4" /> Nettoyer
          </motion.button>
        </div>
      </motion.div>

      {/* Alerte critique globale */}
      <AnimatePresence>
        {criticalCount > 0 && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            className="flex items-center gap-4 p-4 rounded-2xl border-2 border-red-200 bg-red-50">
            <motion.div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-red-500"
              animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <ShieldAlert className="w-6 h-6 text-white" />
            </motion.div>
            <div className="flex-1">
              <p className="font-black text-red-700">{criticalCount} alerte{criticalCount > 1 ? 's' : ''} critique{criticalCount > 1 ? 's' : ''} non traitée{criticalCount > 1 ? 's' : ''}</p>
              <p className="text-sm text-red-600">Ces alertes nécessitent une action immédiate de votre part.</p>
            </div>
            <motion.button onClick={() => { setCategory('fraude'); setShowUnreadOnly(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              Voir <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtres catégories + toggle lu/non-lu */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(CATEGORY_LABELS) as NotifCategory[]).map(cat => {
            const count = categoryCounts[cat];
            return (
              <motion.button key={cat} onClick={() => setCategory(cat)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all"
                style={{
                  borderColor: category === cat ? BO_PRIMARY : '#e5e7eb',
                  backgroundColor: category === cat ? `${BO_PRIMARY}15` : 'white',
                  color: category === cat ? BO_PRIMARY : '#6b7280',
                }}
                whileTap={{ scale: 0.95 }}>
                {CATEGORY_LABELS[cat]}
                {count > 0 && (
                  <span className="w-4 h-4 rounded-full text-white text-[9px] font-black flex items-center justify-center"
                    style={{ backgroundColor: cat === 'fraude' ? '#EF4444' : BO_PRIMARY }}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
        <motion.button onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all"
          style={{ borderColor: showUnreadOnly ? BO_PRIMARY : '#e5e7eb', backgroundColor: showUnreadOnly ? `${BO_PRIMARY}15` : 'white', color: showUnreadOnly ? BO_PRIMARY : '#6b7280' }}
          whileTap={{ scale: 0.95 }}>
          <Eye className="w-3.5 h-3.5" />
          Non lues seulement
        </motion.button>
      </div>

      {/* Liste notifications */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-3xl p-12 border-2 border-gray-100 text-center">
              <CheckCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-bold text-gray-500">Aucune notification dans cette catégorie</p>
              <p className="text-sm text-gray-400 mt-1">Vous êtes à jour !</p>
            </motion.div>
          ) : (
            filtered.map((notif, i) => {
              const Icon = notif.icon || Bell;
              const config = NOTIF_CONFIG[notif.level] ?? NOTIF_CONFIG.info;
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`rounded-2xl border-2 p-4 transition-all ${notif.lu ? 'bg-white border-gray-100' : config.bg + ' ' + config.border}`}
                  layout>
                  <div className="flex items-start gap-3">
                    {/* Indicateur non-lu */}
                    <div className="flex-shrink-0 pt-1">
                      {!notif.lu && (
                        <motion.div className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: config.dot }}
                          animate={{ scale: notif.level === 'critical' ? [1, 1.3, 1] : 1 }}
                          transition={{ duration: 1.5, repeat: notif.level === 'critical' ? Infinity : 0 }} />
                      )}
                      {notif.lu && <div className="w-2.5 h-2.5" />}
                    </div>

                    {/* Icône */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.lu ? 'bg-gray-100' : ''}`}
                      style={!notif.lu ? { backgroundColor: `${config.dot}20` } : {}}>
                      <Icon className="w-5 h-5" style={{ color: notif.lu ? '#9ca3af' : config.dot }} />
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`font-black text-sm ${notif.lu ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notif.titre}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notif.lu && (
                            <motion.button onClick={() => markAsRead(notif.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-green-50 transition-colors"
                              whileTap={{ scale: 0.9 }} title="Marquer comme lu">
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            </motion.button>
                          )}
                          <motion.button onClick={() => deleteNotif(notif.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                            whileTap={{ scale: 0.9 }} title="Supprimer">
                            <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </motion.button>
                        </div>
                      </div>
                      <p className={`text-xs leading-relaxed mb-2 ${notif.lu ? 'text-gray-400' : 'text-gray-600'}`}>
                        {notif.desc}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin className="w-3 h-3" />
                            {notif.region}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            {notif.temps}
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${notif.lu ? 'bg-gray-100 text-gray-400' : config.bg.replace('50', '100') + ' ' + config.text}`}>
                            {config.label}
                          </span>
                        </div>
                        {notif.action && notif.actionLabel && (
                          <motion.button
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-xl"
                            style={{ color: notif.level === 'critical' ? '#EF4444' : BO_PRIMARY, backgroundColor: notif.level === 'critical' ? '#FEF2F2' : `${BO_PRIMARY}10` }}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={() => { void markAsRead(notif.id); if (notif.action) navigate(notif.action); }}>
                            {notif.actionLabel}
                            <ArrowRight className="w-3 h-3" />
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Résumé en bas */}
      {filtered.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-white rounded-2xl p-4 border-2 border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400 font-semibold">{filtered.length} notification{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}</p>
          <div className="flex items-center gap-4 text-xs">
            {(['critical', 'warning', 'info', 'success'] as NotifLevel[]).map(level => {
              const count = filtered.filter(n => n.level === level).length;
              if (count === 0) return null;
              const cfg = NOTIF_CONFIG[level] ?? NOTIF_CONFIG.info;
              return (
                <div key={level} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
                  <span className="font-semibold text-gray-500">{cfg.label} : {count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}