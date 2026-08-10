import { useEffect } from 'react';
import { API_URL } from '../utils/api';

const VAPID_PUBLIC_KEY = 'Ez09UNY20LSDPRJcMAeMM-qmKpxtp7MrDhYb6WIHxH6P2xg855zWWDqQ7lLRDq4mf4FatL-hLY6nU37sHOpCyEA';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const registerPush = async () => {
      try {
        // 1. Enregistrer le Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        // 2. Demander la permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // 3. Récupérer ou créer la souscription
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        // 4. Envoyer le token au backend
        await fetch(`${API_URL}/notifications/push-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: subscription }),
        });
      } catch (err) {
        void err;
      }
    };

    registerPush();
  }, [userId]);
}
