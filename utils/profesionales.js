// utils/profesionales.js - Gestión de profesionales (CORREGIDO)

console.log('👥 profesionales.js cargado');

// Helper para obtener negocio_id - SIN RECURSIÓN
function getNegocioId() {
    // Usar la función global de config-negocio.js si existe
    if (typeof window.getNegocioIdFromConfig !== 'undefined') {
        return window.getNegocioIdFromConfig();
    }
    // Fallback a localStorage
    return localStorage.getItem('negocioId');
}

let profesionalesCache = [];
let ultimaActualizacionProfesionales = 0;
const CACHE_DURATION_PROFESIONALES = 5 * 60 * 1000;

async function hashPasswordProfesional(password) {
    const texto = String(password || '').trim();
    if (!texto || !window.crypto?.subtle) return texto;

    const encoder = new TextEncoder();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoder.encode(texto));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return `sha256$${hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

async function cargarProfesionalesDesdeDB() {
    try {
        const negocioId = getNegocioId();
        console.log('🌐 Cargando profesionales desde Supabase para negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&select=id,negocio_id,nombre,especialidad,color,avatar,activo,telefono,nivel,fechas_libres&order=id.asc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) return null;
        
        const data = await response.json();
        profesionalesCache = data;
        ultimaActualizacionProfesionales = Date.now();
        return data;
    } catch (error) {
        console.error('Error cargando profesionales:', error);
        return null;
    }
}

window.salonProfesionales = {
    getAll: async function(activos = true) {
        if (Date.now() - ultimaActualizacionProfesionales < CACHE_DURATION_PROFESIONALES && profesionalesCache.length > 0) {
            if (activos) {
                return profesionalesCache.filter(p => p.activo === true);
            }
            return [...profesionalesCache];
        }
        
        const datos = await cargarProfesionalesDesdeDB();
        if (datos) {
            if (activos) {
                return datos.filter(p => p.activo === true);
            }
            return datos;
        }
        return [];
    },
    
    getById: async function(id) {
        try {
            const negocioId = getNegocioId();
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&id=eq.${id}&select=id,negocio_id,nombre,especialidad,color,avatar,activo,telefono,nivel,fechas_libres`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            if (!response.ok) return null;
            const data = await response.json();
            return data[0] || null;
        } catch (error) {
            console.error('Error obteniendo profesional:', error);
            return null;
        }
    },
    
    crear: async function(profesional) {
        try {
            const passwordHash = profesional.password ? await hashPasswordProfesional(profesional.password) : null;
            const negocioId = getNegocioId();
            console.log('➕ Creando profesional para negocio:', negocioId);
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/profesionales`,
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
                        nombre: profesional.nombre,
                        especialidad: profesional.especialidad,
                        color: profesional.color || 'bg-amber-600',
                        avatar: profesional.avatar || '👤',
                        activo: true,
                        telefono: profesional.telefono || null,
                        password: passwordHash,
                        nivel: profesional.nivel || 1
                    })
                }
            );
            
            if (!response.ok) return null;
            
            const nuevo = await response.json();
            profesionalesCache = await cargarProfesionalesDesdeDB() || profesionalesCache;
            
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('profesionalesActualizados'));
            }
            
            return nuevo[0];
        } catch (error) {
            console.error('Error en crear:', error);
            return null;
        }
    },
    
    actualizar: async function(id, cambios) {
        try {
            const negocioId = getNegocioId();
            console.log('✏️ Actualizando profesional:', id, 'negocio:', negocioId);
            
            const cambiosLimpios = { ...cambios };
            if (!String(cambiosLimpios.password || '').trim()) {
                delete cambiosLimpios.password;
            } else {
                cambiosLimpios.password = await hashPasswordProfesional(cambiosLimpios.password);
            }

            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(cambiosLimpios)
                }
            );
            
            if (!response.ok) return null;
            
            const actualizado = await response.json();
            profesionalesCache = await cargarProfesionalesDesdeDB() || profesionalesCache;
            
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('profesionalesActualizados'));
            }
            
            return actualizado[0];
        } catch (error) {
            console.error('Error en actualizar:', error);
            return null;
        }
    },
    
    eliminar: async function(id) {
        try {
            const negocioId = getNegocioId();
            console.log('🗑️ Eliminando profesional:', id, 'negocio:', negocioId);
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&id=eq.${id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) return false;
            
            profesionalesCache = await cargarProfesionalesDesdeDB() || profesionalesCache;
            
            if (window.dispatchEvent) {
                window.dispatchEvent(new Event('profesionalesActualizados'));
            }
            
            return true;
        } catch (error) {
            console.error('Error en eliminar:', error);
            return false;
        }
    }
};

setTimeout(async () => {
    await window.salonProfesionales.getAll(false);
}, 1000);
