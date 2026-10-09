const CACHE_NAME = 'money-pro-v1.3.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './resources/icon-192.png',
  './resources/icon-512.png',
  './resources/icon-1240.png',
  './resources/screenshot1.png'
];

// Install event - cache important files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches + re-arm daily reminder
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== REMINDER_CACHE) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
     .then(() => scheduleFromStored())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Do not intercept the synthetic reminder-config URL
  if (event.request.url.indexOf('mmpro.local/reminder-config') !== -1) return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Optional: Cache new successful responses
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback when offline and page not in cache
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});


/* ═══════════════════════════════════════════════════════════
   DAILY REMINDER — background notification when app is closed
   or user is logged out. Controlled by messages from index.html.
   ═══════════════════════════════════════════════════════════ */
const REMINDER_CACHE = 'mmpro-reminder-meta';
const REMINDER_URL = 'https://mmpro.local/reminder-config';

let _swReminderTimer = null;

async function saveReminderConfig(cfg) {
  const c = await caches.open(REMINDER_CACHE);
  await c.put(
    REMINDER_URL,
    new Response(JSON.stringify(cfg), {
      headers: { 'Content-Type': 'application/json' }
    })
  );
}

async function loadReminderConfig() {
  try {
    const c = await caches.open(REMINDER_CACHE);
    const res = await c.match(REMINDER_URL);
    if (!res) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function nextTargetMs(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

async function showDailyNotification() {
  const cfg = await loadReminderConfig();
  if (!cfg || !cfg.enabled) return;

  const today = new Date().toISOString().slice(0, 10);
  if (cfg.lastFire === today) return;

  cfg.lastFire = today;
  await saveReminderConfig(cfg);

  const title = '💰 Daily Reminder';
  const body = "Reminder From your Money Manager! Today's Money Transactions are yet to be posted!! Ignore if already done";
  const options = {
    body: body,
    icon: './resources/icon-192.png',
    badge: './resources/icon-192.png',
    tag: 'mm-daily-reminder',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url: './' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  try {
    await self.registration.showNotification(title, options);
  } catch (e) {
    // Fallback without icon / actions (some browsers)
    try {
      await self.registration.showNotification(title, {
        body: body,
        tag: 'mm-daily-reminder',
        renotify: true,
        requireInteraction: true
      });
    } catch (e2) {}
  }
}

async function scheduleFromStored() {
  if (_swReminderTimer) {
    clearTimeout(_swReminderTimer);
    _swReminderTimer = null;
  }
  const cfg = await loadReminderConfig();
  if (!cfg || !cfg.enabled || cfg.hour == null || cfg.minute == null) return;

  const delay = nextTargetMs(cfg.hour, cfg.minute);
  _swReminderTimer = setTimeout(async () => {
    await showDailyNotification();
    await scheduleFromStored(); // next day
  }, Math.max(1000, delay));
}

// Messages from the app page (index.html)
self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'SCHEDULE_REMINDER') {
    event.waitUntil((async () => {
      const prev = await loadReminderConfig();
      const cfg = {
        enabled: true,
        hour: data.hour,
        minute: data.minute,
        time: data.time || (String(data.hour).padStart(2, '0') + ':' + String(data.minute).padStart(2, '0')),
        lastFire: (prev && prev.lastFire) || null
      };
      await saveReminderConfig(cfg);
      await scheduleFromStored();
      try {
        if (self.registration.periodicSync) {
          await self.registration.periodicSync.register('mm-daily-reminder', {
            minInterval: 12 * 60 * 60 * 1000
          });
        }
      } catch (e) {}
    })());
  }

  if (data.type === 'CANCEL_REMINDER') {
    event.waitUntil((async () => {
      if (_swReminderTimer) {
        clearTimeout(_swReminderTimer);
        _swReminderTimer = null;
      }
      await saveReminderConfig({ enabled: false });
      try {
        if (self.registration.periodicSync) {
          await self.registration.periodicSync.unregister('mm-daily-reminder');
        }
      } catch (e) {}
    })());
  }

  if (data.type === 'PING_REMINDER') {
    event.waitUntil(scheduleFromStored());
  }
});

// Periodic Background Sync — browser may wake SW roughly daily (Chrome Android)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'mm-daily-reminder') {
    event.waitUntil((async () => {
      const cfg = await loadReminderConfig();
      if (!cfg || !cfg.enabled) return;
      const now = new Date();
      const due = new Date();
      due.setHours(cfg.hour, cfg.minute, 0, 0);
      if (now >= due) {
        await showDailyNotification();
      }
      await scheduleFromStored();
    })());
  }
});

// Tap notification → open / focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) {
        await client.focus();
        return;
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow('./');
    }
  })());
});
