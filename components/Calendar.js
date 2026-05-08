// components/Calendar.js - Disponibilidad real por servicio, profesional y reservas

function Calendar({ onDateSelect, selectedDate, profesional, service, onHorariosCargados }) {
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [diasLaborales, setDiasLaborales] = React.useState([]);
    const [diasCerrados, setDiasCerrados] = React.useState([]);
    const [cargandoHorarios, setCargandoHorarios] = React.useState(false);
    const [fechasLibresProfesional, setFechasLibresProfesional] = React.useState([]);
    const [horariosPorDia, setHorariosPorDia] = React.useState({});
    const [descansosPorDia, setDescansosPorDia] = React.useState({});
    const [fechasSinDisponibilidad, setFechasSinDisponibilidad] = React.useState([]);
    const [cargandoDisponibilidad, setCargandoDisponibilidad] = React.useState(false);
    const [minAntelacionHoras, setMinAntelacionHoras] = React.useState(2);
    const [maxAntelacionDias, setMaxAntelacionDias] = React.useState(30);

    const indiceToHoraLegible = (indice) => {
        const horas = Math.floor(indice / 2);
        const minutos = indice % 2 === 0 ? '00' : '30';
        return `${horas.toString().padStart(2, '0')}:${minutos}`;
    };

    const timeToMinutes = (timeStr) => {
        const [hours, minutes] = String(timeStr || '00:00').split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    };

    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getNegocioIdLocal = () => {
        if (typeof window.getNegocioIdFromConfig === 'function') return window.getNegocioIdFromConfig();
        if (typeof window.getNegocioId === 'function') return window.getNegocioId();
        return localStorage.getItem('negocioId');
    };

    const getTodayLocalString = () => formatDate(new Date());

    const slotTieneDescanso = (slotStart, slotEnd, descansosDelDia = []) => {
        return descansosDelDia.some(descanso => {
            if (!descanso?.inicio || !descanso?.fin) return false;
            const descansoStart = timeToMinutes(descanso.inicio);
            const descansoEnd = timeToMinutes(descanso.fin);
            return (slotStart < descansoEnd) && (slotEnd > descansoStart);
        });
    };

    React.useEffect(() => {
        if (!profesional) return;
        
        const cargarDisponibilidad = async () => {
            setCargandoHorarios(true);
            try {
                const config = window.salonConfig ? await window.salonConfig.get() : {};
                setMinAntelacionHoras(config?.min_antelacion_horas ?? 2);
                setMaxAntelacionDias(config?.max_antelacion_dias ?? 30);

                const horarios = await window.salonConfig.getHorariosProfesional(profesional.id);
                const porDia = horarios.horariosPorDia || {};
                const descansos = window.salonConfig.getDescansosPorDia ?
                    await window.salonConfig.getDescansosPorDia(profesional.id) :
                    {};

                setDiasLaborales(horarios.dias || []);
                setHorariosPorDia(porDia);
                setDescansosPorDia(descansos || {});
                if (onHorariosCargados) onHorariosCargados(porDia);
                
                const diasCerradosList = await window.getDiasCerrados();
                setDiasCerrados((diasCerradosList || []).map(d => d.fecha));
                setFechasLibresProfesional(profesional.fechas_libres || []);
                
                await verificarDisponibilidadMes(porDia, descansos || {}, config);
            } catch (error) {
                console.error('Error cargando disponibilidad:', error);
                setDiasLaborales([]);
                setDiasCerrados([]);
                setFechasLibresProfesional([]);
                setHorariosPorDia({});
                setDescansosPorDia({});
            } finally {
                setCargandoHorarios(false);
            }
        };
        
        cargarDisponibilidad();
        
        const handleActualizacion = () => cargarDisponibilidad();
        window.addEventListener('diasCerradosActualizados', handleActualizacion);
        
        return () => {
            window.removeEventListener('diasCerradosActualizados', handleActualizacion);
        };
    }, [profesional, service]);

    React.useEffect(() => {
        if (Object.keys(horariosPorDia).length > 0) {
            verificarDisponibilidadMes(horariosPorDia, descansosPorDia);
        }
    }, [currentDate, service]);

    const verificarDisponibilidadMes = async (horarios, descansos = {}, configOverride = null) => {
        if (!service || !profesional) {
            setFechasSinDisponibilidad([]);
            return;
        }

        setCargandoDisponibilidad(true);
        
        try {
            const negocioId = getNegocioIdLocal();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const diasEnMes = new Date(year, month + 1, 0).getDate();
            const fechaInicio = formatDate(new Date(year, month, 1));
            const fechaFin = formatDate(new Date(year, month + 1, 0));
            const minHoras = configOverride?.min_antelacion_horas ?? minAntelacionHoras;
            const maxDias = configOverride?.max_antelacion_dias ?? maxAntelacionDias;
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesional.id}&estado=neq.Cancelado&select=fecha,hora_inicio,hora_fin`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            const reservas = response.ok ? await response.json() : [];
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) reservasPorFecha[r.fecha] = [];
                reservasPorFecha[r.fecha].push(r);
            });
            
            const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const sinDisponibilidad = [];
            const ahora = new Date();
            const minFechaPermitida = new Date(Date.now() + (minHoras * 60 * 60 * 1000));
            
            for (let d = 1; d <= diasEnMes; d++) {
                const fecha = new Date(year, month, d);
                const fechaStr = formatDate(fecha);
                const diaSemana = diasSemana[fecha.getDay()];
                const diffDias = Math.ceil((new Date(`${fechaStr}T00:00:00`) - new Date(formatDate(ahora) + 'T00:00:00')) / (1000 * 60 * 60 * 24));
                let baseSlots = (horarios[diaSemana] || []).map(indiceToHoraLegible);
                
                if (service.horarios_permitidos && service.horarios_permitidos.length > 0) {
                    baseSlots = baseSlots.filter(slot => service.horarios_permitidos.includes(slot));
                }
                
                if (baseSlots.length === 0 || diffDias > maxDias) {
                    sinDisponibilidad.push(fechaStr);
                    continue;
                }
                
                const reservasDia = reservasPorFecha[fechaStr] || [];
                const descansosDelDia = descansos[diaSemana] || [];
                const tieneSlotDisponible = baseSlots.some(slotStr => {
                    const slotStart = timeToMinutes(slotStr);
                    const slotEnd = slotStart + (parseInt(service.duracion) || 60);
                    const fechaHoraSlot = new Date(year, month, d, Math.floor(slotStart / 60), slotStart % 60, 0);
                    
                    if (fechaHoraSlot < minFechaPermitida) return false;
                    if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) return false;
                    
                    return !reservasDia.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });
                });
                
                if (!tieneSlotDisponible) {
                    sinDisponibilidad.push(fechaStr);
                }
            }
            
            setFechasSinDisponibilidad(sinDisponibilidad);
        } catch (error) {
            console.error('Error verificando disponibilidad real del mes:', error);
            setFechasSinDisponibilidad([]);
        } finally {
            setCargandoDisponibilidad(false);
        }
    };

    const isPastDate = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const profesionalTrabajaEsteDia = (date) => {
        if (!profesional || diasLaborales.length === 0) return true;
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        return diasLaborales.includes(diasSemana[date.getDay()]);
    };

    const esDiaCerrado = (date) => diasCerrados.includes(formatDate(date));
    const esDiaLibreProfesional = (date) => (fechasLibresProfesional || []).includes(formatDate(date));
    const esDiaSinDisponibilidad = (date) => fechasSinDisponibilidad.includes(formatDate(date));

    const tieneHorariosConfigurados = (date) => {
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = diasSemana[date.getDay()];
        let horariosDelDia = (horariosPorDia[diaSemana] || []).map(indiceToHoraLegible);
        if (service?.horarios_permitidos?.length) {
            horariosDelDia = horariosDelDia.filter(slot => service.horarios_permitidos.includes(slot));
        }
        return horariosDelDia.length > 0;
    };

    const nextMonth = () => {
        const next = new Date(currentDate);
        next.setMonth(currentDate.getMonth() + 1);
        setCurrentDate(next);
    };

    const prevMonth = () => {
        const prev = new Date(currentDate);
        prev.setMonth(currentDate.getMonth() - 1);
        setCurrentDate(prev);
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
        for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
        return days;
    };

    const days = getDaysInMonth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    if (cargandoHorarios) {
        return (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">📅</span>
                    3. Selecciona una fecha
                    {profesional && (
                        <span className="text-sm bg-pink-100 text-pink-700 px-3 py-1 rounded-full ml-2">
                            con {profesional.nombre}
                        </span>
                    )}
                </h2>
                <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-b-2 border-pink-500 rounded-full mx-auto"></div>
                    <p className="text-pink-400 mt-4">Cargando disponibilidad...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                <span className="text-2xl">📅</span>
                3. Selecciona una fecha
                {profesional && (
                    <span className="text-sm bg-pink-100 text-pink-700 px-3 py-1 rounded-full ml-2">
                        con {profesional.nombre}
                    </span>
                )}
                {selectedDate && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2">
                        Fecha seleccionada
                    </span>
                )}
                {cargandoDisponibilidad && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full ml-2 animate-pulse">
                        Verificando...
                    </span>
                )}
            </h2>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border-2 border-pink-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-pink-100 border-b border-pink-200">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/50 rounded-full transition-colors text-pink-600" title="Mes anterior">◀</button>
                    <span className="font-bold text-pink-800 text-lg capitalize">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/50 rounded-full transition-colors text-pink-600" title="Mes siguiente">▶</button>
                </div>

                <div className="p-4">
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                            <div key={i} className={`text-xs font-medium py-1 ${d === 'D' ? 'text-pink-400' : 'text-pink-600'}`}>{d}</div>
                        ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((date, idx) => {
                            if (!date) return <div key={idx} className="h-10" />;

                            const dateStr = formatDate(date);
                            const past = isPastDate(date);
                            const selected = selectedDate === dateStr;
                            const profesionalTrabaja = profesionalTrabajaEsteDia(date);
                            const cerrado = esDiaCerrado(date);
                            const diaLibreProfesional = esDiaLibreProfesional(date);
                            const sinDisponibilidad = esDiaSinDisponibilidad(date);
                            const tieneHorarios = tieneHorariosConfigurados(date);
                            const available = !past && profesionalTrabaja && !cerrado && !diaLibreProfesional && !sinDisponibilidad && tieneHorarios;
                            
                            let className = "h-10 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all relative";
                            if (selected) className += " bg-pink-500 text-white shadow-md scale-105 ring-2 ring-pink-300";
                            else if (!available) className += " text-pink-300 cursor-not-allowed bg-pink-50/50";
                            else className += " text-pink-700 hover:bg-pink-100 hover:text-pink-600 hover:scale-105 cursor-pointer";
                            
                            let title = "";
                            if (cerrado) title = "Dia cerrado";
                            else if (diaLibreProfesional) title = `${profesional?.nombre} no trabaja este dia`;
                            else if (sinDisponibilidad) title = "Sin horarios disponibles para este servicio";
                            else if (past && dateStr === getTodayLocalString()) title = "Hoy ya no hay horarios disponibles";
                            else if (past) title = "Fecha pasada";
                            else if (!profesionalTrabaja && profesional) {
                                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                                title = `${profesional.nombre} no trabaja los ${diasSemana[date.getDay()]}s`;
                            } else if (!tieneHorarios) title = "No hay horarios configurados para este dia";
                            else title = "Disponible";
                            
                            return (
                                <button key={idx} onClick={() => available && onDateSelect(dateStr)} disabled={!available} className={className} title={title}>
                                    {date.getDate()}
                                    {cerrado && <span className="absolute top-0 right-0 text-[10px] text-red-500">×</span>}
                                    {diaLibreProfesional && !cerrado && <span className="absolute top-0 right-0 text-[10px] text-orange-500">○</span>}
                                    {sinDisponibilidad && !cerrado && !diaLibreProfesional && <span className="absolute top-0 right-0 text-[10px] text-red-500">×</span>}
                                    {available && !selected && <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-pink-400 rounded-full"></span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {profesional && (
                <div className="text-xs text-pink-600 bg-pink-50 p-3 rounded-lg border border-pink-200">
                    <div className="flex items-center gap-2">
                        <span className="text-pink-400 text-lg">📅</span>
                        <span>
                            <strong>Dias que trabaja {profesional.nombre}:</strong>{' '}
                            {diasLaborales.length > 0
                                ? diasLaborales.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
                                : 'Todos los dias (sin configuracion especifica)'}
                        </span>
                    </div>
                    {fechasLibresProfesional.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-orange-500 text-lg">○</span>
                            <span><strong>Dias libres:</strong> {fechasLibresProfesional.length} dia(s) no disponible(s)</span>
                        </div>
                    )}
                    {diasCerrados.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-red-400 text-lg">×</span>
                            <span><strong>Dias cerrados del local:</strong> {diasCerrados.length} dia(s) no disponible(s)</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
