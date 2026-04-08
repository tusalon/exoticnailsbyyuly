// utils/dias-cerrados.js - Gestión de días cerrados (feriados, vacaciones)

console.log('📅 dias-cerrados.js cargado');

// Helper para obtener negocio_id
function getNegocioId() {
    if (typeof window.getNegocioIdFromConfig !== 'undefined') {
        return window.getNegocioIdFromConfig();
    }
    return localStorage.getItem('negocioId');
}

// Variables con nombres ÚNICOS para evitar conflictos con config.js
let diasCerradosCacheData = [];
let ultimaActualizacionDiasCerrados = 0;
const CACHE_DURATION_DIAS_CERRADOS = 10 * 60 * 1000; // 10 minutos

/**
 * Carga los días cerrados desde Supabase
 */
async function cargarDiasCerrados() {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) return [];
        
        console.log('🌐 Cargando días cerrados para negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/dias_cerrados?negocio_id=eq.${negocioId}&select=fecha,motivo&order=fecha.asc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!response.ok) {
            console.error('Error cargando días cerrados:', await response.text());
            return [];
        }
        
        const data = await response.json();
        diasCerradosCacheData = data;
        ultimaActualizacionDiasCerrados = Date.now();
        
        console.log(`✅ ${data.length} días cerrados cargados`);
        return data;
        
    } catch (error) {
        console.error('Error cargando días cerrados:', error);
        return [];
    }
}

/**
 * Verifica si una fecha específica está cerrada
 */
window.verificarDiaCerrado = async function(fechaStr) {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) return null;
        
        if (Date.now() - ultimaActualizacionDiasCerrados < CACHE_DURATION_DIAS_CERRADOS && diasCerradosCacheData.length > 0) {
            const encontrado = diasCerradosCacheData.find(d => d.fecha === fechaStr);
            return encontrado || null;
        }
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/dias_cerrados?negocio_id=eq.${negocioId}&fecha=eq.${fechaStr}&select=motivo`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return data[0] || null;
        
    } catch (error) {
        console.error('Error verificando día cerrado:', error);
        return null;
    }
};

/**
 * Obtiene todos los días cerrados
 */
window.getDiasCerrados = async function() {
    if (Date.now() - ultimaActualizacionDiasCerrados < CACHE_DURATION_DIAS_CERRADOS && diasCerradosCacheData.length > 0) {
        return [...diasCerradosCacheData];
    }
    return await cargarDiasCerrados();
};

/**
 * Obtiene solo las fechas de días cerrados (para comparaciones rápidas)
 */
window.getDiasCerradosFechas = async function() {
    const dias = await window.getDiasCerrados();
    return dias.map(d => d.fecha);
};

/**
 * Agrega un día cerrado
 */
window.agregarDiaCerrado = async function(fecha, motivo = '') {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('No hay negocioId');
            return false;
        }
        
        console.log('➕ Agregando día cerrado:', fecha, motivo);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/dias_cerrados`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    negocio_id: negocioId,
                    fecha: fecha,
                    motivo: motivo
                })
            }
        );
        
        if (!response.ok) {
            const error = await response.text();
            console.error('Error agregando día cerrado:', error);
            return false;
        }
        
        await cargarDiasCerrados();
        
        if (window.dispatchEvent) {
            window.dispatchEvent(new Event('diasCerradosActualizados'));
        }
        
        return true;
        
    } catch (error) {
        console.error('Error agregando día cerrado:', error);
        return false;
    }
};

/**
 * Elimina un día cerrado
 */
window.eliminarDiaCerrado = async function(fecha) {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('No hay negocioId');
            return false;
        }
        
        console.log('🗑️ Eliminando día cerrado:', fecha);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/dias_cerrados?negocio_id=eq.${negocioId}&fecha=eq.${fecha}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!response.ok) {
            console.error('Error eliminando día cerrado:', await response.text());
            return false;
        }
        
        await cargarDiasCerrados();
        
        if (window.dispatchEvent) {
            window.dispatchEvent(new Event('diasCerradosActualizados'));
        }
        
        return true;
        
    } catch (error) {
        console.error('Error eliminando día cerrado:', error);
        return false;
    }
};

// Precargar días cerrados al inicio
setTimeout(async () => {
    await cargarDiasCerrados();
}, 1000);

console.log('✅ dias-cerrados.js inicializado');