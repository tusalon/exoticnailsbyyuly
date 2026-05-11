// components/admin/ServiciosPanelPro.js - panel profesional con categorias

const CATEGORIAS_SERVICIO = [
    { id: 'todos', label: 'Todos', icono: '📋' },
    { id: 'manicura', label: 'Manicura', icono: '💅' },
    { id: 'pedicura', label: 'Pedicura', icono: '🦶' },
    { id: 'faciales', label: 'Faciales', icono: '✨' },
    { id: 'barberia', label: 'Barbería', icono: '💈' },
    { id: 'cejas', label: 'Cejas', icono: '👁️' },
    { id: 'combos', label: 'Combos', icono: '🎁' },
    { id: 'otros', label: 'Otros', icono: '⭐' },
    { id: 'inactivos', label: 'Inactivos', icono: '⏸️' },
];

function normalizarTextoServicio(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function inferirCategoriaServicio(servicio) {
    if (servicio?.categoria) return servicio.categoria;

    const texto = normalizarTextoServicio(`${servicio?.nombre || ''} ${servicio?.descripcion || ''}`);
    if (texto.includes('pedic') || texto.includes('pie')) return 'pedicura';
    if (texto.includes('facial') || texto.includes('limpieza') || texto.includes('dermap')) return 'faciales';
    if (texto.includes('barba') || texto.includes('corte') || texto.includes('barber')) return 'barberia';
    if (texto.includes('ceja') || texto.includes('pestana') || texto.includes('pestaña')) return 'cejas';
    if (texto.includes('combo') || texto.includes('paquete')) return 'combos';
    if (texto.includes('manic') || texto.includes('una') || texto.includes('uña') || texto.includes('gel') || texto.includes('polygel') || texto.includes('builder')) return 'manicura';
    return 'otros';
}

function getCategoriaServicio(servicio) {
    const categoriaId = inferirCategoriaServicio(servicio);
    return CATEGORIAS_SERVICIO.find(c => c.id === categoriaId) || CATEGORIAS_SERVICIO.find(c => c.id === 'otros');
}

function ServiciosPanel() {
    const [servicios, setServicios] = React.useState([]);
    const [mostrarForm, setMostrarForm] = React.useState(false);
    const [editando, setEditando] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [busqueda, setBusqueda] = React.useState('');
    const [categoriaActiva, setCategoriaActiva] = React.useState('todos');
    const [servicioParaAsignar, setServicioParaAsignar] = React.useState(null);

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
                const lista = await window.salonServicios.getAll(false);
                setServicios(lista || []);
            }
        } catch (error) {
            console.error('Error cargando servicios:', error);
        } finally {
            setCargando(false);
        }
    };

    const serviciosFiltrados = React.useMemo(() => {
        const q = normalizarTextoServicio(busqueda);
        return servicios.filter(servicio => {
            const categoria = inferirCategoriaServicio(servicio);
            const coincideCategoria =
                categoriaActiva === 'todos' ||
                (categoriaActiva === 'inactivos' ? servicio.activo === false : categoria === categoriaActiva && servicio.activo !== false);
            const coincideBusqueda = !q || normalizarTextoServicio(`${servicio.nombre} ${servicio.descripcion}`).includes(q);
            return coincideCategoria && coincideBusqueda;
        });
    }, [servicios, busqueda, categoriaActiva]);

    const conteoCategoria = (categoriaId) => {
        if (categoriaId === 'todos') return servicios.filter(s => s.activo !== false).length;
        if (categoriaId === 'inactivos') return servicios.filter(s => s.activo === false).length;
        return servicios.filter(s => s.activo !== false && inferirCategoriaServicio(s) === categoriaId).length;
    };

    const handleGuardar = async (servicio) => {
        try {
            if (editando) {
                await window.salonServicios.actualizar(editando.id, servicio);
            } else {
                await window.salonServicios.crear(servicio);
            }
            await cargarServicios();
            setMostrarForm(false);
            setEditando(null);
        } catch (error) {
            console.error('Error guardando servicio:', error);
            alert('Error al guardar el servicio');
        }
    };

    const handleDuplicar = async (servicio) => {
        const copia = {
            nombre: `${servicio.nombre} (copia)`,
            categoria: inferirCategoriaServicio(servicio),
            duracion: servicio.duracion,
            precio: servicio.precio,
            descripcion: servicio.descripcion || '',
            horarios_permitidos: servicio.horarios_permitidos || [],
        };
        await window.salonServicios.crear(copia);
        await cargarServicios();
    };

    const handleEliminar = async (id) => {
        if (!confirm('¿Eliminar este servicio? También se eliminarán las asignaciones de profesionales.')) return;
        try {
            await window.salonServicios.eliminar(id);
            await cargarServicios();
        } catch (error) {
            console.error('Error eliminando servicio:', error);
            alert('Error al eliminar el servicio');
        }
    };

    const toggleActivo = async (id) => {
        const servicio = servicios.find(s => s.id === id);
        try {
            await window.salonServicios.actualizar(id, { activo: !servicio.activo });
            await cargarServicios();
        } catch (error) {
            console.error('Error cambiando estado:', error);
        }
    };

    const abrirNuevo = () => {
        setEditando(null);
        setMostrarForm(true);
    };

    if (cargando) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando servicios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <span>💅</span>
                            Servicios
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Organiza precios, duración, categorías, horarios y profesionales.
                        </p>
                    </div>
                    <button
                        onClick={abrirNuevo}
                        className="bg-pink-600 text-white px-4 py-3 rounded-lg hover:bg-pink-700 font-semibold shadow-sm"
                    >
                        + Nuevo servicio
                    </button>
                </div>

                <div className="mt-5 flex flex-col md:flex-row gap-3">
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                        placeholder="Buscar por nombre o descripción"
                    />
                    <div className="grid grid-cols-3 md:flex gap-2">
                        <button
                            onClick={() => setBusqueda('')}
                            className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                        >
                            Limpiar
                        </button>
                    </div>
                </div>

                <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                    {CATEGORIAS_SERVICIO.map(categoria => (
                        <button
                            key={categoria.id}
                            onClick={() => setCategoriaActiva(categoria.id)}
                            className={`shrink-0 px-3 py-2 rounded-full border text-sm font-medium transition ${
                                categoriaActiva === categoria.id
                                    ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                            }`}
                        >
                            <span className="mr-1">{categoria.icono}</span>
                            {categoria.label}
                            <span className={`ml-2 text-xs ${categoriaActiva === categoria.id ? 'text-white/80' : 'text-gray-400'}`}>
                                {conteoCategoria(categoria.id)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {mostrarForm && (
                <ServicioForm
                    servicio={editando}
                    onGuardar={handleGuardar}
                    onCancelar={() => {
                        setMostrarForm(false);
                        setEditando(null);
                    }}
                />
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {serviciosFiltrados.length === 0 ? (
                    <div className="xl:col-span-2 bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                        <p className="font-medium">No hay servicios para este filtro.</p>
                        <p className="text-sm mt-1">Crea uno nuevo o cambia de categoría.</p>
                    </div>
                ) : (
                    serviciosFiltrados.map(servicio => {
                        const categoria = getCategoriaServicio(servicio);
                        return (
                            <div
                                key={servicio.id}
                                className={`bg-white border rounded-xl p-4 shadow-sm transition hover:shadow-md ${
                                    servicio.activo === false ? 'opacity-60 border-gray-200 bg-gray-50' : 'border-gray-100'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-2xl">{categoria.icono}</span>
                                            <h3 className="font-bold text-gray-900 text-lg truncate">{servicio.nombre}</h3>
                                            <span className="text-xs px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100">
                                                {categoria.label}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                            <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-700">{servicio.duracion} min</span>
                                            <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-700">${servicio.precio}</span>
                                            <button
                                                onClick={() => toggleActivo(servicio.id)}
                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    servicio.activo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                                                }`}
                                            >
                                                {servicio.activo !== false ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </div>
                                        {servicio.descripcion && (
                                            <p className="text-sm text-gray-500 mt-3 line-clamp-2">{servicio.descripcion}</p>
                                        )}
                                        {servicio.horarios_permitidos?.length > 0 && (
                                            <p className="text-xs text-pink-600 mt-3">
                                                🕐 Horarios permitidos: {servicio.horarios_permitidos.join(', ')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => setServicioParaAsignar(servicio)} className="w-9 h-9 rounded-lg hover:bg-purple-50 text-purple-600" title="Asignar profesionales">👥</button>
                                        <button onClick={() => { setEditando(servicio); setMostrarForm(true); }} className="w-9 h-9 rounded-lg hover:bg-blue-50 text-blue-600" title="Editar">✏️</button>
                                        <button onClick={() => handleDuplicar(servicio)} className="w-9 h-9 rounded-lg hover:bg-amber-50 text-amber-600" title="Duplicar">📄</button>
                                        <button onClick={() => handleEliminar(servicio.id)} className="w-9 h-9 rounded-lg hover:bg-red-50 text-red-600" title="Eliminar">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {servicioParaAsignar && (
                <AsignarProfesionalesModal
                    servicio={servicioParaAsignar}
                    onClose={() => setServicioParaAsignar(null)}
                />
            )}
        </div>
    );
}

function ServicioForm({ servicio, onGuardar, onCancelar }) {
    const categoriaInicial = servicio ? inferirCategoriaServicio(servicio) : 'manicura';
    const [form, setForm] = React.useState({
        nombre: servicio?.nombre || '',
        categoria: categoriaInicial,
        duracion: String(servicio?.duracion || '45'),
        precio: String(servicio?.precio ?? '0'),
        descripcion: servicio?.descripcion || '',
        horarios_permitidos: servicio?.horarios_permitidos || [],
    });
    const [horariosStr, setHorariosStr] = React.useState(servicio?.horarios_permitidos ? servicio.horarios_permitidos.join(', ') : '');

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!form.nombre.trim()) {
            alert('El nombre del servicio es obligatorio');
            return;
        }

        const duracionNum = parseInt(form.duracion, 10);
        if (isNaN(duracionNum) || duracionNum < 15) {
            alert('La duración debe ser al menos 15 minutos');
            return;
        }

        const precioNum = parseFloat(form.precio);
        if (isNaN(precioNum) || precioNum < 0) {
            alert('El precio debe ser un valor válido');
            return;
        }

        let horariosArray = [];
        if (horariosStr.trim()) {
            horariosArray = horariosStr
                .split(',')
                .map(h => h.trim())
                .filter(h => h.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/));
            if (horariosArray.length === 0) {
                alert('Formato de horarios inválido. Usa HH:MM separados por comas, por ejemplo: 09:00, 11:00, 15:30');
                return;
            }
        }

        onGuardar({
            ...form,
            nombre: form.nombre.trim(),
            descripcion: form.descripcion.trim(),
            duracion: duracionNum,
            precio: precioNum,
            horarios_permitidos: horariosArray,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-pink-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">
                        {servicio ? '✏️ Editar servicio' : '➕ Nuevo servicio'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Completa la información que verá la clienta al reservar.</p>
                </div>
                <button type="button" onClick={onCancelar} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="space-y-3">
                    <h4 className="font-semibold text-gray-800">Información básica</h4>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del servicio *</label>
                        <input
                            type="text"
                            value={form.nombre}
                            onChange={(e) => setForm({...form, nombre: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                            placeholder="Ej: Builder gel"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
                        <select
                            value={form.categoria}
                            onChange={(e) => setForm({...form, categoria: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none bg-white"
                        >
                            {CATEGORIAS_SERVICIO.filter(c => !['todos', 'inactivos'].includes(c.id)).map(categoria => (
                                <option key={categoria.id} value={categoria.id}>{categoria.icono} {categoria.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                        <textarea
                            value={form.descripcion}
                            onChange={(e) => setForm({...form, descripcion: e.target.value})}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                            rows="4"
                            placeholder="Detalle breve del servicio"
                        />
                    </div>
                </section>

                <section className="space-y-3">
                    <h4 className="font-semibold text-gray-800">Precio, duración y disponibilidad</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min) *</label>
                            <input
                                type="text"
                                value={form.duracion}
                                onChange={(e) => setForm({...form, duracion: e.target.value.replace(/[^0-9]/g, '')})}
                                onFocus={(e) => e.target.select()}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                                inputMode="numeric"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($) *</label>
                            <input
                                type="text"
                                value={form.precio}
                                onChange={(e) => {
                                    const valor = e.target.value.replace(/[^0-9.]/g, '');
                                    if (valor.split('.').length > 2) return;
                                    setForm({...form, precio: valor});
                                }}
                                onFocus={(e) => e.target.select()}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                                inputMode="decimal"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Horarios permitidos</label>
                        <input
                            type="text"
                            value={horariosStr}
                            onChange={(e) => setHorariosStr(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                            placeholder="Ej: 09:00, 11:00, 15:30"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Déjalo vacío para usar todos los horarios del profesional.
                        </p>
                    </div>
                </section>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-5 pt-4 border-t">
                <button type="button" onClick={onCancelar} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                    Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold">
                    {servicio ? 'Actualizar servicio' : 'Guardar servicio'}
                </button>
            </div>
        </form>
    );
}
