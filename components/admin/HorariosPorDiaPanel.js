// components/admin/HorariosPorDiaPanel.js - Panel para configurar horarios por día

function HorariosPorDiaPanel({ profesionalId, profesionalNombre, onGuardar, onCancelar }) {
    const [horariosPorDia, setHorariosPorDia] = React.useState({});
    const [descansosPorDia, setDescansosPorDia] = React.useState({});
    const [cargando, setCargando] = React.useState(true);
    const [diaSeleccionado, setDiaSeleccionado] = React.useState('lunes');
    const [horasDisponibles, setHorasDisponibles] = React.useState([]);
    const [nuevoDescanso, setNuevoDescanso] = React.useState({ inicio: '13:00', fin: '14:00' });

    const dias = [
        { id: 'lunes', nombre: 'Lunes' },
        { id: 'martes', nombre: 'Martes' },
        { id: 'miercoles', nombre: 'Miércoles' },
        { id: 'jueves', nombre: 'Jueves' },
        { id: 'viernes', nombre: 'Viernes' },
        { id: 'sabado', nombre: 'Sábado' },
        { id: 'domingo', nombre: 'Domingo' }
    ];

    // Generar todas las horas posibles cada 30 minutos (de 0 a 23:30)
    const todasLasHoras = React.useMemo(() => {
        const horas = [];
        for (let i = 0; i < 48; i++) {
            const hora = Math.floor(i / 2);
            const minutos = i % 2 === 0 ? '00' : '30';
            horas.push({
                indice: i,
                legible: `${hora.toString().padStart(2, '0')}:${minutos}`,
                label: `${hora.toString().padStart(2, '0')}:${minutos}`
            });
        }
        return horas;
    }, []);

    React.useEffect(() => {
        if (profesionalId) {
            cargarHorarios();
        }
    }, [profesionalId]);

    const cargarHorarios = async () => {
        setCargando(true);
        try {
            const horarios = await window.salonConfig.getHorariosPorDia(profesionalId);
            const descansos = window.salonConfig.getDescansosPorDia ?
                await window.salonConfig.getDescansosPorDia(profesionalId) :
                {};
            console.log('📋 Horarios cargados por día:', horarios);
            
            // Inicializar todos los días con array vacío si no existen
            const horariosInicializados = {};
            const descansosInicializados = {};
            dias.forEach(dia => {
                horariosInicializados[dia.id] = horarios[dia.id] || [];
                descansosInicializados[dia.id] = descansos[dia.id] || [];
            });
            
            setHorariosPorDia(horariosInicializados);
            setDescansosPorDia(descansosInicializados);
            
            // Actualizar horas disponibles para el día seleccionado
            setHorasDisponibles(horariosInicializados[diaSeleccionado] || []);
            
        } catch (error) {
            console.error('Error cargando horarios:', error);
            alert('Error al cargar horarios');
        } finally {
            setCargando(false);
        }
    };

    const handleDiaChange = (diaId) => {
        setDiaSeleccionado(diaId);
        setHorasDisponibles(horariosPorDia[diaId] || []);
    };

    const toggleHora = (indice) => {
        const nuevasHoras = [...(horariosPorDia[diaSeleccionado] || [])];
        
        if (nuevasHoras.includes(indice)) {
            // Quitar hora
            const index = nuevasHoras.indexOf(indice);
            nuevasHoras.splice(index, 1);
        } else {
            // Agregar hora
            nuevasHoras.push(indice);
            nuevasHoras.sort((a, b) => a - b);
        }
        
        const nuevosHorarios = {
            ...horariosPorDia,
            [diaSeleccionado]: nuevasHoras
        };
        
        setHorariosPorDia(nuevosHorarios);
        setHorasDisponibles(nuevasHoras);
    };

    const toggleTodasLasHoras = () => {
        const horasActuales = horariosPorDia[diaSeleccionado] || [];
        
        if (horasActuales.length === todasLasHoras.length) {
            // Quitar todas
            const nuevosHorarios = {
                ...horariosPorDia,
                [diaSeleccionado]: []
            };
            setHorariosPorDia(nuevosHorarios);
            setHorasDisponibles([]);
        } else {
            // Agregar todas
            const todas = todasLasHoras.map(h => h.indice);
            const nuevosHorarios = {
                ...horariosPorDia,
                [diaSeleccionado]: todas
            };
            setHorariosPorDia(nuevosHorarios);
            setHorasDisponibles(todas);
        }
    };

    const copiarHorarios = (desdeDia) => {
        const horasACopiar = horariosPorDia[desdeDia] || [];
        const nuevosHorarios = {
            ...horariosPorDia,
            [diaSeleccionado]: [...horasACopiar]
        };
        setHorariosPorDia(nuevosHorarios);
        setHorasDisponibles(horasACopiar);
    };

    const limpiarDia = () => {
        const nuevosHorarios = {
            ...horariosPorDia,
            [diaSeleccionado]: []
        };
        setHorariosPorDia(nuevosHorarios);
        setHorasDisponibles([]);
    };

    const agregarDescanso = () => {
        if (!nuevoDescanso.inicio || !nuevoDescanso.fin) return;
        if (nuevoDescanso.inicio >= nuevoDescanso.fin) {
            alert('La hora de inicio del descanso debe ser menor que la hora final.');
            return;
        }

        const descansosActuales = descansosPorDia[diaSeleccionado] || [];
        setDescansosPorDia({
            ...descansosPorDia,
            [diaSeleccionado]: [...descansosActuales, { ...nuevoDescanso }]
        });
    };

    const eliminarDescanso = (index) => {
        const descansosActuales = descansosPorDia[diaSeleccionado] || [];
        setDescansosPorDia({
            ...descansosPorDia,
            [diaSeleccionado]: descansosActuales.filter((_, i) => i !== index)
        });
    };

    const handleGuardar = async () => {
        try {
            await window.salonConfig.guardarHorariosPorDia(profesionalId, horariosPorDia, descansosPorDia);
            onGuardar(horariosPorDia);
        } catch (error) {
            console.error('Error guardando:', error);
        }
    };

    if (cargando) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
                <p className="text-gray-500 mt-2">Cargando horarios...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4">
                📅 Horarios de {profesionalNombre} por día
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Panel izquierdo: Selector de días */}
                <div className="md:col-span-1 space-y-2">
                    <h4 className="font-medium text-gray-700 mb-2">Días de la semana</h4>
                    {dias.map(dia => {
                        const cantidadHoras = horariosPorDia[dia.id]?.length || 0;
                        return (
                            <button
                                key={dia.id}
                                onClick={() => handleDiaChange(dia.id)}
                                className={`
                                    w-full text-left px-4 py-3 rounded-lg transition-all
                                    ${diaSeleccionado === dia.id 
                                        ? 'bg-amber-600 text-white shadow-md' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                                `}
                            >
                                <div className="flex justify-between items-center">
                                    <span>{dia.nombre}</span>
                                    {cantidadHoras > 0 && (
                                        <span className={`
                                            text-xs px-2 py-1 rounded-full
                                            ${diaSeleccionado === dia.id 
                                                ? 'bg-amber-500 text-white' 
                                                : 'bg-gray-300 text-gray-700'}
                                        `}>
                                            {cantidadHoras} hs
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                {/* Panel derecho: Horas para el día seleccionado */}
                <div className="md:col-span-3">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-700">
                            Horas para {dias.find(d => d.id === diaSeleccionado)?.nombre}
                            {horasDisponibles.length > 0 && (
                                <span className="ml-2 text-sm text-amber-600">
                                    ({horasDisponibles.length} horarios)
                                </span>
                            )}
                        </h4>
                        
                        <div className="flex gap-2">
                            <button
                                onClick={toggleTodasLasHoras}
                                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                            >
                                {horasDisponibles.length === todasLasHoras.length ? 'Quitar todas' : 'Agregar todas'}
                            </button>
                            <button
                                onClick={limpiarDia}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                            >
                                Limpiar día
                            </button>
                        </div>
                    </div>
                    
                    {/* Selector para copiar horarios de otro día */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center gap-2">
                        <span className="text-sm text-gray-600">Copiar horarios de:</span>
                        <select
                            onChange={(e) => copiarHorarios(e.target.value)}
                            className="border rounded-lg px-2 py-1 text-sm"
                            value=""
                        >
                            <option value="">Seleccionar día</option>
                            {dias
                                .filter(d => d.id !== diaSeleccionado)
                                .map(dia => (
                                    <option key={dia.id} value={dia.id}>
                                        {dia.nombre} ({horariosPorDia[dia.id]?.length || 0} hs)
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    {/* Descansos / almuerzo */}
                    <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <h5 className="font-medium text-amber-800 mb-3">Descansos / almuerzo</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mb-3">
                            <input
                                type="time"
                                value={nuevoDescanso.inicio}
                                onChange={(e) => setNuevoDescanso({ ...nuevoDescanso, inicio: e.target.value })}
                                className="border rounded-lg px-3 py-2 text-sm"
                            />
                            <input
                                type="time"
                                value={nuevoDescanso.fin}
                                onChange={(e) => setNuevoDescanso({ ...nuevoDescanso, fin: e.target.value })}
                                className="border rounded-lg px-3 py-2 text-sm"
                            />
                            <button
                                type="button"
                                onClick={agregarDescanso}
                                className="bg-amber-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-amber-700"
                            >
                                Agregar
                            </button>
                        </div>

                        <div className="space-y-2">
                            {(descansosPorDia[diaSeleccionado] || []).length === 0 ? (
                                <p className="text-xs text-amber-700">Sin descansos para este dÃ­a.</p>
                            ) : (
                                (descansosPorDia[diaSeleccionado] || []).map((descanso, index) => (
                                    <div key={`${descanso.inicio}-${descanso.fin}-${index}`} className="flex justify-between items-center bg-white border border-amber-100 rounded-lg px-3 py-2 text-sm">
                                        <span className="text-gray-700">{descanso.inicio} - {descanso.fin}</span>
                                        <button
                                            type="button"
                                            onClick={() => eliminarDescanso(index)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    
                    {/* Grilla de horas */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-96 overflow-y-auto p-2 border rounded-lg">
                        {todasLasHoras.map(hora => {
                            const activa = horasDisponibles.includes(hora.indice);
                            return (
                                <button
                                    key={hora.indice}
                                    onClick={() => toggleHora(hora.indice)}
                                    className={`
                                        px-2 py-1 text-xs font-medium rounded transition-all
                                        ${activa 
                                            ? 'bg-amber-600 text-white shadow-md hover:bg-amber-700' 
                                            : 'bg-white border border-gray-300 text-gray-700 hover:border-amber-400 hover:bg-amber-50'}
                                    `}
                                >
                                    {hora.legible}
                                </button>
                            );
                        })}
                    </div>
                    
                    <p className="text-xs text-gray-500 mt-2">
                        ⏰ Horarios cada 30 minutos. Seleccioná las horas en las que {profesionalNombre} trabaja este día.
                    </p>
                </div>
            </div>
            
            {/* Resumen semanal */}
            <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-3">Resumen semanal:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {dias.map(dia => {
                        const cantidad = horariosPorDia[dia.id]?.length || 0;
                        return (
                            <div key={dia.id} className="text-center p-2 bg-gray-50 rounded-lg">
                                <div className="text-xs text-gray-500">{dia.nombre.substring(0, 3)}</div>
                                <div className={`font-bold ${cantidad > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                    {cantidad} hs
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Botones de acción */}
            <div className="flex justify-end gap-3 mt-6">
                <button
                    onClick={onCancelar}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleGuardar}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                    Guardar Horarios
                </button>
            </div>
        </div>
    );
}
