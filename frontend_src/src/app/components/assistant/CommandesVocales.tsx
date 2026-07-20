import React from 'react';
import { motion } from 'motion/react';
import { Mic, Check } from 'lucide-react';
import { TANTI_SAGESSE_CONFIGS, ModuleType } from '../../config/tantieSagesseConfig';

interface CommandesVocalesProps {
  module: ModuleType;
  onClose?: () => void;
}

export function CommandesVocales({ module, onClose }: CommandesVocalesProps) {
  const config = TANTI_SAGESSE_CONFIGS[module];

  return (
    <motion.div
      className="p-6 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: config.color }}
          >
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Commandes vocales</h2>
            <p className="text-sm text-gray-600">{config.name}</p>
          </div>
        </div>
        
        <p className="text-gray-700 bg-orange-50 p-4 rounded-xl border-l-4" style={{ borderColor: config.color }}>
          {config.welcomeMessage}
        </p>
      </div>

      {/* Available Commands */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Check className="w-5 h-5" style={{ color: config.color }} />
          Commandes disponibles ({config.voiceCommands.length})
        </h3>

        <div className="grid gap-3">
          {config.voiceCommands.map((command, index) => (
            <motion.div
              key={index}
              className="p-4 rounded-xl bg-white border-2 border-gray-200 hover:border-gray-300 transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 mt-1"
                  style={{ backgroundColor: config.color }}
                >
                  <Mic className="w-4 h-4" />
                </div>
                
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">
                    {command.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {command.patterns.map((pattern, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-lg bg-gray-100 text-xs font-mono text-gray-700"
                      >
                        "{pattern}"
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Suggestions */}
      {config.quickSuggestions.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold text-lg mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            {config.quickSuggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                className="p-3 rounded-xl border-2 text-center"
                style={{ borderColor: `${config.color}40`, backgroundColor: `${config.color}10` }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + (index * 0.05) }}
              >
                <p className="text-sm font-semibold text-gray-900">
                  {suggestion.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Context Info */}
      <div className="mt-8 p-4 rounded-xl bg-blue-50 border-l-4 border-blue-500">
        <p className="text-sm text-gray-700">
          <strong>Personnalité contextuelle :</strong> {config.personality}
        </p>
        {config.blockMessage && (
          <p className="text-sm text-gray-600 mt-2">
            <strong>Limitations :</strong> {config.blockMessage}
          </p>
        )}
      </div>
    </motion.div>
  );
}