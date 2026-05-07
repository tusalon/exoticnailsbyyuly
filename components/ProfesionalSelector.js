// components/ProfesionalSelector.js - selector compatible con multiples servicios

function ProfesionalSelector({ onSelect, selectedProfesional, selectedService }) {
    const [profesionales, setProfesionales] = React.useState([]);
    const [profesionalesPorServicio, setProfesionalesPorServicio] = React.useState({});
    const [cargando, setCargando] = React.useState(true);
    const [todosProfesionales, setTodosProfesionales] = React.useState([]);

    const getSelectedServices = () => {
        if (!selectedService) return [];
        return Array.isArray(selectedService.items) ? selectedService.items : [selectedService];
    };

    const serviciosSeleccionados = getSelectedServices();
    const esMultiServicio = serviciosSeleccionados.length > 1;
    const asignacionesActuales = selectedProfesional?.assignments || [];

    React.useEffect(() => {
        cargarTodosProfesionales();
    }, []);

    React.useEffect(() => {
        if (todosProfesionales.length > 0) {
            filtrarPorServicio();
        }
    }, [selectedService, todosProfesionales]);

    const cargarTodosProfesionales = async () => {
        setCargando(true);
        try {
            if (window.salonProfesionales) {
                const activos = await window.salonProfesionales.getAll(true);
                setTodosProfesionales(activos || []);
                filtrarPorServicio(activos || []);
            }
        } catch (error) {
            console.error('Error cargando profesionales:', error);
        } finally {
            setCargando(false);
        }
    };

    const filtrarPorServicio = async (profesionalesList = todosProfesionales) => {
        if (!selectedService) {
            setProfesionales(profesionalesList);
            setProfesionalesPorServicio({});
            return;
        }

        try {
            if (window.getProfesionalesPorServicio) {
                const servicios = getSelectedServices();
                const listasPorServicio = await Promise.all(
                    servicios.map(servicio => window.getProfesionalesPorServicio(servicio.id))
                );

                const porServicio = {};
                servicios.forEach((servicio, index) => {
                    const ids = listasPorServicio[index].map(p => p.id);
                    porServicio[servicio.id] = profesionalesList.filter(p => ids.includes(p.id));
                });
                setProfesionalesPorServicio(porServicio);

                const idsComunes = listasPorServicio.reduce((idsComunesAcc, lista, index) => {
                    const idsActuales = lista.map(p => p.id);
                    if (index === 0) return idsActuales;
                    return idsComunesAcc.filter(id => idsActuales.includes(id));
                }, []);

                const filtrados = profesionalesList.filter(p => idsComunes.includes(p.id));
                setProfesionales(filtrados);

                if (!esMultiServicio && selectedProfesional && !filtrados.find(p => p.id === selectedProfesional.id)) {
                    onSelect(null);
                }
            } else {
                setProfesionales(profesionalesList);
            }
        } catch (error) {
            console.error('Error filtrando profesionales:', error);
            setProfesionales(profesionalesList);
        }
    };

    const seleccionarProfesionalUnico = (prof) => {
        if (esMultiServicio) {
            onSelect({
                ...prof,
                mode: 'single',
                assignments: serviciosSeleccionados.map(servicio => ({ servicio, profesional: prof }))
            });
        } else {
            onSelect(prof);
        }
    };

    const seleccionarProfesionalParaServicio = (servicio, prof) => {
        const siguientes = serviciosSeleccionados.map(s => {
            const existente = asignacionesActuales.find(a => String(a.servicio.id) === String(s.id));
            if (String(s.id) === String(servicio.id)) {
                return { servicio: s, profesional: prof };
            }
            return existente || { servicio: s, profesional: null };
        });

        const completas = siguientes.every(a => a.profesional);
        onSelect({
            id: 'multi-profesional',
            nombre: completas ? siguientes.map(a => a.profesional.nombre).join(' + ') : 'Seleccion pendiente',
            mode: 'multi',
            assignments: siguientes
        });
    };

    const profesionalAsignado = (servicio) => {
        return asignacionesActuales.find(a => String(a.servicio.id) === String(servicio.id))?.profesional || null;
    };

    const seleccionCompleta = () => {
        if (!selectedProfesional) return false;
        if (!esMultiServicio) return true;
        return selectedProfesional.assignments?.length === serviciosSeleccionados.length &&
            selectedProfesional.assignments.every(a => a.profesional);
    };

    if (cargando) {
        return (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">*</span>
                    2. Elige profesional
                </h2>
                <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-b-2 border-pink-500 rounded-full mx-auto"></div>
                    <p className="text-pink-400 mt-4">Cargando profesionales...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                <span className="text-2xl">*</span>
                2. Elige profesional
                {seleccionCompleta() && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2">
                        Seleccion lista
                    </span>
                )}
            </h2>

            {esMultiServicio && profesionales.length === 0 && (
                <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    No hay una sola profesional para todos los servicios. Elige una profesional para cada servicio y buscaremos un horario consecutivo.
                </div>
            )}

            {profesionales.length > 0 && (
                <div className="space-y-3">
                    <div className="text-xs text-pink-600 bg-pink-50 p-2 rounded-lg border border-pink-200">
                        Profesionales que pueden hacer todos los servicios seleccionados.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {profesionales.map(prof => (
                            <button
                                key={prof.id}
                                onClick={() => seleccionarProfesionalUnico(prof)}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${selectedProfesional?.mode !== 'multi' && selectedProfesional?.id === prof.id ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-300 shadow-lg' : 'border-pink-200 bg-white/80 hover:border-pink-400 hover:bg-pink-50/50'}`}
                            >
                                <div className="flex flex-col items-center text-center">
                                    <div className={`w-16 h-16 ${prof.color || 'bg-pink-500'} rounded-full flex items-center justify-center text-3xl mb-3 shadow-md ring-2 ring-pink-300/50`}>
                                        {prof.avatar || '*'}
                                    </div>
                                    <span className="font-bold text-pink-800 text-lg block">{prof.nombre}</span>
                                    <span className="text-sm text-pink-500 mt-1">{prof.especialidad}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {esMultiServicio && (
                <div className="space-y-3">
                    <div className="text-xs text-pink-600 bg-white p-3 rounded-lg border border-pink-200">
                        Tambien puedes repartir los servicios entre varias profesionales.
                    </div>
                    {serviciosSeleccionados.map(servicio => {
                        const opciones = profesionalesPorServicio[servicio.id] || [];
                        const asignada = profesionalAsignado(servicio);
                        return (
                            <div key={servicio.id} className="bg-white rounded-xl border border-pink-200 p-4 space-y-3">
                                <div className="flex justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-pink-800">{servicio.nombre}</p>
                                        <p className="text-xs text-pink-500">{servicio.duracion} min</p>
                                    </div>
                                    {asignada && <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full h-fit">{asignada.nombre}</span>}
                                </div>
                                {opciones.length === 0 ? (
                                    <p className="text-sm text-red-500">No hay profesionales asignadas a este servicio.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {opciones.map(prof => (
                                            <button
                                                key={prof.id}
                                                type="button"
                                                onClick={() => seleccionarProfesionalParaServicio(servicio, prof)}
                                                className={`p-3 rounded-lg border text-left ${asignada?.id === prof.id ? 'bg-pink-50 border-pink-500 ring-2 ring-pink-200' : 'bg-pink-50/40 border-pink-100 hover:border-pink-300'}`}
                                            >
                                                <div className="font-semibold text-pink-800">{prof.nombre}</div>
                                                <div className="text-xs text-pink-500">{prof.especialidad}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!esMultiServicio && profesionales.length === 0 && (
                <div className="text-center p-8 bg-pink-50 rounded-xl border border-pink-200">
                    <p className="text-pink-700 font-medium">No hay profesionales disponibles para este servicio</p>
                    <p className="text-sm text-pink-600 mt-1">El administrador debe asignar profesionales al servicio</p>
                </div>
            )}

            <div className="text-xs text-pink-500 bg-pink-50 p-3 rounded-lg border border-pink-200">
                Cada profesional tiene su propia agenda. Si eliges varias, buscaremos horarios consecutivos disponibles.
            </div>
        </div>
    );
}