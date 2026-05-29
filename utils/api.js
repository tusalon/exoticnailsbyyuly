// utils/api.js - Versión genérica para profesionales (CORREGIDO)

console.log('📡 api.js cargado');

// Usar variable global o definir si no existe
if (typeof window.TABLE_NAME === 'undefined') {
    window.TABLE_NAME = 'reservas';
}
const TABLE_NAME = window.TABLE_NAME;

const normalizeTimeKey = (value) => String(value || '').slice(0, 5);

// Helper para obtener negocio_id - SIN RECURSIÓN
function getNegocioId() {
    // Usar la función global de config-negocio.js si existe
    if (typeof window.getNegocioIdFromConfig !== 'undefined') {
        return window.getNegocioIdFromConfig();
    }
    // Fallback a localStorage
    return localStorage.getItem('negocioId');
}

/**
 * Fetch all bookings for a specific date
 */
async function getBookingsByDate(dateStr) {
    try {
        const negocioId = getNegocioId();
        console.log('🌐 Solicitando turnos a Supabase para', dateStr, 'negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/${TABLE_NAME}?negocio_id=eq.${negocioId}&fecha=eq.${dateStr}&estado=neq.Cancelado&select=*`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store'
            }
        );
        
        if (!response.ok) throw new Error('Error fetching bookings');
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

/**
 * Fetch bookings for a specific date AND profesional
 */
async function getBookingsByDateAndProfesional(dateStr, profesionalId) {
    try {
        const negocioId = getNegocioId();
        console.log(`🌐 Solicitando turnos para ${dateStr} del profesional ${profesionalId} (negocio: ${negocioId})`);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/${TABLE_NAME}?negocio_id=eq.${negocioId}&fecha=eq.${dateStr}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=*`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store'
            }
        );
        
        if (!response.ok) throw new Error('Error fetching bookings');
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

/**
 * Create a new booking
 */
async function createBooking(bookingData) {
    try {
        const negocioId = getNegocioId();
        const bloqueo = await window.getClienteBloqueado?.(bookingData.cliente_whatsapp);
        if (bloqueo) {
            const error = new Error('Este cliente no tiene permiso para reservar.');
            error.code = 'CLIENTE_BLOQUEADO';
            throw error;
        }
        
        const dataForSupabase = {
            negocio_id: negocioId,
            cliente_nombre: bookingData.cliente_nombre,
            cliente_whatsapp: bookingData.cliente_whatsapp,
            servicio: bookingData.servicio,
            duracion: bookingData.duracion,
            profesional_id: bookingData.trabajador_id || bookingData.profesional_id,
            profesional_nombre: bookingData.trabajador_nombre || bookingData.profesional_nombre,
            fecha: bookingData.fecha,
            hora_inicio: bookingData.hora_inicio,
            hora_fin: bookingData.hora_fin,
            estado: bookingData.estado || 'Reservado'
        };

        console.log('📤 Enviando a Supabase:', dataForSupabase);

        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/${TABLE_NAME}`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store',
                body: JSON.stringify(dataForSupabase)
            }
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error('Error creating booking');
        }
        
        const newBooking = await response.json();
        console.log('✅ Reserva creada exitosamente:', newBooking);
        
        return { success: true, data: newBooking[0] };
    } catch (error) {
        console.error('❌ Error creating booking:', error);
        throw error;
    }
}

/**
 * Fetch all bookings (for admin)
 */
async function getAllBookings() {
    try {
        const negocioId = getNegocioId();
        console.log('🌐 Solicitando todas las reservas a Supabase para negocio:', negocioId);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/${TABLE_NAME}?negocio_id=eq.${negocioId}&select=*&order=fecha.desc,hora_inicio.asc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store'
            }
        );
        
        if (!response.ok) throw new Error('Error fetching all bookings');
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching all bookings:', error);
        return [];
    }
}

/**
 * Update booking status
 */
async function updateBookingStatus(id, newStatus) {
    try {
        const negocioId = getNegocioId();
        console.log(`📝 Actualizando reserva ${id} a estado ${newStatus} (negocio: ${negocioId})`);
        
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/${TABLE_NAME}?negocio_id=eq.${negocioId}&id=eq.${id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store',
                body: JSON.stringify({ estado: newStatus })
            }
        );
        
        if (!response.ok) throw new Error('Error updating booking');
        
        console.log('✅ Estado actualizado');
        return { success: true };
    } catch (error) {
        console.error('Error updating booking:', error);
        throw error;
    }
}

