import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sprout, MapPin, CalendarClock, Package, Navigation as NavIcon, Store } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { SubPageLayout } from '../layout/SubPageLayout';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';

interface RecoltedPrevue {
  producteurId: string;
  producteurNom: string | null;
  culture: string;
  dateRecolteEstimee: string;
  quantiteEstimee: number;
  commune: string | null;
  distanceKm: number | null;
}

interface RecoltesPrevuesResponse {
  cooperative: { id: string; nom: string; commune: string | null } | null;
  recoltes: RecoltedPrevue[];
}

function formatDateFr(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function RecoltesPrevues() {
  const { user: appUser } = useApp();
  const isGrossiste = appUser?.role === 'marchand' && appUser?.sousProfilMarchand === 'grossiste';

  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [data, setData] = useState<RecoltesPrevuesResponse | null>(null);

  useEffect(() => {
    if (!isGrossiste) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setErreur(null);
    apiRequest<RecoltesPrevuesResponse>(API_URL, '/producteurs/recoltes-prevues', {
      method: 'GET',
      signal: controller.signal,
    })
      .then((res) => {
        setData(res);
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        const message = e instanceof Error ? e.message : 'Chargement impossible';
        setErreur(message);
      })
      .finally(() => {
        setLoading(false);
      });
    return () => controller.abort();
  }, [isGrossiste]);

  if (!isGrossiste) {
    return (
      <SubPageLayout role="marchand" title="Récoltes prévues">
        <div className="pt-2 pb-32 lg:pb-8 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen" style={{ backgroundColor: '#FFF2E9' }}>
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-[#C46210]" />
            </div>
            <p className="text-gray-700 font-bold mb-1">Réservé aux grossistes</p>
            <p className="text-sm text-gray-500">Cet écran est accessible uniquement aux marchands grossistes.</p>
          </div>
        </div>
      </SubPageLayout>
    );
  }

  return (
    <SubPageLayout role="marchand" title="Récoltes prévues">
      <div className="pt-2 pb-32 lg:pb-8 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen" style={{ backgroundColor: '#FFF2E9' }}>
        {data?.cooperative && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 bg-white rounded-2xl border-2 border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-[#C46210]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Ta coopérative de référence</p>
              <p className="font-bold text-gray-900 text-sm">
                {data.cooperative.nom}
                {data.cooperative.commune ? ` (${data.cooperative.commune})` : ''}
              </p>
            </div>
          </motion.div>
        )}

        <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-sm text-gray-600 text-center">
          Producteurs avec une récolte à venir, triés par proximité de ta coopérative
        </motion.p>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-10 h-10 border-4 border-[#C46210] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500">Chargement des récoltes prévues...</p>
          </div>
        )}

        {!loading && erreur && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-red-500 font-bold mb-1">Chargement impossible</p>
            <p className="text-sm text-gray-500">{erreur}</p>
          </div>
        )}

        {!loading && !erreur && data && data.recoltes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
              <Sprout className="w-8 h-8 text-[#C46210]" />
            </div>
            <p className="text-gray-700 font-bold mb-1">Aucune récolte prévue</p>
            <p className="text-sm text-gray-500">Aucun producteur n'a de récolte à venir pour le moment.</p>
          </div>
        )}

        {!loading && !erreur && data && data.recoltes.length > 0 && (
          <div className="space-y-3">
            {data.recoltes.map((r, index) => (
              <motion.div
                key={`${r.producteurId}-${r.dateRecolteEstimee}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-orange-50 via-white to-orange-50 rounded-3xl border-2 border-gray-200 shadow-md p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Sprout className="w-5 h-5 text-green-700" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{r.producteurNom || 'Producteur'}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {r.commune || 'Commune inconnue'}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C46210] text-white text-xs font-bold">
                      <NavIcon className="w-3 h-3" />
                      {r.distanceKm === null ? 'Distance inconnue' : `${r.distanceKm} km`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-xl border border-gray-100 p-2.5">
                    <p className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1"><Sprout className="w-3 h-3" />Culture</p>
                    <p className="font-bold text-gray-900 text-sm truncate">{r.culture}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-2.5">
                    <p className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1"><Package className="w-3 h-3" />Quantité</p>
                    <p className="font-bold text-gray-900 text-sm">{r.quantiteEstimee.toLocaleString('fr-FR')} kg</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 p-2.5">
                    <p className="text-[10px] text-gray-500 mb-0.5 flex items-center gap-1"><CalendarClock className="w-3 h-3" />Récolte</p>
                    <p className="font-bold text-gray-900 text-sm">{formatDateFr(r.dateRecolteEstimee)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SubPageLayout>
  );
}
