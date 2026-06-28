// components/admin/HorariosExcepcionPanel.js

function HorariosExcepcionPanel({ profesionalId, profesionalNombre, onCerrar }) {
    const dias = [
        { id: 'lunes', nombre: 'Lunes' },
        { id: 'martes', nombre: 'Martes' },
        { id: 'miercoles', nombre: 'Miércoles' },
        { id: 'jueves', nombre: 'Jueves' },
        { id: 'viernes', nombre: 'Viernes' },
        { id: 'sabado', nombre: 'Sábado' },
        { id: 'domingo', nombre: 'Domingo' }
    ];

    const [excepciones, setExcepciones] = React.useState([]);
    const [cargando, setCargando] = React.useState(false);
    const [modoFormulario, setModoFormulario] = React.useState(false);
    const [editando, setEditando] = React.useState(null);
    const [error, setError] = React.useState('');
    const [reservasAviso, setReservasAviso] = React.useState([]);
    const [diaSeleccionado, setDiaSeleccionado] = React.useState('lunes');
    const [form, setForm] = React.useState({
        fechaInicio: '',
        fechaFin: '',
        horariosPorDia: {},
        descansosPorDia: {}
    });
    const [nuevoDescanso, setNuevoDescanso] = React.useState({ inicio: '13:00', fin: '14:00' });

    const formatearHora = (hora) => window.formatTo12Hour ? window.formatTo12Hour(hora) : hora;
    const todasLasHoras = React.useMemo(() => {
        const horas = [];
        for (let i = 0; i < 48; i++) {
            const hora = Math.floor(i / 2);
            const minutos = i % 2 === 0 ? '00' : '30';
            const valor = `${String(hora).padStart(2, '0')}:${minutos}`;
            horas.push({ indice: i, valor, label: formatearHora(valor) });
        }
        return horas;
    }, []);

    React.useEffect(() => {
        cargarExcepciones();
    }, [profesionalId]);

    React.useEffect(() => {
        cargarReservasEnRango();
    }, [form.fechaInicio, form.fechaFin, profesionalId]);

    const inicializarDias = (horarios = {}, descansos = {}) => {
        const horariosIniciales = {};
        const descansosIniciales = {};
        dias.forEach(dia => {
            horariosIniciales[dia.id] = horarios[dia.id] || [];
            descansosIniciales[dia.id] = descansos[dia.id] || [];
        });
        return { horariosIniciales, descansosIniciales };
    };

    const cargarExcepciones = async () => {
        if (!profesionalId) return;
        setCargando(true);
        try {
            const data = await window.salonConfig.getExcepcionesProfesional(profesionalId);
            setExcepciones(data || []);
        } catch (err) {
            setError(err.message || 'No se pudieron cargar las excepciones.');
        } finally {
            setCargando(false);
        }
    };

    const abrirNuevo = () => {
        const base = inicializarDias();
        setEditando(null);
        setError('');
        setReservasAviso([]);
        setDiaSeleccionado('lunes');
        setForm({
            fechaInicio: '',
            fechaFin: '',
            horariosPorDia: base.horariosIniciales,
            descansosPorDia: base.descansosIniciales
        });
        setModoFormulario(true);
    };

    const abrirEditar = (excepcion) => {
        const base = inicializarDias(excepcion.horarios_por_dia || {}, excepcion.descansos_por_dia || {});
        setEditando(excepcion);
        setError('');
        setDiaSeleccionado('lunes');
        setForm({
            fechaInicio: excepcion.fecha_inicio,
            fechaFin: excepcion.fecha_fin,
            horariosPorDia: base.horariosIniciales,
            descansosPorDia: base.descansosIniciales
        });
        setModoFormulario(true);
    };

    const cargarReservasEnRango = async () => {
        if (!form.fechaInicio || !form.fechaFin || form.fechaFin < form.fechaInicio || !profesionalId) {
            setReservasAviso([]);
            return;
        }

        try {
            const negocioId = window.getNegocioIdFromConfig ? window.getNegocioIdFromConfig() : localStorage.getItem('negocioId');
            const url = `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&profesional_id=eq.${profesionalId}&fecha=gte.${form.fechaInicio}&fecha=lte.${form.fechaFin}&estado=eq.Reservado&select=fecha,hora_inicio,cliente_nombre&order=fecha.asc,hora_inicio.asc`;
            const response = await fetch(url, {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            });
            if (!response.ok) {
                setReservasAviso([]);
                return;
            }
            setReservasAviso(await response.json());
        } catch {
            setReservasAviso([]);
        }
    };

    const toggleHora = (indice) => {
        const actuales = form.horariosPorDia[diaSeleccionado] || [];
        const nuevas = actuales.includes(indice)
            ? actuales.filter(item => item !== indice)
            : [...actuales, indice].sort((a, b) => a - b);

        setForm({
            ...form,
            horariosPorDia: {
                ...form.horariosPorDia,
                [diaSeleccionado]: nuevas
            }
        });
    };

    const limpiarDia = () => {
        setForm({
            ...form,
            horariosPorDia: {
                ...form.horariosPorDia,
                [diaSeleccionado]: []
            }
        });
    };

    const copiarDia = (desdeDia) => {
        if (!desdeDia) return;
        setForm({
            ...form,
            horariosPorDia: {
                ...form.horariosPorDia,
                [diaSeleccionado]: [...(form.horariosPorDia[desdeDia] || [])]
            },
            descansosPorDia: {
                ...form.descansosPorDia,
                [diaSeleccionado]: [...(form.descansosPorDia[desdeDia] || [])]
            }
        });
    };

    const agregarDescanso = () => {
        if (!nuevoDescanso.inicio || !nuevoDescanso.fin || nuevoDescanso.inicio >= nuevoDescanso.fin) {
            setError('El descanso debe tener una hora final mayor que la inicial.');
            return;
        }
        const actuales = form.descansosPorDia[diaSeleccionado] || [];
        setForm({
            ...form,
            descansosPorDia: {
                ...form.descansosPorDia,
                [diaSeleccionado]: [...actuales, { ...nuevoDescanso }]
            }
        });
        setError('');
    };

    const eliminarDescanso = (index) => {
        const actuales = form.descansosPorDia[diaSeleccionado] || [];
        setForm({
            ...form,
            descansosPorDia: {
                ...form.descansosPorDia,
                [diaSeleccionado]: actuales.filter((_, i) => i !== index)
            }
        });
    };

    const guardar = async () => {
        setError('');
        if (!form.fechaInicio || !form.fechaFin) {
            setError('Selecciona fecha de inicio y fecha de fin.');
            return;
        }
        if (form.fechaFin < form.fechaInicio) {
            setError('La fecha final no puede ser anterior a la fecha inicial.');
            return;
        }

        try {
            await window.salonConfig.guardarExcepcion(profesionalId, {
                id: editando?.id,
                fechaInicio: form.fechaInicio,
                fechaFin: form.fechaFin,
                horariosPorDia: form.horariosPorDia,
                descansosPorDia: form.descansosPorDia
            });
            await cargarExcepciones();
            setModoFormulario(false);
            setEditando(null);
        } catch (err) {
            setError(err.message || 'No se pudo guardar la excepción.');
        }
    };

    const eliminar = async (excepcion) => {
        if (!confirm(`¿Eliminar la excepción del ${excepcion.fecha_inicio} al ${excepcion.fecha_fin}?`)) return;
        try {
            await window.salonConfig.eliminarExcepcion(excepcion.id);
            await cargarExcepciones();
        } catch (err) {
            setError(err.message || 'No se pudo eliminar la excepción.');
        }
    };

    const resumenDias = (excepcion) => {
        const horarios = excepcion.horarios_por_dia || {};
        const activos = dias
            .filter(dia => (horarios[dia.id] || []).length > 0)
            .map(dia => `${dia.nombre}: ${(horarios[dia.id] || []).length}`);
        return activos.length ? activos.join(' · ') : 'Sin horarios configurados';
    };

    if (modoFormulario) {
        const horasDia = form.horariosPorDia[diaSeleccionado] || [];
        const descansosDia = form.descansosPorDia[diaSeleccionado] || [];

        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <h3 className="font-bold text-lg text-amber-900">
                            {editando ? 'Editar excepción' : 'Añadir excepción'}
                        </h3>
                        <p className="text-sm text-amber-800">{profesionalNombre}</p>
                    </div>
                    <button onClick={() => setModoFormulario(false)} className="text-gray-500 hover:text-gray-800">Cerrar</button>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <label className="block">
                        <span className="text-sm font-semibold text-gray-700">Fecha inicio</span>
                        <input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" />
                    </label>
                    <label className="block">
                        <span className="text-sm font-semibold text-gray-700">Fecha fin</span>
                        <input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} className="w-full border rounded-lg px-3 py-2 mt-1" />
                    </label>
                </div>

                {reservasAviso.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-4 text-sm text-yellow-900">
                        <p className="font-bold">Hay {reservasAviso.length} reservas en este rango. Revísalas antes de continuar.</p>
                        <div className="mt-2 space-y-1 max-h-32 overflow-auto">
                            {reservasAviso.map((reserva, index) => (
                                <p key={index}>{reserva.fecha} · {formatearHora(reserva.hora_inicio)} · {reserva.cliente_nombre || 'Cliente'}</p>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        {dias.map(dia => (
                            <button
                                key={dia.id}
                                onClick={() => setDiaSeleccionado(dia.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg ${diaSeleccionado === dia.id ? 'bg-amber-600 text-white' : 'bg-white border text-gray-700'}`}
                            >
                                {dia.nombre}
                                {(form.horariosPorDia[dia.id] || []).length > 0 && (
                                    <span className="float-right text-xs">{(form.horariosPorDia[dia.id] || []).length}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="md:col-span-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <h4 className="font-semibold">Horarios de {dias.find(d => d.id === diaSeleccionado)?.nombre}</h4>
                            <div className="flex gap-2">
                                <select onChange={(e) => copiarDia(e.target.value)} value="" className="border rounded-lg px-2 py-1 text-sm">
                                    <option value="">Copiar de...</option>
                                    {dias.filter(d => d.id !== diaSeleccionado).map(dia => <option key={dia.id} value={dia.id}>{dia.nombre}</option>)}
                                </select>
                                <button onClick={limpiarDia} className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-700">Limpiar</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-auto p-2 bg-white rounded-lg border">
                            {todasLasHoras.map(hora => (
                                <button
                                    key={hora.indice}
                                    onClick={() => toggleHora(hora.indice)}
                                    className={`px-2 py-2 rounded-lg text-sm ${horasDia.includes(hora.indice) ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    {hora.label}
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 bg-white border rounded-lg p-3">
                            <h4 className="font-semibold mb-2">Descansos del día</h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                                <input type="time" value={nuevoDescanso.inicio} onChange={(e) => setNuevoDescanso({ ...nuevoDescanso, inicio: e.target.value })} className="border rounded-lg px-2 py-1" />
                                <input type="time" value={nuevoDescanso.fin} onChange={(e) => setNuevoDescanso({ ...nuevoDescanso, fin: e.target.value })} className="border rounded-lg px-2 py-1" />
                                <button onClick={agregarDescanso} className="bg-amber-600 text-white rounded-lg px-3 py-1">Añadir descanso</button>
                            </div>
                            {descansosDia.length === 0 ? (
                                <p className="text-sm text-gray-500">Sin descansos.</p>
                            ) : descansosDia.map((descanso, index) => (
                                <div key={index} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg px-3 py-2 mb-2">
                                    <span>{formatearHora(descanso.inicio)} - {formatearHora(descanso.fin)}</span>
                                    <button onClick={() => eliminarDescanso(index)} className="text-red-600">Eliminar</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => setModoFormulario(false)} className="px-4 py-2 rounded-lg border">Cancelar</button>
                    <button onClick={guardar} className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700">Guardar excepción</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-amber-200 rounded-xl p-4 mt-6">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                    <h3 className="font-bold text-lg">Horarios de excepción</h3>
                    <p className="text-sm text-gray-600">Rangos temporales para {profesionalNombre}.</p>
                </div>
                <button onClick={abrirNuevo} className="bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700">
                    + Añadir excepción
                </button>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
            {cargando ? (
                <p className="text-gray-500">Cargando excepciones...</p>
            ) : excepciones.length === 0 ? (
                <p className="text-sm text-gray-500">No hay horarios de excepción configurados.</p>
            ) : (
                <div className="space-y-3">
                    {excepciones.map(excepcion => (
                        <div key={excepcion.id} className="border rounded-lg p-3">
                            <div className="flex flex-wrap justify-between gap-2">
                                <div>
                                    <p className="font-semibold">{excepcion.fecha_inicio} - {excepcion.fecha_fin}</p>
                                    <p className="text-sm text-gray-600">{resumenDias(excepcion)}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => abrirEditar(excepcion)} className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700">Editar</button>
                                    <button onClick={() => eliminar(excepcion)} className="px-3 py-1 rounded-lg bg-red-100 text-red-700">Eliminar</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
