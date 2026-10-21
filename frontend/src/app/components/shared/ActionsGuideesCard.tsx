/**
 * ✅ ACTIONS GUIDÉES CARD
 * 
 * Composant affichant 3 actions prioritaires pour augmenter le score
 * Actions cliquables avec navigation directe
 */

import React from 'react';
import { CheckCircle2, Circle, ChevronRight, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { ScoreAction } from '../../hooks/useScoreJULABA';

interface ActionsGuideesCardProps {
  actions: ScoreAction[];
  primaryColor: string;
  onActionClick?: (action: ScoreAction) => void;
}

export function ActionsGuideesCard({
  actions,
  primaryColor,
  onActionClick,
}: ActionsGuideesCardProps) {
  const navigate = useNavigate();

  const handleActionClick = (action: ScoreAction) => {
    if (action.completed) return;

    onActionClick?.(action);

    if (action.onClick) {
      action.onClick();
    } else if (action.route) {
      navigate(action.route);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5" style={{ color: primaryColor }} />
        <h3 className="font-bold text-base text-gray-900">
          3 actions pour augmenter ton score
        </h3>
      </div>

      {/* Actions list */}
      <div className="space-y-2">
        {actions.slice(0, 3).map((action, index) => (
          <motion.button
            key={action.id}
            onClick={() => handleActionClick(action)}
            disabled={action.completed}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={action.completed ? {} : { x: 5, scale: 1.02 }}
            whileTap={action.completed ? {} : { scale: 0.98 }}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
              action.completed
                ? 'bg-green-50 border-green-200 cursor-default'
                : 'bg-white border-gray-200 hover:border-current hover:shadow-md cursor-pointer'
            }`}
            style={{
              borderColor: action.completed ? '#BBF7D0' : undefined,
            }}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <div className="flex-shrink-0 mt-0.5">
                {action.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p 
                    className={`font-bold text-sm ${
                      action.completed ? 'text-green-700 line-through' : 'text-gray-900'
                    }`}
                  >
                    {action.label}
                  </p>
                  <div 
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      action.completed ? 'bg-green-200' : 'bg-gray-100'
                    }`}
                  >
                    <Zap 
                      className={`w-3 h-3 ${
                        action.completed ? 'text-green-700' : ''
                      }`}
                      style={{ color: action.completed ? undefined : primaryColor }}
                    />
                    <span 
                      className={`text-xs font-bold ${
                        action.completed ? 'text-green-700' : ''
                      }`}
                      style={{ color: action.completed ? undefined : primaryColor }}
                    >
                      +{action.points}
                    </span>
                  </div>
                </div>
                <p 
                  className={`text-xs ${
                    action.completed ? 'text-green-600' : 'text-gray-600'
                  }`}
                >
                  {action.description}
                </p>
              </div>

              {/* Arrow */}
              {!action.completed && (
                <ChevronRight 
                  className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"
                />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="pt-2"
      >
        <button
          onClick={() => {
            const firstIncompleteAction = actions.find(a => !a.completed);
            if (firstIncompleteAction) {
              handleActionClick(firstIncompleteAction);
            }
          }}
          className="w-full py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all"
          style={{ backgroundColor: primaryColor }}
        >
          Améliorer mon score
        </button>
      </motion.div>
    </div>
  );
}