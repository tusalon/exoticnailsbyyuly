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

function hexToRgbParts(hex, fallback = '236 72 153') {
    const limpio = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return fallback;
    const r = parseInt(limpio.slice(0, 2), 16);
    const g = parseInt(limpio.slice(2, 4), 16);
    const b = parseInt(limpio.slice(4, 6), 16);
    return `${r} ${g} ${b}`;
}

function normalizarHexColor(hex, fallback = '#ec4899') {
    const limpio = String(hex || '').replace('#', '').trim();
    return /^[0-9a-fA-F]{6}$/.test(limpio) ? `#${limpio}` : fallback;
}

function getRgbFromHex(hex) {
    const limpio = normalizarHexColor(hex).replace('#', '');
    return {
        r: parseInt(limpio.slice(0, 2), 16),
        g: parseInt(limpio.slice(2, 4), 16),
        b: parseInt(limpio.slice(4, 6), 16)
    };
}

function getLuminancia(hex) {
    const { r, g, b } = getRgbFromHex(hex);
    const canal = value => {
        const v = value / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function oscurecerHex(hex, factor = 0.55) {
    const { r, g, b } = getRgbFromHex(hex);
    const toHex = value => Math.max(0, Math.min(255, Math.round(value * factor))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function asegurarColorVisible(hex, fallback = '#c0266f') {
    const color = normalizarHexColor(hex, fallback);
    return getLuminancia(color) > 0.72 ? oscurecerHex(color, 0.45) : color;
}

function aplicarTemaNegocio(config = {}) {
    const primarioOriginal = normalizarHexColor(config.color_primario, '#ec4899');
    const secundarioOriginal = normalizarHexColor(config.color_secundario, '#f9a8d4');
    const primario = asegurarColorVisible(primarioOriginal, '#c0266f');
    const secundario = getLuminancia(secundarioOriginal) > 0.86 ? '#f9a8d4' : secundarioOriginal;
    const primarioRgb = hexToRgbParts(primario);
    const secundarioRgb = hexToRgbParts(secundario, '249 168 212');
    const root = document.documentElement;

    root.style.setProperty('--brand-primary', primario);
    root.style.setProperty('--brand-secondary', secundario);
    root.style.setProperty('--brand-primary-original', primarioOriginal);
    root.style.setProperty('--brand-secondary-original', secundarioOriginal);
    root.style.setProperty('--brand-primary-rgb', primarioRgb);
    root.style.setProperty('--brand-secondary-rgb', secundarioRgb);
    const secundarioRgbCss = secundarioRgb.split(' ').join(', ');
    root.style.setProperty('--brand-soft', `rgba(${secundarioRgbCss}, 0.20)`);
    root.style.setProperty('--brand-surface', `rgba(${secundarioRgbCss}, 0.12)`);
    root.style.setProperty('--brand-surface-strong', `rgba(${secundarioRgbCss}, 0.28)`);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', primario);
}

window.aplicarTemaNegocio = aplicarTemaNegocio;

function normalizarPreferenciasWhatsApp(config = {}) {
    const moneda = String(config.whatsapp_moneda || 'CUP').toUpperCase();
    return {
        moneda: ['CUP', 'USD'].includes(moneda) ? moneda : 'CUP',
        mostrarCostos: config.whatsapp_mostrar_costos !== false
    };
}

window.getPreferenciasWhatsAppNegocio = function(config = null) {
    return normalizarPreferenciasWhatsApp(config || configCache || {});
};

/**
 * Obtiene el negocio_id propio de este cliente.
 */
function getNegocioId() {
    const localId = localStorage.getItem('negocioId');
    if (localId !== NEGOCIO_ID_POR_DEFECTO) {
        localStorage.setItem('negocioId', NEGOCIO_ID_POR_DEFECTO);
    }
    console.log('📌 Usando negocioId del cliente:', NEGOCIO_ID_POR_DEFECTO);
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
        aplicarTemaNegocio(configCache);
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
            const preferenciasWhatsApp = normalizarPreferenciasWhatsApp(configCache);
            configCache.whatsapp_moneda = preferenciasWhatsApp.moneda;
            configCache.whatsapp_mostrar_costos = preferenciasWhatsApp.mostrarCostos;
            if (window.setCodigoPaisTelefono) {
                window.setCodigoPaisTelefono(configCache.codigo_pais || configCache.codigo_pais_telefono || '53');
            }
            aplicarTemaNegocio(configCache);
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

window.getCodigoPaisNegocio = async function() {
    const config = await window.cargarConfiguracionNegocio();
    return window.getCodigoPaisTelefono ? window.getCodigoPaisTelefono(config) : (config?.codigo_pais || '53');
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
