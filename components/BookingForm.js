// components/BookingForm.js - VERSIÓN GENÉRICA
// CON LÓGICA COMPLETA DE NOTIFICACIONES (PUSH SIEMPRE)
// CORREGIDO: Hora local para archivos ICS
// MODIFICADO: Solo notifica a la dueña, NO al cliente

function BookingForm({ service, profesional, date, time, onSubmit, onCancel, cliente }) {
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState(null);

    // ============================================
    // FUNCIÓN PARA PARTIR LÍNEAS LARGAS (RFC 5545)
    // ============================================
    function partirLinea(texto, limite = 70) {
        if (texto.length <= limite) return texto;
        
        let resultado = '';
        let posicion = 0;
        
        while (posicion < texto.length) {
            if (posicion === 0) {
                resultado += texto.substring(posicion, posicion + limite) + '\n';
                posicion += limite;
            } else {
                resultado += ' ' + texto.substring(posicion, posicion + limite - 1) + '\n';
                posicion += limite - 1;
            }
        }
        
        return resultado.trim();
    }

    // ============================================
    // GENERAR UUID
    // ============================================
    function generarUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ============================================
    // FORMATEAR FECHA LOCAL (NO UTC)
    // ============================================
    function formatearFechaLocal(fechaStr, horaStr) {
        const [year, month, day] = fechaStr.split('-');
        const [hour, minute] = horaStr.split(':');
        
        const fecha = new Date(year, month - 1, day, hour, minute, 0);
        
        const yearStr = fecha.getFullYear();
        const monthStr = String(fecha.getMonth() + 1).padStart(2, '0');
        const dayStr = String(fecha.getDate()).padStart(2, '0');
        const hourStr2 = String(fecha.getHours()).padStart(2, '0');
        const minuteStr = String(fecha.getMinutes()).padStart(2, '0');
        
        return `${yearStr}${monthStr}${dayStr}T${hourStr2}${minuteStr}00`;
    }

    // ============================================
    // GENERAR ARCHIVO .ICS (CORREGIDO - HORA LOCAL)
    // ============================================
    function generarArchivoCalendario(bookingData, nombreNegocio) {
        const uid = generarUUID();
        
        const dtstart = formatearFechaLocal(bookingData.fecha, bookingData.hora_inicio);
        const dtend = formatearFechaLocal(bookingData.fecha, bookingData.hora_fin);
        
        const ahora = new Date();
        const stampYear = ahora.getFullYear();
        const stampMonth = String(ahora.getMonth() + 1).padStart(2, '0');
        const stampDay = String(ahora.getDate()).padStart(2, '0');
        const stampHour = String(ahora.getHours()).padStart(2, '0');
        const stampMin = String(ahora.getMinutes()).padStart(2, '0');
        const dtstamp = `${stampYear}${stampMonth}${stampDay}T${stampHour}${stampMin}00`;
        
        const [year, month, day] = bookingData.fecha.split('-').map(Number);
        const [startHour, startMinute] = bookingData.hora_inicio.split(':').map(Number);
        const [endHour, endMinute] = bookingData.hora_fin.split(':').map(Number);
        
        const fechaInicio = new Date(year, month - 1, day, startHour, startMinute, 0);
        const fechaFin = new Date(year, month - 1, day, endHour, endMinute, 0);
        
        const meses = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const diaInicio = fechaInicio.getDate();
        const mesInicio = meses[fechaInicio.getMonth()];
        const añoInicio = fechaInicio.getFullYear();
        let horasInicio = fechaInicio.getHours();
        const minutosInicio = fechaInicio.getMinutes().toString().padStart(2, '0');
        const ampmInicio = horasInicio >= 12 ? 'PM' : 'AM';
        horasInicio = horasInicio % 12;
        horasInicio = horasInicio ? horasInicio : 12;
        const fechaInicioStr = `${diaInicio} ${mesInicio} ${añoInicio} ${horasInicio}:${minutosInicio} ${ampmInicio}`;
        
        const diaFin = fechaFin.getDate();
        const mesFin = meses[fechaFin.getMonth()];
        const añoFin = fechaFin.getFullYear();
        let horasFin = fechaFin.getHours();
        const minutosFin = fechaFin.getMinutes().toString().padStart(2, '0');
        const ampmFin = horasFin >= 12 ? 'PM' : 'AM';
        horasFin = horasFin % 12;
        horasFin = horasFin ? horasFin : 12;
        const fechaFinStr = `${diaFin} ${mesFin} ${añoFin} ${horasFin}:${minutosFin} ${ampmFin}`;
        
        const linea1 = `Appointment Details`;
        const linea2 = `When: ${fechaInicioStr} - ${fechaFinStr} (CST)`;
        const linea3 = `Servicio: ${bookingData.servicio}`;
        const linea4 = `Profesional: ${bookingData.profesional_nombre}`;
        const linea5 = `Cliente: ${bookingData.cliente_nombre}`;
        const linea6 = `WhatsApp: +53 ${bookingData.cliente_whatsapp}`;
        const linea7 = ``;
        const linea8 = nombreNegocio;
        
        const descripcion = `${partirLinea(linea1)}\n${partirLinea(linea2)}\n${partirLinea(linea3)}\n${partirLinea(linea4)}\n${partirLinea(linea5)}\n${partirLinea(linea6)}\n${linea7}\n${linea8}`;
        
        return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//${nombreNegocio}//Setmore//EN
METHOD:REQUEST
BEGIN:VTIMEZONE
TZID:America/Havana
TZURL:http://tzurl.org/zoneinfo-outlook/America/Havana
X-LIC-LOCATION:America/Havana
BEGIN:STANDARD
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
TZNAME:CST
DTSTART:19701101T010000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
END:STANDARD
BEGIN:DAYLIGHT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
TZNAME:CDT
DTSTART:19700308T000000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
END:DAYLIGHT
END:VTIMEZONE
X-WR-TIMEZONE:America/Havana
BEGIN:VEVENT
UID:${uid}
SEQUENCE:0
DTSTAMP:${dtstamp}
DTSTART;TZID=America/Havana:${dtstart}
DTEND;TZID=America/Havana:${dtend}
SUMMARY:${bookingData.servicio} with ${bookingData.profesional_nombre}
TRANSP:OPAQUE
LOCATION:${nombreNegocio}
DESCRIPTION:${descripcion}
ORGANIZER;CN="${nombreNegocio}":mailto:info@${nombreNegocio.replace(/\s+/g, '').toLowerCase()}.com
ATTENDEE;ROLE=CHAIR;CUTYPE=INDIVIDUAL;RSVP=FALSE;CN="${nombreNegocio}":MAILTO:info@${nombreNegocio.replace(/\s+/g, '').toLowerCase()}.com
ATTENDEE;ROLE=REQ-PARTICIPANT;CUTYPE=INDIVIDUAL;RSVP=FALSE;CN="${bookingData.cliente_nombre}":MAILTO:cliente@email.com
STATUS:CONFIRMED
CLASS:PUBLIC
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Reminder: Tomorrow
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Reminder: In 1 hour
END:VALARM
END:VEVENT
END:VCALENDAR`;
    }

    // ============================================
    // DESCARGAR ARCHIVO
    // ============================================
    function descargarArchivoICS(contenido, nombreArchivo) {
        try {
            const blob = new Blob([contenido], { type: 'text/calendar;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = nombreArchivo;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            console.log(' ✅ Archivo descargado');
            return true;
        } catch (error) {
            console.error('Error:', error);
            return false;
        }
    }

    // ============================================
    // HANDLE SUBMIT (CORREGIDO - SOLO NOTIFICAR A DUEÑA)
    // ============================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            if (service.esMultiple && profesional.esMultiple) {
                const configNegocio = await window.cargarConfiguracionNegocio();
                const configGlobal = window.salonConfig ? await window.salonConfig.get() : {};
                const minAntelacionHoras = configGlobal?.min_antelacion_horas ?? 2;
                const requiereAnticipo = configNegocio?.requiere_anticipo === true;

                const [year, month, day] = date.split('-').map(Number);
                const [hours, minutes] = time.split(':').map(Number);
                const fechaTurno = new Date(year, month - 1, day, hours, minutes, 0);
                const minFechaPermitida = new Date(Date.now() + (minAntelacionHoras * 60 * 60 * 1000));

                if (fechaTurno < minFechaPermitida) {
                    setError(`Solo se puede reservar con al menos ${minAntelacionHoras} hora(s) de anticipación.`);
                    setSubmitting(false);
                    return;
                }

                let cursor = time;
                const creadas = [];

                for (const item of profesional.asignaciones) {
                    const servicioItem = item.servicio;
                    const profesionalItem = item.profesional;
                    const bookings = await getBookingsByDateAndProfesional(date, profesionalItem.id);
                    const available = filterAvailableSlots([cursor], servicioItem.duracion, bookings);

                    if (available.length === 0) {
                        setError(`El horario de ${servicioItem.nombre} con ${profesionalItem.nombre} ya no está disponible.`);
                        setSubmitting(false);
                        return;
                    }

                    const endTime = calculateEndTime(cursor, servicioItem.duracion);
                    const bookingData = {
                        cliente_nombre: cliente.nombre,
                        cliente_whatsapp: cliente.whatsapp,
                        servicio: servicioItem.nombre,
                        duracion: servicioItem.duracion,
                        profesional_id: profesionalItem.id,
                        profesional_nombre: profesionalItem.nombre,
                        fecha: date,
                        hora_inicio: cursor,
                        hora_fin: endTime,
                        estado: requiereAnticipo ? "Pendiente" : "Reservado"
                    };

                    const result = await createBooking(bookingData);
                    if (!result.success || !result.data) throw new Error('No se pudo crear una de las reservas');
                    creadas.push(result.data);
                    cursor = endTime;
                }

                const bookingResumen = {
                    ...creadas[0],
                    servicio: service.nombre,
                    duracion: service.duracion,
                    profesional_nombre: profesional.asignaciones.map(item => `${item.servicio.nombre}: ${item.profesional.nombre}`).join(' | '),
                    hora_inicio: time,
                    hora_fin: cursor,
                    reservas_relacionadas: creadas
                };

                const nombreNegocio = configNegocio?.nombre || 'Mi Salón';
                if (requiereAnticipo) {
                    if (window.notificarReservaPendiente) await window.notificarReservaPendiente(bookingResumen);
                } else {
                    if (window.notificarNuevaReserva) await window.notificarNuevaReserva(bookingResumen);
                }

                const icsContent = generarArchivoCalendario(bookingResumen, nombreNegocio);
                const fechaSegura = bookingResumen.fecha.replace(/-/g, '');
                const horaSegura = bookingResumen.hora_inicio.replace(':', '');
                const nombreSeguro = bookingResumen.cliente_nombre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                descargarArchivoICS(icsContent, `turno-${fechaSegura}-${horaSegura}-${nombreSeguro}.ics`);

                onSubmit(bookingResumen);
                return;
            }

            const bookings = await getBookingsByDateAndProfesional(date, profesional.id);
            const baseSlots = [time];
            const available = filterAvailableSlots(baseSlots, service.duracion, bookings);

            if (available.length === 0) {
                setError("Ese horario ya no está disponible.");
                setSubmitting(false);
                return;
            }

            const endTime = calculateEndTime(time, service.duracion);
            
            const configNegocio = await window.cargarConfiguracionNegocio();
            const configGlobal = window.salonConfig ? await window.salonConfig.get() : {};
            const minAntelacionHoras = configGlobal?.min_antelacion_horas ?? 2;
            const requiereAnticipo = configNegocio?.requiere_anticipo === true;

            const [year, month, day] = date.split('-').map(Number);
            const [hours, minutes] = time.split(':').map(Number);
            const fechaTurno = new Date(year, month - 1, day, hours, minutes, 0);
            const minFechaPermitida = new Date(Date.now() + (minAntelacionHoras * 60 * 60 * 1000));

            if (fechaTurno < minFechaPermitida) {
                setError(`Solo se puede reservar con al menos ${minAntelacionHoras} hora(s) de anticipación.`);
                setSubmitting(false);
                return;
            }

            const bookingData = {
                cliente_nombre: cliente.nombre,
                cliente_whatsapp: cliente.whatsapp,
                servicio: service.nombre,
                duracion: service.duracion,
                profesional_id: profesional.id,
                profesional_nombre: profesional.nombre,
                fecha: date,
                hora_inicio: time,
                hora_fin: endTime,
                estado: requiereAnticipo ? "Pendiente" : "Reservado"
            };

            const result = await createBooking(bookingData);
            
            if (result.success && result.data) {
                console.log(` ✅ Reserva creada en estado ${result.data.estado}`);
                
                const nombreNegocio = configNegocio?.nombre || 'Mi Salón';
                
                //  ELIMINADO: No enviar WhatsApp al cliente
                // if (requiereAnticipo && window.enviarMensajePago) {
                //     await window.enviarMensajePago(result.data, configNegocio);
                // } else if (!requiereAnticipo && window.enviarConfirmacionReserva) {
                //     await window.enviarConfirmacionReserva(result.data, configNegocio);
                // }
                
                //  SOLO notificar a la dueña
                if (requiereAnticipo) {
                    if (window.notificarReservaPendiente) {
                        await window.notificarReservaPendiente(result.data);
                    }
                    console.log(' 📱 Dueña notificada: RESERVA PENDIENTE DE PAGO (con datos + push)');
                } else {
                    if (window.notificarNuevaReserva) {
                        await window.notificarNuevaReserva(result.data);
                    }
                    console.log(' 📱 Dueña notificada: NUEVO TURNO AGENDADO (con push)');
                }
                
                // Generar y descargar archivo ICS
                const icsContent = generarArchivoCalendario(result.data, nombreNegocio);
                
                const fechaSegura = result.data.fecha.replace(/-/g, '');
                const horaSegura = result.data.hora_inicio.replace(':', '');
                const nombreSeguro = result.data.cliente_nombre
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '');
                
                const nombreArchivo = `turno-${fechaSegura}-${horaSegura}-${nombreSeguro}.ics`;
                
                descargarArchivoICS(icsContent, nombreArchivo);
                
                onSubmit(result.data);
            }
        } catch (err) {
            console.error('Error:', err);
            setError("Ocurrió un error al guardar la reserva.");
        } finally {
            setSubmitting(false);
        }
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white/95 backdrop-blur-md w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl space-y-6 border-2 border-pink-300">
                <div className="flex justify-between items-center border-b border-pink-200 pb-4">
                    <h3 className="text-xl font-bold text-pink-800 flex items-center gap-2">
                        <span></span>
                        Confirmar Reserva
                    </h3>
                    <button onClick={onCancel} className="text-pink-400 hover:text-pink-600">
                        <i className="icon-x text-2xl"></i>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-gradient-to-r from-pink-50 to-pink-100 p-4 rounded-xl border border-pink-200 space-y-2">
                        <div className="flex items-center gap-3 text-pink-700">
                            <span className="text-2xl">
                                {service.nombre.toLowerCase().includes('corte') ? '' : 
                                 service.nombre.toLowerCase().includes('una') ? '' :
                                 service.nombre.toLowerCase().includes('peinado') ? '' :
                                 service.nombre.toLowerCase().includes('maquillaje') ? '' : ''}
                            </span>
                            <span className="font-medium">{service.nombre}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-pink-700">
                            <span className="text-2xl"></span>
                            <span>Con: <strong>{profesional.nombre}</strong></span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-pink-700">
                            <span className="text-2xl"></span>
                            <span>{window.formatFechaCompleta ? window.formatFechaCompleta(date) : date}</span>
                        </div>
                        <div className="flex items-center gap-3 text-pink-700">
                            <span className="text-2xl"></span>
                            <span>{window.formatTo12Hour ? window.formatTo12Hour(time) : time} ({service.duracion} min)</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
                            <p className="text-sm text-pink-700">
                                <span className="font-semibold">Tus datos:</span> {cliente.nombre} - +{cliente.whatsapp}
                            </p>
                        </div>

                        {error && (
                            <div className="text-pink-600 text-sm bg-pink-100 p-3 rounded-lg flex items-start gap-2 border border-pink-300">
                                <span className="text-pink-500"></span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white py-3.5 rounded-xl font-bold hover:from-pink-600 hover:to-pink-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg"
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <span></span>
                                    Confirmar Reserva
                                    <span></span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
