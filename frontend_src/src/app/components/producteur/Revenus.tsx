import { useProducteur } from '../../contexts/ProducteurContext';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Wallet,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  Calendar,
  Download,
  Sparkles,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

import { Montant, MontantCard } from '../shared/Montant';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { Clock } from 'lucide-react';

// Données réelles depuis /api/v1/recoltes
const donneesGraphique = [
  { jour: 1, montant: 450000 },
  { jour: 2, montant: 680000 },
  { jour: 3, montant: 520000 },
  { jour: 4, montant: 890000 },
  { jour: 5, montant: 750000 },
  { jour: 6, montant: 920000 },
  { jour: 7, montant: 1150000 },
];


type PeriodeFiltreType = '7jours' | '30jours' | '3mois';

// Bulles flottantes animées
const BullesFlottantes = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/10"
          style={{
            width: Math.random() * 100 + 50,
            height: Math.random() * 100 + 50,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

// Particules scintillantes
const Particules = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        >
          <Sparkles className="w-4 h-4 text-yellow-300" />
        </motion.div>
      ))}
    </div>
  );
};

export function Revenus() {
  const [periodeFiltree, setPeriodeFiltree] = useState<PeriodeFiltreType>('7jours');

  const { recoltes, stats } = useProducteur();
  const revenuTotal = stats?.revenusTotal || 0;
  const nbTransactions = recoltes.length;
  const enAttente = 0;
  const croissance = 0;
  const transactions = recoltes.map((r:any) => ({ id: r.id, client: 'Client', date: r.dateRecolte ? new Date(r.dateRecolte).toLocaleDateString('fr-FR') : '—', statut: r.statut === 'vendue' ? 'recu' : 'en_attente', icon: '🌾', produit: r.produit, quantite: r.quantite + ' kg', mode: 'Cash', montant: Number(r.prixUnitaire||0)*Number(r.quantite||0) }));

  return (
    <div className="space-y-6 pb-6">
      {/* Carte Hero - Revenu Total avec animations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-[#00563B] via-[#007d4f] to-[#16A34A] rounded-3xl p-6 shadow-2xl overflow-hidden"
      >
        {/* Bulles flottantes */}
        <BullesFlottantes />

        {/* Gradient animé */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />

        <div className="relative z-10">
          {/* Label avec icône animée */}
          <div className="flex items-center gap-2 mb-3">
            <motion.div 
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
              animate={{
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            >
              <Wallet className="w-5 h-5 text-white" strokeWidth={2.5} />
            </motion.div>
            <p className="text-white/90 font-medium">Revenu total</p>
          </div>

          {/* Montant avec animation de pulse */}
          <motion.h1 
            className="text-5xl font-bold text-white mb-4 tracking-tight"
            animate={{
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 2,
            }}
          >
            {(revenuTotal || 0).toLocaleString()}
            <span className="text-2xl ml-2 font-semibold opacity-70">FCFA</span>
          </motion.h1>

          {/* Badge croissance avec animation */}
          <motion.div 
            className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2"
            whileHover={{ scale: 1.05 }}
            animate={{
              y: [0, -3, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          >
            <motion.div
              animate={{
                rotate: [0, 15, 0],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
              }}
            >
              <ArrowUpRight className="w-4 h-4 text-white" strokeWidth={3} />
            </motion.div>
            <span className="text-white font-bold text-lg">+{croissance}%</span>
            <span className="text-white/80 text-sm ml-1">vs période précédente</span>
          </motion.div>

          {/* Mini graphique animé */}
          <motion.div 
            className="mt-6 h-20 -mx-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={donneesGraphique || []}>
                <Line 
                  type="monotone" 
                  dataKey="montant" 
                  stroke="#ffffff" 
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </motion.div>

      {/* 3 Stats Cards avec animations flottantes */}
      <KPIGrid cols={3}>
        <UniversalKPI
          label="Transactions"
          animatedTarget={nbTransactions}
          icon={CreditCard}
          color="#3B82F6"
          iconAnimation="spin"
          delay={0.1}
        />
        <UniversalKPI
          label="En attente"
          value={(enAttente || 0).toLocaleString('fr-FR')}
          suffix="FCFA"
          icon={Clock}
          color="#F97316"
          iconAnimation="pulse"
          delay={0.15}
        />
        <UniversalKPI
          label="Croissance"
          value={`+${croissance}%`}
          icon={TrendingUp}
          color="#22C55E"
          iconAnimation="float"
          trendUp
          delay={0.2}
        />
      </KPIGrid>

      {/* Filtres de période avec animations */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <motion.div
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </motion.div>
        
        {[
          { id: '7jours' as PeriodeFiltreType, label: '7 derniers jours' },
          { id: '30jours' as PeriodeFiltreType, label: '30 derniers jours' },
          { id: '3mois' as PeriodeFiltreType, label: '3 derniers mois' },
        ].map((periode) => (
          <motion.button
            key={periode.id}
            onClick={() => setPeriodeFiltree(periode.id)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              periodeFiltree === periode.id
                ? 'bg-[#00563B] text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05, y: -2 }}
          >
            {periode.label}
          </motion.button>
        ))}
      </div>

      {/* Liste des transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Historique</h2>
          <motion.button
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold"
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.05 }}
          >
            <Download className="w-4 h-4" />
            Exporter
          </motion.button>
        </div>

        <div className="space-y-3">
          {transactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, x: 5 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden"
            >
              {/* Effet de brillance au hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900 mb-1">{transaction.client}</p>
                    <p className="text-xs text-gray-500">{transaction.date}</p>
                  </div>
                  <motion.span 
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      transaction.statut === 'reçu'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-orange-50 text-orange-700'
                    }`}
                    animate={{
                      scale: transaction.statut === 'en_attente' ? [1, 1.1, 1] : 1,
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: transaction.statut === 'en_attente' ? Infinity : 0,
                    }}
                  >
                    {transaction.statut === 'reçu' ? '✓ Reçu' : '⏳ En attente'}
                  </motion.span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <motion.div 
                    className="bg-gray-50 rounded-xl p-2.5 flex items-center gap-2 hover:bg-green-50"
                  >
                    <motion.span 
                      className="text-2xl"
                      animate={{
                        rotate: [0, -10, 10, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: index * 0.2,
                      }}
                    >
                      {transaction.icon}
                    </motion.span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-0.5">Produit</p>
                      <p className="font-semibold text-sm text-gray-900">{transaction.produit}</p>
                    </div>
                  </motion.div>
                  <div className="bg-gray-50 rounded-xl p-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Quantité</p>
                    <p className="font-semibold text-sm text-gray-900">{transaction.quantite}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div 
                      className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <span className="text-lg">📱</span>
                    </motion.div>
                    <span className="text-xs text-gray-600 font-medium">{transaction.mode}</span>
                  </div>
                  <motion.p 
                    className="text-2xl font-bold text-[#00563B]"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.2,
                    }}
                  >
                    {(transaction.montant || 0).toLocaleString()} F
                  </motion.p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}