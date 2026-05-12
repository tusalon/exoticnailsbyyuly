// components/ServiceSelectionCategorias.js - selector cliente con categorias configurables

function normalizarCategoriaServicio(texto) {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function catId(categoria) {
    return categoria?.slug || categoria?.id || 'otros';
}

function catNombre(categoria) {
    return categoria?.nombre || categoria?.label || 'Otros';
}

function catIcono(categoria) {
    return categoria?.icono || '⭐';
}

function inferirCategoriaCliente(servicio, categorias = []) {
    if (servicio?.categoria) return servicio.categoria;

    const texto = normalizarCategoriaServicio(`${servicio?.nombre || ''} ${servicio?.descripcion || ''}`);
    if (texto.includes('pedic') || texto.includes('pie')) return 'pedicura';
    if (texto.includes('facial') || texto.includes('limpieza') || texto.includes('dermap')) return 'faciales';
    if (texto.includes('barba') || texto.includes('corte') || texto.includes('barber')) return 'barberia';
    if (texto.includes('ceja') || texto.includes('pestana')) return 'cejas';
    if (texto.includes('combo') || texto.includes('paquete')) return 'combos';
    if (texto.includes('manic') || texto.includes('una') || texto.includes('uña') || texto.includes('gel') || texto.includes('polygel') || texto.includes('builder')) return 'manicura';
    return categorias.some(c => catId(c) === 'otros') ? 'otros' : catId(categorias[0]);
}

function getCategoriaCliente(servicio, categorias = []) {
    const id = inferirCategoriaCliente(servicio, categorias);
    return categorias.find(c => catId(c) === id) || categorias.find(c => catId(c) === 'otros') || { id: 'otros', nombre: 'Otros', icono: '⭐' };
}

function ServiceSelection({ onSelect, selectedService }) {
    const [services, setServices] = React.useState([]);
    const [categorias, setCategorias] = React.useState(window.salonCategoriasServicios?.defaults || []);
    const [cargando, setCargando] = React.useState(true);
    const [categoriaActiva, setCategoriaActiva] = React.useState('todos');

    React.useEffect(() => {
        cargarDatos();

        const refresh = () => cargarDatos();
        window.addEventListener('serviciosActualizados', refresh);
        window.addEventListener('categoriasServiciosActualizadas', refresh);

        return () => {
            window.removeEventListener('serviciosActualizados', refresh);
            window.removeEventListener('categoriasServiciosActualizadas', refresh);
        };
    }, []);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [serviciosActivos, categoriasActivas] = await Promise.all([
                window.salonServicios?.getAll(true) || [],
                window.salonCategoriasServicios?.getAll(true) || []
            ]);
            setServices(serviciosActivos || []);
            setCategorias((categoriasActivas?.length ? categoriasActivas : window.salonCategoriasServicios?.defaults) || []);
        } catch (error) {
            console.error('Error cargando servicios/categorias:', error);
            setServices([]);
        } finally {
            setCargando(false);
        }
    };

    const categoriasVisibles = React.useMemo(() => {
        const visibles = categorias.filter(categoria =>
            services.some(servicio => inferirCategoriaCliente(servicio, categorias) === catId(categoria))
        );
        return services.length > 0 ? [{ id: 'todos', slug: 'todos', nombre: 'Todos', icono: '📋' }, ...visibles] : [];
    }, [services, categorias]);

    const serviciosFiltrados = React.useMemo(() => {
        if (categoriaActiva === 'todos') return services;
        return services.filter(servicio => inferirCategoriaCliente(servicio, categorias) === categoriaActiva);
    }, [services, categorias, categoriaActiva]);

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
            <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                <span className="text-2xl">✨</span>
                1. Elige tu servicio
                {selectedService && <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-1">Seleccionado</span>}
            </h2>

            {services.length === 0 ? (
                <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-pink-200">
                    <p className="text-pink-500">No hay servicios disponibles</p>
                    <p className="text-xs text-pink-400 mt-2">La administradora debe cargar servicios primero</p>
                </div>
            ) : (
                <>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                        {categoriasVisibles.map(categoria => {
                            const id = catId(categoria);
                            return (
                                <button
                                    key={id}
                                    onClick={() => setCategoriaActiva(id)}
                                    className={`shrink-0 px-3 py-2 rounded-full border text-sm font-semibold transition ${
                                        categoriaActiva === id ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-white/85 text-pink-700 border-pink-200 hover:bg-pink-50'
                                    }`}
                                >
                                    <span className="mr-1">{catIcono(categoria)}</span>
                                    {catNombre(categoria)}
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {serviciosFiltrados.map(service => {
                            const categoria = getCategoriaCliente(service, categorias);
                            return (
                                <button
                                    key={service.id}
                                    onClick={() => onSelect(service)}
                                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 transform hover:scale-[1.02] ${
                                        selectedService?.id === service.id ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-300 shadow-md' : 'border-pink-200 bg-white/80 backdrop-blur-sm hover:border-pink-400 hover:bg-pink-50/50 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{catIcono(categoria)}</span>
                                                <div className="min-w-0">
                                                    <span className="font-medium text-pink-800 text-lg block">{service.nombre}</span>
                                                    <span className="text-xs text-pink-500">{catNombre(categoria)}</span>
                                                </div>
                                            </div>
                                            {service.descripcion && <p className="text-sm text-pink-600/70 mt-1 ml-8">{service.descripcion}</p>}
                                        </div>
                                        <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                                            <span className="text-pink-600 font-bold text-lg">${service.precio}</span>
                                            <span className="flex items-center text-pink-500 text-xs bg-pink-50 px-2 py-1 rounded-full border border-pink-200">{service.duracion} min</span>
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
