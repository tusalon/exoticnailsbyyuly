// utils/native-push-notifications.js - Push nativo para APK Capacitor.

console.log('native-push-notifications.js cargado');

function isRservasNativeApp() {
    return Boolean(
        window.Capacitor &&
        (
            window.Capacitor.isNativePlatform?.() ||
            window.Capacitor.getPlatform?.() === 'android' ||
            window.Capacitor.getPlatform?.() === 'ios'
        )
    );
}

function getNativePushPlugin() {
    return window.Capacitor?.Plugins?.PushNotifications || null;
}

function getNegocioIdNativePush() {
    if (typeof window.getNegocioIdFromConfig === 'function') return window.getNegocioIdFromConfig();
    return localStorage.getItem('negocioId') || window.NEGOCIO_ID_POR_DEFECTO || '';
}

function getRolNativePush(defaultRole = 'admin') {
    if (localStorage.getItem('adminAuth')) return 'admin';
    if (localStorage.getItem('profesionalAuth')) return 'profesional';
    return defaultRole;
}

async function guardarTokenNativePush(token, role) {
    const negocioId = getNegocioIdNativePush();
    if (!negocioId) throw new Error('No hay negocio_id para guardar el token nativo.');

    const platform = window.Capacitor?.getPlatform?.() || 'native';
    const payload = {
        negocio_id: negocioId,
        role,
        endpoint: `native:${platform}:${token}`,
        subscription: {
            provider: 'fcm',
            token,
            platform
        },
        user_agent: navigator.userAgent || platform,
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
        throw new Error(`No se pudo guardar el token nativo: ${errorText}`);
    }

    localStorage.setItem('rservasNativePushActivo', 'true');
    localStorage.setItem('rservasNativePushRole', role);
    return true;
}

window.solicitarNativePushRservasRoma = async function(options = {}) {
    const role = options.role || getRolNativePush(options.defaultRole || 'admin');
    const PushNotifications = getNativePushPlugin();

    if (!isRservasNativeApp()) {
        return false;
    }

    if (!PushNotifications) {
        alert('Esta APK todavia no tiene el plugin nativo de notificaciones. Compila una APK nueva.');
        return false;
    }

    return new Promise(async (resolve) => {
        let finished = false;
        const finish = (ok) => {
            if (finished) return;
            finished = true;
            resolve(ok);
        };

        try {
            const permission = await PushNotifications.requestPermissions();
            if (permission.receive !== 'granted') {
                alert('Android no concedio el permiso de notificaciones para esta app.');
                finish(false);
                return;
            }

            await PushNotifications.removeAllListeners();

            await PushNotifications.addListener('registration', async (token) => {
                try {
                    await guardarTokenNativePush(token.value, role);
                    alert('Notificaciones activadas para esta APK.');
                    finish(true);
                } catch (error) {
                    console.error('No se pudo guardar token nativo:', error);
                    alert(error.message || 'No se pudo guardar el token de notificaciones.');
                    finish(false);
                }
            });

            await PushNotifications.addListener('registrationError', (error) => {
                console.error('Error registrando push nativo:', error);
                alert('No se pudo activar el push nativo. Si falta Firebase, agrega google-services.json y recompila la APK.');
                finish(false);
            });

            await PushNotifications.register();

            setTimeout(() => {
                if (!finished) {
                    alert('No se recibio token de Android. Revisa que la APK tenga Firebase/google-services.json configurado.');
                    finish(false);
                }
            }, 12000);
        } catch (error) {
            console.error('Error solicitando push nativo:', error);
            alert(error.message || 'No se pudo solicitar el permiso nativo de notificaciones.');
            finish(false);
        }
    });
};

function instalarBotonNativePushAdmin() {
    if (!isRservasNativeApp()) return;
    if (document.getElementById('rservas-native-push-button')) return;
    if (!localStorage.getItem('adminAuth') && !localStorage.getItem('profesionalAuth')) return;
    if (localStorage.getItem('rservasNativePushActivo') === 'true') return;

    const button = document.createElement('button');
    button.id = 'rservas-native-push-button';
    button.type = 'button';
    button.textContent = 'Activar notificaciones APK';
    button.style.cssText = [
        'position:fixed',
        'left:16px',
        'bottom:72px',
        'z-index:9998',
        'border:0',
        'border-radius:999px',
        'padding:12px 16px',
        'background:#0f766e',
        'color:#fff',
        'font-weight:700',
        'box-shadow:0 10px 30px rgba(0,0,0,.22)',
        'cursor:pointer'
    ].join(';');

    button.addEventListener('click', async () => {
        button.disabled = true;
        button.textContent = 'Activando APK...';
        const ok = await window.solicitarNativePushRservasRoma({ defaultRole: 'admin' }).catch((error) => {
            console.error('Error activando push APK:', error);
            alert(error.message || 'No se pudo activar push APK.');
            return false;
        });

        if (ok) {
            button.remove();
            return;
        }

        button.disabled = false;
        button.textContent = 'Activar notificaciones APK';
    });

    document.body.appendChild(button);
}

window.addEventListener('load', () => {
    setTimeout(instalarBotonNativePushAdmin, 1800);
});
