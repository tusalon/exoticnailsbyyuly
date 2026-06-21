// utils/push-notifications.js - Web Push opcional para RservasRoma.

console.log('push-notifications.js cargado');

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

function pedirPermisoNotificacionesPush() {
    if (!('Notification' in window)) return Promise.resolve('unsupported');
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return Promise.resolve(Notification.permission);
    }

    // Chrome moderno devuelve Promise; navegadores viejos usan callback.
    if (Notification.requestPermission.length === 0) {
        return Notification.requestPermission();
    }

    return new Promise((resolve) => {
        Notification.requestPermission(resolve);
    });
}

function getDiagnosticoPushRservas() {
    const hasNotification = 'Notification' in window;
    const hasServiceWorker = 'serviceWorker' in navigator;

    return {
        url: window.location.href,
        protocol: window.location.protocol,
        secureContext: Boolean(window.isSecureContext),
        notificationApi: hasNotification,
        notificationPermission: hasNotification ? Notification.permission : 'no disponible',
        pushManager: 'PushManager' in window,
        serviceWorker: hasServiceWorker,
        serviceWorkerController: hasServiceWorker ? Boolean(navigator.serviceWorker.controller) : false,
        vapidConfigured: pushKeyConfigurada(),
        standalone: Boolean(
            window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        ) || Boolean(window.navigator.standalone),
        userAgent: navigator.userAgent || ''
    };
}

function formatearDiagnosticoPush(diagnostico, error = null) {
    const lineas = [
        'Diagnostico de notificaciones:',
        `Permiso: ${diagnostico.notificationPermission}`,
        `Contexto seguro: ${diagnostico.secureContext ? 'si' : 'no'}`,
        `Notification API: ${diagnostico.notificationApi ? 'si' : 'no'}`,
        `PushManager: ${diagnostico.pushManager ? 'si' : 'no'}`,
        `Service Worker: ${diagnostico.serviceWorker ? 'si' : 'no'}`,
        `Service Worker activo: ${diagnostico.serviceWorkerController ? 'si' : 'no'}`,
        `Llave VAPID: ${diagnostico.vapidConfigured ? 'configurada' : 'sin configurar'}`,
        `Modo app instalada: ${diagnostico.standalone ? 'si' : 'no'}`
    ];

    if (error) {
        lineas.push(`Error: ${error.message || error}`);
    }

    if (diagnostico.notificationPermission === 'denied') {
        lineas.push('');
        lineas.push('Chrome tiene bloqueado el permiso. En Android revisa:');
        lineas.push('1. Ajustes del telefono > Apps > Chrome > Notificaciones.');
        lineas.push('2. Chrome > Configuracion > Configuracion de sitios > Notificaciones.');
        lineas.push('3. Si no aparece tusalon.github.io, activa que los sitios puedan pedir permiso y vuelve a tocar el boton.');
    } else if (diagnostico.notificationPermission === 'default') {
        lineas.push('');
        lineas.push('El permiso quedo sin aceptar. Vuelve a tocar el boton y acepta el aviso del navegador.');
    }

    return lineas.join('\n');
}

window.diagnosticarPushRservasRoma = function(error = null, mostrarAlerta = true) {
    const diagnostico = getDiagnosticoPushRservas();
    console.table(diagnostico);

    if (mostrarAlerta) {
        alert(formatearDiagnosticoPush(diagnostico, error));
    }

    return diagnostico;
};

async function getRegistroServiceWorkerPush() {
    if (!('serviceWorker' in navigator)) return null;

    const ready = await navigator.serviceWorker.ready;
    return ready || null;
}

async function guardarSuscripcionPush(subscription, role) {
    const negocioId = getNegocioIdPush();
    console.log('[Push] guardarSuscripcionPush - negocioId:', negocioId, 'role:', role);
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

    console.log('[Push] endpoint:', subscription.endpoint?.substring(0, 60));
    console.log('[Push] SUPABASE_URL:', window.SUPABASE_URL);

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

    console.log('[Push] respuesta HTTP:', response.status);
    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Push] error guardando:', errorText);
        throw new Error(`No se pudo guardar la suscripcion push: ${errorText}`);
    }

    console.log('[Push] suscripcion guardada OK');
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
    const role = options.role || options.rol || getRolPush(options.defaultRole || 'cliente');

    if (!pushKeyConfigurada()) {
        console.warn('Push: falta clave VAPID pública');
        return { ok: false, error: 'vapid_key_missing' };
    }

    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
        console.warn('Push: navegador no compatible');
        return { ok: false, error: 'not_supported' };
    }

    const permission = options.permission || await pedirPermisoNotificacionesPush();
    if (permission !== 'granted') {
        console.warn('Push: permiso no concedido:', permission);
        return { ok: false, error: 'permission_' + permission };
    }

    const registration = await getRegistroServiceWorkerPush();
    if (!registration) {
        console.warn('Push: Service Worker no disponible');
        return { ok: false, error: 'sw_not_ready' };
    }

    try {
        console.log('[Push] VAPID key:', window.RSERVAS_PUSH_PUBLIC_KEY?.substring(0, 20));
        let subscription = await registration.pushManager.getSubscription();
        console.log('[Push] suscripcion existente:', subscription ? 'SI' : 'NO');
        if (!subscription) {
            console.log('[Push] creando nueva suscripcion...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(window.RSERVAS_PUSH_PUBLIC_KEY)
            });
            console.log('[Push] suscripcion creada:', subscription.endpoint?.substring(0, 60));
        }
        await guardarSuscripcionPush(subscription.toJSON ? subscription.toJSON() : subscription, role);
        return { ok: true };
    } catch (err) {
        console.error('[Push] error:', err.name, err.message);
        return { ok: false, error: err.message };
    }
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
    return;
    if (document.getElementById('rservas-push-button')) return;
    if (!pushKeyConfigurada()) return;
    if (!('Notification' in window) || Notification.permission === 'granted') return;
    if (!localStorage.getItem('adminAuth') && !localStorage.getItem('profesionalAuth')) return;

    const button = document.createElement('button');
    button.id = 'rservas-push-button';
    button.type = 'button';
    button.textContent = Notification.permission === 'denied' ? 'Push bloqueado' : 'Activar notificaciones';
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

    button.addEventListener('click', () => {
        // En Chrome Android conviene pedir el permiso como primera accion exacta del toque.
        const permissionPromise = pedirPermisoNotificacionesPush();
        button.disabled = true;
        button.textContent = 'Activando...';

        permissionPromise
            .then((permission) => window.solicitarPushRservasRoma({ defaultRole: 'admin', permission }))
            .then((ok) => {
                if (ok) {
                    button.remove();
                    return;
                }

                button.disabled = false;
                button.textContent = Notification.permission === 'denied' ? 'Push bloqueado' : 'Activar notificaciones';
            })
            .catch((error) => {
                console.error('Error activando Web Push:', error);
                window.diagnosticarPushRservasRoma(error);
                button.disabled = false;
                button.textContent = Notification.permission === 'denied' ? 'Push bloqueado' : 'Activar notificaciones';
            });
    });

    document.body.appendChild(button);
}

window.addEventListener('load', () => {
    setTimeout(instalarBotonPushAdmin, 1500);
});
