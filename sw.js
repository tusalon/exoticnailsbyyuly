// sw.js - Service Worker para Exotic Nails by Yuly

const CACHE_NAME = 'exoticnailsbyyuly-v72';
const BASE = '/exoticnailsbyyuly';

const urlsToCache = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/admin.html`,
  `${BASE}/admin-login.html`,
  `${BASE}/offline-panel.html`,
  `${BASE}/calendar.html`,
  `${BASE}/setup-wizard.html`,
  `${BASE}/editar-negocio.html`,
  `${BASE}/manifest.json`,

  // App principal
  `${BASE}/app.js`,
  `${BASE}/client-app.js`,
  `${BASE}/admin-app.js`,

  // Utils
  `${BASE}/utils/api.js`,
  `${BASE}/utils/auth-clients.js`,
  `${BASE}/utils/auth-profesionales.js`,
  `${BASE}/utils/config-negocio.js`,
  `${BASE}/utils/config.js`,
  `${BASE}/utils/dias-cerrados.js`,
  `${BASE}/utils/hero-backgrounds.js`,
  `${BASE}/utils/native-push-notifications.js`,
  `${BASE}/utils/offline-panel.js`,
  `${BASE}/utils/phone-utils.js`,
  `${BASE}/utils/profesionales.js`,
  `${BASE}/utils/push-config.js?v=20260621`,
  `${BASE}/utils/push-notifications.js?v=20260621`,
  `${BASE}/utils/servicios.js`,
  `${BASE}/utils/storage.js`,
  `${BASE}/utils/supabase-config.js`,
  `${BASE}/utils/timeLogic.js`,
  `${BASE}/utils/whatsapp-helper.js`,
  `${BASE}/utils/legacy-ios-fallback.css`,

  // Componentes cliente
  `${BASE}/components/BookingForm.js`,
  `${BASE}/components/Calendar.js`,
  `${BASE}/components/ClientAuthScreen.js`,
  `${BASE}/components/Confirmation.js`,
  `${BASE}/components/Header.js`,
  `${BASE}/components/InstallButton.js`,
  `${BASE}/components/MultiProfesionalSelector.js`,
  `${BASE}/components/MultiTimeSlots.js`,
  `${BASE}/components/MyBookings.js`,
  `${BASE}/components/ProfesionalSelector.js`,
  `${BASE}/components/ServiceSelection.js`,
  `${BASE}/components/ServiceSelectionCategorias.js`,
  `${BASE}/components/ServiceSelectionTabs.js`,
  `${BASE}/components/TimeSlots.js`,
  `${BASE}/components/WelcomeScreen.js`,
  `${BASE}/components/WhatsAppButton.js`,

  // Componentes admin
  `${BASE}/components/admin/ConfigPanel.js`,
  `${BASE}/components/admin/EditarNegocio.js`,
  `${BASE}/components/admin/HorariosExcepcionPanel.js`,
  `${BASE}/components/admin/HorariosPorDiaPanel.js`,
  `${BASE}/components/admin/ProfesionalesPanel.js`,
  `${BASE}/components/admin/ServiciosPanel.js`,
  `${BASE}/components/admin/ServiciosPanelCategorias.js`,
  `${BASE}/components/admin/ServiciosPanelPro.js`,
  `${BASE}/components/admin/SetupWizard.js`,

  // Vendors
  `${BASE}/vendor/react.production.min.js`,
  `${BASE}/vendor/react-dom.production.min.js`,
  `${BASE}/vendor/babel.min.js`,
  `${BASE}/vendor/bcrypt.min.js`,
  `${BASE}/vendor/tailwind-browser.js`,
  `${BASE}/vendor/lucide/lucide.css`,
  `${BASE}/vendor/lucide/lucide.woff2`,

  // Iconos
  `${BASE}/icons/icon-72x72.png`,
  `${BASE}/icons/icon-96x96.png`,
  `${BASE}/icons/icon-128x128.png`,
  `${BASE}/icons/icon-144x144.png`,
  `${BASE}/icons/icon-152x152.png`,
  `${BASE}/icons/icon-192x192.png`,
  `${BASE}/icons/icon-384x384.png`,
  `${BASE}/icons/icon-512x512.png`,
  `${BASE}/icons/badge.svg`,
];

// URLs externas — nunca interceptar
const BYPASS = [
  'supabase.co',
  'ntfy.sh',
  'unsplash.com',
  'wa.me',
  'api.whatsapp.com',
  'whatsapp.com',
  'cdn.',
  'unpkg.com',
  'trickle.so',
];

// ============================================
// INSTALACIÓN
// ============================================
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('Error al cachear:', err))
  );
});

// ============================================
// ACTIVACIÓN — limpia caches anteriores
// ============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================
// FETCH — Cache First para archivos de app
// ============================================
self.addEventListener('fetch', event => {
  if (!event.request.url.startsWith('http')) return;
  if (BYPASS.some(b => event.request.url.includes(b))) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
          return caches.match(`${BASE}/icons/icon-192x192.png`);
        }
        return new Response('Sin conexión', { status: 408 });
      });
    })
  );
});

// ============================================
// MENSAJES
// ============================================
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
});

// ============================================
// WEB PUSH
// ============================================
self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'RservasRoma', body: event.data ? event.data.text() : 'Nueva notificación' };
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'RservasRoma', {
    body: payload.body || 'Tienes una nueva notificación',
    icon: `${BASE}/icons/icon-192x192.png`,
    badge: `${BASE}/icons/badge.svg`,
    tag: payload.tag || 'rservasroma',
    data: { url: payload.url || `${BASE}/admin.html`, ...(payload.data || {}) },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  let targetUrl = event.notification?.data?.url || `${BASE}/`;
  // Si la URL es relativa, convertirla a absoluta usando el scope del SW
  if (targetUrl.startsWith('/') && !targetUrl.startsWith('//')) {
    const scope = self.registration.scope || `https://tusalon.github.io${BASE}/`;
    targetUrl = scope.replace(/\/$/, '') + (targetUrl === '/' ? '' : targetUrl);
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(targetUrl) && 'focus' in c) return c.focus();
      }
      return clients.openWindow ? clients.openWindow(targetUrl) : null;
    })
  );
});
