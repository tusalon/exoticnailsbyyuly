// components/TimeSlots.js - horarios compatibles con multiples profesionales

function TimeSlots({ service, date, profesional, onTimeSelect, selectedTime }) {
    const [slots, setSlots] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [diaTrabaja, setDiaTrabaja] = React.useState(true);
    const [verificacionCompleta, setVerificacionCompleta] = React.useState(false);
    const [maxAntelacionDias, setMaxAntelacionDias] = React.useState(30);
    const [minAntelacionHoras, setMinAntelacionHoras] = React.useState(2);

    const indiceToHoraLegible = (indice) => {
        const horas = Math.floor(indice / 2);
        const minutos = indice % 2 === 0 ? '00' : '30';
        return `${horas.toString().padStart(2, '0')}:${minutos}`;
    };

    const getAssignments = () => {
        if (profesional?.assignments?.length) {
            return profesional.assignments.filter(a => a.profesional && a.servicio);
        }
        if (profesional && service) {
            const servicios = Array.isArray(service.items) ? service.items : [service];
            return servicios.map(servicio => ({ servicio, profesional }));
        }
        return [];
    };

    const assignments = getAssignments();
    const totalDuracion = assignments.reduce((total, a) => total + (parseInt(a.servicio.duracion) || 0), 0) || service?.duracion || 0;
    const profesionalesLabel = Array.from(new Set(assignments.map(a => a.profesional.nombre))).join(' + ');

    React.useEffect(() => {
        const cargarConfiguracion = async () => {
            try {
                if (window.salonConfig) {
                    const config = await window.salonConfig.get();
                    if (config && config.max_antelacion_dias) setMaxAntelacionDias(config.max_antelacion_dias);
                    if (config && config.min_antelacion_horas !== undefined) setMinAntelacionHoras(config.min_antelacion_horas);
                }
            } catch (error) {
                console.error('Error cargando configuracion:', error);
            }
        };
        cargarConfiguracion();
    }, []);

    const formatDateLocal = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day).toLocaleDateString();
    };

    const getCurrentLocalDate = () => {
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
        const day = hoy.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const minutesToTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const slotTieneDescanso = (slotStart, slotEnd, descansosDelDia = []) => {
        return descansosDelDia.some(descanso => {
            if (!descanso?.inicio || !descanso?.fin) return false;
            const descansoStart = timeToMinutes(descanso.inicio);
            const descansoEnd = timeToMinutes(descanso.fin);
            return (slotStart < descansoEnd) && (slotEnd > descansoStart);
        });
    };

    const getDiaSemana = () => {
        const [year, month, day] = date.split('-').map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        return diasSemana[fechaLocal.getDay()];
    };

    React.useEffect(() => {
        if (!service || !date || assignments.length === 0) {
            setVerificacionCompleta(false);
            return;
        }

        const loadSlots = async () => {
            setLoading(true);
            setError(null);
            setVerificacionCompleta(false);
            try {
                const hoy = new Date();
                const fechaSeleccionada = new Date(date + 'T00:00:00');
                const diffDays = Math.ceil((fechaSeleccionada - hoy) / (1000 * 60 * 60 * 24));
                if (diffDays > maxAntelacionDias) {
                    setError(`Solo se puede reservar con hasta ${maxAntelacionDias} dias de antelacion`);
                    setSlots([]);
                    setDiaTrabaja(false);
                    return;
                }

                const diaSemana = getDiaSemana();
                const horariosPorProfesional = await Promise.all(
                    assignments.map(a => window.salonConfig.getHorariosProfesional(a.profesional.id))
                );

                const bookingsPorProfesional = await Promise.all(
                    assignments.map(a => getBookingsByDateAndProfesional(date, a.profesional.id))
                );

                const primeraAsignacion = assignments[0];
                const primerHorario = horariosPorProfesional[0];
                let baseIndices = primerHorario.horariosPorDia?.[diaSemana] || primerHorario.horas || [];
                if (primeraAsignacion.servicio.horarios_permitidos?.length) {
                    baseIndices = baseIndices.filter(indice => primeraAsignacion.servicio.horarios_permitidos.includes(indiceToHoraLegible(indice)));
                }

                if (baseIndices.length === 0) {
                    setSlots([]);
                    setDiaTrabaja(false);
                    return;
                }

                const todayStr = getCurrentLocalDate();
                const esHoy = date === todayStr;
                const ahora = new Date();
                const minAllowedMinutes = (ahora.getHours() * 60 + ahora.getMinutes()) + (minAntelacionHoras * 60);

                const disponibles = baseIndices.map(indiceToHoraLegible).filter(slotStartStr => {
                    let cursor = timeToMinutes(slotStartStr);
                    const inicioTotal = cursor;

                    if (esHoy && inicioTotal < minAllowedMinutes) return false;

                    for (let i = 0; i < assignments.length; i++) {
                        const asignacion = assignments[i];
                        const horarios = horariosPorProfesional[i];
                        const bookings = bookingsPorProfesional[i] || [];
                        const duracion = parseInt(asignacion.servicio.duracion) || 0;
                        const inicio = cursor;
                        const fin = cursor + duracion;
                        const horaInicio = minutesToTime(inicio);
                        const indicesDia = horarios.horariosPorDia?.[diaSemana] || horarios.horas || [];
                        const horasDia = indicesDia.map(indiceToHoraLegible);
                        const descansosDelDia = horarios.descansosPorDia?.[diaSemana] || [];

                        if (!horasDia.includes(horaInicio)) return false;
                        if (asignacion.servicio.horarios_permitidos?.length && !asignacion.servicio.horarios_permitidos.includes(horaInicio)) return false;
                        if (slotTieneDescanso(inicio, fin, descansosDelDia)) return false;

                        const conflicto = bookings.some(booking => {
                            const bookingStart = timeToMinutes(booking.hora_inicio);
                            const bookingEnd = timeToMinutes(booking.hora_fin);
                            return (inicio < bookingEnd) && (fin > bookingStart);
                        });
                        if (conflicto) return false;

                        cursor = fin;
                    }
                    return true;
                }).sort();

                setDiaTrabaja(disponibles.length > 0);
                setSlots(disponibles);
            } catch (err) {
                console.error(err);
                setError('Error al cargar horarios');
                setSlots([]);
            } finally {
                setVerificacionCompleta(true);
                setLoading(false);
            }
        };

        loadSlots();
    }, [service, date, profesional, maxAntelacionDias, minAntelacionHoras]);

    if (!service || !date || assignments.length === 0) return null;

    if (!verificacionCompleta || loading) {
        return (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">*</span>
                    4. Elige un horario
                </h2>
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                <span className="text-2xl">*</span>
                4. Elige un horario
                {selectedTime && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2">Horario seleccionado</span>
                )}
            </h2>

            <div className="text-sm bg-gradient-to-r from-pink-50 to-pink-100 p-4 rounded-xl border border-pink-200">
                <div className="font-medium text-pink-700">Duracion total: {totalDuracion} min</div>
                <div className="text-xs text-pink-500 mt-1">Profesionales: {profesionalesLabel}</div>
                {assignments.length > 1 && (
                    <div className="text-xs text-pink-600 mt-2">
                        Los servicios se agendan consecutivos, en el mismo orden seleccionado.
                    </div>
                )}
            </div>

            {date === getCurrentLocalDate() && (
                <div className="text-sm text-pink-600 bg-pink-50 p-3 rounded-lg border border-pink-200">
                    Solo se muestran horarios con al menos {minAntelacionHoras} horas de anticipacion.
                </div>
            )}

            {error ? (
                <div className="p-4 bg-pink-50 text-pink-600 rounded-lg text-sm border border-pink-200">{error}</div>
            ) : slots.length === 0 ? (
                <div className="text-center p-8 bg-pink-50 rounded-xl border border-pink-200">
                    <p className="text-pink-700 font-medium">No hay horarios disponibles para esa combinacion el {formatDateLocal(date)}</p>
                    <p className="text-sm text-pink-500 mt-1">Prueba con otra fecha u otra profesional.</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                    {slots.map(time24h => {
                        const isSelected = selectedTime === time24h;
                        return (
                            <button
                                key={time24h}
                                onClick={() => onTimeSelect(time24h)}
                                className={`py-3 px-2 rounded-lg text-base font-semibold transition-all flex flex-col items-center ${isSelected ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg ring-2 ring-pink-300' : 'bg-white text-pink-700 border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50'}`}
                            >
                                <span>{window.formatTo12Hour ? window.formatTo12Hour(time24h) : time24h}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}