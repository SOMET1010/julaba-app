/**
 * UnregisteredPhone : écran affiché quand le numéro saisi n’est pas enregistré.
 * Route : /non-enregistre
 * Accessible uniquement via navigation programmatique (Login.tsx) avec state.phone.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Phone, UserX } from 'lucide-react';
import { Button } from '../ui/button';
import { getSystemSettings } from '../../utils/api';

/**
 * Masque partiellement un numéro de téléphone pour limiter l’exposition PII.
 * Format : "+225 XX XX XX 12 34" (4 derniers chiffres visibles).
 * Si format inconnu, masque tout sauf les 4 derniers caractères.
 */
function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length < 5) return phone;
  const last4 = cleaned.slice(-4);
  const prefix = cleaned.startsWith('+225') ? '+225' : '';
  const middleLen = cleaned.length - last4.length - prefix.length;
  if (middleLen <= 0) return phone;
  const masked = 'X'.repeat(Math.min(middleLen, 6));
  return `${prefix} ${masked} ${last4}`.trim();
}

export function UnregisteredPhone() {
  const location = useLocation();
  const navigate = useNavigate();
  const phone: string = location.state?.phone || '';
  const [supportPhone, setSupportPhone] = useState<string>('');
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Si pas de numéro transmis, retour direct à la connexion
  useEffect(() => {
    if (!phone && mountedRef.current) {
      navigate('/', { replace: true });
    }
  }, [phone, navigate]);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    getSystemSettings().then(response => {
      if (!mountedRef.current) return;
      if (response.success && response.settings?.supportPhone) {
        setSupportPhone(response.settings.supportPhone);
      }
    }).catch((err) => {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('[UnregisteredPhone] getSystemSettings failed:', err instanceof Error ? err.message : err);
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  if (!phone) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#C46210] to-[#A85108] flex flex-col items-center justify-center p-4" style={{ minHeight: '100dvh' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center"
        aria-labelledby="unregistered-phone-title"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5"
        >
          <UserX className="w-8 h-8 text-amber-600" aria-hidden="true" />
        </motion.div>

        <h1 id="unregistered-phone-title" className="text-2xl font-bold text-gray-900 mb-3">
          Numéro non enregistré
        </h1>
        
        <p role="alert" aria-live="polite" className="text-gray-600 mb-6">
          Le numéro <span className="font-bold text-[#C46210]">{maskPhone(phone)}</span> n’est pas encore enregistré sur Jùlaba.
        </p>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
          <p className="text-sm text-amber-800 font-medium mb-4">
            Pour créer ton compte, contacte un agent identificateur ou un administrateur Jùlaba.
          </p>
          
          {supportPhone && (
            <motion.a
              href={`tel:${supportPhone}`}
              aria-label={`Appeler le support au ${supportPhone}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 text-[#C46210]/70 text-sm px-4 py-2 rounded-lg hover:text-[#C46210] hover:bg-[#C46210]/10 transition-all"
            >
              <Phone className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{supportPhone}</span>
            </motion.a>
          )}
        </div>

        <Button
          onClick={() => navigate('/')}
          className="w-full h-14 rounded-2xl text-lg font-semibold"
          style={{ backgroundColor: '#C46210' }}
        >
          Retour à la connexion
          <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
        </Button>
      </motion.div>
    </div>
  );
}
