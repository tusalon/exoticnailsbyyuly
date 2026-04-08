// components/admin/ConfigPanel.js - Versión con Fechas Libres y Días Cerrados Globales
// SIN DEPENDENCIA DE dias-cerrados.js

function ConfigPanel({ profesionalId, modoRestringido }) {
    const [profesionales, setProfesionales] = React.useState([]);
    const [profesionalSeleccionado, setProfesionalSeleccionado] = React.useState(null);
    const [mostrarEditorPorDia, setMostrarEditorPorDia] = React.useState(false);
    const [configGlobal, setConfigGlobal] = React.useState({
        duracion_turnos: 60,
        intervalo_entre_turnos: 0,
        modo_24h: false,
        max_antelacion_dias: 30
    });
    const [cargando, setCargando] = React.useState(true);
    const [nombreNegocio, setNombreNegocio] = React.useState('');

    React.useEffect(() => {
        if (window.getNombreNegocio) {
            window.getNombreNegocio().then(nombre => {
                setNombreNegocio(nombre);
            });
        }
    }, []);

    const opcionesDuracion = [
        { value: 30, label: '30 min', icon: '⏱️' },
        { value: 45, label: '45 min', icon: '⏰' },
        { value: 60, label: '60 min', icon: '⌛' },
        { value: 75, label: '75 min', icon: '⏳' },
        { value: 90, label: '90 min', icon: '🕐' },
        { value: 120, label: '120 min', icon: '🕑' }
    ];

    const opcionesAntelacion = [
        { value: 3, label: '3 días', icon: '🔜' },
        { value: 4, label: '4 días', icon: '📅' },
        { value: 5, label: '5 días', icon: '📆' },
        { value: 6, label: '6 días', icon: '🗓️' },
        { value: 7, label: '7 días', icon: '📆' },
        { value: 15, label: '15 días', icon: '📅' },
        { value: 30, label: '30 días', icon: '📅' },
        { value: 60, label: '60 días', icon: '📆' }
    ];

    React.useEffect(() => {
        cargarDatos();
    }, []);

    React.useEffect(() => {
        if (modoRestringido && profesionalId) {
            setProfesionalSeleccionado(profesionalId);
        }
    }, [modoRestringido, profesionalId]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            if (window.salonProfesionales) {
                const lista = await window.salonProfesionales.getAll(true);
                setProfesionales(lista || []);
                
                if (!modoRestringido && lista && lista.length > 0) {
                    setProfesionalSeleccionado(lista[0].id);
                }
            }
            
            if (!modoRestringido && window.salonConfig) {
                const config = await window.salonConfig.get();
                setConfigGlobal(config || {
                    duracion_turnos: 60,
                    intervalo_entre_turnos: 0,
                    modo_24h: false,
                    max_antelacion_dias: 30
                });
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setCargando(false);
        }
    };

    const abrirEditorPorDia = () => {
        if (!profesionalSeleccionado) {
            alert('Seleccioná un profesional primero');
            return;
        }
        setMostrarEditorPorDia(true);
    };

    const handleGuardarConfigGlobal = async () => {
        if (modoRestringido) return;
        
        try {
            await window.salonConfig.guardar(configGlobal);
            alert('✅ Configuración global guardada');
        } catch (error) {
            alert('Error al guardar configuración global');
        }
    };

    if (cargando) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <h2 className="text-xl font-bold mb-6">
                {modoRestringido ? '⚙️ Mi Configuración' : `⚙️ Configuración de ${nombreNegocio}`}
            </h2>
            
            {!modoRestringido && (
                <>
                    {/* CONFIGURACIÓN GENERAL */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                        <h3 className="font-semibold text-lg mb-4">⚙️ Configuración General</h3>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Duración por defecto (min)
                                </label>
                                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                                    {opcionesDuracion.map(opcion => (
                                        <button
                                            key={opcion.value}
                                            type="button"
                                            onClick={() => setConfigGlobal({
                                                ...configGlobal, 
                                                duracion_turnos: opcion.value
                                            })}
                                            className={`
                                                py-2 px-1 rounded-lg text-xs font-medium transition-all flex flex-col items-center
                                                ${configGlobal.duracion_turnos === opcion.value
                                                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:border-amber-400 hover:bg-amber-50'}
                                            `}
                                        >
                                            <span className="text-lg mb-1">{opcion.icon}</span>
                                            <span>{opcion.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Intervalo entre turnos (min)
                                </label>
                                <input
                                    type="number"
                                    value={configGlobal.intervalo_entre_turnos || 0}
                                    onChange={(e) => setConfigGlobal({
                                        ...configGlobal, 
                                        intervalo_entre_turnos: parseInt(e.target.value) || 0
                                    })}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                    min="0"
                                    step="5"
                                />
                            </div>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Antelación máxima para reservar
                            </label>
                            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                                {opcionesAntelacion.map(opcion => (
                                    <button
                                        key={opcion.value}
                                        type="button"
                                        onClick={() => setConfigGlobal({
                                            ...configGlobal, 
                                            max_antelacion_dias: opcion.value
                                        })}
                                        className={`
                                            py-2 px-1 rounded-lg text-xs font-medium transition-all flex flex-col items-center
                                            ${configGlobal.max_antelacion_dias === opcion.value
                                                ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:border-amber-400 hover:bg-amber-50'}
                                        `}
                                    >
                                        <span className="text-lg mb-1">{opcion.icon}</span>
                                        <span>{opcion.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="mb-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={configGlobal.modo_24h || false}
                                    onChange={(e) => setConfigGlobal({
                                        ...configGlobal, 
                                        modo_24h: e.target.checked
                                    })}
                                    className="w-5 h-5 text-amber-600"
                                />
                                <span className="text-sm text-gray-700">Modo 24 horas</span>
                            </label>
                        </div>
                        
                        <button
                            onClick={handleGuardarConfigGlobal}
                            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition text-sm"
                        >
                            Guardar Configuración Global
                        </button>
                    </div>

                    {/* NUEVO: DÍAS CERRADOS GLOBALES - SIN DEPENDENCIA EXTERNA */}
                    <DiasCerradosGlobalesPanel />
                </>
            )}
            
            {/* SECCIÓN DEL PROFESIONAL */}
            <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm mt-6">
                <h3 className="font-semibold text-lg mb-4">👥 Configuración del Profesional</h3>
                
                {!modoRestringido && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Seleccionar Profesional
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={profesionalSeleccionado || ''}
                                onChange={(e) => setProfesionalSeleccionado(parseInt(e.target.value))}
                                className="flex-1 border rounded-lg px-3 py-2"
                            >
                                <option value="">Seleccione un profesional</option>
                                {profesionales.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre}</option>
                                ))}
                            </select>
                            
                            <button
                                onClick={abrirEditorPorDia}
                                disabled={!profesionalSeleccionado}
                                className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Horarios por día
                            </button>
                        </div>
                        {profesionales.length === 0 && !cargando && (
                            <p className="text-sm text-amber-600 mt-2">
                                ⚠️ No hay profesionales activos.
                            </p>
                        )}
                    </div>
                )}
                
                {modoRestringido && profesionalId && (
                    <div className="mb-4">
                        <button
                            onClick={abrirEditorPorDia}
                            className="w-full bg-amber-600 text-white px-4 py-3 rounded-lg hover:bg-amber-700 font-medium"
                        >
                            Configurar mis horarios por día
                        </button>
                    </div>
                )}

                {/* PANEL DE DÍAS LIBRES INDIVIDUALES */}
                {profesionalSeleccionado && (
                    <FechasLibresPanel 
                        profesionalId={profesionalSeleccionado} 
                        profesionales={profesionales} 
                        onActualizar={cargarDatos} 
                    />
                )}
            </div>
            
            {/* Modal para editor por día */}
            {mostrarEditorPorDia && profesionalSeleccionado && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                        <HorariosPorDiaPanel
                            profesionalId={profesionalSeleccionado}
                            profesionalNombre={profesionales.find(p => p.id === profesionalSeleccionado)?.nombre || 'Profesional'}
                            onGuardar={(horarios) => {
                                setMostrarEditorPorDia(false);
                            }}
                            onCancelar={() => setMostrarEditorPorDia(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ==========================================
// COMPONENTE: FECHAS LIBRES POR PROFESIONAL
// ==========================================
function FechasLibresPanel({ profesionalId, profesionales, onActualizar }) {
    const [fechas, setFechas] = React.useState([]);
    const [nuevaFecha, setNuevaFecha] = React.useState('');
    const profesional = profesionales.find(p => p.id === profesionalId);

    React.useEffect(() => {
        if (profesional) {
            setFechas(profesional.fechas_libres || []);
        }
    }, [profesionalId, profesional]);

    const handleAgregar = async () => {
        if (!nuevaFecha) return;
        if (fechas.includes(nuevaFecha)) {
            alert('Esta fecha ya está en la lista de días libres');
            return;
        }
        const nuevasFechas = [...fechas, nuevaFecha].sort();
        setFechas(nuevasFechas);
        setNuevaFecha('');
        await guardarFechas(nuevasFechas);
    };

    const handleEliminar = async (fechaAEliminar) => {
        const nuevasFechas = fechas.filter(f => f !== fechaAEliminar);
        setFechas(nuevasFechas);
        await guardarFechas(nuevasFechas);
    };

    const guardarFechas = async (nuevasFechas) => {
        try {
            if (window.salonProfesionales && window.salonProfesionales.actualizar) {
                await window.salonProfesionales.actualizar(profesionalId, { fechas_libres: nuevasFechas });
                if (onActualizar) onActualizar(); 
            }
        } catch (error) {
            console.error("Error al guardar fechas libres:", error);
            alert("Error al guardar la fecha.");
        }
    };

    return (
        <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
            <h3 className="font-semibold text-lg text-orange-800 mb-2 flex items-center gap-2">
                ✈️ Días Libres / Vacaciones de {profesional?.nombre}
            </h3>
            <p className="text-sm text-orange-600 mb-4">
                El profesional NO recibirá turnos estos días.
            </p>

            <div className="flex flex-wrap sm:flex-nowrap gap-2 mb-4">
                <input
                    type="date"
                    value={nuevaFecha}
                    onChange={(e) => setNuevaFecha(e.target.value)}
                    className="border border-orange-200 rounded-lg px-3 py-2 text-sm flex-1 focus:ring-orange-500"
                />
                <button
                    onClick={handleAgregar}
                    disabled={!nuevaFecha}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
                >
                    + Agregar
                </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {fechas.length === 0 ? (
                    <p className="text-sm text-gray-500 italic bg-white p-3 rounded text-center border">
                        No hay días libres programados.
                    </p>
                ) : (
                    fechas.map(fecha => (
                        <div key={fecha} className="flex justify-between items-center bg-white p-2 rounded border border-orange-100 shadow-sm">
                            <span className="font-medium text-gray-700 ml-2">
                                {window.formatFechaCompleta ? window.formatFechaCompleta(fecha) : fecha}
                            </span>
                            <button 
                                onClick={() => handleEliminar(fecha)} 
                                className="text-red-500 hover:bg-red-50 px-3 py-1 rounded transition"
                            >
                                🗑️
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ==========================================
// COMPONENTE: DÍAS CERRADOS DEL LOCAL - SIN DEPENDENCIA EXTERNA
// ==========================================
function DiasCerradosGlobalesPanel() {
    const [dias, setDias] = React.useState([]);
    const [fecha, setFecha] = React.useState('');
    const [motivo, setMotivo] = React.useState('');
    const [cargando, setCargando] = React.useState(true);

    const getNegocioId = () => {
        const localId = localStorage.getItem('negocioId');
        if (localId) return localId;
        if (window.NEGOCIO_ID_POR_DEFECTO) return window.NEGOCIO_ID_POR_DEFECTO;
        if (typeof window.getNegocioId === 'function') return window.getNegocioId();
        return null;
    };

    const cargarDias = async () => {
        setCargando(true);
        try {
            const negocioId = getNegocioId();
            if (!negocioId || !window.SUPABASE_URL) {
                setCargando(false);
                return;
            }

            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/dias_cerrados?negocio_id=eq.${negocioId}&order=fecha.asc`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                // Filtrar solo los que son iguales o posteriores a hoy
                const hoy = new Date().toISOString().split('T')[0];
                const diasFuturos = (data || []).filter(d => d.fecha >= hoy);
                setDias(diasFuturos);
            }
        } catch (error) {
            console.error('Error cargando días cerrados:', error);
        } finally {
            setCargando(false);
        }
    };

    React.useEffect(() => {
        cargarDias();
        
        // Escuchar cambios en días cerrados
        const handleActualizacion = () => cargarDias();
        window.addEventListener('diasCerradosActualizados', handleActualizacion);
        
        return () => {
            window.removeEventListener('diasCerradosActualizados', handleActualizacion);
        };
    }, []);

    const handleAgregar = async () => {
        if (!fecha) {
            alert('Por favor, seleccioná una fecha.');
            return;
        }
        
        const negocioId = getNegocioId();
        if (!negocioId) {
            alert('Error: No se pudo identificar el negocio');
            return;
        }
        
        try {
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/dias_cerrados`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        negocio_id: negocioId,
                        fecha: fecha,
                        motivo: motivo || 'Cerrado por feriado/descanso'
                    })
                }
            );
            
            if (response.ok) {
                setFecha('');
                setMotivo('');
                cargarDias();
                // Disparar evento para actualizar otros componentes
                if (window.dispatchEvent) {
                    window.dispatchEvent(new Event('diasCerradosActualizados'));
                }
            } else {
                const error = await response.text();
                console.error('Error al agregar:', error);
                alert('Error al agregar el día cerrado. Verificá tu conexión.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al conectar con el servidor');
        }
    };

    const handleEliminar = async (id) => {
        if (!confirm('¿Seguro que querés volver a abrir el local este día?')) return;
        
        try {
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/dias_cerrados?id=eq.${id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            if (response.ok) {
                cargarDias();
                if (window.dispatchEvent) {
                    window.dispatchEvent(new Event('diasCerradosActualizados'));
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-lg text-red-800 mb-2 flex items-center gap-2">
                🚫 Días Cerrados del Local
            </h3>
            <p className="text-sm text-red-600 mb-4">
                El local completo estará cerrado estos días. <b>Ningún profesional</b> recibirá turnos.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 mb-4 bg-white p-3 rounded shadow-sm border border-red-100">
                <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm focus:ring-red-500"
                    min={new Date().toISOString().split('T')[0]}
                />
                <input
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo (ej: Feriado Nacional)"
                    className="border rounded-lg px-3 py-2 text-sm flex-1 focus:ring-red-500"
                />
                <button
                    onClick={handleAgregar}
                    disabled={!fecha}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                    Cerrar Local
                </button>
            </div>

            {cargando ? (
                <p className="text-sm text-gray-500 text-center py-2">Cargando...</p>
            ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {dias.length === 0 ? (
                        <p className="text-sm text-gray-500 italic bg-white p-3 rounded text-center border">
                            El local no tiene días de cierre global programados.
                        </p>
                    ) : (
                        dias.map(d => (
                            <div key={d.id} className="flex justify-between items-center bg-white p-3 rounded border border-red-100 shadow-sm">
                                <div>
                                    <p className="font-bold text-gray-800">
                                        {window.formatFechaCompleta ? window.formatFechaCompleta(d.fecha) : d.fecha}
                                    </p>
                                    <p className="text-xs text-gray-500">{d.motivo}</p>
                                </div>
                                <button
                                    onClick={() => handleEliminar(d.id)}
                                    className="text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded transition"
                                >
                                    Abrir Local
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}s