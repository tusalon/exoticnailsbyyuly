// components/MultiTimeSlots.js - horarios secuenciales para varios servicios/profesionales

function MultiTimeSlots({ service, date, profesional, onTimeSelect, selectedTime }) {
    const [slots, setSlots] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [minAntelacionHoras, setMinAntelacionHoras] = React.useState(2);

    const asignaciones = profesional?.asignaciones || [];

    const indiceToHoraLegible = (indice) => {
        const horas = Math.floor(indice / 2);
        const minutos = indice % 2 === 0 ? '00' : '30';
        return `${horas.toString().padStart(2, '0')}:${minutos}`;
    };

    const timeToMinutes = (timeStr) => {
        const [hours, minutes] = String(timeStr || '00:00').split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    };

    const minutesToTime = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const getCurrentLocalDate = () => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    };

    const slotTieneDescanso = (slotStart, slotEnd, descansosDelDia = []) => {
        return descansosDelDia.some(descanso => {
            if (!descanso?.inicio || !descanso?.fin) return false;
            const descansoStart = timeToMinutes(descanso.inicio);
            const descansoEnd = timeToMinutes(descanso.fin);
            return (slotStart < descansoEnd) && (slotEnd > descansoStart);
        });
    };

    const estaDentroHorarioTrabajo = (inicio, fin, indicesDelDia = []) => {
        if (!indicesDelDia.length) return false;

        const minutosTrabajo = indicesDelDia
            .map(indice => timeToMinutes(indiceToHoraLegible(indice)))
            .sort((a, b) => a - b);

        const bloques = [];
        let bloqueInicio = minutosTrabajo[0];
        let bloqueFin = minutosTrabajo[0] + 30;

        for (let i = 1; i < minutosTrabajo.length; i++) {
            const minuto = minutosTrabajo[i];
            if (minuto <= bloqueFin) {
                bloqueFin = Math.max(bloqueFin, minuto + 30);
            } else {
                bloques.push({ inicio: bloqueInicio, fin: bloqueFin });
                bloqueInicio = minuto;
                bloqueFin = minuto + 30;
            }
        }

        bloques.push({ inicio: bloqueInicio, fin: bloqueFin });
        return bloques.some(bloque => inicio >= bloque.inicio && fin <= bloque.fin);
    };

    React.useEffect(() => {
        const cargar = async () => {
            if (!service?.esMultiple || !date || !profesional?.esMultiple) return;
            setLoading(true);
            setError(null);
            try {
                const config = window.salonConfig ? await window.salonConfig.get() : {};
                const minHoras = config?.min_antelacion_horas ?? 2;
                setMinAntelacionHoras(minHoras);

                const [year, month, day] = date.split('-').map(Number);
                const fechaLocal = new Date(year, month - 1, day);
                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const diaSemana = diasSemana[fechaLocal.getDay()];

                const datos = await Promise.all(asignaciones.map(async item => {
                    const horarios = await window.salonConfig.getHorariosPorDia(item.profesional.id);
                    const descansos = window.salonConfig.getDescansosPorDia
                        ? await window.salonConfig.getDescansosPorDia(item.profesional.id)
                        : {};
                    const bookings = await getBookingsByDateAndProfesional(date, item.profesional.id);
                    return { ...item, horarios, descansos, bookings };
                }));

                if (datos.length !== asignaciones.length) {
                    setSlots([]);
                    return;
                }

                let baseSlots = (datos[0].horarios[diaSemana] || []).map(indiceToHoraLegible);
                const primerServicio = datos[0].servicio;
                if (primerServicio.horarios_permitidos?.length) {
                    baseSlots = baseSlots.filter(slot => primerServicio.horarios_permitidos.includes(slot));
                }

                const esHoy = date === getCurrentLocalDate();
                const ahora = new Date();
                const minAllowed = ahora.getHours() * 60 + ahora.getMinutes() + (minHoras * 60);

                const disponibles = baseSlots.filter(slot => {
                    let cursor = timeToMinutes(slot);
                    if (esHoy && cursor < minAllowed) return false;

                    for (let index = 0; index < datos.length; index++) {
                        const item = datos[index];
                        const duracion = parseInt(item.servicio.duracion, 10) || 60;
                        const inicio = cursor;
                        const fin = inicio + duracion;
                        const indicesDelDia = item.horarios[diaSemana] || [];

                        if (!estaDentroHorarioTrabajo(inicio, fin, indicesDelDia)) return false;

                        // En una reserva multiple, solo la primera hora la elige la clienta.
                        // Los servicios siguientes empiezan automaticamente al terminar el anterior.
                        if (index === 0 && item.servicio.horarios_permitidos?.length && !item.servicio.horarios_permitidos.includes(minutesToTime(inicio))) return false;

                        if (slotTieneDescanso(inicio, fin, item.descansos[diaSemana] || [])) return false;

                        const conflicto = item.bookings.some(booking => {
                            const bStart = timeToMinutes(booking.hora_inicio);
                            const bEnd = timeToMinutes(booking.hora_fin);
                            return (inicio < bEnd) && (fin > bStart);
                        });
                        if (conflicto) return false;

                        cursor = fin;
                    }

                    return true;
                });

                setSlots(disponibles.sort());
            } catch (err) {
                console.error('Error calculando horarios multiservicio:', err);
                setError('Error al cargar horarios');
                setSlots([]);
            } finally {
                setLoading(false);
            }
        };

        cargar();
    }, [service, date, profesional]);

    if (!service?.esMultiple || !date || !profesional?.esMultiple) return null;

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                <span className="text-2xl">⏰</span>
                4. Elige horario de inicio
                {selectedTime && <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2">Seleccionado</span>}
            </h2>

            <div className="text-sm bg-pink-50 p-4 rounded-xl border border-pink-200 text-pink-700">
                Los servicios se reservarán en secuencia desde la hora seleccionada.
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                </div>
            ) : error ? (
                <div className="p-4 bg-pink-50 text-pink-600 rounded-lg text-sm border border-pink-200">{error}</div>
            ) : slots.length === 0 ? (
                <div className="text-center p-8 bg-pink-50 rounded-xl border border-pink-200">
                    <p className="text-pink-700 font-medium">No hay horarios disponibles para esta combinación.</p>
                    <p className="text-sm text-pink-500 mt-1">Prueba otra fecha o cambia profesionales.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                        {slots.map(time24h => (
                            <button
                                key={time24h}
                                onClick={() => onTimeSelect(time24h)}
                                className={`py-3 px-2 rounded-lg text-base font-semibold transition-all transform ${
                                    selectedTime === time24h
                                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg scale-105 ring-2 ring-pink-300'
                                        : 'bg-white text-pink-700 border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50 hover:scale-105 hover:shadow-md'
                                }`}
                            >
                                {window.formatTo12Hour ? window.formatTo12Hour(time24h) : time24h}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-pink-400 mt-3 text-center">
                        Mínimo {minAntelacionHoras} hora(s) de anticipación.
                    </p>
                </>
            )}
        </div>
    );
}
