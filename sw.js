// Puente: este salón ya vive en la app nueva (https://tusalon.github.io/rservasroma/).
// Este service worker solo hace tres cosas: borra la caché vieja, deja de interceptar peticiones (todo va directo
// a la red) y mantiene las notificaciones push que ya estaban suscritas. Generado por migracion-repos/puente.js.
const DESTINO = "https://tusalon.github.io/rservasroma/";
const SLUG = "exoticnailsbyyuly";
const REPO = "exoticnailsbyyuly";
const QS = new URLSearchParams({ s: SLUG }).toString(); // la misma codificación que usa mapearUrl
const CLIENTA = DESTINO + '?' + QS;
const ADMIN = DESTINO + 'admin.html?' + QS;

// Una dirección de la app vieja ("/repo/admin.html", "https://tusalon.github.io/repo/?x=1") -> la de la app nueva.
function mapearUrl(url) {
    if (!url) return ADMIN;
    var u = String(url);
    if (u.indexOf(DESTINO) === 0) return u;
    var rel = null;
    var marca = '/' + REPO + '/';
    var i = u.indexOf(marca);
    if (i === 0 || (i > 0 && /^https?:\/\/tusalon\.github\.io/.test(u))) rel = u.slice(i + marca.length);
    else if (u === '/' + REPO) rel = '';
    if (rel === null) return u;
    var partes = rel.split('#');
    var hash = partes[1] ? '#' + partes[1] : '';
    var cb = partes[0].split('?');
    var pagina = cb[0];
    var params = new URLSearchParams(cb[1] || '');
    params.set('s', SLUG);
    return DESTINO + pagina + '?' + params.toString() + hash;
}

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys()
            .then(function (claves) { return Promise.all(claves.map(function (c) { return caches.delete(c); })); })
            .then(function () { return self.clients.claim(); })
            .then(function () { return self.clients.matchAll({ type: 'window' }); })
            .then(function (ventanas) {
                // Las ventanas que ya estaban abiertas con la app vieja pasan a la nueva.
                ventanas.forEach(function (v) {
                    try { v.navigate(/admin/i.test(v.url) ? ADMIN : CLIENTA); } catch (e) { /* ventana cerrada */ }
                });
            })
    );
});

// Sin 'fetch' a proposito: no se intercepta nada.

self.addEventListener('push', function (event) {
    var carga = {};
    try {
        carga = event.data ? event.data.json() : {};
    } catch (e) {
        carga = { title: 'RservasRoma', body: event.data ? event.data.text() : 'Tienes una nueva notificación' };
    }
    event.waitUntil(self.registration.showNotification(carga.title || 'RservasRoma', {
        body: carga.body || 'Tienes una nueva notificación',
        icon: DESTINO + 'icons/icon-192x192.png',
        badge: DESTINO + 'icons/badge-96.png',
        tag: carga.tag || 'rservasroma',
        data: Object.assign({ url: mapearUrl(carga.url) }, carga.data || {})
    }));
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    var destino = mapearUrl(event.notification && event.notification.data && event.notification.data.url);
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (ventanas) {
            for (var i = 0; i < ventanas.length; i++) {
                if (ventanas[i].url === destino && 'focus' in ventanas[i]) return ventanas[i].focus();
            }
            return clients.openWindow ? clients.openWindow(destino) : null;
        })
    );
});
