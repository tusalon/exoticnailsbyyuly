// utils/config-negocio.js - VERSIÓN MULTI-TENANT CORREGIDA
// CLIENTE: Exotic Nails by Yuly

console.log('🏢 config-negocio.js cargado');

// ============================================
// 🔥 CONFIGURACIÓN POR CLIENTE - ¡LO ÚNICO QUE CAMBIA!
// ============================================
const NEGOCIO_ID_POR_DEFECTO = '55e7df41-6cf7-45d7-9fc3-a17966e3645a'; // ID de Exotic Nails by Yuly

// Hacer accesible globalmente
window.NEGOCIO_ID_POR_DEFECTO = NEGOCIO_ID_POR_DEFECTO;

// ============================================
// FUNCIONES PARA OBTENER EL ID (GLOBALES)
// ============================================
window.getNegocioId = function() {
    return NEGOCIO_ID_POR_DEFECTO;
};

window.getNegocioIdFromConfig = function() {
    return NEGOCIO_ID_POR_DEFECTO;
};

// Cache de configuración
let configCache = null;
let ultimaActualizacion = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos

/**
 * Obtiene el negocio_id del localStorage o usa el ID por defecto
 */
function getNegocioId() {
    // 1. Prioridad: lo que haya en localStorage (cuando el admin se loguea)
    const localId = localStorage.getItem('negocioId');
    if (localId) {
        console.log('📌 Usando negocioId de localStorage:', localId);
        return localId;
    }
    
    // 2. Si no, usar el ID por defecto
    console.log('📌 Usando negocioId por defecto (quemado en código):', NEGOCIO_ID_POR_DEFECTO);
    return NEGOCIO_ID_POR_DEFECTO;
}

/**
 * Carga la configuración del negocio desde Supabase
 */
window.cargarConfiguracionNegocio = async function(forceRefresh = false) {
    const negocioId = getNegocioId();
    if (!negocioId) {
        console.error('❌ No hay negocioId disponible');
        return null;
    }

    // Usar caché si no se fuerza refresco
    if (!forceRefresh && configCache && (Date.now() - ultimaActualizacion) < CACHE_DURATION) {
        console.log('📦 Usando cache de configuración');
        return configCache;
    }

    try {
        console.log('🌐 Cargando configuración del negocio desde Supabase...');
        console.log('📡 ID del negocio:', negocioId);
        
        const url = `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${negocioId}&select=*`;
        
        const response = await fetch(url, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            return null;
        }

        const data = await response.json();
        
        // Guardar en cache
        configCache = data[0] || null;
        ultimaActualizacion = Date.now();
        
        if (configCache) {
            console.log('✅ Configuración cargada:');
            console.log('   - Nombre:', configCache.nombre);
            console.log('   - Teléfono:', configCache.telefono);
            console.log('   - Email:', configCache.email);
            console.log('   - Instagram:', configCache.instagram);
            console.log('   - Logo:', configCache.logo_url);
            
            // Guardar ID en localStorage para futuras sesiones
            const localId = localStorage.getItem('negocioId');
            if (!localId) {
                console.log('💾 Guardando ID en localStorage');
                localStorage.setItem('negocioId', negocioId);
            }
        } else {
            console.log('⚠️ No se encontró configuración para el negocio');
        }
        
        return configCache;
    } catch (error) {
        console.error('❌ Error cargando configuración:', error);
        return null;
    }
};

/**
 * Obtiene el nombre del negocio
 */
window.getNombreNegocio = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.nombre || 'Exotic Nails by Yuly';
};

/**
 * Obtiene el teléfono del dueño
 */
window.getTelefonoDuenno = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.telefono || '52541431';
};

/**
 * Obtiene el email del negocio
 */
window.getEmailNegocio = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.email || 'yulynails52@gmail.com';
};

/**
 * Obtiene el Instagram
 */
window.getInstagram = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.instagram || '';
};

/**
 * Obtiene el Facebook
 */
window.getFacebook = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.facebook || '';
};

/**
 * Obtiene el horario de atención
 */
window.getHorarioAtencion = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.horario_atencion || '';
};

/**
 * Obtiene el mensaje de bienvenida
 */
window.getMensajeBienvenida = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.mensaje_bienvenida || '¡Bienvenida a Exotic Nails by Yuly!';
};

/**
 * Obtiene el mensaje de confirmación
 */
window.getMensajeConfirmacion = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.mensaje_confirmacion || 'Tu turno ha sido reservado con éxito';
};

/**
 * Obtiene el tópico de ntfy para notificaciones
 */
window.getNtfyTopic = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.ntfy_topic || 'exoticnailsbyyuly';
};

/**
 * 🔥 NUEVA FUNCIÓN: Obtiene si el negocio requiere anticipo
 */
window.getRequiereAnticipo = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.requiere_anticipo || false;
};

/**
 * Verifica si el negocio ya está configurado
 */
window.negocioConfigurado = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return config?.configurado || false;
};

// Precargar configuración al inicio
setTimeout(async () => {
    console.log('🔄 Precargando configuración automática...');
    await window.cargarConfiguracionNegocio();
}, 500);

console.log('✅ config-negocio.js listo para Exotic Nails by Yuly');
console.log('🏷️  ID configurado:', NEGOCIO_ID_POR_DEFECTO);