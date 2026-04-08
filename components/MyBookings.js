// components/MyBookings.js - VERSIÓN COMPLETA CORREGIDA

function MyBookings({ cliente, onVolver }) {
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [cancelando, setCancelando] = React.useState(false);
    const [filtro, setFiltro] = React.useState('activas');
    const [mensajeError, setMensajeError] = React.useState('');
    const [negocioId, setNegocioId] = React.useState(null);

    // Obtener negocioId
    React.useEffect(() => {
        const id = localStorage.getItem('negocioId') || window.NEGOCIO_ID_POR_DEFECTO;
        setNegocioId(id);
        console.log('🏢 MyBookings - Negocio ID:', id);
    }, []);

    React.useEffect(() => {
        if (cliente?.whatsapp && negocioId) {
            cargarReservas();
        }
    }, [cliente, negocioId]);

    const cargarReservas = async () => {
        setLoading(true);
        setMensajeError('');
        try {
            console.log('🔍 Buscando reservas para:', cliente.whatsapp, 'en negocio:', negocioId);
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&cliente_whatsapp=eq.${cliente.whatsapp}&order=fecha.desc,hora_inicio.desc`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Error al cargar reservas');
            }
            
            const data = await response.json();
            console.log(`📋 Reservas encontradas:`, data.length);
            setBookings(Array.isArray(data) ? data : []);
            
        } catch (error) {
            console.error('Error cargando reservas:', error);
            setMensajeError('Error al cargar tus reservas');
        } finally {
            setLoading(false);
        }
    };

    const puedeCancelar = (fecha, horaInicio) => {
        try {
            const ahora = new Date();
            const [year, month, day] = fecha.split('-').map(Number);
            const [hours, minutes] = horaInicio.split(':').map(Number);
            
            const fechaTurno = new Date(year, month - 1, day, hours, minutes, 0);
            const diffMs = fechaTurno - ahora;
            const diffMinutos = Math.floor(diffMs / (1000 * 60));
            
            return diffMinutos > 60;
            
        } catch (error) {
            console.error('Error verificando cancelación:', error);
            return false;
        }
    };

    const getMensajeTiempoRestante = (fecha, horaInicio) => {
        try {
            const ahora = new Date();
            const [year, month, day] = fecha.split('-').map(Number);
            const [hours, minutes] = horaInicio.split(':').map(Number);
            
            const fechaTurno = new Date(year, month - 1, day, hours, minutes, 0);
            
            const diffMs = fechaTurno - ahora;
            const diffMinutos = Math.floor(diffMs / (1000 * 60));
            const diffHoras = Math.floor(diffMinutos / 60);
            const minutosRestantes = diffMinutos % 60;
            
            if (diffMinutos <= 0) {
                return "⏰ El turno ya pasó";
            } else if (diffMinutos <= 60) {
                return `⚠️ Faltan menos de ${diffMinutos} minutos - No puedes cancelar`;
            } else if (diffHoras > 0) {
                return `🕐 Faltan ${diffHoras}h ${minutosRestantes}m - Puedes cancelar`;
            } else {
                return `🕐 Faltan ${diffMinutos} minutos - Puedes cancelar`;
            }
        } catch (error) {
            return "";
        }
    };

    // FUNCIÓN CORREGIDA - USA notificarCancelacion + teléfono dinámico
const handleCancelarReserva = async (id, bookingData) => {
    if (!puedeCancelar(bookingData.fecha, bookingData.hora_inicio)) {
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(bookingData.fecha) : 
            bookingData.fecha;
        
        // 🔥 OBTENER TELÉFONO DE LA BD
        const telefonoDuenno = await window.getTelefonoDuenno();
        
        const mensaje = `❌ No puedes cancelar este turno porque faltan menos de 1 hora.
            
📅 Tu turno es el ${fechaConDia} a las ${window.formatTo12Hour ? window.formatTo12Hour(bookingData.hora_inicio) : bookingData.hora_inicio}

⏰ Solo se permiten cancelaciones con al menos 1 hora de anticipación.

Si no puedes asistir, contactanos por WhatsApp al +53 ${telefonoDuenno}`;
        
        alert(mensaje);
        return;
    }
    
    const fechaConDiaConfirm = window.formatFechaCompleta ? 
        window.formatFechaCompleta(bookingData.fecha) : 
        bookingData.fecha;
    
    if (!confirm(`¿Estás segura que querés cancelar tu turno del ${fechaConDiaConfirm} a las ${window.formatTo12Hour ? window.formatTo12Hour(bookingData.hora_inicio) : bookingData.hora_inicio}?`)) {
        return;
    }
    
    setCancelando(true);
    try {
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 'Cancelado' })
            }
        );
        
        if (!response.ok) {
            throw new Error('Error al cancelar');
        }
        
        console.log('📤 Enviando notificaciones de cancelación...');
        
        // Marcar que fue cancelado por cliente
        bookingData.cancelado_por = 'cliente';
        
        // ÚNICA LLAMADA - notificarCancelacion ya maneja WhatsApp al dueño + ntfy
        if (window.notificarCancelacion) {
            await window.notificarCancelacion(bookingData);
        }
        
        alert('✅ Turno cancelado correctamente');
        await cargarReservas();
        
    } catch (error) {
        console.error('Error cancelando reserva:', error);
        alert('Error al cancelar el turno');
    } finally {
        setCancelando(false);
    }
};
    const reservasFiltradas = bookings.filter(booking => {
        if (filtro === 'activas') return booking.estado !== 'Cancelado';
        if (filtro === 'canceladas') return booking.estado === 'Cancelado';
        return true;
    });

    const activasCount = bookings.filter(b => b.estado !== 'Cancelado').length;
    const canceladasCount = bookings.filter(b => b.estado === 'Cancelado').length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 pb-20">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-10 border-b border-pink-200">
                <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
                    <button
                        onClick={onVolver}
                        className="flex items-center gap-2 text-pink-600 hover:text-pink-800 transition"
                    >
                        <i className="icon-arrow-left text-xl"></i>
                        <span className="font-medium">Volver</span>
                    </button>
                    <h1 className="text-xl font-bold text-pink-800">✨ Mis Reservas ✨</h1>
                    <div className="w-20"></div>
                </div>
            </div>

            {/* Contenido */}
            <div className="max-w-3xl mx-auto px-4 py-6">
                
                {/* Info del cliente */}
                <div className="bg-white/80 backdrop-blur-sm border border-pink-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                            {cliente.nombre.charAt(0)}
                        </div>
                        <div>
                            <p className="font-medium text-pink-800">{cliente.nombre}</p>
                            <p className="text-sm text-pink-600">{cliente.whatsapp}</p>
                        </div>
                    </div>
                </div>

                {/* Mensaje de error si hay */}
                {mensajeError && (
                    <div className="bg-pink-100 border border-pink-300 text-pink-700 p-3 rounded-lg mb-4 text-sm">
                        {mensajeError}
                    </div>
                )}

                {/* Filtros */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setFiltro('activas')}
                        className={`
                            px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap
                            ${filtro === 'activas' 
                                ? 'bg-pink-500 text-white shadow-md' 
                                : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}
                        `}
                    >
                        Activas ({activasCount})
                    </button>
                    <button
                        onClick={() => setFiltro('canceladas')}
                        className={`
                            px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap
                            ${filtro === 'canceladas' 
                                ? 'bg-pink-500 text-white shadow-md' 
                                : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}
                        `}
                    >
                        Canceladas ({canceladasCount})
                    </button>
                    <button
                        onClick={() => setFiltro('todas')}
                        className={`
                            px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap
                            ${filtro === 'todas' 
                                ? 'bg-pink-500 text-white shadow-md' 
                                : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}
                        `}
                    >
                        Todas ({bookings.length})
                    </button>
                </div>

                {/* Listado de reservas */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                        <p className="text-pink-500 mt-4">Cargando tus reservas...</p>
                    </div>
                ) : reservasFiltradas.length === 0 ? (
                    <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-pink-200">
                        <div className="text-6xl mb-4">📅✨</div>
                        <p className="text-pink-600 mb-2">No tenés reservas {filtro !== 'todas' ? filtro : ''}</p>
                        <button
                            onClick={onVolver}
                            className="text-pink-500 font-medium hover:underline"
                        >
                            Reservar un turno
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reservasFiltradas.map(booking => {
                            const puedeCancelarBooking = booking.estado !== 'Cancelado' && 
                                                         puedeCancelar(booking.fecha, booking.hora_inicio);
                            const tiempoRestante = getMensajeTiempoRestante(booking.fecha, booking.hora_inicio);
                            
                            const fechaConDia = window.formatFechaCompleta ? 
                                window.formatFechaCompleta(booking.fecha) : 
                                booking.fecha;
                            
                            const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
                            
                            return (
                                <div
                                    key={booking.id}
                                    className={`
                                        bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border-l-4 overflow-hidden border border-pink-200
                                        ${booking.estado === 'Cancelado' 
                                            ? 'border-l-pink-400 opacity-70' 
                                            : 'border-l-pink-500'}
                                    `}
                                >
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-sm text-pink-600 font-medium block mb-1">
                                                    {fechaConDia}
                                                </span>
                                                <h3 className="font-bold text-pink-800 text-lg">{booking.servicio}</h3>
                                            </div>
                                            <span className={`
                                                px-3 py-1 rounded-full text-xs font-semibold
                                                ${booking.estado === 'Reservado' ? 'bg-pink-100 text-pink-700' :
                                                  booking.estado === 'Confirmado' ? 'bg-pink-200 text-pink-800' :
                                                  'bg-pink-100 text-pink-500'}
                                            `}>
                                                {booking.estado}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                            <div className="flex items-center gap-2 text-pink-600">
                                                <span className="text-pink-400">⏰</span>
                                                <span>{window.formatTo12Hour ? window.formatTo12Hour(booking.hora_inicio) : booking.hora_inicio}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-pink-600">
                                                <span className="text-pink-400">⏱️</span>
                                                <span>{booking.duracion} min</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-pink-600 col-span-2">
                                                <span className="text-pink-400">👩‍🎨</span>
                                                <span>Profesional: {profesional}</span>
                                            </div>
                                        </div>
                                        
                                        {booking.estado !== 'Cancelado' && (
                                            <div className={`
                                                text-xs p-2 rounded-lg mb-3 flex items-center gap-2
                                                ${puedeCancelarBooking 
                                                    ? 'bg-pink-50 text-pink-700 border border-pink-200' 
                                                    : 'bg-pink-100 text-pink-700 border border-pink-300'}
                                            `}>
                                                <span>{puedeCancelarBooking ? '💡' : '⚠️'}</span>
                                                <span>{tiempoRestante}</span>
                                            </div>
                                        )}
                                        
                                        {booking.estado !== 'Cancelado' && (
                                            <button
                                                onClick={() => handleCancelarReserva(booking.id, booking)}
                                                disabled={cancelando || !puedeCancelarBooking}
                                                className={`
                                                    w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2
                                                    ${puedeCancelarBooking
                                                        ? 'bg-pink-100 hover:bg-pink-200 text-pink-700'
                                                        : 'bg-pink-50 text-pink-400 cursor-not-allowed'}
                                                    disabled:opacity-50 disabled:cursor-not-allowed
                                                `}
                                                title={!puedeCancelarBooking ? "Solo se puede cancelar con al menos 1 hora de anticipación" : ""}
                                            >
                                                {cancelando ? (
                                                    <>
                                                        <div className="animate-spin h-4 w-4 border-2 border-pink-600 border-t-transparent rounded-full"></div>
                                                        Cancelando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>❌</span>
                                                        {puedeCancelarBooking 
                                                            ? 'Cancelar turno' 
                                                            : 'No se puede cancelar (menos de 1h)'}
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}