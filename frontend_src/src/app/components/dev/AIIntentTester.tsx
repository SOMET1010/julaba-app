/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA - Testeur Moteur d'Intention IA
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Composant de développement pour tester le moteur d'intention IA
 * Permet de tester rapidement différents messages et voir les résultats
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, Loader2, CheckCircle2, XCircle, Sparkles, Activity } from 'lucide-react';
import aiIntentService, { type IntentResponse } from '../../services/aiIntentService';

const TEST_MESSAGES = [
  { role: 'marchand', message: 'Je veux vendre 200kg de cacao' },
  { role: 'marchand', message: 'Combien j\'ai gagné aujourd\'hui ?' },
  { role: 'marchand', message: 'Ajouter 5 sacs de riz au panier' },
  { role: 'producteur', message: 'Ma récolte de 3 tonnes de café est prête' },
  { role: 'producteur', message: 'Combien vaut ma récolte ?' },
  { role: 'cooperative', message: 'Combien de membres actifs ?' },
  { role: 'identificateur', message: 'Identifier un nouveau producteur' },
  { role: 'marchand', message: 'J\'ai besoin d\'aide' },
  { role: 'marchand', message: 'Voir mon stock' },
  { role: 'marchand', message: 'euh... comment ça marche ?' },
];

export function AIIntentTester() {
  const [customMessage, setCustomMessage] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('marchand');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<IntentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);

  const analyzeMessage = async (message: string, role: string) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setMetadata(null);

    try {
      const response = await aiIntentService.interpret({
        message,
        role,
        screen: '/test',
        userId: 'test-user',
        context: { test: true },
      });

      if (response.success && response.result) {
        setResult(response.result);
        setMetadata(response.metadata);
      } else {
        setError(response.error || 'Erreur inconnue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customMessage.trim()) {
      analyzeMessage(customMessage, selectedRole);
    }
  };

  const handleTestClick = (testMessage: string, role: string) => {
    setCustomMessage(testMessage);
    setSelectedRole(role);
    analyzeMessage(testMessage, role);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-lg p-6 mb-6 border-2 border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Testeur Moteur d'Intention IA
            </h1>
          </div>
          <p className="text-gray-600">
            Testez le moteur d'analyse Tata Nanti Lou avec différents messages
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section gauche - Formulaire */}
          <div className="space-y-6">
            {/* Formulaire custom */}
            <div className="bg-white rounded-3xl shadow-lg p-6 border-2 border-blue-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Message personnalisé
              </h2>

              <form onSubmit={handleCustomSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rôle utilisateur
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="marchand">Marchand</option>
                    <option value="producteur">Producteur</option>
                    <option value="cooperative">Coopérative</option>
                    <option value="identificateur">Identificateur</option>
                    <option value="institution">Institution</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Écris ton message ici..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none resize-none"
                    rows={4}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={isAnalyzing || !customMessage.trim()}
                  className="w-full px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Analyser
                    </>
                  )}
                </motion.button>
              </form>
            </div>

            {/* Messages de test prédéfinis */}
            <div className="bg-white rounded-3xl shadow-lg p-6 border-2 border-green-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Messages de test rapides
              </h2>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {TEST_MESSAGES.map((test, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleTestClick(test.message, test.role)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 hover:border-green-400 transition-all"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          {test.role}
                        </p>
                        <p className="text-sm text-gray-900 truncate">
                          {test.message}
                        </p>
                      </div>
                      <Send className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Section droite - Résultats */}
          <div className="space-y-6">
            {/* Résultat */}
            {isAnalyzing && (
              <motion.div
                className="bg-white rounded-3xl shadow-lg p-6 border-2 border-blue-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  <div>
                    <p className="font-bold text-gray-900">Analyse en cours...</p>
                    <p className="text-sm text-gray-500">GPT-4o-mini réfléchit</p>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                className="bg-white rounded-3xl shadow-lg p-6 border-2 border-red-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-1">Erreur</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                className="bg-white rounded-3xl shadow-lg p-6 border-2 border-green-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 mb-1">Analyse réussie</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {result.message}
                    </p>
                  </div>
                </div>

                {/* Détails */}
                <div className="space-y-3">
                  {/* Intent */}
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-xs font-semibold text-blue-600 mb-1">
                      INTENTION DÉTECTÉE
                    </p>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <p className="font-bold text-blue-900 capitalize">
                        {result.intent.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <p className="text-xs font-semibold text-purple-600 mb-2">
                      CONFIANCE
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-white rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${result.confidence * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <span className="font-bold text-purple-900">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Entity & Action */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-orange-50 rounded-xl">
                      <p className="text-xs font-semibold text-orange-600 mb-1">
                        ENTITÉ
                      </p>
                      <p className="font-bold text-orange-900 capitalize">
                        {result.entity}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl">
                      <p className="text-xs font-semibold text-green-600 mb-1">
                        ACTION
                      </p>
                      <p className="font-bold text-green-900 uppercase">
                        {result.action}
                      </p>
                    </div>
                  </div>

                  {/* Paramètres */}
                  {Object.keys(result.parameters).length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs font-semibold text-gray-600 mb-2">
                        PARAMÈTRES EXTRAITS
                      </p>
                      <div className="space-y-1">
                        {Object.entries(result.parameters).map(([key, value]) =>
                          value ? (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 capitalize">
                                {key}:
                              </span>
                              <span className="text-sm font-semibold text-gray-900">
                                {value}
                              </span>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}

                  {/* Confirmation requise */}
                  <div className="p-3 bg-yellow-50 rounded-xl flex items-center gap-2">
                    <p className="text-xs font-semibold text-yellow-600">
                      CONFIRMATION:
                    </p>
                    <span className="font-bold text-yellow-900">
                      {result.requiresConfirmation ? 'OUI' : 'NON'}
                    </span>
                  </div>

                  {/* Metadata */}
                  {metadata && (
                    <div className="p-3 bg-indigo-50 rounded-xl">
                      <p className="text-xs font-semibold text-indigo-600 mb-2">
                        MÉTADONNÉES
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-600">Modèle:</span>
                          <span className="font-semibold text-indigo-900">
                            {metadata.model}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-600">Tokens:</span>
                          <span className="font-semibold text-indigo-900">
                            {metadata.tokens}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-600">Timestamp:</span>
                          <span className="font-semibold text-indigo-900">
                            {new Date(metadata.timestamp).toLocaleTimeString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* JSON brut */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-600 hover:text-gray-900">
                    Voir JSON brut
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-900 text-green-400 rounded-xl text-xs overflow-auto">
                    {JSON.stringify({ result, metadata }, null, 2)}
                  </pre>
                </details>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}