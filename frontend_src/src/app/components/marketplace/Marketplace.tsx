import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, MapPin, Star } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { API_URL } from '../../utils/api';

// Données chargées depuis /api/v1/produits

const ROLE_COLORS = {
  marchand: '#C46210',
  producteur: '#00563B',
  cooperative: '#2072AF',
  institution: '#702963',
};

export function Marketplace() {
  const { user, speak } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/caisse/produits`, { headers: { } })
      .then(r => r.json())
      .then(d => {
        const list = d.produits || d.data || (Array.isArray(d) ? d : []);
        setItems(list.map((p: any) => ({
          id: p.id,
          sellerId: p.marchand_id || '',
          sellerName: p.marchand_nom || 'Vendeur',
          sellerRole: 'marchand' as const,
          sellerScore: 80,
          productName: p.nom,
          quantity: parseFloat(p.stock) || 0,
          price: parseFloat(p.prix) || 0,
          region: p.region || '',
          commune: p.commune || '',
          photo: p.image || '',
          available: p.actif !== false,
          createdAt: p.created_at || '',
        })));
      })
      .catch(() => setItems([]));
  }, []);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = !selectedRegion || item.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const handleItemClick = (item: any) => {
    speak(`${item.productName}, ${item.quantity} kilogrammes à ${item.price} francs CFA le kilo. Vendeur: ${item.sellerName}, score ${item.sellerScore} sur 100`);
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Marketplace 🛒
        </h1>
        <p className="text-gray-600">Produits vivriers disponibles</p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="pl-12 h-14 rounded-2xl"
          />
        </div>
      </motion.div>

      {/* Region Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedRegion(null)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
              !selectedRegion
                ? 'text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={!selectedRegion ? { backgroundColor: user ? ROLE_COLORS[user.role] : '#C46210' } : {}}
          >
            Toutes les régions
          </button>
          {['Abidjan', 'Bouaké', 'San Pedro', 'Yamoussoukro'].map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                selectedRegion === region
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={selectedRegion === region ? { backgroundColor: user ? ROLE_COLORS[user.role] : '#C46210' } : {}}
            >
              {region}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Items Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {filteredItems.length === 0 ? (
          <Card className="p-8 rounded-2xl text-center">
            <p className="text-gray-500">Aucun produit trouvé</p>
            <p className="text-sm text-gray-400 mt-1">Essaye une autre recherche</p>
          </Card>
        ) : (
          filteredItems.map((item) => (
            <Card
              key={item.id}
              className="p-5 rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleItemClick(item)}
            >
              <div className="flex gap-4">
                {/* Product Image Placeholder */}
                <div
                  className="w-24 h-24 rounded-xl flex items-center justify-center text-4xl flex-shrink-0"
                  style={{ backgroundColor: `${ROLE_COLORS[item.sellerRole]}20` }}
                >
                  {item.productName.includes('Riz') ? '🌾' : 
                   item.productName.includes('Maïs') ? '🌽' : 
                   item.productName.includes('Igname') ? '🥔' : '🌱'}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">
                      {item.productName}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="rounded-lg flex-shrink-0"
                      style={{ backgroundColor: `${ROLE_COLORS[item.sellerRole]}20`, color: ROLE_COLORS[item.sellerRole] }}
                    >
                      {item.sellerRole}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{item.region}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: ROLE_COLORS[item.sellerRole] }}>
                        {item.price} FCFA
                      </p>
                      <p className="text-xs text-gray-500">par kg</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.quantity} kg disponibles
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">{item.sellerScore}/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Vendeur: <span className="font-semibold text-gray-700">{item.sellerName}</span>
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </motion.div>
    </div>
  );
}