import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sprout } from 'lucide-react';
import { useProducteur } from '../../contexts/ProducteurContext';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import {
  IMG_PRODUIT_TOMATE as imgTomate, IMG_PRODUIT_AUBERGINE as imgAubergine,
  IMG_PRODUIT_PIMENT as imgPiment, IMG_PRODUIT_GOMBO as imgGombo,
  IMG_PRODUIT_MANIOC as imgManioc, IMG_PRODUIT_IGNAME as imgIgname,
  IMG_PRODUIT_MAIS as imgMais, IMG_PRODUIT_RIZ as imgRiz,
  IMG_PRODUIT_BANANE as imgBanane, IMG_PRODUIT_OIGNON as imgOignon,
  IMG_PRODUIT_AVOCAT as imgAvocat, IMG_PRODUIT_AUTRE as imgAutre
} from '../../assets/images';

interface CreerPlantationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR = '#2E8B57';

const CULTURES = [
  { id: 'Tomate',          img: imgTomate    },
  { id: 'Aubergine',       img: imgAubergine },
  { id: 'Piment',          img: imgPiment    },
  { id: 'Gombo',           img: imgGombo     },
  { id: 'Manioc',          img: imgManioc    },
  { id: 'Igname',          img: imgIgname    },
  { id: 'Maïs',            img: imgMais      },
  { id: 'Riz',             img: imgRiz       },
  { id: 'Banane plantain', img: imgBanane    },
  { id: 'Oignon',          img: imgOignon    },
  { id: 'Avocat',          img: imgAvocat    },
  { id: 'autre',           img: imgAutre     },
];

const MOIS_OPTIONS = [2, 3, 4, 6];

