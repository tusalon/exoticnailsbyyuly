// utils/auth-profesionales.js - Autenticación para profesionales (CORREGIDO)

console.log('👤 auth-profesionales.js cargado');

// Helper para obtener negocio_id - SIN RECURSIÓN
function getNegocioId() {
    // Usar la función global de config-negocio.js si existe
    if (typeof window.getNegocioIdFromConfig !== 'undefined') {
        return window.getNegocioIdFromConfig();
    }
    // Fallback a localStorage
    return localStorage.getItem('negocioId');
}

// ============================================
// FUNCIONES DE AUTENTICACIÓN PARA PROFESIONALES
// ============================================

window.loginProfesional = async function(telefono, password) {
    try {
        const negocioId = getNegocioId();
        const telefonoLimpio = window.normalizarTelefonoLocal
            ? window.normalizarTelefonoLocal(telefono)
            : String(telefono || '').replace(/\D/g, '').replace(/^53(?=\d{8,}$)/, '');
        const passwordLimpio = String(password || '').trim();
        if (!negocioId || !telefonoLimpio || !passwordLimpio) {
            return null;
        }
        console.log('🔐 Intentando login de profesional:', telefono, 'negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/rpc/login_profesional`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    p_negocio_id: negocioId,
                    p_telefono: telefonoLimpio,
                    p_password: passwordLimpio
                })
            }
        );
        
        if (!response.ok) {
            console.error('Error response:', await response.text());
            return null;
        }
        
        let data = await response.json();
        console.log('📋 Resultado login:', data);
        
        if (data && data.length > 0) {
            return data[0];
        }
        return null;
    } catch (error) {
        console.error('Error en loginProfesional:', error);
        return null;
    }
};

window.verificarProfesionalPorTelefono = async function(telefono) {
    try {
        const negocioId = getNegocioId();
        const telefonoLimpio = window.normalizarTelefonoLocal
            ? window.normalizarTelefonoLocal(telefono)
            : String(telefono || '').replace(/\D/g, '').replace(/^53(?=\d{8,}$)/, '');
        if (!negocioId || !telefonoLimpio) {
            return null;
        }
        console.log('🔍 Verificando si es profesional (solo teléfono):', telefono, 'negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${encodeURIComponent(negocioId)}&telefono=eq.${encodeURIComponent(telefonoLimpio)}&activo=eq.true&select=id,nombre,telefono,nivel`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            console.error('Error response:', await response.text());
            return null;
        }
        
        const data = await response.json();
        console.log('📋 Resultado verificación:', data);
        
        if (data && data.length > 0) {
            return data[0];
        }
        return null;
    } catch (error) {
        console.error('Error verificando profesional:', error);
        return null;
    }
};

window.getProfesionalAutenticado = function() {
    const auth = localStorage.getItem('profesionalAuth');
    const loginTime = localStorage.getItem('profesionalLoginTime');
    const sesionVigente = loginTime && (Date.now() - parseInt(loginTime)) < 8 * 60 * 60 * 1000;
    if (!sesionVigente) {
        localStorage.removeItem('profesionalAuth');
        localStorage.removeItem('profesionalLoginTime');
        return null;
    }
    if (auth) {
        try {
            return JSON.parse(auth);
        } catch (e) {
            return null;
        }
    }
    return null;
};

// ============================================
// FUNCIONES PARA OBTENER ROL
// ============================================

window.obtenerRolUsuario = async function(telefono) {
    try {
        const negocioId = getNegocioId();
        console.log('🔍 Obteniendo rol para:', telefono, 'negocio:', negocioId);
        
        const telefonoLimpio = telefono.replace(/\D/g, '');
        
        // Verificar si es PROFESIONAL
        const profesionalRes = await fetch(
            `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&telefono=eq.${telefonoLimpio}&activo=eq.true&select=id,nombre,nivel`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (profesionalRes.ok) {
            const profesionales = await profesionalRes.json();
            if (profesionales && profesionales.length > 0) {
                console.log('👨‍🎨 Es profesional:', profesionales[0].nombre);
                return {
                    rol: 'profesional',
                    id: profesionales[0].id,
                    nombre: profesionales[0].nombre,
                    nivel: profesionales[0].nivel || 1
                };
            }
        }
        
        return {
            rol: 'cliente',
            nombre: null
        };
        
    } catch (error) {
        console.error('Error obteniendo rol:', error);
        return { rol: 'cliente' };
    }
};

window.tieneAccesoPanel = async function(telefono) {
    const rol = await window.obtenerRolUsuario(telefono);
    return rol.rol === 'admin' || rol.rol === 'profesional';
};

// ============================================
// FUNCIONES PARA RESERVAS DE PROFESIONALES
// ============================================

window.getReservasPorProfesional = async function(profesionalId, soloActivas = true) {
    try {
        const negocioId = getNegocioId();
        console.log(`📋 Obteniendo reservas para profesional ${profesionalId} (negocio: ${negocioId})`);
        
        let url = `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&profesional_id=eq.${profesionalId}&order=fecha.desc,hora_inicio.asc`;
        
        if (soloActivas) {
            url += '&estado=neq.Cancelado';
        }
        
        const response = await fetch(
            url,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) return [];
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error obteniendo reservas:', error);
        return [];
    }
};

// Alias para compatibilidad
window.getReservasPorBarbero = window.getReservasPorProfesional;
