// utils/api.js - Versión genérica para profesionales (CORREGIDO)

console.log('📡 api.js cargado');

// Usar variable global o definir si no existe
if (typeof window.TABLE_NAME === 'undefined') {
    window.TABLE_NAME = 'reservas';
}
const TABLE_NAME = window.TABLE_NAME;

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

// Hacer funciones globales
window.getBookingsByDate = getBookingsByDate;
window.getBookingsByDateAndProfesional = getBookingsByDateAndProfesional;
window.getBookingsByDateAndWorker = getBookingsByDateAndProfesional;
window.createBooking = createBooking;
window.getAllBookings = getAllBookings;
window.updateBookingStatus = updateBookingStatus;

console.log('✅ api.js funciones disponibles');