export function CreerPlantationModal({ isOpen, onClose }: CreerPlantationModalProps) {
  const { createCycle } = useProducteur();
  const { speak } = useApp();

  const [culture, setCulture] = useState('');
  const [surface, setSurface] = useState(1);
  const [autreCulture, setAutreCulture] = useState('');
  const [datePlantation, setDatePlantation] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [moisAvantRecolte, setMoisAvantRecolte] = useState(3);
  const [quantiteEstimee, setQuantiteEstimee] = useState(1000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreer = async () => {
    if (!culture.trim()) {
      toast.error('Choisis un type de culture avant de continuer.');
      speak('Choisis d\'abord une culture.'); // voix : le producteur ne lit pas le bandeau
      return;
    }
    if (culture === 'autre' && !autreCulture.trim()) {
      toast.error('Précise le nom de la culture dans le champ "Autre".');
      speak('Dis-moi le nom de la culture.');
      return;
    }
    setIsSubmitting(true);
    const dateRecolte = new Date(datePlantation);
    dateRecolte.setMonth(dateRecolte.getMonth() + moisAvantRecolte);

    try {
      await createCycle({
        culture: culture === 'autre' ? autreCulture.trim() : culture.trim(),
        surface,
        date_plantation: datePlantation,
        date_recolte_estimee: dateRecolte.toISOString().split('T')[0],
        quantite_estimee: quantiteEstimee,
      });
      setIsSubmitting(false);
      speak('C\'est fait ! Ta plantation est créée.'); // confirmation parlée
      onClose();
      setCulture('');
      setAutreCulture('');
      setSurface(1);
      setQuantiteEstimee(1000);
      setMoisAvantRecolte(3);
    } catch (error: unknown) {
      setIsSubmitting(false);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la création de la plantation';
      if (errorMessage.toLowerCase().includes('connecter') || errorMessage.toLowerCase().includes('auth')) {
        toast.error('Tu dois te connecter à ton compte JULABA pour créer une plantation. Vérifie ta connexion internet et réessaie.');
        speak('Tu dois être connectée. Vérifie ton réseau et réessaie.');
      } else {
        toast.error(errorMessage);
        speak("Ça n'a pas marché. Réessaie, s'il te plaît.");
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-3xl shadow-2xl z-[210] overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            {/* Header vert */}
            <div className="bg-gradient-to-r from-[#2E8B57] to-[#3BA869] px-6 py-5 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <Sprout className="w-6 h-6" strokeWidth={2.5} />
                  Nouvelle plantation
                </h2>
                <p className="text-white/85 text-sm mt-1">Enregistre ta nouvelle culture</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40 transition-colors mt-0.5"
              >
                <X className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
              <div className="p-5 space-y-6 bg-white">

                {/* ── Produit ── */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Quel produit tu plantes ?
                  </label>

                  {/* Grille 4 colonnes d'icônes */}
                  <div className="grid grid-cols-4 gap-2">
                    {CULTURES.map((c) => {
                      const isSelected = culture === c.id;
                      return (
                        <motion.button
                          key={c.id}
                          onClick={() => { setCulture(c.id); speak(c.id); }}
                          className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 px-1 border-2 transition-all ${
                            isSelected
                              ? 'border-transparent shadow-lg'
                              : 'bg-white border-gray-200 hover:border-green-300'
                          }`}
                          style={isSelected ? { backgroundColor: `${COLOR}18`, borderColor: COLOR } : {}}
                          whileTap={{ scale: 0.92 }}
                          whileHover={{ scale: 1.04, y: -2 }}
                        >
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-white shadow-sm' : 'bg-gray-50'
                            }`}
                          >
                            <img
                              src={c.img}
                              alt={c.id}
                              className="w-9 h-9 object-contain"
                            />
                          </div>
                          <span
                            className="text-[10px] font-bold leading-tight text-center"
                            style={{ color: isSelected ? COLOR : '#6b7280' }}
                          >
                            {c.id}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Champ saisie manuelle si "Autre" sélectionné */}
                  <AnimatePresence>
                    {culture === 'autre' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-3"
                      >
                        <input
                          type="text"
                          placeholder="Ex: Tomate cerise, Piment oiseau..."
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-green-500 focus:outline-none font-semibold text-base text-gray-900 bg-white placeholder:text-gray-400"
                          autoFocus
                          value={autreCulture}
                          onChange={e => setAutreCulture(e.target.value)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Surface ── */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Combien d'hectares ?
                  </label>
                  <input
                    type="number"
                    value={surface}
                    onChange={(e) => setSurface(Number(e.target.value))}
                    min={0.1}
                    step={0.1}
                    className="w-full px-4 py-4 rounded-2xl border border-gray-300 focus:border-green-500 focus:outline-none font-black text-3xl text-gray-900 bg-white"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    1 hectare = 1 terrain de foot
                  </p>
                </div>

                {/* ── Date plantation ── */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Quand as-tu planté ?
                  </label>
                  <input
                    type="date"
                    value={datePlantation}
                    onChange={(e) => setDatePlantation(e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl border border-gray-300 focus:border-green-500 focus:outline-none font-semibold text-lg text-gray-900 bg-white"
                  />
                </div>

                {/* ── Durée récolte ── */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Dans combien de mois tu récoltes ?
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {MOIS_OPTIONS.map((mois) => (
                      <motion.button
                        key={mois}
                        onClick={() => { setMoisAvantRecolte(mois); speak(`${mois} mois`); }}
                        className={`py-3 rounded-full font-bold text-sm border-2 transition-all ${
                          moisAvantRecolte === mois
                            ? 'bg-[#2E8B57] border-[#2E8B57] text-white shadow-md'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-green-400'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        {mois} mois
                      </motion.button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={moisAvantRecolte}
                    onChange={(e) => setMoisAvantRecolte(Number(e.target.value))}
                    min={1}
                    max={24}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-green-500 focus:outline-none font-black text-2xl text-gray-900 bg-white"
                  />
                </div>

                {/* ── Quantité estimée ── */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Combien de kg tu penses récolter ?
                  </label>
                  <input
                    type="number"
                    value={quantiteEstimee}
                    onChange={(e) => setQuantiteEstimee(Number(e.target.value))}
                    min={1}
                    step={100}
                    className="w-full px-4 py-4 rounded-2xl border border-gray-300 focus:border-green-500 focus:outline-none font-black text-3xl text-gray-900 bg-white"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    C'est une estimation, tu pourras la modifier
                  </p>
                </div>

                {/* ── Boutons ── */}
                <div className="flex gap-3 pt-2 pb-2">
                  <button
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors text-base"
                  >
                    Annuler
                  </button>
                  <motion.button
                    onClick={handleCreer}
                    disabled={isSubmitting || !culture.trim()}
                    className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50 transition-all text-base"
                    style={{ backgroundColor: '#2E8B57' }}
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {isSubmitting ? 'Création...' : 'Créer'}
                  </motion.button>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}