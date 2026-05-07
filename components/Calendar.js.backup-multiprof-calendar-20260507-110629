// components/Calendar.js - VERSIÓN CON DÍAS CERRADOS

function Calendar({ onDateSelect, selectedDate, profesional }) {
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [diasLaborales, setDiasLaborales] = React.useState([]);
    const [diasCerrados, setDiasCerrados] = React.useState([]);
    const [cargandoHorarios, setCargandoHorarios] = React.useState(false);

    React.useEffect(() => {
        if (!profesional) return;
        
        const cargarDisponibilidad = async () => {
            setCargandoHorarios(true);
            try {
                const horarios = await window.salonConfig.getHorariosProfesional(profesional.id);
                console.log(`📅 Días laborales de ${profesional.nombre}:`, horarios.dias);
                setDiasLaborales(horarios.dias || []);
                
                const diasCerradosList = await window.getDiasCerrados();
                setDiasCerrados(diasCerradosList.map(d => d.fecha));
                
            } catch (error) {
                console.error('Error cargando disponibilidad:', error);
                setDiasLaborales([]);
                setDiasCerrados([]);
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
        
    }, [profesional]);

    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getTodayLocalString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isPastDate = (date) => {
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayStr = getTodayLocalString();
        const dateStr = formatDate(date);
        
        if (date < today) return true;
        
        if (dateStr === todayStr) {
            const currentHour = now.getHours();
            const currentMinutes = now.getMinutes();
            
            const LAST_SLOT_HOUR = 20;
            const LAST_SLOT_MINUTES = 0;
            
            if (currentHour > LAST_SLOT_HOUR) return true;
            if (currentHour === LAST_SLOT_HOUR && currentMinutes > LAST_SLOT_MINUTES) return true;
        }
        
        return false;
    };

    const profesionalTrabajaEsteDia = (date) => {
        if (!profesional) return true;
        
        if (diasLaborales.length === 0) return true;
        
        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = diasSemana[date.getDay()];
        return diasLaborales.includes(diaSemana);
    };

    const esDiaCerrado = (date) => {
        const fechaStr = formatDate(date);
        return diasCerrados.includes(fechaStr);
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
        
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        
        return days;
    };

    const days = getDaysInMonth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    if (cargandoHorarios) {
        return (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">📅</span>
                    3. Seleccioná una fecha
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
                3. Seleccioná una fecha
                {profesional && (
                    <span className="text-sm bg-pink-100 text-pink-700 px-3 py-1 rounded-full ml-2">
                        con {profesional.nombre}
                    </span>
                )}
                {selectedDate && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2">
                        ✓ Fecha seleccionada
                    </span>
                )}
            </h2>
            
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border-2 border-pink-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-pink-100 border-b border-pink-200">
                    <button 
                        onClick={prevMonth} 
                        className="p-2 hover:bg-white/50 rounded-full transition-colors text-pink-600"
                        title="Mes anterior"
                    >
                        ◀
                    </button>
                    <span className="font-bold text-pink-800 text-lg capitalize">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button 
                        onClick={nextMonth} 
                        className="p-2 hover:bg-white/50 rounded-full transition-colors text-pink-600"
                        title="Mes siguiente"
                    >
                        ▶
                    </button>
                </div>

                <div className="p-4">
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                            <div key={i} className={`text-xs font-medium py-1 ${d === 'D' ? 'text-pink-400' : 'text-pink-600'}`}>
                                {d}
                            </div>
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
                            
                            const available = !past && profesionalTrabaja && !cerrado;
                            
                            let className = "h-10 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all relative";
                            
                            if (selected) {
                                className += " bg-pink-500 text-white shadow-md scale-105 ring-2 ring-pink-300";
                            } else if (!available) {
                                className += " text-pink-300 cursor-not-allowed bg-pink-50/50";
                            } else {
                                className += " text-pink-700 hover:bg-pink-100 hover:text-pink-600 hover:scale-105 cursor-pointer";
                            }
                            
                            let title = "";
                            if (cerrado) {
                                title = "🚫 Día cerrado (feriado/vacaciones)";
                            } else if (past && dateStr === getTodayLocalString()) {
                                title = "Hoy ya no hay horarios disponibles";
                            } else if (past) {
                                title = "Fecha pasada";
                            } else if (!profesionalTrabaja && profesional) {
                                const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                                const diaSemana = diasSemana[date.getDay()];
                                title = `${profesional.nombre} no trabaja los ${diaSemana}s`;
                            } else {
                                title = "Disponible";
                            }
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => available && onDateSelect(dateStr)}
                                    disabled={!available}
                                    className={className}
                                    title={title}
                                >
                                    {date.getDate()}
                                    {cerrado && (
                                        <span className="absolute top-0 right-0 text-[10px] text-red-500">🚫</span>
                                    )}
                                    {available && !selected && !cerrado && (
                                        <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-pink-400 rounded-full"></span>
                                    )}
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
                            <strong>Días que trabaja {profesional.nombre}:</strong>{' '}
                            {diasLaborales.length > 0 
                                ? diasLaborales.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
                                : 'Todos los días (sin configuración específica)'}
                        </span>
                    </div>
                    {diasCerrados.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-red-400 text-lg">🚫</span>
                            <span>
                                <strong>Días cerrados:</strong>{' '}
                                {diasCerrados.length} día(s) no disponible(s)
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
                        <span>Disponible</span>
                        <span className="w-3 h-3 bg-pink-200 rounded-full ml-3"></span>
                        <span>No disponible</span>
                        <span className="w-3 h-3 bg-red-300 rounded-full ml-3"></span>
                        <span>Día cerrado</span>
                    </div>
                </div>
            )}
        </div>
    );
}