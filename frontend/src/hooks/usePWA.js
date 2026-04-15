import { useEffect, useCallback } from 'react';

export function usePWA() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        // Tell SW to schedule the daily-reset notification
        const sw = reg.active || reg.installing || reg.waiting;
        if (sw) {
          const send = () => sw.postMessage({ type: 'SCHEDULE_DAILY_RESET' });
          sw.state === 'activated' ? send() : sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') send();
          });
        }
      } catch (err) {
        console.warn('[HQ] SW registration failed:', err);
      }
    };

    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  const requestNotifications = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      // Tell active SW to re-schedule now that we have permission
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SCHEDULE_DAILY_RESET' });
      }
    }
    return result;
  }, []);

  return { requestNotifications };
}
