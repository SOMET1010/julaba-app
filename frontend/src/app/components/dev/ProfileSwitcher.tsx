/**
 * JULABA -- ProfileSwitcher (MODE DEV UNIQUEMENT)
 * 
 * Composant de developpement permettant l'acces rapide a tous les profils
 * utilisateurs et au Back-Office sans authentification.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { X, Code, ChevronRight, ShieldCheck } from 'lucide-react';
import { useBackOfficeOptional, MOCK_BO_USERS, BORoleType } from '../../contexts/BackOfficeContext';
import { DEV_MOCK_USERS } from '../../data/mockUsers';

const PROFILE_STYLES: Record<string, { borderColor: string; bgColor: string; avatarColor: string; roleColor: string; roleLabel: string }> = {
  'marchand': { borderColor: '#F97316', bgColor: '#FFF7ED', avatarColor: '#10B981', roleColor: '#F97316', roleLabel: 'Marchand' },
  'producteur': { borderColor: '#10B981', bgColor: '#ECFDF5', avatarColor: '#8B5CF6', roleColor: '#10B981', roleLabel: 'Producteur' },
  'cooperative': { borderColor: '#3B82F6', bgColor: '#F0FDF4', avatarColor: '#10B981', roleColor: '#3B82F6', roleLabel: 'Cooperative' },
  'institution': { borderColor: '#F59E0B', bgColor: '#FEFCE8', avatarColor: '#3B82F6', roleColor: '#F59E0B', roleLabel: 'Institution' },
  'identificateur': { borderColor: '#8B5CF6', bgColor: '#FFF7ED', avatarColor: '#EF4444', roleColor: '#EC4899', roleLabel: 'Identificateur' },
};

export function ProfileSwitcher({ forceShow = false }: { forceShow?: boolean }) {
  const navigate = useNavigate();
  const { setUser: setAppUser } = useApp();
  const { setUser: setUserProfile } = useUser();
  const backOfficeContext = useBackOfficeOptional();
  const [isOpen, setIsOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState<string | null>(null);
  const [boLoading, setBoLoading] = useState(false);

  const handleBOAccess = async () => {
    setBoLoading(true);
    await new Promise(r => setTimeout(r, 350));
    const user = MOCK_BO_USERS.find(u => u.role === 'super_admin');
    if (user && backOfficeContext?.setBOUser) {
      backOfficeContext.setBOUser(user);
      setIsOpen(false);
      navigate('/backoffice/dashboard');
    }
    setBoLoading(false);
  };

  const handleProfileSwitch = async (userId: string) => {
    setProfileLoading(userId);
    await new Promise(r => setTimeout(r, 350));
    const user = DEV_MOCK_USERS.find(u => u.id === userId);
    if (user) {
      setAppUser(user);
      setUserProfile(user);
      setIsOpen(false);
      const routes: Record<string, string> = {
        'marchand': '/marchand',
        'producteur': '/producteur',
        'cooperative': '/cooperative',
        'institution': '/institution',
        'identificateur': '/identificateur',
      };
      navigate(routes[user.role] || '/');
    }
    setProfileLoading(null);
  };

  const isDevEnvironment =
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('figma.site') ||
    window.location.hostname.includes('makeproxy');

  if (!isDevEnvironment && !forceShow) return null;

  return (
    <>
      {/* Bouton flottant Dev */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-4 z-[9999] w-10 h-10 rounded-full bg-purple-600 shadow-lg flex items-center justify-center border-2 border-purple-400/50"
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.85, scale: 1 }} transition={{ delay: 0.5 }}
      >
        <Code className="w-4 h-4 text-white" />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-amber-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                    <Code className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Dev Mode</h2>
                    <p className="text-xs text-gray-500">Changer de profil</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* User Cards */}
              <div className="px-4 pb-3 max-h-[55vh] overflow-y-auto space-y-3">
                {DEV_MOCK_USERS.map((user, index) => {
                  const style = PROFILE_STYLES[user.role] || { borderColor: '#6B7280', bgColor: '#F9FAFB', avatarColor: '#6B7280', roleColor: '#6B7280', roleLabel: user.role };
                  const initial = user.firstName.charAt(0).toUpperCase();

                  return (
                    <motion.button
                      key={user.id}
                      onClick={() => handleProfileSwitch(user.id)}
                      disabled={profileLoading !== null}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50"
                      style={{
                        borderColor: style.borderColor,
                        backgroundColor: style.bgColor,
                      }}
                    >
                      {/* Avatar Initial */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: style.avatarColor }}
                      >
                        <span className="text-white text-lg font-bold">{initial}</span>
                      </div>

                      {/* Info gauche */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-bold text-gray-900 text-base">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm font-semibold" style={{ color: style.roleColor }}>
                          {style.roleLabel}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {user.phone}
                        </div>
                      </div>

                      {/* Info droite */}
                      <div className="text-right shrink-0">
                        {profileLoading === user.id ? (
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : (
                          <>
                            <div className="text-xs text-gray-500">{user.commune || user.region}</div>
                            <div className="text-sm font-bold" style={{ color: style.borderColor }}>
                              Score: {user.score}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.button>
                  );
                })}

                {/* Separator ADMINISTRATION */}
                <div className="flex items-center gap-3 pt-3 pb-1">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 tracking-widest uppercase">Administration</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Back-Office Central */}
                <motion.button
                  onClick={handleBOAccess}
                  disabled={boLoading}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-200 bg-white hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-gray-900 text-base">Back-Office Central</div>
                    <div className="text-xs text-gray-500">Acces admin sans connexion</div>
                  </div>
                  {boLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </motion.button>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-100">
                <p className="text-center text-xs text-gray-400">
                  Mode developpeur - Visible uniquement en localhost
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}