// components/ServiceSelectionTabs.js - selector por categorias

const CLIENT_SERVICE_CATEGORIES = [
    { id: 'todos', label: 'Todos', icono: '📋' },
    { id: 'manicura', label: 'Manicura', icono: '💅' },
    { id: 'pedicura', label: 'Pedicura', icono: '🦶' },
    { id: 'faciales', label: 'Faciales', icono: '✨' },
    { id: 'barberia', label: 'Barbería', icono: '💈' },
    { id: 'cejas', label: 'Cejas', icono: '👁️' },
    { id: 'combos', label: 'Combos', icono: '🎁' },
    { id: 'otros', label: 'Otros', icono: '⭐' },
];

function normalizarCategoriaServicio(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function inferirCategoriaCliente(servicio) {
    if (servicio?.categoria) return servicio.categoria;

    const texto = normalizarCategoriaServicio(`${servicio?.nombre || ''} ${servicio?.descripcion || ''}`);
    if (texto.includes('pedic') || texto.includes('pie')) return 'pedicura';
    if (texto.includes('facial') || texto.includes('limpieza') || texto.includes('dermap')) return 'faciales';
    if (texto.includes('barba') || texto.includes('corte') || texto.includes('barber')) return 'barberia';
    if (texto.includes('ceja') || texto.includes('pestana') || texto.includes('pestaña')) return 'cejas';
    if (texto.includes('combo') || texto.includes('paquete')) return 'combos';
    if (texto.includes('manic') || texto.includes('una') || texto.includes('uña') || texto.includes('gel') || texto.includes('polygel') || texto.includes('builder')) return 'manicura';
    return 'otros';
}

function getCategoriaCliente(servicio) {
    const categoria = inferirCategoriaCliente(servicio);
    return CLIENT_SERVICE_CATEGORIES.find(c => c.id === categoria) || CLIENT_SERVICE_CATEGORIES.find(c => c.id === 'otros');
}

function ServiceSelection({ onSelect, selectedService }) {
    const [services, setServices] = React.useState([]);
    const [cargando, setCargando] = React.useState(true);
    const [categoriaActiva, setCategoriaActiva] = React.useState('todos');

    React.useEffect(() => {
        cargarServicios();

        const handleActualizacion = () => cargarServicios();
        window.addEventListener('serviciosActualizados', handleActualizacion);

        return () => window.removeEventListener('serviciosActualizados', handleActualizacion);
    }, []);

    const cargarServicios = async () => {
        setCargando(true);
        try {
            if (window.salonServicios) {
                const serviciosActivos = await window.salonServicios.getAll(true);
                setServices(serviciosActivos || []);
            }
        } catch (error) {
            console.error('Error cargando servicios:', error);
            setServices([]);
        } finally {
            setCargando(false);
        }
    };

    const categoriasVisibles = React.useMemo(() => {
        return CLIENT_SERVICE_CATEGORIES.filter(categoria => {
            if (categoria.id === 'todos') return services.length > 0;
            return services.some(servicio => inferirCategoriaCliente(servicio) === categoria.id);
        });
    }, [services]);

    const serviciosFiltrados = React.useMemo(() => {
        if (categoriaActiva === 'todos') return services;
        return services.filter(servicio => inferirCategoriaCliente(servicio) === categoriaActiva);
    }, [services, categoriaActiva]);

    const getIconoServicio = (service) => getCategoriaCliente(service).icono;

    if (cargando) {
        return (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    1. Elige tu servicio
                </h2>
                <div className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-b-2 border-pink-500 rounded-full mx-auto"></div>
                    <p className="text-pink-400 mt-4">Cargando servicios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    1. Elige tu servicio
                    {selectedService && (
                        <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-1">
                            Seleccionado
                        </span>
                    )}
                </h2>
            </div>

            {services.length === 0 ? (
                <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-pink-200">
                    <p className="text-pink-500">No hay servicios disponibles</p>
                    <p className="text-xs text-pink-400 mt-2">La administradora debe cargar servicios primero</p>
                </div>
            ) : (
                <>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                        {categoriasVisibles.map(categoria => (
                            <button
                                key={categoria.id}
                                onClick={() => setCategoriaActiva(categoria.id)}
                                className={`shrink-0 px-3 py-2 rounded-full border text-sm font-semibold transition ${
                                    categoriaActiva === categoria.id
                                        ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                                        : 'bg-white/85 text-pink-700 border-pink-200 hover:bg-pink-50'
                                }`}
                            >
                                <span className="mr-1">{categoria.icono}</span>
                                {categoria.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {serviciosFiltrados.map(service => {
                            const categoria = getCategoriaCliente(service);
                            return (
                                <button
                                    key={service.id}
                                    onClick={() => onSelect(service)}
                                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 transform hover:scale-[1.02] ${
                                        selectedService?.id === service.id
                                            ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-300 shadow-md'
                                            : 'border-pink-200 bg-white/80 backdrop-blur-sm hover:border-pink-400 hover:bg-pink-50/50 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{getIconoServicio(service)}</span>
                                                <div className="min-w-0">
                                                    <span className="font-medium text-pink-800 text-lg block">{service.nombre}</span>
                                                    <span className="text-xs text-pink-500">{categoria.label}</span>
                                                </div>
                                            </div>
                                            {service.descripcion && (
                                                <p className="text-sm text-pink-600/70 mt-1 ml-8">{service.descripcion}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                                            <span className="text-pink-600 font-bold text-lg">${service.precio}</span>
                                            <span className="flex items-center text-pink-500 text-xs bg-pink-50 px-2 py-1 rounded-full border border-pink-200">
                                                {service.duracion} min
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