async function getListaEsperaPorFechaProfesional(dateStr, profesionalId) {
    try {
        const negocioId = getNegocioId();
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/lista_espera?negocio_id=eq.${negocioId}&fecha=eq.${dateStr}&profesional_id=eq.${profesionalId}&estado=neq.cerrada&select=*`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            console.warn('Lista de espera no disponible:', await response.text());
            return [];
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error cargando lista de espera:', error);
        return [];
    }
}

async function unirseListaEspera(data) {
    try {
        const negocioId = getNegocioId();
        const existente = await getListaEsperaPorFechaProfesional(data.fecha, data.profesional_id);
        const ocupado = existente.find(item =>
            normalizeTimeKey(item.hora_inicio) === normalizeTimeKey(data.hora_inicio) &&
            String(item.estado || '').toLowerCase() !== 'cerrada'
        );

        if (ocupado) {
            return { success: false, reason: 'occupied', data: ocupado };
        }

        const payload = {
            negocio_id: negocioId,
            cliente_nombre: data.cliente_nombre,
            cliente_whatsapp: data.cliente_whatsapp,
            servicio: data.servicio,
            duracion: data.duracion,
            profesional_id: data.profesional_id,
            profesional_nombre: data.profesional_nombre,
            fecha: data.fecha,
            hora_inicio: data.hora_inicio,
            hora_fin: data.hora_fin,
            estado: 'esperando'
        };

        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/lista_espera`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store',
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error creando lista de espera:', errorText);
            if (errorText.includes('duplicate') || errorText.includes('23505')) {
                return { success: false, reason: 'occupied' };
            }
            throw new Error(errorText);
        }

        const inserted = await response.json();
        return { success: true, data: inserted?.[0] || payload };
    } catch (error) {
        console.error('Error uniendose a lista de espera:', error);
        return { success: false, reason: 'error', error };
    }
}

async function notificarListaEsperaTurnoLiberado(booking) {
    try {
        if (!booking?.fecha || !booking?.hora_inicio || !booking?.profesional_id) return false;

        const negocioId = booking.negocio_id || getNegocioId();
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/lista_espera?negocio_id=eq.${negocioId}&fecha=eq.${booking.fecha}&profesional_id=eq.${booking.profesional_id}&hora_inicio=eq.${normalizeTimeKey(booking.hora_inicio)}&estado=eq.esperando&select=*&order=created_at.asc&limit=1`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            console.warn('No se pudo consultar lista de espera:', await response.text());
            return false;
        }

        const data = await response.json();
        const espera = data?.[0];
        if (!espera) return false;

        const fecha = window.formatFechaCompleta ? window.formatFechaCompleta(espera.fecha) : espera.fecha;
        const hora = window.formatTo12Hour ? window.formatTo12Hour(espera.hora_inicio) : espera.hora_inicio;
        const mensaje =
`LISTA DE ESPERA - TURNO LIBERADO

Se libero un turno ocupado:
Fecha: ${fecha}
Hora: ${hora}
Profesional: ${espera.profesional_nombre}
Servicio: ${espera.servicio}

Clienta en lista de espera:
Nombre: ${espera.cliente_nombre}
WhatsApp: ${espera.cliente_whatsapp}`;

        if (window.enviarNotificacionPush) {
            await window.enviarNotificacionPush('Lista de espera: turno liberado', mensaje, 'bell', 'high');
        }

        const config = window.cargarConfiguracionNegocio ? await window.cargarConfiguracionNegocio(true) : {};
        if (window.enviarWhatsApp && config?.telefono) {
            window.enviarWhatsApp(config.telefono, mensaje);
        }

        await fetch(
            `${window.SUPABASE_URL}/rest/v1/lista_espera?negocio_id=eq.${negocioId}&id=eq.${espera.id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    estado: 'notificada',
                    fecha_notificacion: new Date().toISOString()
                })
            }
        );

        return true;
    } catch (error) {
        console.error('Error notificando lista de espera:', error);
        return false;
    }
}

// Hacer funciones globales
window.getBookingsByDate = getBookingsByDate;
window.getBookingsByDateAndProfesional = getBookingsByDateAndProfesional;
window.getBookingsByDateAndWorker = getBookingsByDateAndProfesional;
window.createBooking = createBooking;
window.getAllBookings = getAllBookings;
window.updateBookingStatus = updateBookingStatus;
window.getListaEsperaPorFechaProfesional = getListaEsperaPorFechaProfesional;
window.unirseListaEspera = unirseListaEspera;
window.notificarListaEsperaTurnoLiberado = notificarListaEsperaTurnoLiberado;

console.log('✅ api.js funciones disponibles');
