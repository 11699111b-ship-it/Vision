// Superhero HQ — Service Worker
// Offline caching + IST-accurate local notifications

// Bump this on every deploy so the new SW purges the old cache (the activate
// handler deletes any cache whose name !== CACHE) and clients converge on fresh code.
const CACHE = 'superhero-hq-v6-20260624-debughidden';
const BASE = new URL('.', self.location).pathname;

const APP_SHELL = [
  BASE,
  `${BASE}index.html`,
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
      self.clients.claim(),
    ]).then(() => scheduleAll())
  );
});

// ── Fetch: stale-while-revalidate ────────────────────────────────────────────
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

// ── Push (server-push fallback) ───────────────────────────────────────────────
self.addEventListener('push', e => {
  const data = e.data?.json?.() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Superhero HQ', {
      body: data.body || 'Your quests await.',
      icon: `${BASE}icon-192.png`,
      badge: `${BASE}icon-192.png`,
      vibrate: [200, 100, 200],
      tag: data.tag || 'hq-push',
      renotify: true,
      data: { url: '/' },
    })
  );
});

// ── Notification click: open app ─────────────────────────────────────────────
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

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_DAILY_RESET') scheduleAll();
});

// ── IST helpers ───────────────────────────────────────────────────────────────
// IST = UTC + 5:30. We work entirely in UTC so device timezone is irrelevant.
// Adding IST_OFFSET to Date.now() and using getUTC* methods gives IST values.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istNow() {
  return new Date(Date.now() + IST_OFFSET_MS);
}

// ms until next occurrence of istHour:istMinute IST (daily)
function msUntilDailyIST(istHour, istMinute) {
  const now = istNow();
  const curMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const tgtMin = istHour * 60 + istMinute;
  let diffMin = tgtMin - curMin;
  if (diffMin <= 0) diffMin += 24 * 60;
  return diffMin * 60 * 1000 - now.getUTCSeconds() * 1000 - now.getUTCMilliseconds();
}

// ms until next occurrence of istHour:istMinute on a specific weekday (0=Sun)
function msUntilWeeklyIST(dayOfWeek, istHour, istMinute) {
  const now = istNow();
  const curDay = now.getUTCDay();
  const curMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const tgtMin = istHour * 60 + istMinute;
  let daysUntil = (dayOfWeek - curDay + 7) % 7;
  if (daysUntil === 0 && curMin >= tgtMin) daysUntil = 7;
  const diffMin = daysUntil * 24 * 60 + (tgtMin - curMin);
  return diffMin * 60 * 1000 - now.getUTCSeconds() * 1000 - now.getUTCMilliseconds();
}

function canNotify() {
  return self.Notification && self.Notification.permission === 'granted';
}

function showNotification(title, body, tag) {
  if (!canNotify()) return;
  self.registration.showNotification(title, {
    body,
    icon: `${BASE}icon-192.png`,
    badge: `${BASE}icon-192.png`,
    tag,
    renotify: true,
    vibrate: [150, 50, 150],
    data: { url: '/' },
  });
}

// ── Schedulers ────────────────────────────────────────────────────────────────
const timers = {};

function scheduleDaily(key, istHour, istMinute, title, body) {
  if (timers[key]) clearTimeout(timers[key]);
  const ms = msUntilDailyIST(istHour, istMinute);
  timers[key] = setTimeout(() => {
    showNotification(title, body, key);
    timers[key] = null;
    scheduleDaily(key, istHour, istMinute, title, body); // reschedule tomorrow
  }, ms);
}

function scheduleWeekly(key, dayOfWeek, istHour, istMinute, title, body) {
  if (timers[key]) clearTimeout(timers[key]);
  const ms = msUntilWeeklyIST(dayOfWeek, istHour, istMinute);
  timers[key] = setTimeout(() => {
    showNotification(title, body, key);
    timers[key] = null;
    scheduleWeekly(key, dayOfWeek, istHour, istMinute, title, body); // reschedule next week
  }, ms);
}

function scheduleAll() {
  // 9:00 AM IST daily — morning focus reminder
  scheduleDaily(
    'morning-goals',
    9, 0,
    'Superhero HQ — Watch Your Goals',
    'Your quests are live. Stay on mission, Anurag.'
  );

  // 10:00 PM IST daily — evening update prompt
  scheduleDaily(
    'evening-update',
    22, 0,
    'Superhero HQ — Update Daily Tasks',
    'Mark what you completed today before the day ends.'
  );

  // Sunday 8:00 PM IST — sprint deadline warning
  scheduleWeekly(
    'sprint-deadline',
    0, 20, 0,
    'Superhero HQ — Submit Your Mission',
    'Sprint closes at midnight IST. Submit before it auto-closes.'
  );

}
