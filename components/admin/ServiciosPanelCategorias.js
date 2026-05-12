// components/admin/ServiciosPanelCategorias.js - servicios con categorias editables

function normalizarTextoServicio(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function categoriaId(categoria) {
    return categoria?.slug || categoria?.id || 'otros';
}

function categoriaNombre(categoria) {
    return categoria?.nombre || categoria?.label || 'Otros';
}

function categoriaIcono(categoria) {
    return categoria?.icono || '⭐';
}

function inferirCategoriaServicio(servicio, categorias = []) {
    if (servicio?.categoria) return servicio.categoria;

    const texto = normalizarTextoServicio(`${servicio?.nombre || ''} ${servicio?.descripcion || ''}`);
    if (texto.includes('pedic') || texto.includes('pie')) return 'pedicura';
    if (texto.includes('facial') || texto.includes('limpieza') || texto.includes('dermap')) return 'faciales';
    if (texto.includes('barba') || texto.includes('corte') || texto.includes('barber')) return 'barberia';
    if (texto.includes('ceja') || texto.includes('pestana')) return 'cejas';
    if (texto.includes('combo') || texto.includes('paquete')) return 'combos';
    if (texto.includes('manic') || texto.includes('una') || texto.includes('uña') || texto.includes('gel') || texto.includes('polygel') || texto.includes('builder')) return 'manicura';
    return categorias.some(c => categoriaId(c) === 'otros') ? 'otros' : categoriaId(categorias[0]);
}

function getCategoriaServicio(servicio, categorias = []) {
    const id = inferirCategoriaServicio(servicio, categorias);
    return categorias.find(c => categoriaId(c) === id) || categorias.find(c => categoriaId(c) === 'otros') || { id: 'otros', nombre: 'Otros', icono: '⭐' };
}

function ServiciosPanel() {
    const [servicios, setServicios] = React.useState([]);
    const [categorias, setCategorias] = React.useState(window.salonCategoriasServicios?.defaults || []);
    const [mostrarForm, setMostrarForm] = React.useState(false);
    const [editando, setEditando] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [busqueda, setBusqueda] = React.useState('');
    const [categoriaActiva, setCategoriaActiva] = React.useState('todos');
    const [servicioParaAsignar, setServicioParaAsignar] = React.useState(null);
    const [mostrarCategorias, setMostrarCategorias] = React.useState(false);

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
            const [listaServicios, listaCategorias] = await Promise.all([
                window.salonServicios?.getAll(false) || [],
                window.salonCategoriasServicios?.getAll(false) || []
            ]);
            setServicios(listaServicios || []);
            setCategorias((listaCategorias?.length ? listaCategorias : window.salonCategoriasServicios?.defaults) || []);
        } catch (error) {
            console.error('Error cargando servicios/categorias:', error);
        } finally {
            setCargando(false);
        }
    };

    const categoriasFiltro = React.useMemo(() => ([
        { id: 'todos', slug: 'todos', nombre: 'Todos', icono: '📋', activo: true },
        ...categorias.filter(c => c.activo !== false),
        { id: 'inactivos', slug: 'inactivos', nombre: 'Inactivos', icono: '⏸️', activo: true }
    ]), [categorias]);

    const serviciosFiltrados = React.useMemo(() => {
        const q = normalizarTextoServicio(busqueda);
        return servicios.filter(servicio => {
            const cat = inferirCategoriaServicio(servicio, categorias);
            const coincideCategoria =
                categoriaActiva === 'todos' ||
                (categoriaActiva === 'inactivos' ? servicio.activo === false : cat === categoriaActiva && servicio.activo !== false);
            const coincideBusqueda = !q || normalizarTextoServicio(`${servicio.nombre} ${servicio.descripcion}`).includes(q);
            return coincideCategoria && coincideBusqueda;
        });
    }, [servicios, categorias, busqueda, categoriaActiva]);

    const conteoCategoria = (id) => {
        if (id === 'todos') return servicios.filter(s => s.activo !== false).length;
        if (id === 'inactivos') return servicios.filter(s => s.activo === false).length;
        return servicios.filter(s => s.activo !== false && inferirCategoriaServicio(s, categorias) === id).length;
    };

    const guardarServicio = async (servicio) => {
        if (editando) await window.salonServicios.actualizar(editando.id, servicio);
        else await window.salonServicios.crear(servicio);
        setMostrarForm(false);
        setEditando(null);
        await cargarDatos();
    };

    const duplicarServicio = async (servicio) => {
        await window.salonServicios.crear({
            nombre: `${servicio.nombre} (copia)`,
            categoria: inferirCategoriaServicio(servicio, categorias),
            duracion: servicio.duracion,
            precio: servicio.precio,
            descripcion: servicio.descripcion || '',
            horarios_permitidos: servicio.horarios_permitidos || []
        });
        await cargarDatos();
    };

    const eliminarServicio = async (id) => {
        if (!confirm('¿Eliminar este servicio? También se eliminarán las asignaciones de profesionales.')) return;
        await window.salonServicios.eliminar(id);
        await cargarDatos();
    };

    const toggleActivo = async (servicio) => {
        await window.salonServicios.actualizar(servicio.id, { activo: !servicio.activo });
        await cargarDatos();
    };

    if (cargando) {
        return (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                <p className="text-gray-500 mt-4">Cargando servicios...</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <span>💅</span> Servicios
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Controla servicios, categorías, precios, duración y profesionales.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button onClick={() => setMostrarCategorias(!mostrarCategorias)} className="border border-pink-200 text-pink-700 px-4 py-3 rounded-lg hover:bg-pink-50 font-semibold">
                            ⚙️ Categorías
                        </button>
                        <button onClick={() => { setEditando(null); setMostrarForm(true); }} className="bg-pink-600 text-white px-4 py-3 rounded-lg hover:bg-pink-700 font-semibold shadow-sm">
                            + Nuevo servicio
                        </button>
                    </div>
                </div>

                <div className="mt-5 flex flex-col md:flex-row gap-3">
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                        placeholder="Buscar por nombre o descripción"
                    />
                    <button onClick={() => setBusqueda('')} className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
                        Limpiar
                    </button>
                </div>

                <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                    {categoriasFiltro.map(categoria => {
                        const id = categoriaId(categoria);
                        return (
                            <button
                                key={id}
                                onClick={() => setCategoriaActiva(id)}
                                className={`shrink-0 px-3 py-2 rounded-full border text-sm font-medium transition ${
                                    categoriaActiva === id ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-white text-gray-700 border-gray-200 hover:border-pink-300 hover:bg-pink-50'
                                }`}
                            >
                                <span className="mr-1">{categoriaIcono(categoria)}</span>
                                {categoriaNombre(categoria)}
                                <span className={`ml-2 text-xs ${categoriaActiva === id ? 'text-white/80' : 'text-gray-400'}`}>{conteoCategoria(id)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {mostrarCategorias && (
                <CategoriasServiciosManager
                    categorias={categorias}
                    servicios={servicios}
                    onChange={cargarDatos}
                />
            )}

            {mostrarForm && (
                <ServicioFormCategorias
                    servicio={editando}
                    categorias={categorias}
                    onGuardar={guardarServicio}
                    onCancelar={() => { setMostrarForm(false); setEditando(null); }}
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
                        const categoria = getCategoriaServicio(servicio, categorias);
                        return (
                            <div key={servicio.id} className={`bg-white border rounded-xl p-4 shadow-sm transition hover:shadow-md ${servicio.activo === false ? 'opacity-60 border-gray-200 bg-gray-50' : 'border-gray-100'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-2xl">{categoriaIcono(categoria)}</span>
                                            <h3 className="font-bold text-gray-900 text-lg truncate">{servicio.nombre}</h3>
                                            <span className="text-xs px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100">{categoriaNombre(categoria)}</span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2 text-sm">
                                            <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-700">{servicio.duracion} min</span>
                                            <span className="px-2 py-1 bg-gray-100 rounded-full text-gray-700">${servicio.precio}</span>
                                            <button onClick={() => toggleActivo(servicio)} className={`px-2 py-1 rounded-full text-xs font-semibold ${servicio.activo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                {servicio.activo !== false ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </div>
                                        {servicio.descripcion && <p className="text-sm text-gray-500 mt-3 line-clamp-2">{servicio.descripcion}</p>}
                                        {servicio.horarios_permitidos?.length > 0 && <p className="text-xs text-pink-600 mt-3">🕐 Horarios permitidos: {servicio.horarios_permitidos.join(', ')}</p>}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => setServicioParaAsignar(servicio)} className="w-9 h-9 rounded-lg hover:bg-purple-50 text-purple-600" title="Asignar profesionales">👥</button>
                                        <button onClick={() => { setEditando(servicio); setMostrarForm(true); }} className="w-9 h-9 rounded-lg hover:bg-blue-50 text-blue-600" title="Editar">✏️</button>
                                        <button onClick={() => duplicarServicio(servicio)} className="w-9 h-9 rounded-lg hover:bg-amber-50 text-amber-600" title="Duplicar">📄</button>
                                        <button onClick={() => eliminarServicio(servicio.id)} className="w-9 h-9 rounded-lg hover:bg-red-50 text-red-600" title="Eliminar">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {servicioParaAsignar && (
                <AsignarProfesionalesModal servicio={servicioParaAsignar} onClose={() => setServicioParaAsignar(null)} />
            )}
        </div>
    );
}

function CategoriasServiciosManager({ categorias, servicios, onChange }) {
    const [form, setForm] = React.useState({ nombre: '', icono: '✨', orden: 99 });
    const [editando, setEditando] = React.useState(null);

    const reset = () => {
        setForm({ nombre: '', icono: '✨', orden: 99 });
        setEditando(null);
    };

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) {
            alert('Escribe el nombre de la categoría.');
            return;
        }

        const payload = {
            nombre: form.nombre.trim(),
            slug: form.slug || form.nombre.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            icono: form.icono || '⭐',
            orden: parseInt(form.orden, 10) || 99,
            activo: true
        };

        const result = editando
            ? await window.salonCategoriasServicios?.actualizar(editando.id, payload)
            : await window.salonCategoriasServicios?.crear(payload);

        if (!result) {
            alert('No se pudo guardar la categoría. Revisa si ya corriste el SQL de categorías.');
            return;
        }

        reset();
        await onChange();
    };

    const editar = (categoria) => {
        setEditando(categoria);
        setForm({
            nombre: categoriaNombre(categoria),
            slug: categoriaId(categoria),
            icono: categoriaIcono(categoria),
            orden: categoria.orden || 99
        });
    };

    const eliminar = async (categoria) => {
        const id = categoriaId(categoria);
        const usados = servicios.filter(s => inferirCategoriaServicio(s, categorias) === id);
        if (!confirm(`¿Eliminar la categoría "${categoriaNombre(categoria)}"? ${usados.length ? 'Sus servicios pasarán a Otros.' : ''}`)) return;

        for (const servicio of usados) {
            await window.salonServicios.actualizar(servicio.id, { categoria: 'otros' });
        }

        const ok = await window.salonCategoriasServicios?.eliminar(categoria.id);
        if (!ok) {
            alert('No se pudo eliminar la categoría. Revisa si ya corriste el SQL de categorías.');
            return;
        }
        await onChange();
    };

    const toggle = async (categoria) => {
        const ok = await window.salonCategoriasServicios?.actualizar(categoria.id, { activo: categoria.activo === false });
        if (!ok) {
            alert('No se pudo cambiar el estado de la categoría.');
            return;
        }
        await onChange();
    };

    return (
        <div className="bg-white rounded-xl border border-pink-100 shadow-sm p-5">
            <div className="flex flex-col lg:flex-row gap-5">
                <form onSubmit={guardar} className="lg:w-80 space-y-3">
                    <h3 className="font-bold text-gray-900">{editando ? 'Editar categoría' : 'Nueva categoría'}</h3>
                    <input value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2" placeholder="Nombre: Faciales premium" />
                    <div className="grid grid-cols-2 gap-2">
                        <input value={form.icono} onChange={(e) => setForm({...form, icono: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2" placeholder="Emoji" maxLength="4" />
                        <input value={form.orden} onChange={(e) => setForm({...form, orden: e.target.value.replace(/\D/g, '')})} className="w-full border border-gray-200 rounded-lg px-3 py-2" placeholder="Orden" inputMode="numeric" />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-pink-600 text-white px-3 py-2 rounded-lg hover:bg-pink-700">{editando ? 'Actualizar' : 'Crear'}</button>
                        {editando && <button type="button" onClick={reset} className="px-3 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>}
                    </div>
                </form>

                <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-3">Categorías actuales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {categorias.map(categoria => {
                            const id = categoriaId(categoria);
                            const usados = servicios.filter(s => inferirCategoriaServicio(s, categorias) === id).length;
                            return (
                                <div key={`${categoria.id}-${id}`} className={`border rounded-lg p-3 flex items-center gap-3 ${categoria.activo === false ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
                                    <span className="text-2xl">{categoriaIcono(categoria)}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-800 truncate">{categoriaNombre(categoria)}</div>
                                        <div className="text-xs text-gray-500">{usados} servicios · orden {categoria.orden || 99}</div>
                                    </div>
                                    <button onClick={() => editar(categoria)} className="text-blue-600 hover:bg-blue-50 rounded-lg w-8 h-8" title="Editar">✏️</button>
                                    <button onClick={() => toggle(categoria)} className="text-amber-600 hover:bg-amber-50 rounded-lg w-8 h-8" title="Activar/desactivar">{categoria.activo === false ? '▶️' : '⏸️'}</button>
                                    <button onClick={() => eliminar(categoria)} className="text-red-600 hover:bg-red-50 rounded-lg w-8 h-8" title="Eliminar">🗑️</button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ServicioFormCategorias({ servicio, categorias, onGuardar, onCancelar }) {
    const categoriaInicial = servicio ? inferirCategoriaServicio(servicio, categorias) : categoriaId(categorias.find(c => c.activo !== false) || categorias[0]);
    const [form, setForm] = React.useState({
        nombre: servicio?.nombre || '',
        categoria: categoriaInicial || 'otros',
        duracion: String(servicio?.duracion || '45'),
        precio: String(servicio?.precio ?? '0'),
        descripcion: servicio?.descripcion || '',
        horarios_permitidos: servicio?.horarios_permitidos || []
    });
    const [horariosStr, setHorariosStr] = React.useState(servicio?.horarios_permitidos ? servicio.horarios_permitidos.join(', ') : '');

    const submit = (e) => {
        e.preventDefault();
        const duracion = parseInt(form.duracion, 10);
        const precio = parseFloat(form.precio);
        if (!form.nombre.trim()) return alert('El nombre del servicio es obligatorio');
        if (isNaN(duracion) || duracion < 15) return alert('La duración debe ser al menos 15 minutos');
        if (isNaN(precio) || precio < 0) return alert('El precio debe ser válido');

        let horarios = [];
        if (horariosStr.trim()) {
            horarios = horariosStr.split(',').map(h => h.trim()).filter(h => h.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/));
            if (horarios.length === 0) return alert('Formato de horarios inválido. Usa HH:MM separados por comas.');
        }

        onGuardar({
            ...form,
            nombre: form.nombre.trim(),
            descripcion: form.descripcion.trim(),
            duracion,
            precio,
            horarios_permitidos: horarios
        });
    };

    return (
        <form onSubmit={submit} className="bg-white rounded-xl border border-pink-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">{servicio ? '✏️ Editar servicio' : '➕ Nuevo servicio'}</h3>
                    <p className="text-sm text-gray-500 mt-1">Completa la información que verá la clienta al reservar.</p>
                </div>
                <button type="button" onClick={onCancelar} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <section className="space-y-3">
                    <h4 className="font-semibold text-gray-800">Información básica</h4>
                    <input value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2" placeholder="Nombre del servicio" required />
                    <select value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white">
                        {categorias.filter(c => c.activo !== false).map(categoria => (
                            <option key={categoriaId(categoria)} value={categoriaId(categoria)}>{categoriaIcono(categoria)} {categoriaNombre(categoria)}</option>
                        ))}
                    </select>
                    <textarea value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2" rows="4" placeholder="Descripción" />
                </section>
                <section className="space-y-3">
                    <h4 className="font-semibold text-gray-800">Precio, duración y disponibilidad</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <input value={form.duracion} onChange={(e) => setForm({...form, duracion: e.target.value.replace(/\D/g, '')})} className="w-full border border-gray-200 rounded-lg px-3 py-2" placeholder="Duración" inputMode="numeric" />
                        <input value={form.precio} onChange={(e) => setForm({...form, precio: e.target.value.replace(/[^0-9.]/g, '')})} className="w-full border border-gray-200 rounded-lg px-3 py-2" placeholder="Precio" inputMode="decimal" />
                    </div>
                    <input value={horariosStr} onChange={(e) => setHorariosStr(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2" placeholder="Horarios permitidos: 09:00, 11:00" />
                    <p className="text-xs text-gray-400">Déjalo vacío para usar todos los horarios del profesional.</p>
                </section>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-5 pt-4 border-t">
                <button type="button" onClick={onCancelar} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 font-semibold">{servicio ? 'Actualizar servicio' : 'Guardar servicio'}</button>
            </div>
        </form>
    );
}
