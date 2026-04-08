// utils/auth-clients.js - VERSIÓN CON REGISTRO AUTOMÁTICO
// Los clientes se registran solos sin necesidad de aprobación

console.log('🚀 auth-clients.js CARGADO - MODO REGISTRO AUTOMÁTICO');

// Helper para obtener negocio_id
function getNegocioId() {
    if (typeof window.getNegocioIdFromConfig !== 'undefined') {
        return window.getNegocioIdFromConfig();
    }
    return localStorage.getItem('negocioId');
}

// ============================================
// FUNCIÓN PRINCIPAL - VERIFICAR O CREAR CLIENTE
// ============================================

/**
 * Verifica si un cliente existe en la base de datos
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @returns {Promise<object|null>} - Datos del cliente o null
 */
window.verificarAccesoCliente = async function(whatsapp) {
    try {
        const negocioId = getNegocioId();
        console.log('🔍 Verificando acceso para:', whatsapp, 'negocio:', negocioId);
        
        // Buscar si ya existe como cliente
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}&select=*`,
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
        
        // Si existe, devolverlo
        if (data && data.length > 0) {
            console.log('✅ Cliente encontrado:', data[0]);
            return data[0];
        }
        
        console.log('📝 Cliente no encontrado');
        return null;
        
    } catch (error) {
        console.error('Error en verificarAccesoCliente:', error);
        return null;
    }
};

/**
 * Crea un nuevo cliente en la base de datos
 * @param {string} nombre - Nombre completo del cliente
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @returns {Promise<object|null>} - Datos del cliente creado
 */
window.crearCliente = async function(nombre, whatsapp) {
    try {
        const negocioId = getNegocioId();
        console.log('➕ Creando nuevo cliente:', { nombre, whatsapp, negocio: negocioId });
        
        // PRIMERO: Verificar si ya existe en ESTE negocio
        const checkUrl = `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}&select=*`;
        console.log('🔍 Verificando existencia:', checkUrl);
        
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        
        if (checkResponse.ok) {
            const existing = await checkResponse.json();
            if (existing && existing.length > 0) {
                console.log('✅ Cliente ya existe en este negocio:', existing[0]);
                return existing[0];
            }
        }
        
        // SEGUNDO: Si no existe, CREARLO
        console.log('📝 Cliente no existe en este negocio, creando...');
        
        const createResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados`,
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
                    nombre: nombre,
                    whatsapp: whatsapp,
                    fecha_registro: new Date().toISOString()
                })
            }
        );
        
        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('❌ Error al crear cliente:', {
                status: createResponse.status,
                statusText: createResponse.statusText,
                error: errorText
            });
            
            // Si es 409, puede ser un falso positivo, intentar obtener el cliente de nuevo
            if (createResponse.status === 409) {
                console.log('⚠️ Conflicto 409, intentando recuperar cliente existente...');
                
                const retryResponse = await fetch(checkUrl, {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                });
                
                if (retryResponse.ok) {
                    const retryData = await retryResponse.json();
                    if (retryData && retryData.length > 0) {
                        console.log('✅ Cliente recuperado después del conflicto:', retryData[0]);
                        return retryData[0];
                    }
                }
            }
            
            return null;
        }
        
        const nuevoCliente = await createResponse.json();
        console.log('✅ Cliente creado exitosamente:', nuevoCliente);
        
        return Array.isArray(nuevoCliente) ? nuevoCliente[0] : nuevoCliente;
        
    } catch (error) {
        console.error('❌ Error en crearCliente:', error);
        return null;
    }
};

/**
 * Actualiza el nombre de un cliente existente
 * @param {string} whatsapp - Número completo con 53 al inicio
 * @param {string} nuevoNombre - Nuevo nombre del cliente
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
window.actualizarNombreCliente = async function(whatsapp, nuevoNombre) {
    try {
        const negocioId = getNegocioId();
        console.log('✏️ Actualizando nombre de cliente:', { whatsapp, nuevoNombre, negocio: negocioId });
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ nombre: nuevoNombre })
            }
        );
        
        if (!response.ok) {
            console.error('Error actualizando nombre:', await response.text());
            return false;
        }
        
        console.log('✅ Nombre actualizado correctamente');
        return true;
        
    } catch (error) {
        console.error('Error en actualizarNombreCliente:', error);
        return false;
    }
};

/**
 * Verifica si un número está autorizado (alias para compatibilidad)
 */
window.isClienteAutorizado = async function(whatsapp) {
    const cliente = await window.verificarAccesoCliente(whatsapp);
    return !!cliente;
};

// ============================================
// FUNCIONES PARA EL PANEL DE ADMIN
// ============================================

/**
 * Obtiene todos los clientes registrados
 */
window.getClientesRegistrados = async function() {
    try {
        const negocioId = getNegocioId();
        console.log('📋 Obteniendo clientes registrados para negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&order=fecha_registro.desc`,
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
            return [];
        }
        
        const data = await response.json();
        console.log('✅ Clientes obtenidos:', data.length);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        return [];
    }
};

// Alias para compatibilidad con código existente
window.getClientesAutorizados = window.getClientesRegistrados;

/**
 * Elimina un cliente de la base de datos
 */
window.eliminarCliente = async function(whatsapp) {
    console.log('🗑️ Eliminando cliente:', whatsapp);
    
    try {
        const negocioId = getNegocioId();
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/clientes_autorizados?negocio_id=eq.${negocioId}&whatsapp=eq.${whatsapp}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!response.ok) {
            console.error('Error eliminando:', await response.text());
            return false;
        }
        
        console.log('✅ Cliente eliminado');
        return true;
    } catch (error) {
        console.error('Error eliminando cliente:', error);
        return false;
    }
};

// Alias para compatibilidad
window.eliminarClienteAutorizado = window.eliminarCliente;

console.log('✅ auth-clients.js inicializado - MODO REGISTRO AUTOMÁTICO ACTIVADO');