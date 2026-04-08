// components/admin/ServiciosPanel.js - CON ASIGNACIÓN DE PROFESIONALES

function ServiciosPanel() {
    const [servicios, setServicios] = React.useState([]);
    const [mostrarForm, setMostrarForm] = React.useState(false);
    const [editando, setEditando] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [servicioParaAsignar, setServicioParaAsignar] = React.useState(null);

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
                const lista = await window.salonServicios.getAll(false);
                console.log('✅ Servicios obtenidos:', lista);
                setServicios(lista || []);
            }
        } catch (error) {
            console.error('Error cargando servicios:', error);
        } finally {
            setCargando(false);
        }
    };

    const handleGuardar = async (servicio) => {
        try {
            console.log('💾 Guardando servicio:', servicio);
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

    const handleEliminar = async (id) => {
        if (!confirm('¿Eliminar este servicio? También se eliminarán las asignaciones de profesionales.')) return;
        try {
            console.log('🗑️ Eliminando servicio:', id);
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
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">💈 Servicios</h2>
                <button
                    onClick={() => {
                        setEditando(null);
                        setMostrarForm(true);
                    }}
                    className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
                >
                    + Nuevo Servicio
                </button>
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

            <div className="space-y-2">
                {servicios.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="mb-2">No hay servicios cargados</p>
                        <p className="text-sm">Hacé clic en "+ Nuevo Servicio" para comenzar</p>
                    </div>
                ) : (
                    servicios.map(s => (
                        <div key={s.id} className={`border rounded-lg p-4 ${s.activo ? '' : 'opacity-50 bg-gray-50'}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="font-semibold text-lg">{s.nombre}</h3>
                                        <button
                                            onClick={() => toggleActivo(s.id)}
                                            className={`text-xs px-2 py-1 rounded-full ${
                                                s.activo 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}
                                        >
                                            {s.activo ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {s.duracion} min | ${s.precio}
                                    </p>
                                    {s.descripcion && (
                                        <p className="text-xs text-gray-500 mt-1">{s.descripcion}</p>
                                    )}
                                    {s.horarios_permitidos && s.horarios_permitidos.length > 0 && (
                                        <p className="text-xs text-pink-600 mt-1">
                                            🕐 Horarios permitidos: {s.horarios_permitidos.join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setServicioParaAsignar(s)}
                                        className="text-purple-600 hover:text-purple-800 px-2"
                                        title="Asignar profesionales a este servicio"
                                    >
                                        👥
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditando(s);
                                            setMostrarForm(true);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 px-2"
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleEliminar(s.id)}
                                        className="text-red-600 hover:text-red-800 px-2"
                                        title="Eliminar"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal para asignar profesionales */}
            {servicioParaAsignar && (
                <AsignarProfesionalesModal
                    servicio={servicioParaAsignar}
                    onClose={() => setServicioParaAsignar(null)}
                />
            )}
        </div>
    );
}

// COMPONENTE DE FORMULARIO DE SERVICIO
function ServicioForm({ servicio, onGuardar, onCancelar }) {
    const [form, setForm] = React.useState(servicio || {
        nombre: '',
        duracion: '45',
        precio: '0',
        descripcion: '',
        horarios_permitidos: []
    });

    const [horariosStr, setHorariosStr] = React.useState(
        servicio?.horarios_permitidos ? servicio.horarios_permitidos.join(', ') : ''
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!form.nombre.trim()) {
            alert('El nombre del servicio es obligatorio');
            return;
        }

        const duracionNum = parseInt(form.duracion);
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
            horariosArray = horariosStr.split(',').map(h => h.trim()).filter(h => h.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/));
            if (horariosArray.length === 0 && horariosStr.trim()) {
                alert('Formato de horarios inválido. Use formato HH:MM separados por comas (ej: 09:00, 11:00, 15:30)');
                return;
            }
        }
        
        onGuardar({
            ...form,
            duracion: duracionNum,
            precio: precioNum,
            horarios_permitidos: horariosArray
        });
    };

    return (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-pink-200">
            <h3 className="font-semibold mb-4 text-pink-800">
                {servicio ? '✏️ Editar Servicio' : '➕ Nuevo Servicio'}
            </h3>
            
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del servicio *
                    </label>
                    <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => setForm({...form, nombre: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Ej: Corte de Cabello"
                        required
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duración (min) *
                        </label>
                        <input
                            type="text"
                            value={form.duracion}
                            onChange={(e) => {
                                const valor = e.target.value.replace(/[^0-9]/g, '');
                                setForm({...form, duracion: valor});
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                            placeholder="Ej: 45"
                            inputMode="numeric"
                            pattern="[0-9]*"
                        />
                        <p className="text-xs text-gray-400 mt-1">Podés borrar y escribir el valor que quieras</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Precio ($) *
                        </label>
                        <input
                            type="text"
                            value={form.precio}
                            onChange={(e) => {
                                const valor = e.target.value.replace(/[^0-9.]/g, '');
                                const partes = valor.split('.');
                                if (partes.length > 2) return;
                                setForm({...form, precio: valor});
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                            placeholder="Ej: 2500"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                        />
                        <p className="text-xs text-gray-400 mt-1">Podés usar punto para decimales (ej: 99.50)</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Horarios permitidos (opcional)
                    </label>
                    <input
                        type="text"
                        value={horariosStr}
                        onChange={(e) => setHorariosStr(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Ej: 09:00, 11:00, 15:30"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Horarios específicos en que está disponible este servicio (formato HH:MM separados por comas). 
                        Si se deja vacío, se mostrarán todos los horarios del profesional.
                    </p>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                    </label>
                    <textarea
                        value={form.descripcion}
                        onChange={(e) => setForm({...form, descripcion: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        rows="2"
                        placeholder="Descripción opcional del servicio"
                    />
                </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
                <button
                    type="button"
                    onClick={onCancelar}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                    {servicio ? 'Actualizar' : 'Guardar'}
                </button>
            </div>
        </form>
    );
}

// 🔥 COMPONENTE MODAL: Asignar Profesionales a Servicio
function AsignarProfesionalesModal({ servicio, onClose }) {
    const [profesionales, setProfesionales] = React.useState([]);
    const [asignados, setAsignados] = React.useState([]);
    const [cargando, setCargando] = React.useState(true);
    const [guardando, setGuardando] = React.useState(false);

    React.useEffect(() => {
        cargarDatos();
    }, [servicio]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            if (window.salonProfesionales) {
                const todos = await window.salonProfesionales.getAll(true);
                setProfesionales(todos || []);
            }
            
            if (window.getProfesionalesPorServicio) {
                const asignadosData = await window.getProfesionalesPorServicio(servicio.id);
                setAsignados(asignadosData.map(p => p.id));
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setCargando(false);
        }
    };

    const toggleProfesional = async (profesionalId) => {
        setGuardando(true);
        try {
            if (asignados.includes(profesionalId)) {
                if (window.removerProfesionalDeServicio) {
                    const ok = await window.removerProfesionalDeServicio(servicio.id, profesionalId);
                    if (ok) {
                        setAsignados(asignados.filter(id => id !== profesionalId));
                    }
                }
            } else {
                if (window.asignarProfesionalAServicio) {
                    const ok = await window.asignarProfesionalAServicio(servicio.id, profesionalId);
                    if (ok) {
                        setAsignados([...asignados, profesionalId]);
                    }
                }
            }
        } catch (error) {
            console.error('Error cambiando asignación:', error);
            alert('Error al asignar profesional');
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6">
                    <div className="animate-spin h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando profesionales...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">
                        👥 Profesionales para "{servicio.nombre}"
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
                        ×
                    </button>
                </div>
                
                <div className="p-4">
                    <p className="text-sm text-gray-500 mb-4">
                        Seleccioná qué profesionales pueden realizar este servicio.
                        <br />
                        <span className="text-pink-600 text-xs">
                            Los clientes solo verán los profesionales marcados aquí.
                        </span>
                    </p>
                    
                    <div className="space-y-2">
                        {profesionales.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">
                                No hay profesionales activos. 
                                <br />
                                <span className="text-xs">Creá profesionales en la pestaña "Profesionales"</span>
                            </p>
                        ) : (
                            profesionales.map(prof => {
                                const isSelected = asignados.includes(prof.id);
                                return (
                                    <button
                                        key={prof.id}
                                        onClick={() => toggleProfesional(prof.id)}
                                        disabled={guardando}
                                        className={`
                                            w-full flex items-center gap-3 p-3 rounded-lg border transition-all
                                            ${isSelected 
                                                ? 'border-pink-500 bg-pink-50' 
                                                : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'}
                                            ${guardando ? 'opacity-50 cursor-wait' : ''}
                                        `}
                                    >
                                        <div className={`w-10 h-10 ${prof.color || 'bg-pink-500'} rounded-full flex items-center justify-center text-white text-lg`}>
                                            {prof.avatar || '👤'}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-medium text-gray-800">{prof.nombre}</div>
                                            <div className="text-xs text-gray-500">{prof.especialidad}</div>
                                        </div>
                                        {isSelected && (
                                            <div className="text-pink-500 text-xl">
                                                ✅
                                            </div>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
                
                <div className="sticky bottom-0 bg-white p-4 border-t">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            {asignados.length} de {profesionales.length} profesionales seleccionados
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}