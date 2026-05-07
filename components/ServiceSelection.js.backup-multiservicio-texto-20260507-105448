// components/ServiceSelection.js - Versión femenina

function ServiceSelection({ onSelect, selectedService }) {
    const [services, setServices] = React.useState([]);
    const [cargando, setCargando] = React.useState(true);

    const getSelectedItems = () => {
        if (!selectedService) return [];
        return Array.isArray(selectedService.items) ? selectedService.items : [selectedService];
    };

    const getHorariosComunes = (items) => {
        const listas = items
            .map(item => item.horarios_permitidos || [])
            .filter(lista => lista.length > 0);

        if (listas.length === 0) return [];
        return listas.reduce((comunes, lista) => comunes.filter(hora => lista.includes(hora)));
    };

    const buildServiceGroup = (items) => {
        if (items.length === 0) return null;

        return {
            ...items[0],
            id: items.map(item => item.id).join('-'),
            ids: items.map(item => item.id),
            items,
            nombre: items.map(item => item.nombre).join(' + '),
            duracion: items.reduce((total, item) => total + (parseInt(item.duracion) || 0), 0),
            precio: items.reduce((total, item) => total + (parseFloat(item.precio) || 0), 0),
            horarios_permitidos: getHorariosComunes(items)
        };
    };

    const toggleService = (service) => {
        const selectedItems = getSelectedItems();
        const exists = selectedItems.some(item => item.id === service.id);
        const nextItems = exists
            ? selectedItems.filter(item => item.id !== service.id)
            : [...selectedItems, service];

        onSelect(buildServiceGroup(nextItems));
    };

    React.useEffect(() => {
        cargarServicios();
        
        const handleActualizacion = () => cargarServicios();
        window.addEventListener('serviciosActualizados', handleActualizacion);
        
        return () => {
            window.removeEventListener('serviciosActualizados', handleActualizacion);
        };
    }, []);

    const cargarServicios = async () => {
        setCargando(true);
        try {
            console.log('📋 Cargando servicios...');
            if (window.salonServicios) {
                const serviciosActivos = await window.salonServicios.getAll(true);
                console.log('✅ Servicios obtenidos:', serviciosActivos);
                setServices(serviciosActivos || []);
            }
        } catch (error) {
            console.error('Error cargando servicios:', error);
            setServices([]);
        } finally {
            setCargando(false);
        }
    };

    if (cargando) {
        return (
            <div className="space-y-4 animate-fade-in">
                <h2 className="text-lg font-semibold text-pink-700 flex items-center gap-2">
                    <span className="text-2xl">💅</span>
                    1. Elegí tu servicio
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
                <span className="text-2xl">💅</span>
                1. Elegí tu servicio
                {selectedService && (
                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full ml-2">
                        ✓ Seleccionado
                    </span>
                )}
            </h2>
            
            {services.length === 0 ? (
                <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-pink-200">
                    <p className="text-pink-500">No hay servicios disponibles</p>
                    <p className="text-xs text-pink-400 mt-2">La administradora debe cargar servicios primero</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {services.map(service => {
                        const selectedItems = getSelectedItems();
                        const isSelected = selectedItems.some(item => item.id === service.id);

                        return (
                        <button
                            key={service.id}
                            onClick={() => toggleService(service)}
                            className={`
                                p-4 rounded-xl border-2 text-left transition-all duration-200 transform hover:scale-[1.02]
                                ${isSelected 
                                    ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-300 shadow-md' 
                                    : 'border-pink-200 bg-white/80 backdrop-blur-sm hover:border-pink-400 hover:bg-pink-50/50 hover:shadow-sm'}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">
                                            {service.nombre.toLowerCase().includes('corte') ? '✂️' : 
                                             service.nombre.toLowerCase().includes('uña') ? '💅' :
                                             service.nombre.toLowerCase().includes('peinado') ? '💇‍♀️' :
                                             service.nombre.toLowerCase().includes('maquillaje') ? '💄' : '✨'}
                                        </span>
                                        <span className="font-medium text-pink-800 text-lg block">
                                            {service.nombre}
                                        </span>
                                    </div>
                                    {service.descripcion && (
                                        <p className="text-sm text-pink-600/70 mt-1 ml-8">{service.descripcion}</p>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-1 ml-4">
                                    <span className="text-pink-600 font-bold text-lg">
                                        ${service.precio}
                                    </span>
                                    <span className="flex items-center text-pink-500 text-xs bg-pink-50 px-2 py-1 rounded-full border border-pink-200">
                                        <span className="mr-1">⏱️</span>
                                        {service.duracion} min
                                    </span>
                                </div>
                            </div>
                        </button>
                        );
                    })}
                </div>
            )}

            {selectedService && (
                <div className="bg-white border border-pink-200 rounded-xl p-4 text-sm text-pink-700">
                    <div className="flex justify-between gap-3">
                        <span className="font-semibold">Total seleccionado</span>
                        <span className="font-bold">${selectedService.precio} - {selectedService.duracion} min</span>
                    </div>
                    <p className="text-xs text-pink-500 mt-1">{selectedService.nombre}</p>
                </div>
            )}
        </div>
    );
}
