// utils/push-notifications.js - Web Push opcional para RservasRoma.

console.log('🔔 push-notifications.js cargado');

window.RSERVAS_PUSH_PUBLIC_KEY = window.RSERVAS_PUSH_PUBLIC_KEY || 'CONFIGURAR_VAPID_PUBLIC_KEY';
window.RSERVAS_PUSH_FUNCTION = window.RSERVAS_PUSH_FUNCTION || 'enviar-web-push';

function pushKeyConfigurada() {
    return Boolean(
        window.RSERVAS_PUSH_PUBLIC_KEY &&
        window.RSERVAS_PUSH_PUBLIC_KEY !== 'CONFIGURAR_VAPID_PUBLIC_KEY'
    );
}

function getNegocioIdPush() {
    if (typeof window.getNegocioIdFromConfig === 'function') return window.getNegocioIdFromConfig();
    return localStorage.getItem('negocioId') || window.NEGOCIO_ID_POR_DEFECTO || '';
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

function getRolPush(defaultRole = 'cliente') {
    if (localStorage.getItem('adminAuth')) return 'admin';
    if (localStorage.getItem('profesionalAuth')) return 'profesional';
    return defaultRole;
}

async function getRegistroServiceWorkerPush() {
    if (!('serviceWorker' in navigator)) return null;

    const ready = await navigator.serviceWorker.ready;
    return ready || null;
}

async function guardarSuscripcionPush(subscription, role) {
    const negocioId = getNegocioIdPush();
    if (!negocioId) throw new Error('No hay negocio_id para guardar la suscripcion push.');

    const payload = {
        negocio_id: negocioId,
        role,
        endpoint: subscription.endpoint,
        subscription,
        user_agent: navigator.userAgent || '',
        activo: true,
        updated_at: new Date().toISOString()
    };

    const response = await fetch(`${window.SUPABASE_URL}/rest/v1/push_suscripciones`, {
        method: 'POST',
        headers: {
            apikey: window.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`No se pudo guardar la suscripcion push: ${errorText}`);
    }

    localStorage.setItem('rservasPushActivo', 'true');
    localStorage.setItem('rservasPushRole', role);
    return true;
}

window.pushRservasDisponible = function() {
    return Boolean(
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        pushKeyConfigurada()
    );
};

window.solicitarPushRservasRoma = async function(options = {}) {
    const role = options.role || getRolPush(options.defaultRole || 'cliente');

    if (!pushKeyConfigurada()) {
        alert('Web Push todavia no esta configurado. Falta poner la llave publica VAPID.');
        return false;
    }

    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
        alert('Este dispositivo o navegador no permite notificaciones push web.');
        return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        alert('No se activaron las notificaciones. Puedes permitirlas luego desde los ajustes del navegador.');
        return false;
    }

    const registration = await getRegistroServiceWorkerPush();
    if (!registration) {
        alert('No se encontro el Service Worker para activar notificaciones.');
        return false;
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(window.RSERVAS_PUSH_PUBLIC_KEY)
        });
    }

    await guardarSuscripcionPush(subscription.toJSON ? subscription.toJSON() : subscription, role);
    alert('Notificaciones push activadas para este dispositivo.');
    return true;
};

window.enviarWebPushRservasRoma = async function({ title, body, url = '', role = 'admin', tags = 'bell', data = {} } = {}) {
    try {
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return false;

        const negocioId = getNegocioIdPush();
        if (!negocioId) return false;

        const response = await fetch(`${window.SUPABASE_URL}/functions/v1/${window.RSERVAS_PUSH_FUNCTION}`, {
            method: 'POST',
            headers: {
                apikey: window.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                negocio_id: negocioId,
                role,
                title,
                body,
                url,
                tags,
                data
            })
        });

        if (!response.ok) {
            console.warn('Web Push no enviado:', await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.warn('Web Push opcional fallo:', error);
        return false;
    }
};

function instalarBotonPushAdmin() {
    if (document.getElementById('rservas-push-button')) return;
    if (!pushKeyConfigurada()) return;
    if (!('Notification' in window) || Notification.permission === 'granted') return;
    if (!localStorage.getItem('adminAuth') && !localStorage.getItem('profesionalAuth')) return;

    const button = document.createElement('button');
    button.id = 'rservas-push-button';
    button.type = 'button';
    button.textContent = 'Activar notificaciones';
    button.style.cssText = [
        'position:fixed',
        'left:16px',
        'bottom:16px',
        'z-index:9998',
        'border:0',
        'border-radius:999px',
        'padding:12px 16px',
        'background:#111827',
        'color:#fff',
        'font-weight:700',
        'box-shadow:0 10px 30px rgba(0,0,0,.22)',
        'cursor:pointer'
    ].join(';');

    button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Activando...';
        const ok = await window.solicitarPushRservasRoma({ defaultRole: 'admin' }).catch(() => false);
        if (ok) button.remove();
        else {
            button.disabled = false;
            button.textContent = 'Activar notificaciones';
        }
    });

    document.body.appendChild(button);
}

window.addEventListener('load', () => {
    setTimeout(instalarBotonPushAdmin, 1500);
});
