// components/MyBookings.js - VERSIÓN COMPLETA CORREGIDA

function MyBookings({ cliente, onVolver }) {
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [cancelando, setCancelando] = React.useState(false);
    const [filtro, setFiltro] = React.useState('activas');
    const [mensajeError, setMensajeError] = React.useState('');
    const [negocioId, setNegocioId] = React.useState(null);
    const [minCancelacionHoras, setMinCancelacionHoras] = React.useState(1);
    const [configGlobal, setConfigGlobal] = React.useState({});
    const [reprogramando, setReprogramando] = React.useState(false);
    const [reservaReprogramando, setReservaReprogramando] = React.useState(null);
    const [reprogramacionFecha, setReprogramacionFecha] = React.useState('');
    const [reprogramacionHora, setReprogramacionHora] = React.useState('');
    const [horariosReprogramacion, setHorariosReprogramacion] = React.useState([]);
    const [cargandoHorariosReprogramacion, setCargandoHorariosReprogramacion] = React.useState(false);
    const [mensajeReprogramacion, setMensajeReprogramacion] = React.useState('');

    // Obtener negocioId
    React.useEffect(() => {
        const id = localStorage.getItem('negocioId') || window.NEGOCIO_ID_POR_DEFECTO;
        setNegocioId(id);
        console.log('🏢 MyBookings - Negocio ID:', id);
    }, []);

    React.useEffect(() => {
        if (!window.salonConfig) return;

        window.salonConfig.get().then(config => {
            setConfigGlobal(config || {});
            if (config && config.min_cancelacion_horas !== undefined) {
                setMinCancelacionHoras(config.min_cancelacion_horas);
            }
        }).catch(error => {
            console.error('Error cargando configuraciÃ³n de cancelaciÃ³n:', error);
        });
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
            
            return diffMinutos > (minCancelacionHoras * 60);
            
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
            } else if (diffMinutos <= (minCancelacionHoras * 60)) {
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

    const formatDateInput = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getTodayLocalString = () => formatDateInput(new Date());

    const timeToMinutes = (timeStr) => {
        const [hours, minutes] = String(timeStr || '00:00').split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    };

    const minutesToTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    const indiceToHoraLegible = (indice) => {
        const horas = Math.floor(indice / 2);
        const minutos = indice % 2 === 0 ? '00' : '30';
        return `${String(horas).padStart(2, '0')}:${minutos}`;
    };

    const variantesHorarioPermitido = (timeStr) => {
        const partes = String(timeStr || '').trim().split(':');
        if (partes.length < 2) return [];
        const hours = parseInt(partes[0], 10);
        const minutes = parseInt(partes[1], 10);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return [];

        const normal = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        const variantes = [normal];
        if (hours >= 1 && hours <= 7) {
            variantes.push(`${String(hours + 12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        }
        return variantes;
    };

    const servicioPermiteHorario = (servicio, slot) => {
        const permitidos = servicio?.horarios_permitidos || [];
        if (!permitidos.length) return true;
        const normalizados = new Set(permitidos.flatMap(variantesHorarioPermitido));
        return normalizados.has(slot);
    };

    const slotTieneDescanso = (slotStart, slotEnd, descansosDelDia = []) => {
        return descansosDelDia.some(descanso => {
            if (!descanso?.inicio || !descanso?.fin) return false;
            const descansoStart = timeToMinutes(descanso.inicio);
            const descansoEnd = timeToMinutes(descanso.fin);
            return (slotStart < descansoEnd) && (slotEnd > descansoStart);
        });
    };

    const calcularHoraFin = (horaInicio, duracion) => {
        return minutesToTime(timeToMinutes(horaInicio) + (parseInt(duracion, 10) || 60));
    };

    const obtenerServicioReserva = async (booking) => {
        try {
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&select=*`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            const servicios = response.ok ? await response.json() : [];
            const nombres = String(booking.servicio || '').split(' + ').map(nombre => nombre.trim()).filter(Boolean);
            return servicios.find(servicio => servicio.nombre === booking.servicio)
                || servicios.find(servicio => servicio.nombre === nombres[0])
                || { nombre: booking.servicio, duracion: booking.duracion || 60 };
        } catch (error) {
            console.error('Error cargando servicio para reprogramar:', error);
            return { nombre: booking.servicio, duracion: booking.duracion || 60 };
        }
    };

    const calcularHorariosReprogramacion = async (booking, fecha) => {
        if (!booking || !fecha || !negocioId) return [];

        const [year, month, day] = fecha.split('-').map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        if (fechaLocal < hoy) return [];

        const maxDias = configGlobal?.max_antelacion_dias ?? 30;
        const minHoras = configGlobal?.min_antelacion_horas ?? 2;
        const diffDias = Math.ceil((fechaLocal - hoy) / (1000 * 60 * 60 * 24));
        if (Number(maxDias) > 0 && diffDias > Number(maxDias)) {
            setMensajeReprogramacion(`Solo se puede reservar con hasta ${maxDias} dias de antelacion.`);
            return [];
        }

        const diasCerrados = typeof window.getDiasCerrados === 'function' ? await window.getDiasCerrados() : [];
        if ((diasCerrados || []).some(diaCerrado => diaCerrado.fecha === fecha)) {
            setMensajeReprogramacion('Ese dia esta cerrado para reservas.');
            return [];
        }

        const horarios = await window.salonConfig.getHorariosProfesional(booking.profesional_id);
        const descansosPorDia = window.salonConfig.getDescansosPorDia
            ? await window.salonConfig.getDescansosPorDia(booking.profesional_id)
            : {};
        const profesionalResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&id=eq.${booking.profesional_id}&select=id,nombre,fechas_libres`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        const profesionales = profesionalResponse.ok ? await profesionalResponse.json() : [];
        const profesional = profesionales[0] || {};
        if (profesional?.fechas_libres?.includes(fecha)) {
            setMensajeReprogramacion('La profesional tiene ese dia marcado como libre.');
            return [];
        }

        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = diasSemana[fechaLocal.getDay()];
        const indicesDelDia = horarios?.horariosPorDia?.[diaSemana] || [];
        if (indicesDelDia.length === 0) {
            setMensajeReprogramacion('No hay horarios configurados para ese dia.');
            return [];
        }

        const servicio = await obtenerServicioReserva(booking);
        const duracion = parseInt(booking.duracion || servicio?.duracion || 60, 10);
        const descansosDelDia = descansosPorDia?.[diaSemana] || [];
        const reservasResponse = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=eq.${fecha}&profesional_id=eq.${booking.profesional_id}&estado=neq.Cancelado&select=id,hora_inicio,hora_fin`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        const reservas = reservasResponse.ok ? await reservasResponse.json() : [];
        const minFechaPermitida = new Date(Date.now() + (minHoras * 60 * 60 * 1000));

        let baseSlots = indicesDelDia.map(indice => indiceToHoraLegible(indice));
        if (servicio?.horarios_permitidos?.length) {
            baseSlots = baseSlots.filter(slot => servicioPermiteHorario(servicio, slot));
        }

        const disponibles = baseSlots.filter(slot => {
            const slotStart = timeToMinutes(slot);
            const slotEnd = slotStart + duracion;
            const [hours, minutes] = slot.split(':').map(Number);
            const fechaHoraSlot = new Date(year, month - 1, day, hours, minutes, 0);

            if (fechaHoraSlot < minFechaPermitida) return false;
            if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) return false;

            return !(reservas || []).some(reserva => {
                if (String(reserva.id) === String(booking.id)) return false;
                const reservaStart = timeToMinutes(reserva.hora_inicio);
                const reservaEnd = timeToMinutes(reserva.hora_fin);
                return (slotStart < reservaEnd) && (slotEnd > reservaStart);
            });
        });

        setMensajeReprogramacion(disponibles.length ? '' : 'No hay horarios disponibles para esa fecha.');
        return Array.from(new Set(disponibles)).sort();
    };

    // FUNCIÓN CORREGIDA - USA notificarCancelacion + teléfono dinámico
const handleCancelarReserva = async (id, bookingData) => {
    if (!puedeCancelar(bookingData.fecha, bookingData.hora_inicio)) {
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(bookingData.fecha) : 
            bookingData.fecha;
        
        // 🔥 OBTENER TELÉFONO DE LA BD
        const telefonoDuenno = await window.getTelefonoDuenno();
        const telefonoContacto = window.formatearTelefono ? window.formatearTelefono(telefonoDuenno) : `+${telefonoDuenno}`;
        
        const mensaje = `❌ No puedes cancelar este turno porque faltan menos de ${minCancelacionHoras} hora(s).
            
📅 Tu turno es el ${fechaConDia} a las ${window.formatTo12Hour ? window.formatTo12Hour(bookingData.hora_inicio) : bookingData.hora_inicio}

⏰ Solo se permiten cancelaciones con al menos ${minCancelacionHoras} hora(s) de anticipación.

Si no puedes asistir, contactanos por WhatsApp al ${telefonoContacto}`;
        
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
        
        await window.notificarListaEsperaTurnoLiberado?.(bookingData);
        alert('✅ Turno cancelado correctamente');
        await cargarReservas();
        
    } catch (error) {
        console.error('Error cancelando reserva:', error);
        alert('Error al cancelar el turno');
    } finally {
        setCancelando(false);
    }
};

    React.useEffect(() => {
        const cargarHorarios = async () => {
            if (!reservaReprogramando || !reprogramacionFecha) {
                setHorariosReprogramacion([]);
                return;
            }

            setCargandoHorariosReprogramacion(true);
            setMensajeReprogramacion('');
            setReprogramacionHora('');
            try {
                const horarios = await calcularHorariosReprogramacion(reservaReprogramando, reprogramacionFecha);
                setHorariosReprogramacion(horarios);
            } catch (error) {
                console.error('Error calculando horarios para reprogramar:', error);
                setMensajeReprogramacion('Error cargando horarios disponibles.');
                setHorariosReprogramacion([]);
            } finally {
                setCargandoHorariosReprogramacion(false);
            }
        };

        cargarHorarios();
    }, [reservaReprogramando, reprogramacionFecha, negocioId, configGlobal]);

    const puedeReprogramar = (booking) => {
        if (!booking) return false;
        if (booking.estado === 'Completado' || booking.estado === 'Ausente') return false;
        if (booking.estado === 'Cancelado') return true;

        try {
            const [year, month, day] = booking.fecha.split('-').map(Number);
            const [hours, minutes] = booking.hora_inicio.split(':').map(Number);
            return new Date(year, month - 1, day, hours, minutes, 0) > new Date();
        } catch (error) {
            return false;
        }
    };

    const abrirReprogramacion = (booking) => {
        if (!puedeReprogramar(booking)) {
            alert('Esta cita ya no se puede reprogramar desde la app.');
            return;
        }
        setReservaReprogramando(booking);
        setReprogramacionFecha('');
        setReprogramacionHora('');
        setHorariosReprogramacion([]);
        setMensajeReprogramacion('');
    };

    const cerrarReprogramacion = () => {
        setReservaReprogramando(null);
        setReprogramacionFecha('');
        setReprogramacionHora('');
        setHorariosReprogramacion([]);
        setMensajeReprogramacion('');
    };

    const notificarReprogramacion = async (bookingActualizado, bookingAnterior) => {
        try {
            const config = window.cargarConfiguracionNegocio ? await window.cargarConfiguracionNegocio(true) : {};
            const fechaAntes = window.formatFechaCompleta ? window.formatFechaCompleta(bookingAnterior.fecha) : bookingAnterior.fecha;
            const fechaNueva = window.formatFechaCompleta ? window.formatFechaCompleta(bookingActualizado.fecha) : bookingActualizado.fecha;
            const horaAntes = window.formatTo12Hour ? window.formatTo12Hour(bookingAnterior.hora_inicio) : bookingAnterior.hora_inicio;
            const horaNueva = window.formatTo12Hour ? window.formatTo12Hour(bookingActualizado.hora_inicio) : bookingActualizado.hora_inicio;
            const mensaje =
`CITA REPROGRAMADA - ${config?.nombre || 'Salon'}

Cliente: ${bookingActualizado.cliente_nombre}
WhatsApp: ${bookingActualizado.cliente_whatsapp}
Servicio: ${bookingActualizado.servicio}
Profesional: ${bookingActualizado.profesional_nombre || 'No asignada'}

Antes: ${fechaAntes} a las ${horaAntes}
Ahora: ${fechaNueva} a las ${horaNueva}`;

            if (window.enviarNotificacionPush) {
                await window.enviarNotificacionPush(`${config?.nombre || 'Salon'} - Cita reprogramada`, mensaje, 'calendar', 'default');
            }
            if (window.enviarWhatsApp && config?.telefono) {
                window.enviarWhatsApp(config.telefono, mensaje);
            }
        } catch (error) {
            console.error('Error notificando reprogramacion:', error);
        }
    };

    const handleGuardarReprogramacion = async () => {
        if (!reservaReprogramando || !reprogramacionFecha || !reprogramacionHora) {
            alert('Selecciona fecha y hora para reprogramar.');
            return;
        }

        setReprogramando(true);
        try {
            const horariosVigentes = await calcularHorariosReprogramacion(reservaReprogramando, reprogramacionFecha);
            if (!horariosVigentes.includes(reprogramacionHora)) {
                setHorariosReprogramacion(horariosVigentes);
                alert('Ese horario ya no esta disponible. Elige otro horario.');
                return;
            }

            const duracion = parseInt(reservaReprogramando.duracion || 60, 10);
            const horaFin = calcularHoraFin(reprogramacionHora, duracion);
            const nuevoEstado = reservaReprogramando.estado === 'Cancelado' ? 'Reservado' : reservaReprogramando.estado;
            const payload = {
                fecha: reprogramacionFecha,
                hora_inicio: reprogramacionHora,
                hora_fin: horaFin,
                estado: nuevoEstado
            };

            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${reservaReprogramando.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const actualizadas = await response.json();
            const bookingActualizado = actualizadas?.[0] || { ...reservaReprogramando, ...payload };
            await notificarReprogramacion(bookingActualizado, reservaReprogramando);
            await window.notificarListaEsperaTurnoLiberado?.(reservaReprogramando);
            alert('Turno reprogramado correctamente');
            cerrarReprogramacion();
            await cargarReservas();
        } catch (error) {
            console.error('Error reprogramando reserva:', error);
            alert('Error al reprogramar el turno');
        } finally {
            setReprogramando(false);
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
                            const puedeReprogramarBooking = puedeReprogramar(booking);
                            const tiempoRestante = getMensajeTiempoRestante(booking.fecha, booking.hora_inicio);
                            
                            const fechaConDia = window.formatFechaCompleta ? 
                                window.formatFechaCompleta(booking.fecha) : 
                                booking.fecha;
                            
                            const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
                            const calendarLink = window.generarLinkCalendarioCliente ? 
                                window.generarLinkCalendarioCliente(booking) : 
                                '';
                            
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

                                        {booking.estado !== 'Cancelado' && calendarLink && (
                                            <a
                                                href={calendarLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 mb-2"
                                            >
                                                <i className="icon-calendar text-base"></i>
                                                Agregar al calendario
                                            </a>
                                        )}

                                        {puedeReprogramarBooking && (
                                            <button
                                                onClick={() => abrirReprogramacion(booking)}
                                                className="w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 mb-2"
                                            >
                                                <i className="icon-calendar text-base"></i>
                                                Reprogramar turno
                                            </button>
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
                                                title={!puedeCancelarBooking ? "Solo se puede cancelar con la antelación configurada" : ""}
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
                                                            : 'No se puede cancelar aún'}
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

            {reservaReprogramando && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-pink-100 p-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-pink-800">Reprogramar turno</h2>
                                <p className="text-sm text-pink-500">{reservaReprogramando.servicio}</p>
                            </div>
                            <button
                                onClick={cerrarReprogramacion}
                                disabled={reprogramando}
                                className="w-9 h-9 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 disabled:opacity-50"
                            >
                                x
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="rounded-lg bg-pink-50 border border-pink-100 p-3 text-sm text-pink-700">
                                <p className="font-medium">Se mantiene la misma cita.</p>
                                <p>Solo vas a cambiar fecha y hora. La app respetara horarios, descansos, dias cerrados, antelacion y citas ocupadas.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-gray-500">Profesional</p>
                                    <p className="font-semibold text-gray-800">{reservaReprogramando.profesional_nombre || 'No asignada'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-gray-500">Duracion</p>
                                    <p className="font-semibold text-gray-800">{reservaReprogramando.duracion || 60} min</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva fecha</label>
                                <input
                                    type="date"
                                    min={getTodayLocalString()}
                                    value={reprogramacionFecha}
                                    onChange={(e) => setReprogramacionFecha(e.target.value)}
                                    className="w-full border border-pink-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
                                />
                            </div>

                            {reprogramacionFecha && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nueva hora</label>
                                    {cargandoHorariosReprogramacion ? (
                                        <div className="flex justify-center py-6">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                                        </div>
                                    ) : horariosReprogramacion.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {horariosReprogramacion.map(hora => (
                                                <button
                                                    key={hora}
                                                    type="button"
                                                    onClick={() => setReprogramacionHora(hora)}
                                                    className={`py-2 px-3 rounded-lg text-sm font-medium ${reprogramacionHora === hora ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}`}
                                                >
                                                    {window.formatTo12Hour ? window.formatTo12Hour(hora) : hora}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-lg bg-pink-50 text-pink-700 border border-pink-100 text-sm">
                                            {mensajeReprogramacion || 'No hay horarios disponibles para esa fecha.'}
                                        </div>
                                    )}
                                </div>
                            )}

                            {mensajeReprogramacion && horariosReprogramacion.length > 0 && (
                                <p className="text-sm text-pink-600">{mensajeReprogramacion}</p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={cerrarReprogramacion}
                                    disabled={reprogramando}
                                    className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGuardarReprogramacion}
                                    disabled={reprogramando || !reprogramacionFecha || !reprogramacionHora}
                                    className="flex-1 py-2 rounded-lg bg-pink-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {reprogramando ? 'Guardando...' : 'Guardar cambio'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
