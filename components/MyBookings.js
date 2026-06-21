// components/MyBookings.js

function MyBookings({ cliente, onVolver }) {
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [cancelando, setCancelando] = React.useState(false);
    const [filtro, setFiltro] = React.useState('proximas');
    const [mensajeError, setMensajeError] = React.useState('');
    const [negocioId, setNegocioId] = React.useState(null);
    const [minCancelacionHoras, setMinCancelacionHoras] = React.useState(1);
    const [configGlobal, setConfigGlobal] = React.useState({});

    // Reprogramación
    const [reprogramando, setReprogramando] = React.useState(false);
    const [reservaReprogramando, setReservaReprogramando] = React.useState(null);
    const [reprogramacionFecha, setReprogramacionFecha] = React.useState('');
    const [reprogramacionHora, setReprogramacionHora] = React.useState('');
    const [horariosReprogramacion, setHorariosReprogramacion] = React.useState([]);
    const [cargandoHorariosReprogramacion, setCargandoHorariosReprogramacion] = React.useState(false);
    const [mensajeReprogramacion, setMensajeReprogramacion] = React.useState('');

    // Confirmación de cancelación (reemplaza confirm() nativo)
    const [confirmandoCancelacion, setConfirmandoCancelacion] = React.useState(null);

    // Toast de éxito/error inline
    const [toast, setToast] = React.useState(null);

    const mostrarToast = (tipo, texto) => {
        setToast({ tipo, texto });
        setTimeout(() => setToast(null), 3500);
    };

    React.useEffect(() => {
        const id = localStorage.getItem('negocioId') || window.NEGOCIO_ID_POR_DEFECTO;
        setNegocioId(id);
    }, []);

    React.useEffect(() => {
        if (!window.salonConfig) return;
        window.salonConfig.get().then(config => {
            setConfigGlobal(config || {});
            if (config && config.min_cancelacion_horas !== undefined) {
                setMinCancelacionHoras(config.min_cancelacion_horas);
            }
        }).catch(() => {});
    }, []);

    React.useEffect(() => {
        if (cliente?.whatsapp && negocioId) cargarReservas();
    }, [cliente, negocioId]);

    const cargarReservas = async () => {
        setLoading(true);
        setMensajeError('');
        try {
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&cliente_whatsapp=eq.${cliente.whatsapp}&order=fecha.desc,hora_inicio.desc`,
                { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` } }
            );
            if (!response.ok) throw new Error();
            const data = await response.json();
            setBookings(Array.isArray(data) ? data : []);
        } catch {
            setMensajeError('Error al cargar tus reservas. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const puedeCancelar = (fecha, horaInicio) => {
        try {
            const [year, month, day] = fecha.split('-').map(Number);
            const [hours, minutes] = horaInicio.split(':').map(Number);
            const diffMs = new Date(year, month - 1, day, hours, minutes, 0) - new Date();
            return Math.floor(diffMs / 60000) > (minCancelacionHoras * 60);
        } catch { return false; }
    };

    const getMensajeTiempoRestante = (fecha, horaInicio) => {
        try {
            const [year, month, day] = fecha.split('-').map(Number);
            const [hours, minutes] = horaInicio.split(':').map(Number);
            const diffMs = new Date(year, month - 1, day, hours, minutes, 0) - new Date();
            const diffMinutos = Math.floor(diffMs / 60000);
            const diffHoras = Math.floor(diffMinutos / 60);
            const mins = diffMinutos % 60;
            if (diffMinutos <= 0) return '⏰ El turno ya pasó';
            if (diffMinutos <= minCancelacionHoras * 60) return `⚠️ Faltan menos de ${diffMinutos} min — no puedes cancelar`;
            return diffHoras > 0 ? `🕐 Faltan ${diffHoras}h ${mins}m — puedes cancelar` : `🕐 Faltan ${diffMinutos} min — puedes cancelar`;
        } catch { return ''; }
    };

    const formatDateInput = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getTodayLocalString = () => formatDateInput(new Date());
    const timeToMinutes = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
    const minutesToTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const indiceToHoraLegible = (i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`;
    const calcularHoraFin = (inicio, dur) => minutesToTime(timeToMinutes(inicio) + (parseInt(dur, 10) || 60));

    const variantesHorarioPermitido = (timeStr) => {
        const [h, m] = String(timeStr || '').trim().split(':').map(s => parseInt(s, 10));
        if (isNaN(h) || isNaN(m)) return [];
        const normal = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        return h >= 1 && h <= 7 ? [normal, `${String(h + 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`] : [normal];
    };

    const servicioPermiteHorario = (servicio, slot) => {
        const permitidos = servicio?.horarios_permitidos || [];
        if (!permitidos.length) return true;
        return new Set(permitidos.flatMap(variantesHorarioPermitido)).has(slot);
    };

    const slotTieneDescanso = (slotStart, slotEnd, descansos = []) =>
        descansos.some(d => d?.inicio && d?.fin && slotStart < timeToMinutes(d.fin) && slotEnd > timeToMinutes(d.inicio));

    const obtenerServicioReserva = async (booking) => {
        try {
            const res = await fetch(`${window.SUPABASE_URL}/rest/v1/servicios?negocio_id=eq.${negocioId}&select=*`,
                { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` } });
            const servicios = res.ok ? await res.json() : [];
            const nombres = String(booking.servicio || '').split(' + ').map(s => s.trim());
            return servicios.find(s => s.nombre === booking.servicio)
                || servicios.find(s => s.nombre === nombres[0])
                || { nombre: booking.servicio, duracion: booking.duracion || 60 };
        } catch { return { nombre: booking.servicio, duracion: booking.duracion || 60 }; }
    };

    const calcularHorariosReprogramacion = async (booking, fecha) => {
        if (!booking || !fecha || !negocioId) return [];
        const [year, month, day] = fecha.split('-').map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        if (fechaLocal < hoy) return [];

        const maxDias = configGlobal?.max_antelacion_dias ?? 30;
        const minHoras = configGlobal?.min_antelacion_horas ?? 2;
        const diffDias = Math.ceil((fechaLocal - hoy) / 86400000);
        if (Number(maxDias) > 0 && diffDias > Number(maxDias)) {
            setMensajeReprogramacion(`Solo puedes reservar con hasta ${maxDias} días de anticipación.`);
            return [];
        }

        const diasCerrados = typeof window.getDiasCerrados === 'function' ? await window.getDiasCerrados() : [];
        if ((diasCerrados || []).some(d => d.fecha === fecha)) {
            setMensajeReprogramacion('Ese día está cerrado para reservas.');
            return [];
        }

        const horarios = await window.salonConfig.getHorariosProfesional(booking.profesional_id);
        const descansosPorDia = window.salonConfig.getDescansosPorDia
            ? await window.salonConfig.getDescansosPorDia(booking.profesional_id) : {};

        const profRes = await fetch(
            `${window.SUPABASE_URL}/rest/v1/profesionales?negocio_id=eq.${negocioId}&id=eq.${booking.profesional_id}&select=id,nombre,fechas_libres`,
            { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` } });
        const profesional = profRes.ok ? (await profRes.json())[0] : {};
        if (profesional?.fechas_libres?.includes(fecha)) {
            setMensajeReprogramacion('La profesional tiene ese día marcado como libre.');
            return [];
        }

        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = diasSemana[fechaLocal.getDay()];
        const indicesDelDia = horarios?.horariosPorDia?.[diaSemana] || [];
        if (!indicesDelDia.length) { setMensajeReprogramacion('No hay horarios para ese día.'); return []; }

        const servicio = await obtenerServicioReserva(booking);
        const duracion = parseInt(booking.duracion || servicio?.duracion || 60, 10);
        const descansosDelDia = descansosPorDia?.[diaSemana] || [];

        const resRes = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=eq.${fecha}&profesional_id=eq.${booking.profesional_id}&estado=neq.Cancelado&select=id,hora_inicio,hora_fin`,
            { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}` } });
        const reservas = resRes.ok ? await resRes.json() : [];
        const minFechaPermitida = new Date(Date.now() + minHoras * 3600000);

        let baseSlots = indicesDelDia.map(indiceToHoraLegible);
        if (servicio?.horarios_permitidos?.length) baseSlots = baseSlots.filter(s => servicioPermiteHorario(servicio, s));

        const disponibles = baseSlots.filter(slot => {
            const slotStart = timeToMinutes(slot);
            const slotEnd = slotStart + duracion;
            const [h, m] = slot.split(':').map(Number);
            if (new Date(year, month - 1, day, h, m) < minFechaPermitida) return false;
            if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) return false;
            return !(reservas || []).some(r => String(r.id) !== String(booking.id) && slotStart < timeToMinutes(r.hora_fin) && slotEnd > timeToMinutes(r.hora_inicio));
        });

        setMensajeReprogramacion(disponibles.length ? '' : 'No hay horarios disponibles para esa fecha.');
        return [...new Set(disponibles)].sort();
    };

    const handleCancelarReserva = async (booking) => {
        if (!puedeCancelar(booking.fecha, booking.hora_inicio)) {
            const telefonoDuenno = await window.getTelefonoDuenno();
            const tel = window.formatearTelefono ? window.formatearTelefono(telefonoDuenno) : `+${telefonoDuenno}`;
            mostrarToast('error', `No puedes cancelar con menos de ${minCancelacionHoras}h de anticipación. Escribe al ${tel}`);
            return;
        }
        setConfirmandoCancelacion(booking);
    };

    const confirmarCancelacion = async () => {
        const booking = confirmandoCancelacion;
        setConfirmandoCancelacion(null);
        setCancelando(true);
        try {
            const res = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${booking.id}`,
                { method: 'PATCH', headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: 'Cancelado' }) }
            );
            if (!res.ok) throw new Error();
            booking.cancelado_por = 'cliente';
            if (window.notificarCancelacion) await window.notificarCancelacion(booking);
            await window.notificarListaEsperaTurnoLiberado?.(booking);
            mostrarToast('ok', 'Turno cancelado correctamente.');
            await cargarReservas();
        } catch {
            mostrarToast('error', 'Error al cancelar el turno. Intenta de nuevo.');
        } finally {
            setCancelando(false);
        }
    };

    React.useEffect(() => {
        if (!reservaReprogramando || !reprogramacionFecha) { setHorariosReprogramacion([]); return; }
        setCargandoHorariosReprogramacion(true);
        setMensajeReprogramacion('');
        setReprogramacionHora('');
        calcularHorariosReprogramacion(reservaReprogramando, reprogramacionFecha)
            .then(setHorariosReprogramacion)
            .catch(() => { setMensajeReprogramacion('Error cargando horarios.'); setHorariosReprogramacion([]); })
            .finally(() => setCargandoHorariosReprogramacion(false));
    }, [reservaReprogramando, reprogramacionFecha, negocioId, configGlobal]);

    const puedeReprogramar = (booking) => {
        if (!booking || booking.estado === 'Completado' || booking.estado === 'Ausente') return false;
        if (booking.estado === 'Cancelado') return true;
        try {
            const [y, mo, d] = booking.fecha.split('-').map(Number);
            const [h, m] = booking.hora_inicio.split(':').map(Number);
            return new Date(y, mo - 1, d, h, m) > new Date();
        } catch { return false; }
    };

    const abrirReprogramacion = (booking) => {
        if (!puedeReprogramar(booking)) { mostrarToast('error', 'Esta cita ya no se puede reprogramar.'); return; }
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

    const notificarReprogramacion = async (nuevo, anterior) => {
        try {
            const config = window.cargarConfiguracionNegocio ? await window.cargarConfiguracionNegocio(true) : {};
            const fA = window.formatFechaCompleta ? window.formatFechaCompleta(anterior.fecha) : anterior.fecha;
            const fN = window.formatFechaCompleta ? window.formatFechaCompleta(nuevo.fecha) : nuevo.fecha;
            const hA = window.formatTo12Hour ? window.formatTo12Hour(anterior.hora_inicio) : anterior.hora_inicio;
            const hN = window.formatTo12Hour ? window.formatTo12Hour(nuevo.hora_inicio) : nuevo.hora_inicio;
            const msg = `CITA REPROGRAMADA - ${config?.nombre || 'Salón'}\n\nCliente: ${nuevo.cliente_nombre}\nWhatsApp: ${nuevo.cliente_whatsapp}\nServicio: ${nuevo.servicio}\nProfesional: ${nuevo.profesional_nombre || 'No asignada'}\n\nAntes: ${fA} a las ${hA}\nAhora: ${fN} a las ${hN}`;
            if (window.enviarNotificacionPush) await window.enviarNotificacionPush(`${config?.nombre || 'Salón'} - Cita reprogramada`, msg, 'calendar', 'default');
            if (window.enviarWhatsApp && config?.telefono) window.enviarWhatsApp(config.telefono, msg);
        } catch {}
    };

    const handleGuardarReprogramacion = async () => {
        if (!reservaReprogramando || !reprogramacionFecha || !reprogramacionHora) {
            mostrarToast('error', 'Selecciona fecha y hora para reprogramar.');
            return;
        }
        setReprogramando(true);
        try {
            const horariosVigentes = await calcularHorariosReprogramacion(reservaReprogramando, reprogramacionFecha);
            if (!horariosVigentes.includes(reprogramacionHora)) {
                setHorariosReprogramacion(horariosVigentes);
                mostrarToast('error', 'Ese horario ya no está disponible. Elige otro.');
                return;
            }
            const horaFin = calcularHoraFin(reprogramacionHora, reservaReprogramando.duracion || 60);
            const payload = { fecha: reprogramacionFecha, hora_inicio: reprogramacionHora, hora_fin: horaFin, estado: reservaReprogramando.estado === 'Cancelado' ? 'Reservado' : reservaReprogramando.estado };
            const res = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${reservaReprogramando.id}`,
                { method: 'PATCH', headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(payload) }
            );
            if (!res.ok) throw new Error();
            const actualizadas = await res.json();
            await notificarReprogramacion(actualizadas?.[0] || { ...reservaReprogramando, ...payload }, reservaReprogramando);
            await window.notificarListaEsperaTurnoLiberado?.(reservaReprogramando);
            mostrarToast('ok', 'Turno reprogramado correctamente.');
            cerrarReprogramacion();
            await cargarReservas();
        } catch {
            mostrarToast('error', 'Error al reprogramar el turno. Intenta de nuevo.');
        } finally {
            setReprogramando(false);
        }
    };

    const hoy = new Date().toISOString().slice(0, 10);
    const esPasado = (b) => b.fecha < hoy || b.estado === 'Completado' || b.estado === 'Ausente';
    const esProximo = (b) => !esPasado(b) && b.estado !== 'Cancelado';

    const reservasFiltradas = bookings.filter(b =>
        filtro === 'proximas'   ? esProximo(b) :
        filtro === 'historial'  ? esPasado(b) :
        filtro === 'canceladas' ? b.estado === 'Cancelado' : true
    );
    const proximasCount   = bookings.filter(esProximo).length;
    const historialCount  = bookings.filter(esPasado).length;
    const canceladasCount = bookings.filter(b => b.estado === 'Cancelado').length;
    const activasCount    = proximasCount;

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 pb-20">

            {/* Toast inline */}
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all
                    ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                    style={{ maxWidth: '90vw' }}>
                    <span>{toast.tipo === 'ok' ? '✅' : '❌'}</span>
                    <span>{toast.texto}</span>
                </div>
            )}

            {/* Modal confirmación cancelación */}
            {confirmandoCancelacion && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold text-pink-800 mb-2">¿Cancelar turno?</h3>
                        <p className="text-sm text-pink-600 mb-1">
                            {window.formatFechaCompleta ? window.formatFechaCompleta(confirmandoCancelacion.fecha) : confirmandoCancelacion.fecha}
                        </p>
                        <p className="text-sm text-pink-600 mb-4">
                            {window.formatTo12Hour ? window.formatTo12Hour(confirmandoCancelacion.hora_inicio) : confirmandoCancelacion.hora_inicio} — {confirmandoCancelacion.servicio}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmandoCancelacion(null)}
                                className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 font-medium">
                                No, volver
                            </button>
                            <button onClick={confirmarCancelacion}
                                className="flex-1 py-2 rounded-lg bg-red-500 text-white font-medium">
                                Sí, cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-10 border-b border-pink-200">
                <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
                    <button onClick={onVolver} className="flex items-center gap-2 text-pink-600 hover:text-pink-800 transition">
                        <i className="icon-arrow-left text-xl"></i>
                        <span className="font-medium">Volver</span>
                    </button>
                    <h1 className="text-xl font-bold text-pink-800">✨ Mis Reservas</h1>
                    <div className="w-20"></div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6">

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

                {mensajeError && (
                    <div className="bg-pink-100 border border-pink-300 text-pink-700 p-3 rounded-lg mb-4 text-sm">{mensajeError}</div>
                )}

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {[
                        ['proximas',   `Próximas (${proximasCount})`],
                        ['historial',  `Historial (${historialCount})`],
                        ['canceladas', `Canceladas (${canceladasCount})`],
                    ].map(([key, label]) => (
                        <button key={key} onClick={() => setFiltro(key)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap
                                ${filtro === key ? 'bg-pink-500 text-white shadow-md' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {filtro === 'historial' && historialCount > 0 && (
                    <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-4 flex items-center gap-3">
                        <span className="text-3xl">💅</span>
                        <div>
                            <p className="font-semibold text-pink-800">{historialCount} visita{historialCount !== 1 ? 's' : ''} en total</p>
                            <p className="text-xs text-pink-500">Gracias por elegirnos siempre</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                        <p className="text-pink-500 mt-4">Cargando tus reservas...</p>
                    </div>
                ) : reservasFiltradas.length === 0 ? (
                    <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-pink-200">
                        <div className="text-6xl mb-4">{filtro === 'historial' ? '📖' : '📅'}</div>
                        <p className="text-pink-600 mb-2">
                            {filtro === 'proximas' ? 'No tienes turnos próximos' :
                             filtro === 'historial' ? 'Aún no tienes visitas pasadas' :
                             'No tienes turnos cancelados'}
                        </p>
                        {filtro === 'proximas' && (
                            <button onClick={onVolver} className="text-pink-500 font-medium hover:underline">Reservar un turno</button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reservasFiltradas.map(booking => {
                            const puedeCancelarBooking = booking.estado !== 'Cancelado' && puedeCancelar(booking.fecha, booking.hora_inicio);
                            const puedeReprogramarBooking = puedeReprogramar(booking);
                            const tiempoRestante = getMensajeTiempoRestante(booking.fecha, booking.hora_inicio);
                            const fechaConDia = window.formatFechaCompleta ? window.formatFechaCompleta(booking.fecha) : booking.fecha;
                            const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
                            const calendarLink = window.generarLinkCalendarioCliente ? window.generarLinkCalendarioCliente(booking) : '';

                            return (
                                <div key={booking.id} className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border-l-4 overflow-hidden border border-pink-200
                                    ${booking.estado === 'Cancelado' ? 'border-l-pink-400 opacity-70' : 'border-l-pink-500'}`}>
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-sm text-pink-600 font-medium block mb-1">{fechaConDia}</span>
                                                <h3 className="font-bold text-pink-800 text-lg">{booking.servicio}</h3>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold
                                                ${booking.estado === 'Reservado' ? 'bg-pink-100 text-pink-700' :
                                                  booking.estado === 'Confirmado' ? 'bg-pink-200 text-pink-800' : 'bg-pink-100 text-pink-500'}`}>
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
                                            <div className={`text-xs p-2 rounded-lg mb-3 flex items-center gap-2
                                                ${puedeCancelarBooking ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-pink-100 text-pink-700 border border-pink-300'}`}>
                                                <span>{puedeCancelarBooking ? '💡' : '⚠️'}</span>
                                                <span>{tiempoRestante}</span>
                                            </div>
                                        )}

                                        {booking.estado !== 'Cancelado' && calendarLink && (
                                            <a href={calendarLink} target="_blank" rel="noopener noreferrer"
                                                className="w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 mb-2">
                                                <i className="icon-calendar text-base"></i>
                                                Agregar al calendario
                                            </a>
                                        )}

                                        {puedeReprogramarBooking && (
                                            <button onClick={() => abrirReprogramacion(booking)}
                                                className="w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 mb-2">
                                                <i className="icon-calendar text-base"></i>
                                                Cambiar fecha y hora
                                            </button>
                                        )}

                                        {booking.estado !== 'Cancelado' && (
                                            <button onClick={() => handleCancelarReserva(booking)}
                                                disabled={cancelando || !puedeCancelarBooking}
                                                className={`w-full py-2 rounded-lg font-medium transition flex items-center justify-center gap-2
                                                    ${puedeCancelarBooking ? 'bg-pink-100 hover:bg-pink-200 text-pink-700' : 'bg-pink-50 text-pink-400 cursor-not-allowed'}
                                                    disabled:opacity-50 disabled:cursor-not-allowed`}>
                                                {cancelando ? (
                                                    <><div className="animate-spin h-4 w-4 border-2 border-pink-600 border-t-transparent rounded-full"></div>Cancelando...</>
                                                ) : (
                                                    <><span>❌</span>{puedeCancelarBooking ? 'Cancelar turno' : 'No se puede cancelar aún'}</>
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

            {/* Modal reprogramación */}
            {reservaReprogramando && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-pink-100 p-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-pink-800">Cambiar fecha y hora</h2>
                                <p className="text-sm text-pink-500">{reservaReprogramando.servicio}</p>
                            </div>
                            <button onClick={cerrarReprogramacion} disabled={reprogramando}
                                className="w-9 h-9 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 disabled:opacity-50 text-lg">
                                ✕
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="rounded-lg bg-pink-50 border border-pink-100 p-3 text-sm text-pink-700">
                                Solo cambia la fecha y hora. El servicio, profesional y duración se mantienen igual.
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-gray-500">Profesional</p>
                                    <p className="font-semibold text-gray-800">{reservaReprogramando.profesional_nombre || 'No asignada'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <p className="text-gray-500">Duración</p>
                                    <p className="font-semibold text-gray-800">{reservaReprogramando.duracion || 60} min</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva fecha</label>
                                <input type="date" min={getTodayLocalString()} value={reprogramacionFecha}
                                    onChange={(e) => setReprogramacionFecha(e.target.value)}
                                    className="w-full border border-pink-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400" />
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
                                                <button key={hora} type="button" onClick={() => setReprogramacionHora(hora)}
                                                    className={`py-2 px-3 rounded-lg text-sm font-medium ${reprogramacionHora === hora ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}`}>
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
                                <button onClick={cerrarReprogramacion} disabled={reprogramando}
                                    className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 disabled:opacity-50">
                                    Cancelar
                                </button>
                                <button onClick={handleGuardarReprogramacion}
                                    disabled={reprogramando || !reprogramacionFecha || !reprogramacionHora}
                                    className="flex-1 py-2 rounded-lg bg-pink-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed">
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
