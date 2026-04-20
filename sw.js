// Superhero HQ — Service Worker
// Offline caching + 3AM daily-reset local notification

const CACHE = 'superhero-hq-v2';

// Resolve base path from SW scope (works under subpath like /Vision/)
const BASE = new URL('.', self.location).pathname;

const APP_SHELL = [
  BASE,
  `${BASE}index.html`,
];

// ── Install: cache app shell ─────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches + claim clients ───────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
      self.clients.claim(),
    ]).then(() => scheduleDailyReset())
  );
});

// ── Fetch: stale-while-revalidate (serves offline too) ──────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => null);

      return cached || networkFetch || caches.match(`${BASE}index.html`);
    })
  );
});

// ── Push notification handler (for future server push) ──────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json?.() ?? {};
  e.waitUntil(
    self.registration.showNotification(
      data.title || 'Superhero HQ — Daily Reset',
      {
        body: data.body || 'New day begins. Quests reset. Level up, Boss Anurag.',
        icon: `${BASE}icon-192.png`,
        badge: `${BASE}icon-192.png`,
        vibrate: [200, 100, 200],
        tag: 'daily-reset',
        renotify: true,
        data: { url: '/' },
      }
    )
  );
});

// ── Notification click: open the app ────────────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(all => {
      const found = all.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (found) return found.focus();
      return clients.openWindow(BASE);
    })
  );
});

// ── Message handler from main thread ────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_DAILY_RESET') scheduleDailyReset();
});

// ── Local 3AM notification scheduler ────────────────────────────────────────
// Works when service worker is alive (device awake, iOS PWA installed on home screen).
let resetTimerId = null;

function scheduleDailyReset() {
  if (resetTimerId) clearTimeout(resetTimerId);

  const now = new Date();
  const next3AM = new Date();
  next3AM.setHours(3, 0, 0, 0);
  if (now >= next3AM) next3AM.setDate(next3AM.getDate() + 1);

  const ms = next3AM - now;

  resetTimerId = setTimeout(() => {
    // Only show if permission granted
    if (self.Notification && self.Notification.permission === 'granted') {
      self.registration.showNotification('Superhero HQ — New Day', {
        body: 'Daily quests reset. Start strong, Boss Anurag.',
        icon: `${BASE}icon-192.png`,
        badge: `${BASE}icon-192.png`,
        tag: 'daily-reset',
        renotify: true,
        vibrate: [150, 50, 150],
        data: { url: '/' },
      });
    }
    resetTimerId = null;
    scheduleDailyReset(); // reschedule for next day
  }, ms);
}
