// admin-app.js - Panel de administración (VERSIÓN CORREGIDA CON HORARIOS POR DÍA)
// CON BOTÓN DE NUEVA RESERVA MANUAL, CALENDARIO DE DISPONIBILIDAD

console.log('🚀 ADMIN-APP.JS - Panel de administración con Nueva Reserva y Calendario Disponibilidad');

window.addEventListener('error', function(e) {
    console.error('❌ Error detectado, posible versión antigua:', e.message);
    
    if (e.message.includes('Failed to load') || e.message.includes('Unexpected token')) {
        console.log('🔄 Forzando recarga por posible versión antigua...');
        
        if (window.swRegistration) {
            window.swRegistration.unregister().then(() => {
                window.location.reload();
            });
        } else {
            window.location.reload();
        }
    }
});

// ============================================
// FUNCION PARA OBTENER NEGOCIO_ID
// ============================================
function getNegocioId() {
    const localId = localStorage.getItem('negocioId');
    if (localId) {
        console.log('AdminApp usando negocioId de localStorage:', localId);
        return localId;
    }
    
    if (window.NEGOCIO_ID_POR_DEFECTO) {
        console.log('AdminApp usando NEGOCIO_ID_POR_DEFECTO:', window.NEGOCIO_ID_POR_DEFECTO);
        return window.NEGOCIO_ID_POR_DEFECTO;
    }
    
    if (typeof window.getNegocioId === 'function') {
        const id = window.getNegocioId();
        console.log('AdminApp usando window.getNegocioId():', id);
        return id;
    }
    
    console.error('a No se pudo obtener negocioId');
    return null;
}

// ============================================
// FUNCIONES DE SUPABASE
// ============================================

async function getAllBookings() {
    try {
        const negocioId = getNegocioId();
        console.log('getAllBookings - negocioId:', negocioId);
        
        if (!negocioId) {
            console.error('❌ No hay negocioId disponible');
            return [];
        }
        
        console.log('Obteniendo reservas para negocio:', negocioId);
        
        const url = `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&select=*&order=fecha.desc,hora_inicio.asc`;
        console.log('URL de consulta:', url);
        
        const res = await fetch(url, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        
        console.log('📊 Status de respuesta:', res.status);
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error('❌ Error en respuesta:', errorText);
            return [];
        }
        
        const data = await res.json();
        console.log('✅ Reservas obtenidas:', data.length);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

async function cancelBooking(id) {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('a No hay negocioId disponible');
            return false;
        }
        
        console.log(`🗑️ Cancelando reserva ${id} para negocio:`, negocioId);
        
        const res = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${id}`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: 'Cancelado' })
            }
        );
        
        if (!res.ok) {
            console.error('Error al cancelar:', await res.text());
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error cancel booking:', error);
        return false;
    }
}

async function createBooking(bookingData) {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('a No hay negocioId disponible');
            return { success: false, error: 'No hay negocioId' };
        }

        const bloqueo = await window.getClienteBloqueado?.(bookingData.cliente_whatsapp);
        if (bloqueo) {
            return { success: false, error: 'Este cliente no tiene permiso para reservar.' };
        }
        
        const dataWithNegocio = {
            ...bookingData,
            negocio_id: negocioId
        };
        
        console.log('Creando reserva para negocio:', negocioId, dataWithNegocio);
        
        const res = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas`,
            {
                method: 'POST',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(dataWithNegocio)
            }
        );
        
        if (!res.ok) {
            const error = await res.text();
            console.error('Error al crear reserva:', error);
            return { success: false, error };
        }
        
        const data = await res.json();
        return { success: true, data: Array.isArray(data) ? data[0] : data };
    } catch (error) {
        console.error('Error creating booking:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// FUNCION PARA MARCAR TURNOS COMO COMPLETADOS
// ============================================
async function marcarTurnosCompletados() {
    try {
        const negocioId = getNegocioId();
        if (!negocioId) {
            console.error('a No hay negocioId disponible');
            return;
        }
        
        const ahora = new Date();
        const ano = ahora.getFullYear();
        const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
        const dia = ahora.getDate().toString().padStart(2, '0');
        const hoy = `${ano}-${mes}-${dia}`;
        
        const horaActual = ahora.getHours();
        const minutosActuales = ahora.getMinutes();
        const totalMinutosActual = horaActual * 60 + minutosActuales;
        
        console.log('🔎 Verificando turnos para marcar como completados...');
        console.log('Fecha LOCAL actual:', hoy);
        console.log('Hora LOCAL actual:', `${horaActual}:${minutosActuales}`);
        
        const responsePasados = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&estado=eq.Reservado&fecha=lt.${hoy}&select=id,fecha,hora_inicio,hora_fin,cliente_nombre,servicio,profesional_nombre`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        if (!responsePasados.ok) {
            console.error('Error al buscar turnos pasados para completar');
            return;
        }
        
        const turnosPasados = await responsePasados.json();
        
        const responseHoy = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&estado=eq.Reservado&fecha=eq.${hoy}&select=id,fecha,hora_inicio,hora_fin,cliente_nombre,servicio,profesional_nombre`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        
        const turnosHoy = responseHoy.ok ? await responseHoy.json() : [];
        
        const turnosHoyTerminados = turnosHoy.filter(turno => {
            const [horas, minutos] = turno.hora_fin.split(':').map(Number);
            const totalMinutosFin = horas * 60 + minutos;
            return totalMinutosFin <= totalMinutosActual;
        });
        
        console.log(`📊 Turnos de días pasados (fecha < ${hoy}): ${turnosPasados.length}`);
        console.log(`📊 Turnos de hoy terminados: ${turnosHoyTerminados.length}`);
        
        const turnosACompletar = [...turnosPasados, ...turnosHoyTerminados];
        
        if (turnosACompletar.length > 0) {
            console.log(`${turnosACompletar.length} turnos a marcar como completados`);
            
            for (const turno of turnosACompletar) {
                console.log(`Completando turno de ${turno.cliente_nombre} - ${turno.fecha} ${turno.hora_inicio} a ${turno.hora_fin}`);
                
                await fetch(
                    `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${turno.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ estado: 'Completado' })
                    }
                );
            }
            
            console.log(`${turnosACompletar.length} turnos marcados como completados`);
        } else {
            console.log('a No hay turnos para completar');
        }
        
    } catch (error) {
        console.error('Error marcando turnos completados:', error);
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const variantesHorarioPermitido = (timeStr) => {
    const partes = String(timeStr || '').trim().split(':');
    if (partes.length < 2) return [];
    const hours = parseInt(partes[0], 10);
    const minutes = parseInt(partes[1], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return [];

    const normal = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const variantes = [normal];
    if (hours >= 1 && hours <= 7) {
        variantes.push(`${String(hours + 12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    }
    return variantes;
};

const servicioPermiteHorario = (servicio, slot) => {
    const permitidos = servicio?.horarios_permitidos || [];
    if (!permitidos.length) return true;
    const normalizados = new Set(permitidos.flatMap(variantesHorarioPermitido));
    return normalizados.has(slot);
};

const slotTieneDescanso = (slotStart, slotEnd, descansosDelDia = []) => {
    return descansosDelDia.some(descanso => {
        if (!descanso?.inicio || !descanso?.fin) return false;
        const descansoStart = timeToMinutes(descanso.inicio);
        const descansoEnd = timeToMinutes(descanso.fin);
        return (slotStart < descansoEnd) && (slotEnd > descansoStart);
    });
};

const estaDentroBloqueTrabajo = (inicio, fin, indicesDelDia = [], duracionTurno = 60, intervaloTurnos = 0) => {
    if (!indicesDelDia.length) return false;

    const minutosTrabajo = indicesDelDia
        .map(indice => timeToMinutes(indiceToHoraLegible(indice)))
        .sort((a, b) => a - b);

    const bloquesBase = minutosTrabajo.map((minuto, index) => {
        const siguiente = minutosTrabajo[index + 1];
        const anterior = minutosTrabajo[index - 1];
        return {
            inicio: minuto,
            fin: siguiente ? Math.max(siguiente, minuto + duracionTurno) : 24 * 60,
            conectaAnterior: anterior !== undefined && minuto - anterior <= duracionTurno + intervaloTurnos
        };
    });

    const bloques = [];
    bloquesBase.forEach(bloque => {
        const ultimo = bloques[bloques.length - 1];
        if (ultimo && bloque.conectaAnterior) {
            ultimo.fin = Math.max(ultimo.fin, bloque.fin);
        } else {
            bloques.push({ inicio: bloque.inicio, fin: bloque.fin });
        }
    });

    return bloques.some(bloque => inicio >= bloque.inicio && fin <= bloque.fin);
};

const formatTo12Hour = (time) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
};

const calculateEndTime = (startTime, duration) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

const getCurrentLocalDate = () => {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = (ahora.getMonth() + 1).toString().padStart(2, '0');
    const day = ahora.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getCurrentLocalMinutes = () => {
    const ahora = new Date();
    return ahora.getHours() * 60 + ahora.getMinutes();
};

const indiceToHoraLegible = (indice) => {
    const horas = Math.floor(indice / 2);
    const minutos = indice % 2 === 0 ? '00' : '30';
    return `${horas.toString().padStart(2, '0')}:${minutos}`;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
function AdminApp() {
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filterDate, setFilterDate] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('activas');
    
    const [userRole, setUserRole] = React.useState('admin');
    const [userNivel, setUserNivel] = React.useState(3);
    const [profesional, setProfesional] = React.useState(null);
    const [nombreNegocio, setNombreNegocio] = React.useState('Mi Negocio');
    const [logoNegocio, setLogoNegocio] = React.useState(null);
    
    const [config, setConfig] = React.useState(null);
    const [configVersion, setConfigVersion] = React.useState(0);
    
    const [tabActivo, setTabActivo] = React.useState('reservas');
    const [agendaDate, setAgendaDate] = React.useState(new Date());
    const [agendaMode, setAgendaMode] = React.useState('dia');
    const [agendaDetalleBooking, setAgendaDetalleBooking] = React.useState(null);
    
    const [showClientesRegistrados, setShowClientesRegistrados] = React.useState(false);
    const [clientesRegistrados, setClientesRegistrados] = React.useState([]);
    const [errorClientes, setErrorClientes] = React.useState('');
    const [cargandoClientes, setCargandoClientes] = React.useState(false);
    const [clientesBloqueados, setClientesBloqueados] = React.useState([]);
    const [cargandoBloqueados, setCargandoBloqueados] = React.useState(false);
    const [nuevoBloqueo, setNuevoBloqueo] = React.useState({ nombre: '', whatsapp: '', motivo: '' });
    const [busquedaClienteManual, setBusquedaClienteManual] = React.useState('');

    const [showNuevaReservaModal, setShowNuevaReservaModal] = React.useState(false);
    const [creandoReservaManual, setCreandoReservaManual] = React.useState(false);
    const creandoReservaManualRef = React.useRef(false);
    const [reservaEditando, setReservaEditando] = React.useState(null);
    const [nuevaReservaData, setNuevaReservaData] = React.useState({
        cliente_nombre: '',
        cliente_whatsapp: '',
        servicio: '',
        profesional_id: '',
        fecha: '',
        hora_inicio: '',
        requiereAnticipo: false
    });
    const [serviciosManualSeleccionados, setServiciosManualSeleccionados] = React.useState([]);
    
    // Estado para el modal de disponibilidad
    const [showDisponibilidadModal, setShowDisponibilidadModal] = React.useState(false);
    const [disponibilidadFecha, setDisponibilidadFecha] = React.useState(new Date());
    const [disponibilidadHoras, setDisponibilidadHoras] = React.useState([]);
    const [disponibilidadCargando, setDisponibilidadCargando] = React.useState(false);
    const [disponibilidadDias, setDisponibilidadDias] = React.useState({});
    const [disponibilidadConteos, setDisponibilidadConteos] = React.useState({});
    const [modoDisponibilidad, setModoDisponibilidad] = React.useState('mes');
    const [disponibilidadSemanal, setDisponibilidadSemanal] = React.useState([]);
    const [diasCerradosFechas, setDiasCerradosFechas] = React.useState([]);
    const [profesionalSeleccionadoDispo, setProfesionalSeleccionadoDispo] = React.useState(null);
    const [cobroEditando, setCobroEditando] = React.useState(null);
    const [cobroForm, setCobroForm] = React.useState({ monto_cobrado: '', notas_cobro: '' });
    const [guardandoCobro, setGuardandoCobro] = React.useState(false);

    const [serviciosList, setServiciosList] = React.useState([]);
    const [profesionalesList, setProfesionalesList] = React.useState([]);
    const [profesionalesManualFiltrados, setProfesionalesManualFiltrados] = React.useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = React.useState([]);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [diasLaborales, setDiasLaborales] = React.useState([]);
    const [fechasConHorarios, setFechasConHorarios] = React.useState({});

    const esAdminPanel = userRole === 'admin';
    const esProfesionalPanel = userRole === 'profesional';
    const puedeGestionarReservas = esAdminPanel || (esProfesionalPanel && userNivel >= 2);
    const puedeGestionarAvanzado = esAdminPanel || (esProfesionalPanel && userNivel >= 3);

    const getServicioManual = (servicioNombre = nuevaReservaData.servicio) => {
        if (!servicioNombre) return null;
        const servicio = serviciosList.find(s => s.nombre === servicioNombre);
        if (servicio) return servicio;

        const primerNombre = String(servicioNombre).split(' + ')[0]?.trim();
        return serviciosList.find(s => s.nombre === primerNombre) || null;
    };

    const getServiciosManualSeleccionados = () => {
        const nombres = serviciosManualSeleccionados.length > 0
            ? serviciosManualSeleccionados
            : String(nuevaReservaData.servicio || '').split(' + ').map(nombre => nombre.trim()).filter(Boolean);

        const servicios = nombres
            .map(nombre => serviciosList.find(s => s.nombre === nombre))
            .filter(Boolean);

        const servicioUnico = getServicioManual();
        return servicios.length > 0 ? servicios : (servicioUnico ? [servicioUnico] : []);
    };

    const toggleServicioManual = (nombreServicio) => {
        const existe = serviciosManualSeleccionados.includes(nombreServicio);
        const actualizados = existe
            ? serviciosManualSeleccionados.filter(nombre => nombre !== nombreServicio)
            : [...serviciosManualSeleccionados, nombreServicio];

        setServiciosManualSeleccionados(actualizados);
        setNuevaReservaData(data => ({
            ...data,
            servicio: actualizados.join(' + '),
            fecha: '',
            hora_inicio: ''
        }));
    };

    const normalizarBusquedaCliente = (valor) => String(valor || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const limpiarTelefonoCliente = (valor) => String(valor || '')
        .replace(/\D/g, '')
        .replace(/^53(?=\d{8,}$)/, '');

    const clientesManualFiltrados = React.useMemo(() => {
        const queryTexto = normalizarBusquedaCliente(busquedaClienteManual);
        const queryNumero = String(busquedaClienteManual || '').replace(/\D/g, '');
        if (!queryTexto && !queryNumero) return clientesRegistrados;

        return clientesRegistrados
            .filter(cliente => {
                const nombreOriginal = String(cliente.nombre || '').toLowerCase().trim();
                const nombreNormalizado = normalizarBusquedaCliente(cliente.nombre);
                const whatsapp = String(cliente.whatsapp || '').replace(/\D/g, '');
                const textoCliente = normalizarBusquedaCliente(Object.values(cliente || {}).join(' '));
                const coincideNombre =
                    nombreNormalizado.includes(queryTexto) ||
                    nombreOriginal.includes(String(busquedaClienteManual || '').toLowerCase().trim());
                const coincideTelefono = queryNumero && whatsapp.includes(queryNumero);
                const coincideTexto = queryTexto && textoCliente.includes(queryTexto);
                return coincideNombre || coincideTelefono || coincideTexto;
            });
    }, [busquedaClienteManual, clientesRegistrados]);

    const seleccionarClienteManual = (cliente) => {
        setNuevaReservaData(prev => ({
            ...prev,
            cliente_nombre: cliente.nombre || '',
            cliente_whatsapp: limpiarTelefonoCliente(cliente.whatsapp)
        }));
        setBusquedaClienteManual('');
    };

    // ============================================
    // FUNCIÓN PARA CARGAR DÍAS CERRADOS DIRECTAMENTE DE SUPABASE
    // ============================================
    const cargarDiasCerradosDirecto = async () => {
        try {
            const negocioId = getNegocioId();
            if (!negocioId) return [];
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/dias_cerrados?negocio_id=eq.${negocioId}&select=fecha`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            if (!response.ok) return [];
            
            const data = await response.json();
            const fechas = data.map(d => d.fecha);
            setDiasCerradosFechas(fechas);
            return fechas;
        } catch (error) {
            console.error('Error cargando días cerrados:', error);
            return [];
        }
    };

    // ============================================
    // CARGAR CONFIGURACIÓN Y LOGO
    // ============================================
    React.useEffect(() => {
        window.getNombreNegocio().then(nombre => {
            setNombreNegocio(nombre);
        });
        
        cargarConfiguracion();
    }, [configVersion]);

    const cargarConfiguracion = async () => {
        try {
            const configData = await window.cargarConfiguracionNegocio(true);
            setConfig(configData);
            if (configData?.nombre) {
                setNombreNegocio(configData.nombre);
            }
            if (configData?.logo_url) {
                setLogoNegocio(configData.logo_url);
            }
            console.log('✅ Configuración recargada:', configData);
        } catch (error) {
            console.error('Error cargando config:', error);
        }
    };

    // ============================================
    // DETECTAR ROL DEL USUARIO
    // ============================================
    React.useEffect(() => {
        const profesionalAuth = window.getProfesionalAutenticado?.();
        if (profesionalAuth) {
            console.log('Usuario detectado como profesional:', profesionalAuth);
            setUserRole('profesional');
            setProfesional(profesionalAuth);
            setUserNivel(profesionalAuth.nivel || 1);
            setProfesionalSeleccionadoDispo(profesionalAuth.id);
            
            setNuevaReservaData(prev => ({
                ...prev,
                profesional_id: profesionalAuth.id
            }));
        } else {
            console.log('Usuario detectado como admin');
            setUserRole('admin');
            setUserNivel(3);
        }
    }, []);

    React.useEffect(() => {
        const cargarDatosModal = async () => {
            if (window.salonServicios) {
                const servicios = await window.salonServicios.getAll(true);
                setServiciosList(servicios || []);
            }
            if (window.salonProfesionales) {
                const profesionales = await window.salonProfesionales.getAll(true);
                setProfesionalesList(profesionales || []);
                setProfesionalesManualFiltrados(profesionales || []);
            }
        };
        cargarDatosModal();
    }, []);

    React.useEffect(() => {
        const filtrarProfesionalesManual = async () => {
            if (!nuevaReservaData.servicio) {
                setProfesionalesManualFiltrados(profesionalesList);
                return;
            }

            try {
                const serviciosSeleccionados = getServiciosManualSeleccionados();
                if (!window.getProfesionalesPorServicio || serviciosSeleccionados.length === 0) {
                    setProfesionalesManualFiltrados(profesionalesList);
                    return;
                }

                const idsPorServicio = await Promise.all(serviciosSeleccionados.map(async servicio => {
                    const profesionalesDelServicio = await window.getProfesionalesPorServicio(servicio.id);
                    return profesionalesDelServicio.map(prof => Number(prof.id)).filter(Boolean);
                }));

                const idsConRestriccion = idsPorServicio.filter(ids => ids.length > 0);
                const idsPermitidos = idsConRestriccion.length > 0
                    ? idsConRestriccion.reduce((permitidos, ids) => permitidos.filter(id => ids.includes(id)))
                    : [];
                const filtrados = idsConRestriccion.length > 0
                    ? profesionalesList.filter(prof => idsPermitidos.includes(Number(prof.id)))
                    : profesionalesList;
                setProfesionalesManualFiltrados(filtrados);

                if (nuevaReservaData.profesional_id && !filtrados.some(prof => prof.id === parseInt(nuevaReservaData.profesional_id))) {
                    setNuevaReservaData(prev => ({
                        ...prev,
                        profesional_id: '',
                        fecha: '',
                        hora_inicio: ''
                    }));
                }
            } catch (error) {
                console.error('Error filtrando profesionales del modal:', error);
                setProfesionalesManualFiltrados(profesionalesList);
            }
        };

        filtrarProfesionalesManual();
    }, [nuevaReservaData.servicio, serviciosManualSeleccionados, profesionalesList, serviciosList]);

    // CARGAR DÍAS CERRADOS AL INICIO
    React.useEffect(() => {
        cargarDiasCerradosDirecto();
    }, []);

    React.useEffect(() => {
        const cargarDiasLaborales = async () => {
            if (nuevaReservaData.profesional_id) {
                try {
                    const horarios = await window.salonConfig.getHorariosProfesional(nuevaReservaData.profesional_id);
                    setDiasLaborales(horarios.dias || []);
                    await cargarDisponibilidadMes(currentDate, nuevaReservaData.profesional_id);
                } catch (error) {
                    console.error('Error cargando días laborales:', error);
                    setDiasLaborales([]);
                }
            }
        };
        cargarDiasLaborales();
    }, [nuevaReservaData.profesional_id]);

    // CARGAR DÍAS CERRADOS CUANDO SE ABRE EL MODAL
    React.useEffect(() => {
        if (showNuevaReservaModal) {
            cargarDiasCerradosDirecto();
        }
    }, [showNuevaReservaModal]);

    React.useEffect(() => {
        if (showNuevaReservaModal && nuevaReservaData.profesional_id) {
            cargarDisponibilidadMes(currentDate, nuevaReservaData.profesional_id);
        }
    }, [showNuevaReservaModal, nuevaReservaData.servicio, nuevaReservaData.profesional_id, reservaEditando]);

    const ordenarHorarios = (horarios = []) => Array.from(new Set(horarios)).sort((a, b) => {
        const [hA, mA] = a.split(':').map(Number);
        const [hB, mB] = b.split(':').map(Number);
        return (hA * 60 + mA) - (hB * 60 + mB);
    });

    const calcularHorariosDisponiblesManual = async (fecha, profesionalId, serviciosSeleccionados) => {
        if (!fecha || !profesionalId || serviciosSeleccionados.length === 0) return [];

        const profesionalObj = profesionalesList.find(p => p.id === parseInt(profesionalId));
        if (diasCerradosFechas.includes(fecha) || profesionalObj?.fechas_libres?.includes(fecha)) {
            return [];
        }

        const duracionTotal = reservaEditando
            ? Number(serviciosSeleccionados[0]?.duracion || reservaEditando?.duracion || 60)
            : serviciosSeleccionados.reduce((total, servicio) => total + Number(servicio.duracion || 60), 0);
        const configGlobal = window.salonConfig ? await window.salonConfig.get() : {};
        const minAntelacionHoras = configGlobal?.min_antelacion_horas ?? 2;
        const maxAntelacionDias = configGlobal?.max_antelacion_dias ?? 30;

        const horarios = await window.salonConfig.getHorariosProfesional(profesionalId);
        const [year, month, day] = fecha.split('-').map(Number);
        const fechaLocal = new Date(year, month - 1, day);
        const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const diaSemana = nombresDias[fechaLocal.getDay()];
        const diasTrabajo = horarios.dias || [];
        let horasTrabajo = horarios.horariosPorDia?.[diaSemana] || horarios.horas || [];
        const descansosDelDia = horarios.descansosPorDia?.[diaSemana] || [];

        if (diasTrabajo.length > 0 && !diasTrabajo.includes(diaSemana)) return [];
        if (horasTrabajo.length === 0) return [];

        const primerServicio = serviciosSeleccionados[0];
        let horasTrabajoFiltradas = horasTrabajo;
        if (primerServicio?.horarios_permitidos?.length) {
            horasTrabajoFiltradas = horasTrabajo.filter(indice => servicioPermiteHorario(primerServicio, indiceToHoraLegible(indice)));
        }
        const slotsTrabajo = horasTrabajoFiltradas.map(indice => indiceToHoraLegible(indice));

        const negocioId = typeof getNegocioId === "function" ? getNegocioId() : (window.getNegocioIdFromConfig ? window.getNegocioIdFromConfig() : localStorage.getItem("negocioId"));
        const response = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=eq.${fecha}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=id,hora_inicio,hora_fin`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );

        if (!response.ok) throw new Error(await response.text());
        const reservas = (await response.json()).filter(reserva => reserva.id !== reservaEditando?.id);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const diffDias = Math.ceil((new Date(year, month - 1, day) - hoy) / (1000 * 60 * 60 * 24));
        const minFechaPermitida = new Date(Date.now() + (minAntelacionHoras * 60 * 60 * 1000));

        if (!reservaEditando && Number(maxAntelacionDias) > 0 && diffDias > Number(maxAntelacionDias)) return [];

        const disponibles = slotsTrabajo.filter(slot => {
            const [horas, minutos] = slot.split(':').map(Number);
            const slotStart = horas * 60 + minutos;
            const slotEnd = slotStart + duracionTotal;
            const fechaHoraSlot = new Date(year, month - 1, day, horas, minutos, 0);

            if (!reservaEditando && fechaHoraSlot < minFechaPermitida) return false;

            if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) {
                return false;
            }

            return !reservas.some(reserva => {
                const reservaStart = timeToMinutes(reserva.hora_inicio);
                const reservaEnd = timeToMinutes(reserva.hora_fin);
                return (slotStart < reservaEnd) && (slotEnd > reservaStart);
            });
        });

        if (reservaEditando?.fecha === fecha && reservaEditando?.hora_inicio) {
            disponibles.push(reservaEditando.hora_inicio);
        }

        return ordenarHorarios(disponibles);
    };

    React.useEffect(() => {
        const cargarHorarios = async () => {
            if (!nuevaReservaData.profesional_id || !nuevaReservaData.fecha || !nuevaReservaData.servicio) {
                setHorariosDisponibles([]);
                return;
            }

            try {
                const serviciosSeleccionados = getServiciosManualSeleccionados();
                if (serviciosSeleccionados.length === 0) return;
                const disponibles = await calcularHorariosDisponiblesManual(
                    nuevaReservaData.fecha,
                    nuevaReservaData.profesional_id,
                    serviciosSeleccionados
                );

                setHorariosDisponibles(disponibles);

            } catch (error) {
                console.error('Error cargando horarios:', error);
                setHorariosDisponibles([]);
            }
        };

        cargarHorarios();
    }, [nuevaReservaData.profesional_id, nuevaReservaData.fecha, nuevaReservaData.servicio, serviciosManualSeleccionados, serviciosList, reservaEditando]);

    // ============================================
    // FUNCIONES DE DISPONIBILIDAD
    // ============================================
    
    const cargarDisponibilidadMes = async (fecha, profesionalId) => {
        if (!profesionalId) return;
        
        try {
            const year = fecha.getFullYear();
            const month = fecha.getMonth();
            const serviciosSeleccionados = getServiciosManualSeleccionados();
            if (serviciosSeleccionados.length === 0 && !reservaEditando) {
                setFechasConHorarios({});
                return;
            }
            const duracion = serviciosSeleccionados.length > 0
                ? serviciosSeleccionados.reduce((total, servicio) => total + Number(servicio.duracion || 60), 0)
                : (reservaEditando?.duracion || 60);
            const configGlobal = window.salonConfig ? await window.salonConfig.get() : {};
            const minAntelacionHoras = configGlobal?.min_antelacion_horas ?? 2;
            const maxAntelacionDias = configGlobal?.max_antelacion_dias ?? 30;
            
            const horarios = await window.salonConfig.getHorariosProfesional(profesionalId);
            const horasTrabajo = horarios.horas || [];
            const diasTrabajo = horarios.dias || [];
            const horariosPorDia = horarios.horariosPorDia || {};
            const descansosPorDia = horarios.descansosPorDia || {};
            
            const primerDia = new Date(year, month, 1);
            const ultimoDia = new Date(year, month + 1, 0);
            
            const fechaInicio = primerDia.toISOString().split('T')[0];
            const fechaFin = ultimoDia.toISOString().split('T')[0];
            
            const negocioId = typeof getNegocioId === "function" ? getNegocioId() : (window.getNegocioIdFromConfig ? window.getNegocioIdFromConfig() : localStorage.getItem("negocioId"));
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=id,fecha,hora_inicio,hora_fin`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            if (!response.ok) throw new Error(await response.text());
            const reservas = (await response.json()).filter(reserva => reserva.id !== reservaEditando?.id);
            
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) {
                    reservasPorFecha[r.fecha] = [];
                }
                reservasPorFecha[r.fecha].push(r);
            });
            
            const disponibilidad = {};
            const conteosDisponibles = {};
            const diasEnMes = ultimoDia.getDate();
            const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const profesionalObj = profesionalesList.find(p => p.id === parseInt(profesionalId));
            const fechasLibresPersonales = profesionalObj?.fechas_libres || [];
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const minFechaPermitida = new Date(Date.now() + (minAntelacionHoras * 60 * 60 * 1000));
            
            for (let d = 1; d <= diasEnMes; d++) {
                const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                const fechaActual = new Date(year, month, d);
                const diaSemana = nombresDias[fechaActual.getDay()];
                const diffDias = Math.ceil((fechaActual - hoy) / (1000 * 60 * 60 * 24));

                if (!reservaEditando && Number(maxAntelacionDias) > 0 && diffDias > Number(maxAntelacionDias)) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }

                if (diasCerradosFechas.includes(fechaStr) || fechasLibresPersonales.includes(fechaStr)) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }

                if (diasTrabajo.length > 0 && !diasTrabajo.includes(diaSemana)) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }

                let horariosDelDia = horariosPorDia[diaSemana] || horasTrabajo;
                const primerServicio = serviciosSeleccionados[0];
                if (primerServicio?.horarios_permitidos?.length) {
                    horariosDelDia = horariosDelDia.filter(indice => servicioPermiteHorario(primerServicio, indiceToHoraLegible(indice)));
                }

                if (horariosDelDia.length === 0) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }

                const descansosDelDia = descansosPorDia[diaSemana] || [];
                const reservasDia = reservasPorFecha[fechaStr] || [];
                const tieneSlotLibre = horariosDelDia.some(horaIndice => {
                    const slotStr = indiceToHoraLegible(horaIndice);
                    const slotStart = timeToMinutes(slotStr);
                    const slotEnd = slotStart + duracion;
                    const fechaHoraSlot = new Date(year, month, d, Math.floor(slotStart / 60), slotStart % 60, 0);

                    if (!reservaEditando && fechaHoraSlot < minFechaPermitida) {
                        return false;
                    }

                    if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) {
                        return false;
                    }

                    return !reservasDia.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });
                });
                
                disponibilidad[fechaStr] = tieneSlotLibre;
            }
            
            setFechasConHorarios(disponibilidad);
        } catch (error) {
            console.error('Error cargando disponibilidad:', error);
        }
    };

    const cargarDisponibilidadDelMes = async (fecha, profesionalId = null) => {
        if (!profesionalId && profesionalesList.length > 0) {
            profesionalId = profesionalesList[0]?.id;
        }
        if (!profesionalId) {
            setDisponibilidadDias({});
            setDisponibilidadConteos({});
            return;
        }
        
        setDisponibilidadCargando(true);
        try {
            const year = fecha.getFullYear();
            const month = fecha.getMonth();
            
            const horarios = await window.salonConfig.getHorariosProfesional(profesionalId);
            const horasTrabajo = horarios.horas || [];
            const diasTrabajo = horarios.dias || [];
            const horariosPorDia = horarios.horariosPorDia || {};
            const descansosPorDia = horarios.descansosPorDia || {};
            
            console.log('=========================================');
            console.log(`📊 Profesional ID: ${profesionalId}`);
            console.log(`📊 Horarios por día:`, horariosPorDia);
            console.log('=========================================');
            
            const profesionalObj = profesionalesList.find(p => p.id === profesionalId);
            const fechasLibresPersonales = profesionalObj?.fechas_libres || [];
            
            const primerDia = new Date(year, month, 1);
            const ultimoDia = new Date(year, month + 1, 0);
            
            const fechaInicio = primerDia.toISOString().split('T')[0];
            const fechaFin = ultimoDia.toISOString().split('T')[0];
            
            const negocioId = typeof getNegocioId === "function" ? getNegocioId() : (window.getNegocioIdFromConfig ? window.getNegocioIdFromConfig() : localStorage.getItem("negocioId"));
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=fecha,hora_inicio,hora_fin`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            if (!response.ok) throw new Error(await response.text());
            const reservas = await response.json();
            
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) {
                    reservasPorFecha[r.fecha] = [];
                }
                reservasPorFecha[r.fecha].push(r);
            });
            
            const disponibilidad = {};
            const conteosDisponibles = {};
            const diasEnMes = ultimoDia.getDate();
            const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            
            for (let d = 1; d <= diasEnMes; d++) {
                const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                
                if (fechasLibresPersonales.includes(fechaStr)) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }
                
                const fechaActual = new Date(year, month, d);
                const diaSemana = nombresDias[fechaActual.getDay()];
                
                const horariosDelDia = (horariosPorDia[diaSemana] && horariosPorDia[diaSemana].length ? horariosPorDia[diaSemana] : horasTrabajo) || [];
                const descansosDelDia = descansosPorDia[diaSemana] || [];
                
                if (horariosDelDia.length === 0) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }
                
                let trabajaEsteDia = true;
                if (diasTrabajo.length > 0 && !diasTrabajo.includes(diaSemana)) {
                    trabajaEsteDia = false;
                }
                
                if (!trabajaEsteDia) {
                    disponibilidad[fechaStr] = false;
                    conteosDisponibles[fechaStr] = 0;
                    continue;
                }
                
                let horariosOcupados = 0;
                let horariosDisponiblesDia = 0;
                const reservasDia = reservasPorFecha[fechaStr] || [];
                
                const hoy = getCurrentLocalDate();
                if (fechaStr === hoy) {
                    console.log(`\n📅 Analizando HOY (${fechaStr}) - ${diaSemana}:`);
                    console.log(`   Horarios del día:`, horariosDelDia.map(i => indiceToHoraLegible(i)));
                    console.log(`   Reservas del día: ${reservasDia.length}`);
                }
                
                for (const horaIndice of horariosDelDia) {
                    const slotStr = indiceToHoraLegible(horaIndice);
                    const [horas, minutos] = slotStr.split(':').map(Number);
                    const slotStart = horas * 60 + minutos;
                    const slotEnd = slotStart + 60;

                    if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) {
                        continue;
                    }

                    horariosDisponiblesDia++;
                    
                    const tieneConflicto = reservasDia.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });
                    
                    if (tieneConflicto) {
                        horariosOcupados++;
                        if (fechaStr === hoy) {
                            console.log(`   ❌ Horario ${slotStr} está OCUPADO`);
                        }
                    } else {
                        if (fechaStr === hoy) {
                            console.log(`   ✅ Horario ${slotStr} está LIBRE`);
                        }
                    }
                }
                
                const tieneDisponibilidad = horariosDisponiblesDia > 0 && horariosOcupados < horariosDisponiblesDia;
                
                if (fechaStr === hoy) {
                    console.log(`   📊 Total horarios del día: ${horariosDelDia.length}, Ocupados: ${horariosOcupados}`);
                    console.log(`   🟢 Disponible: ${tieneDisponibilidad}\n`);
                }
                
                disponibilidad[fechaStr] = tieneDisponibilidad;
                conteosDisponibles[fechaStr] = Math.max(0, horariosDisponiblesDia - horariosOcupados);
            }
            
            setDisponibilidadDias(disponibilidad);
            setDisponibilidadConteos(conteosDisponibles);
        } catch (error) {
            console.error('Error cargando disponibilidad del mes:', error);
        } finally {
            setDisponibilidadCargando(false);
        }
    };

    const cargarDisponibilidadSemanal = async (fecha, profesionalId = null) => {
        if (!profesionalId && profesionalesList.length > 0) profesionalId = profesionalesList[0]?.id;
        if (!profesionalId) {
            setDisponibilidadSemanal([]);
            return;
        }

        setDisponibilidadCargando(true);
        try {
            const profesionalObj = profesionalesList.find(p => p.id === parseInt(profesionalId));
            const horarios = await window.salonConfig.getHorariosProfesional(profesionalId);
            const horasTrabajo = horarios.horas || [];
            const diasTrabajo = horarios.dias || [];
            const horariosPorDia = horarios.horariosPorDia || {};
            const descansosPorDia = horarios.descansosPorDia || {};
            const fechasLibresPersonales = profesionalObj?.fechas_libres || [];
            const diasSemanaVista = getDiasSemanaDisponibilidad(fecha);
            const fechaInicio = formatDate(diasSemanaVista[0]);
            const fechaFin = formatDate(diasSemanaVista[6]);
            const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const negocioId = typeof getNegocioId === "function" ? getNegocioId() : (window.getNegocioIdFromConfig ? window.getNegocioIdFromConfig() : localStorage.getItem("negocioId"));
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&profesional_id=eq.${profesionalId}&estado=neq.Cancelado&select=fecha,hora_inicio,hora_fin,cliente_nombre,servicio,estado`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );

            if (!response.ok) throw new Error(await response.text());
            const reservas = await response.json();
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) reservasPorFecha[r.fecha] = [];
                reservasPorFecha[r.fecha].push(r);
            });

            const semana = diasSemanaVista.map(dia => {
                const fechaStr = formatDate(dia);
                const diaSemana = nombresDias[dia.getDay()];
                const reservasDia = reservasPorFecha[fechaStr] || [];
                const horariosDelDia = (horariosPorDia[diaSemana] && horariosPorDia[diaSemana].length ? horariosPorDia[diaSemana] : horasTrabajo) || [];
                const descansosDelDia = descansosPorDia[diaSemana] || [];
                const esCerrado = diasCerradosFechas.includes(fechaStr);
                const esPasado = fechaStr < getCurrentLocalDate();
                const esLibre = fechasLibresPersonales.includes(fechaStr);
                const trabaja = !(diasTrabajo.length > 0 && !diasTrabajo.includes(diaSemana));

                const turnos = horariosDelDia.map(horaIndice => {
                    const hora = indiceToHoraLegible(horaIndice);
                    const slotStart = timeToMinutes(hora);
                    const slotEnd = slotStart + 60;

                    if (esCerrado) return { hora, estado: 'Cerrado', detalle: 'Local cerrado' };
                    if (esPasado) return { hora, estado: 'Pasado', detalle: 'Fecha pasada' };
                    if (esLibre) return { hora, estado: 'Libre', detalle: `${profesionalObj?.nombre || 'Profesional'} no trabaja` };
                    if (!trabaja) return { hora, estado: 'No trabaja', detalle: 'Dia no laboral' };
                    if (slotTieneDescanso(slotStart, slotEnd, descansosDelDia)) return { hora, estado: 'Descanso', detalle: 'Descanso configurado' };

                    const reserva = reservasDia.find(item => {
                        const reservaStart = timeToMinutes(item.hora_inicio);
                        const reservaEnd = timeToMinutes(item.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });

                    if (reserva) {
                        return { hora, estado: 'Ocupado', detalle: `${reserva.cliente_nombre || 'Cliente'} - ${reserva.servicio || 'Servicio'}` };
                    }

                    return { hora, estado: 'Disponible', detalle: 'Disponible' };
                });

                return {
                    fecha: fechaStr,
                    diaNombre: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
                    turnos,
                    libres: turnos.filter(t => t.estado === 'Disponible').length
                };
            });

            setDisponibilidadSemanal(semana);
        } catch (error) {
            console.error('Error cargando disponibilidad semanal:', error);
            setDisponibilidadSemanal([]);
        } finally {
            setDisponibilidadCargando(false);
        }
    };

    // ============================================
    // FUNCIONES DEL CALENDARIO
    // ============================================
    
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }
        
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        
        return days;
    };
    
    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    
    const isDateAvailable = (date) => {
        if (!date || !nuevaReservaData.profesional_id) return false;
        
        const fechaStr = formatDate(date);
        
        if (diasCerradosFechas.includes(fechaStr)) {
            return false;
        }
        
        const hoy = getCurrentLocalDate();
        if (fechaStr < hoy) {
            return false;
        }
        
        const profesional = profesionalesList.find(p => p.id === parseInt(nuevaReservaData.profesional_id));
        if (profesional && profesional.fechas_libres && profesional.fechas_libres.includes(fechaStr)) {
            return false;
        }
        
        const diaSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][date.getDay()];
        if (diasLaborales.length > 0 && !diasLaborales.includes(diaSemana)) {
            return false;
        }
        
        return fechasConHorarios[fechaStr] || false;
    };
    
    const handleDateSelect = (date) => {
        if (isDateAvailable(date)) {
            const fechaStr = formatDate(date);
            setNuevaReservaData({...nuevaReservaData, fecha: fechaStr, hora_inicio: ''});
        }
    };
    
    const cambiarMes = (direccion) => {
        const nuevaFecha = new Date(currentDate);
        nuevaFecha.setMonth(currentDate.getMonth() + direccion);
        setCurrentDate(nuevaFecha);
        
        if (nuevaReservaData.profesional_id) {
            cargarDisponibilidadMes(nuevaFecha, nuevaReservaData.profesional_id);
        }
    };
    
    const cambiarMesDisponibilidad = (direccion) => {
        const nuevaFecha = new Date(disponibilidadFecha);
        nuevaFecha.setMonth(disponibilidadFecha.getMonth() + direccion);
        setDisponibilidadFecha(nuevaFecha);
        if (modoDisponibilidad === 'semana') {
            cargarDisponibilidadSemanal(nuevaFecha, profesionalSeleccionadoDispo);
        } else {
            cargarDisponibilidadDelMes(nuevaFecha, profesionalSeleccionadoDispo);
        }
    };

    const inicioSemana = (date) => {
        const base = new Date(date);
        base.setHours(0, 0, 0, 0);
        const dia = base.getDay();
        const diff = dia === 0 ? -6 : 1 - dia;
        base.setDate(base.getDate() + diff);
        return base;
    };

    const getDiasSemanaDisponibilidad = (date) => {
        const inicio = inicioSemana(date);
        return Array.from({ length: 7 }, (_, index) => {
            const dia = new Date(inicio);
            dia.setDate(inicio.getDate() + index);
            return dia;
        });
    };

    const cambiarSemanaDisponibilidad = (direccion) => {
        const nuevaFecha = new Date(disponibilidadFecha);
        nuevaFecha.setDate(disponibilidadFecha.getDate() + (direccion * 7));
        setDisponibilidadFecha(nuevaFecha);
        cargarDisponibilidadSemanal(nuevaFecha, profesionalSeleccionadoDispo);
    };

    const compartirDisponibilidadSemanalTexto = () => {
        const profesional = profesionalesList.find(p => p.id === parseInt(profesionalSeleccionadoDispo));
        const lineas = [
            `Disponibilidad semanal - ${nombreNegocio}`,
            profesional ? `Profesional: ${profesional.nombre}` : '',
            ''
        ].filter(Boolean);

        disponibilidadSemanal.forEach(dia => {
            const disponibles = dia.turnos.filter(t => t.estado === 'Disponible').map(t => formatTo12Hour(t.hora));
            const ocupados = dia.turnos.filter(t => t.estado === 'Ocupado').map(t => `${formatTo12Hour(t.hora)} ocupado`);
            const estado = disponibles.length > 0 ? disponibles.join(', ') : 'Sin turnos disponibles';
            lineas.push(`${dia.diaNombre} ${dia.fecha}: ${estado}`);
            if (ocupados.length > 0) lineas.push(`Ocupados: ${ocupados.join(', ')}`);
        });

        const texto = encodeURIComponent(lineas.join('\n'));
        window.open(`https://wa.me/?text=${texto}`, '_blank');
    };

    const canvasToBlob = (canvas) => new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));

    const dibujarTextoCentrado = (ctx, texto, x, y, maxWidth, lineHeight) => {
        const palabras = String(texto || '').split(' ');
        const lineas = [];
        let linea = '';

        palabras.forEach(palabra => {
            const prueba = linea ? `${linea} ${palabra}` : palabra;
            if (ctx.measureText(prueba).width > maxWidth && linea) {
                lineas.push(linea);
                linea = palabra;
            } else {
                linea = prueba;
            }
        });
        if (linea) lineas.push(linea);

        lineas.forEach((item, index) => ctx.fillText(item, x, y + (index * lineHeight)));
        return y + (lineas.length * lineHeight);
    };

    const generarImagenDisponibilidadSemanal = async () => {
        const profesional = profesionalesList.find(p => p.id === parseInt(profesionalSeleccionadoDispo));
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        const semanaInicio = disponibilidadSemanal[0]?.fecha || formatDate(getDiasSemanaDisponibilidad(disponibilidadFecha)[0]);
        const semanaFin = disponibilidadSemanal[6]?.fecha || formatDate(getDiasSemanaDisponibilidad(disponibilidadFecha)[6]);

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#fff7fb');
        gradient.addColorStop(0.45, '#ffffff');
        gradient.addColorStop(1, '#fdf2f8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#be185d';
        ctx.beginPath();
        ctx.arc(980, 120, 180, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(244,114,182,0.22)';
        ctx.beginPath();
        ctx.arc(120, 1820, 220, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#831843';
        ctx.font = '800 58px Arial';
        dibujarTextoCentrado(ctx, nombreNegocio || 'Exotic Nails by Yuly', 540, 145, 850, 64);

        ctx.fillStyle = '#374151';
        ctx.font = '700 34px Arial';
        ctx.fillText('Disponibilidad semanal', 540, 265);

        ctx.fillStyle = '#6b7280';
        ctx.font = '500 28px Arial';
        ctx.fillText(`${semanaInicio} - ${semanaFin}`, 540, 312);
        if (profesional?.nombre) {
            ctx.fillText(`Profesional: ${profesional.nombre}`, 540, 355);
        }

        const cardX = 70;
        const cardY = 430;
        const cardW = 940;
        const cardH = 1230;
        const columnW = cardW / 7;
        const radius = 34;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 14;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, radius);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        disponibilidadSemanal.forEach((dia, index) => {
            const x = cardX + (index * columnW);
            const disponibles = dia.turnos.filter(turno => turno.estado === 'Disponible');
            const headerH = 150;

            ctx.fillStyle = disponibles.length > 0 ? '#ecfdf5' : '#f3f4f6';
            ctx.beginPath();
            ctx.rect(x, cardY, columnW, headerH);
            ctx.fill();

            if (index > 0) {
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, cardY);
                ctx.lineTo(x, cardY + cardH);
                ctx.stroke();
            }

            ctx.textAlign = 'center';
            ctx.fillStyle = '#111827';
            ctx.font = '800 27px Arial';
            ctx.fillText(dia.diaNombre.slice(0, 3).toUpperCase(), x + columnW / 2, cardY + 58);
            ctx.fillStyle = '#6b7280';
            ctx.font = '600 21px Arial';
            ctx.fillText(dia.fecha.slice(5), x + columnW / 2, cardY + 94);

            const slotX = x + 12;
            let y = cardY + headerH + 42;
            const slotW = columnW - 24;
            const slotH = 82;
            const gap = 24;

            if (disponibles.length === 0) {
                ctx.strokeStyle = '#d1d5db';
                ctx.setLineDash([8, 8]);
                ctx.strokeRect(slotX, y, slotW, 190);
                ctx.setLineDash([]);
                ctx.fillStyle = '#9ca3af';
                ctx.font = '700 20px Arial';
                dibujarTextoCentrado(ctx, 'Sin turnos', x + columnW / 2, y + 90, slotW - 16, 24);
            } else {
                disponibles.slice(0, 8).forEach(turno => {
                    const g = ctx.createLinearGradient(slotX, y, slotX, y + slotH);
                    g.addColorStop(0, '#34d399');
                    g.addColorStop(1, '#16a34a');
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.roundRect(slotX, y, slotW, slotH, 22);
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    ctx.font = '900 24px Arial';
                    ctx.fillText(formatTo12Hour(turno.hora).replace(' ', ''), x + columnW / 2, y + 50);
                    y += slotH + gap;
                });
            }
        });

        ctx.fillStyle = '#831843';
        ctx.font = '800 34px Arial';
        ctx.fillText('Reserva tu turno', 540, 1740);
        ctx.fillStyle = '#6b7280';
        ctx.font = '500 26px Arial';
        ctx.fillText('Horarios sujetos a disponibilidad al momento de reservar', 540, 1790);

        ctx.fillStyle = '#be185d';
        ctx.font = '800 30px Arial';
        ctx.fillText('ByReservasRoma', 540, 1850);

        return canvas;
    };

    const compartirDisponibilidadSemanal = async () => {
        try {
            if (!disponibilidadSemanal.length) return;
            const canvas = await generarImagenDisponibilidadSemanal();
            const blob = await canvasToBlob(canvas);
            if (!blob) {
                compartirDisponibilidadSemanalTexto();
                return;
            }

            const file = new File([blob], `disponibilidad-${nombreNegocio || 'salon'}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
                await navigator.share({
                    title: `Disponibilidad semanal - ${nombreNegocio}`,
                    text: `Disponibilidad semanal de ${nombreNegocio}`,
                    files: [file]
                });
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            link.target = '_blank';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (error) {
            console.error('Error generando imagen de disponibilidad:', error);
            compartirDisponibilidadSemanalTexto();
        }
    };

    // ============================================
    // CREAR RESERVA MANUAL
    // ============================================
    const handleCrearReservaManual = async () => {
        if (!puedeGestionarReservas) {
            alert('Tu nivel de acceso solo permite ver reservas.');
            return;
        }
        if (creandoReservaManualRef.current) return;

        if (!nuevaReservaData.cliente_nombre || !nuevaReservaData.cliente_whatsapp || 
            !nuevaReservaData.servicio || !nuevaReservaData.profesional_id || 
            !nuevaReservaData.fecha || !nuevaReservaData.hora_inicio) {
            alert('Completá todos los campos');
            return;
        }

        creandoReservaManualRef.current = true;
        setCreandoReservaManual(true);

        try {
            const serviciosSeleccionados = getServiciosManualSeleccionados();
            if (serviciosSeleccionados.length === 0) {
                alert('Servicio no encontrado');
                return;
            }
            
            const profesional = profesionalesList.find(p => p.id === parseInt(nuevaReservaData.profesional_id));
            if (!profesional) {
                alert('Profesional no encontrado');
                return;
            }
            
            const horariosVigentes = await calcularHorariosDisponiblesManual(
                nuevaReservaData.fecha,
                nuevaReservaData.profesional_id,
                serviciosSeleccionados
            );
            if (!horariosVigentes.includes(nuevaReservaData.hora_inicio)) {
                setHorariosDisponibles(horariosVigentes);
                alert('Ese horario ya no esta disponible. Elegi otro horario.');
                return;
            }

            const servicio = reservaEditando ? serviciosSeleccionados[0] : null;
            const duracionTotal = serviciosSeleccionados.reduce((total, item) => total + Number(item.duracion || 60), 0);
            const endTime = calculateEndTime(nuevaReservaData.hora_inicio, reservaEditando ? servicio.duracion : duracionTotal);
            const configNegocio = await window.cargarConfiguracionNegocio();
            const requiereAnticipo = nuevaReservaData.requiereAnticipo;
            
            const bookingData = {
                cliente_nombre: nuevaReservaData.cliente_nombre,
                cliente_whatsapp: `53${nuevaReservaData.cliente_whatsapp.replace(/\D/g, '').replace(/^53(?=\d{8,}$)/, '')}`,
                servicio: nuevaReservaData.servicio,
                duracion: reservaEditando ? servicio.duracion : duracionTotal,
                profesional_id: nuevaReservaData.profesional_id,
                profesional_nombre: profesional.nombre,
                fecha: nuevaReservaData.fecha,
                hora_inicio: nuevaReservaData.hora_inicio,
                hora_fin: endTime,
                estado: requiereAnticipo ? "Pendiente" : "Reservado"
            };

            console.log('Creando reserva manual. Requiere anticipo:', requiereAnticipo);
            
            let result;
            if (reservaEditando) {
                const response = await fetch(
                    `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${getNegocioId()}&id=eq.${reservaEditando.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            servicio: bookingData.servicio,
                            duracion: bookingData.duracion,
                            profesional_id: bookingData.profesional_id,
                            profesional_nombre: bookingData.profesional_nombre,
                            fecha: bookingData.fecha,
                            hora_inicio: bookingData.hora_inicio,
                            hora_fin: bookingData.hora_fin
                        })
                    }
                );

                if (!response.ok) {
                    result = { success: false, error: await response.text() };
                } else {
                    const data = await response.json();
                    result = { success: true, data: Array.isArray(data) ? data[0] : data };
                }
            } else {
                const reservasCreadas = [];
                let horaActual = nuevaReservaData.hora_inicio;

                for (const servicioSeleccionado of serviciosSeleccionados) {
                    const horaFin = calculateEndTime(horaActual, servicioSeleccionado.duracion);
                    const reservaServicio = {
                        ...bookingData,
                        servicio: servicioSeleccionado.nombre,
                        duracion: servicioSeleccionado.duracion,
                        hora_inicio: horaActual,
                        hora_fin: horaFin
                    };

                    const resultadoServicio = await createBooking(reservaServicio);
                    if (!resultadoServicio.success || !resultadoServicio.data) {
                        result = resultadoServicio;
                        break;
                    }

                    reservasCreadas.push(resultadoServicio.data);
                    horaActual = horaFin;
                }

                if (reservasCreadas.length === serviciosSeleccionados.length) {
                    result = {
                        success: true,
                        data: {
                            ...reservasCreadas[0],
                            servicio: reservasCreadas.map(reserva => reserva.servicio).join(' + '),
                            duracion: duracionTotal,
                            hora_inicio: reservasCreadas[0].hora_inicio,
                            hora_fin: reservasCreadas[reservasCreadas.length - 1].hora_fin,
                            _reservasGrupo: reservasCreadas
                        }
                    };
                } else if (reservasCreadas.length > 0) {
                    result = { success: true, data: reservasCreadas[0], parcial: true };
                }
            }
            
            if (result.success && result.data) {
                if (!reservaEditando && typeof window.crearCliente === 'function') {
                    try {
                        await window.crearCliente(bookingData.cliente_nombre, bookingData.cliente_whatsapp);
                        await loadClientesRegistrados?.();
                    } catch (clienteError) {
                        console.error('Error registrando cliente manual:', clienteError);
                    }
                }

                alert(result.parcial
                    ? 'Se crearon algunos servicios, pero uno falló. Revisa la agenda.'
                    : `Reserva creada exitosamente como "${result.data.estado}"`);
                
                try {
                    if (reservaEditando) {
                        const fechaConDia = window.formatFechaCompleta ? window.formatFechaCompleta(result.data.fecha) : result.data.fecha;
                        const horaFormateada = window.formatTo12Hour ? window.formatTo12Hour(result.data.hora_inicio) : result.data.hora_inicio;
                        const lineaCalendario = typeof generarLineaCalendarioCliente === 'function' ? generarLineaCalendarioCliente(result.data) : '';
                        const mensajeCliente = `Hola *${result.data.cliente_nombre}*, tu turno fue reprogramado.\n\n*Servicio:* ${result.data.servicio}\n*Fecha:* ${fechaConDia}\n*Hora:* ${horaFormateada}\n*Profesional:* ${result.data.profesional_nombre || result.data.trabajador_nombre}\n${lineaCalendario}\nTe esperamos.`;
                        window.enviarWhatsApp(result.data.cliente_whatsapp, mensajeCliente);
                    } else if (requiereAnticipo) {
                        if (window.enviarMensajePago) {
                            await window.enviarMensajePago(result.data, configNegocio);
                        }
                    } else {
                        if (window.enviarConfirmacionReserva) {
                            await window.enviarConfirmacionReserva(result.data, configNegocio);
                        }
                    }
                } catch (whatsappError) {
                    console.error('Error enviando WhatsApp:', whatsappError);
                    alert('Reserva creada, pero hubo un error al enviar el mensaje al cliente.');
                }
                
                setShowNuevaReservaModal(false);
                setReservaEditando(null);
                setNuevaReservaData({
                    cliente_nombre: '',
                    cliente_whatsapp: '',
                    servicio: '',
                    profesional_id: userRole === 'profesional' ? profesional?.id : '',
                    fecha: '',
                    hora_inicio: '',
                    requiereAnticipo: false
                });
                setServiciosManualSeleccionados([]);
                setBusquedaClienteManual('');
                
                fetchBookings();
            } else {
                alert('Error al crear la reserva: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            console.error('Error creando reserva:', error);
            alert('Error al crear la reserva: ' + error.message);
        } finally {
            creandoReservaManualRef.current = false;
            setCreandoReservaManual(false);
        }
    };

    // ============================================
    // FUNCIONES DE CLIENTES
    // ============================================
    
    const loadClientesRegistrados = async () => {
        console.log('Cargando clientes registrados...');
        setCargandoClientes(true);
        try {
            if (typeof window.getClientesRegistrados !== 'function') {
                console.error('getClientesRegistrados no esta definida');
                setClientesRegistrados([]);
                return;
            }
            
            const registrados = await window.getClientesRegistrados();
            console.log('Registrados obtenidos:', registrados.length);
            
            if (Array.isArray(registrados)) {
                setClientesRegistrados(registrados);
            } else {
                console.error('a registrados no es un array:', registrados);
                setClientesRegistrados([]);
            }
        } catch (error) {
            console.error('Error cargando registrados:', error);
            setClientesRegistrados([]);
        } finally {
            setCargandoClientes(false);
        }
    };

    const loadClientesBloqueados = async () => {
        setCargandoBloqueados(true);
        try {
            const bloqueados = await window.getClientesBloqueados?.();
            setClientesBloqueados(Array.isArray(bloqueados) ? bloqueados : []);
        } catch (error) {
            console.error('Error cargando lista negra:', error);
            setClientesBloqueados([]);
        } finally {
            setCargandoBloqueados(false);
        }
    };

    const handleBloquearCliente = async (cliente = null) => {
        if (!puedeGestionarAvanzado) {
            alert('No tenés permiso para bloquear clientes.');
            return;
        }
        const nombre = cliente?.nombre || nuevoBloqueo.nombre;
        const whatsapp = cliente?.whatsapp || nuevoBloqueo.whatsapp;
        const motivo = cliente ? prompt('Motivo del bloqueo (opcional):', '') : nuevoBloqueo.motivo;

        if (!whatsapp) {
            alert('Escribe el WhatsApp del cliente.');
            return;
        }

        if (!confirm(`Bloquear al cliente +${String(whatsapp).replace(/\D/g, '')}?`)) return;

        const ok = await window.bloquearCliente?.({ nombre, whatsapp, motivo });
        if (ok) {
            setNuevoBloqueo({ nombre: '', whatsapp: '', motivo: '' });
            await loadClientesRegistrados();
            await loadClientesBloqueados();
            alert('Cliente bloqueado. Ya no podrá registrarse ni reservar.');
        } else {
            alert('No se pudo bloquear el cliente. Revisa que la tabla clientes_bloqueados exista en Supabase.');
        }
    };

    const handleDesbloquearCliente = async (whatsapp) => {
        if (!puedeGestionarAvanzado) {
            alert('No tenés permiso para desbloquear clientes.');
            return;
        }
        if (!confirm(`Desbloquear al cliente +${String(whatsapp).replace(/\D/g, '')}?`)) return;
        const ok = await window.desbloquearCliente?.(whatsapp);
        if (ok) {
            await loadClientesBloqueados();
            alert('Cliente desbloqueado.');
        } else {
            alert('No se pudo desbloquear el cliente.');
        }
    };

    const handleEliminarCliente = async (whatsapp) => {
        if (!puedeGestionarAvanzado) {
            alert('No tenés permiso para eliminar clientes.');
            return;
        }
        if (!confirm('¿Seguro que querés eliminar este cliente? Perderá el acceso a la app.')) return;
        console.log('🗑️ Eliminando cliente:', whatsapp);
        try {
            if (typeof window.eliminarCliente !== 'function') {
                alert('Error: Función no disponible');
                return;
            }
            const resultado = await window.eliminarCliente(whatsapp);
            if (resultado) {
                await loadClientesRegistrados();
                alert(`Cliente eliminado`);
            }
        } catch (error) {
            console.error('Error eliminando cliente:', error);
            alert('Error al eliminar cliente');
        }
    };

    // ============================================
    // FUNCIONES DE RESERVAS
    // ============================================
    const fetchBookings = async () => {
        console.log('fetchBookings - INICIANDO CARGA');
        setLoading(true);
        try {
            let data;
            
            if (userRole === 'profesional' && profesional) {
                console.log(`Cargando reservas de profesional ${profesional.id}...`);
                data = await window.getReservasPorProfesional?.(profesional.id, false) || [];
            } else {
                console.log('Llamando getAllBookings...');
                data = await getAllBookings();
            }
            
            console.log('Datos recibidos en fetchBookings:', data?.length || 0);
            
            if (Array.isArray(data)) {
                data.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));
                
                await marcarTurnosCompletados();
                
                if (userRole === 'profesional' && profesional) {
                    data = await window.getReservasPorProfesional?.(profesional.id, false) || [];
                } else {
                    data = await getAllBookings();
                }
                
                console.log('RESERVAS CARGADAS:', data.length);
                console.log('Rango de fechas:', {
                    primera: data.length > 0 ? data[data.length-1]?.fecha : 'sin datos',
                    ultima: data.length > 0 ? data[0]?.fecha : 'sin datos'
                });
                
                setBookings(Array.isArray(data) ? data : []);
            } else {
                setBookings([]);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            alert('Error al cargar las reservas');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        const intervalo = setInterval(() => {
            console.log('🔎 Verificando turnos para completar...');
            
            marcarTurnosCompletados().then(() => {
                fetchBookings();
            });
            
        }, 60000);
        
        return () => clearInterval(intervalo);
    }, []);

    React.useEffect(() => {
        fetchBookings();

        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 2)) {
            loadClientesRegistrados();
            loadClientesBloqueados();
        }
        
        console.log('Verificando auth:', {
            userRole,
            userNivel,
            profesional
        });
    }, [userRole, userNivel, profesional]);

    // ============================================
    // FUNCIÓN PARA CONFIRMAR PAGO
    // ============================================
    const confirmarPago = async (id, bookingData) => {
        if (!puedeGestionarReservas) {
            alert('Tu nivel de acceso solo permite ver reservas.');
            return;
        }
        const reservasGrupo = bookingData?._reservasGrupo || [];
        if (bookingData?._grupoVisual && reservasGrupo.length > 1) {
            if (!confirm(`Confirmar que se recibió el pago de ${bookingData.cliente_nombre}? Los ${reservasGrupo.length} servicios pasarán a "Reservado".`)) return;

            try {
                for (const reserva of reservasGrupo) {
                    const response = await fetch(
                        `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${getNegocioId()}&id=eq.${reserva.id}`,
                        {
                            method: 'PATCH',
                            headers: {
                                'apikey': window.SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ estado: 'Reservado' })
                        }
                    );

                    if (!response.ok) {
                        throw new Error('Error al confirmar pago del grupo');
                    }
                }

                const configNegocio = await window.cargarConfiguracionNegocio();
                const fechaConDia = window.formatFechaCompleta ?
                    window.formatFechaCompleta(bookingData.fecha) :
                    bookingData.fecha;
                const horaFormateada = window.formatTo12Hour ?
                    window.formatTo12Hour(bookingData.hora_inicio) :
                    bookingData.hora_inicio;
                const nombreNegocio = configNegocio?.nombre || (window.getNombreNegocio ? await window.getNombreNegocio() : 'Mi Negocio');
                const lineaCalendario = typeof generarLineaCalendarioCliente === 'function' ? generarLineaCalendarioCliente(bookingData) : '';

                const mensajeCliente =
`*${nombreNegocio} - Turno Confirmado*

Hola *${bookingData.cliente_nombre}*, tu turno ha sido CONFIRMADO.

*Fecha:* ${fechaConDia}
*Hora:* ${horaFormateada}
*Servicios:* ${bookingData.servicio}
*Profesionales:* ${bookingData.profesional_nombre || bookingData.trabajador_nombre}

*Pago recibido correctamente*

${lineaCalendario}

Te esperamos.
Cualquier cambio, podés cancelarlo desde la app con hasta 1 hora de anticipación.`;

                window.enviarWhatsApp(bookingData.cliente_whatsapp, mensajeCliente);

                alert('Pago confirmado. Grupo de servicios reservado y cliente notificada.');
                fetchBookings();
                return;
            } catch (error) {
                console.error('Error confirmando pago del grupo:', error);
                alert('Error al confirmar pago del grupo');
                return;
            }
        }

        if (!confirm(`Confirmar que se recibió el pago de ${bookingData.cliente_nombre}? El turno pasará a "Reservado".`)) return;

        try {
            console.log(`Confirmando pago para reserva ${id}`);

            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${getNegocioId()}&id=eq.${id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ estado: 'Reservado' })
                }
            );

            if (!response.ok) {
                throw new Error('Error al confirmar pago');
            }

            console.log('Enviando confirmacion de turno al cliente...');

            const configNegocio = await window.cargarConfiguracionNegocio();
            const fechaConDia = window.formatFechaCompleta ?
                window.formatFechaCompleta(bookingData.fecha) :
                bookingData.fecha;
            const horaFormateada = window.formatTo12Hour ?
                window.formatTo12Hour(bookingData.hora_inicio) :
                bookingData.hora_inicio;
            const nombreNegocio = configNegocio?.nombre || (window.getNombreNegocio ? await window.getNombreNegocio() : 'Mi Negocio');
            const lineaCalendario = typeof generarLineaCalendarioCliente === 'function' ? generarLineaCalendarioCliente(bookingData) : '';

            const mensajeCliente =
`*${nombreNegocio} - Turno Confirmado*

Hola *${bookingData.cliente_nombre}*, tu turno ha sido CONFIRMADO.

*Fecha:* ${fechaConDia}
*Hora:* ${horaFormateada}
*Servicio:* ${bookingData.servicio}
*Profesional:* ${bookingData.profesional_nombre || bookingData.trabajador_nombre}

*Pago recibido correctamente*

${lineaCalendario}

Te esperamos.
Cualquier cambio, podés cancelarlo desde la app con hasta 1 hora de anticipación.`;

            window.enviarWhatsApp(bookingData.cliente_whatsapp, mensajeCliente);

            alert('Pago confirmado. Turno reservado y cliente notificado.');
            fetchBookings();

        } catch (error) {
            console.error('Error confirmando pago:', error);
            alert('Error al confirmar el pago');
        }
    };


    // FUNCIÓN PARA BORRAR TODAS LAS RESERVAS CANCELADAS
    // ============================================
    const borrarCanceladas = async () => {
        if (!puedeGestionarAvanzado) {
            alert('No tenés permiso para borrar reservas canceladas.');
            return;
        }
        if (!confirm('Estas segura de querer borrar TODAS las reservas canceladas? Esta accion no se puede deshacer.')) return;
        
        try {
            const negocioId = getNegocioId();
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&estado=eq.Cancelado`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Error al borrar:', error);
                alert('Error al borrar las reservas canceladas');
                return;
            }
            
            alert(`Se borraron todas las reservas canceladas correctamente`);
            fetchBookings();
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al conectar con el servidor');
        }
    };

    const eliminarReservaHistorial = async (bookingData) => {
        if (!puedeGestionarAvanzado) {
            alert('No tenes permiso para eliminar citas del historial.');
            return;
        }

        const estado = bookingData?.estado;
        if (estado !== 'Cancelado' && estado !== 'Completado' && estado !== 'Ausente') {
            alert('Solo se pueden eliminar citas canceladas, completadas o ausentes.');
            return;
        }

        const reservasGrupo = bookingData?._reservasGrupo || [];
        const ids = reservasGrupo.length > 0 ? reservasGrupo.map(reserva => reserva.id) : [bookingData.id];
        const detalle = reservasGrupo.length > 1 ? `la cita completa (${reservasGrupo.length} servicios)` : 'esta cita';
        if (!confirm(`Eliminar ${detalle} del historial? Esta accion no se puede deshacer.`)) return;

        try {
            const negocioId = getNegocioId();
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=in.(${ids.join(',')})`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error('Error eliminando cita:', await response.text());
                alert('Error al eliminar la cita');
                return;
            }

            alert('Cita eliminada del historial');
            fetchBookings();
        } catch (error) {
            console.error('Error eliminando cita:', error);
            alert('Error al conectar con el servidor');
        }
    };

    const abrirModalCobro = (bookingData) => {
        if (!puedeGestionarReservas) {
            alert('No tenes permiso para registrar cobros.');
            return;
        }
        if (bookingData?.estado !== 'Completado') {
            alert('Solo se puede registrar cobro real en citas completadas.');
            return;
        }

        const montoActual = Number(bookingData.monto_cobrado || 0);
        setCobroEditando(bookingData);
        setCobroForm({
            monto_cobrado: montoActual > 0 ? String(montoActual) : '',
            notas_cobro: bookingData.notas_cobro || ''
        });
    };

    const guardarCobroReal = async () => {
        if (!cobroEditando || guardandoCobro) return;

        const monto = Number(String(cobroForm.monto_cobrado || '').replace(',', '.'));
        if (Number.isNaN(monto) || monto < 0) {
            alert('Ingresa un monto cobrado valido.');
            return;
        }

        setGuardandoCobro(true);
        try {
            const negocioId = getNegocioId();
            const reservasGrupo = cobroEditando?._reservasGrupo || [];
            const reservas = reservasGrupo.length > 0 ? reservasGrupo : [cobroEditando];
            const precios = reservas.map(reserva => {
                const servicio = serviciosList.find(item => item.nombre === reserva.servicio);
                return Number(servicio?.precio || 0);
            });
            const totalPrecios = precios.reduce((total, precio) => total + precio, 0);
            let acumulado = 0;

            for (let index = 0; index < reservas.length; index++) {
                const reserva = reservas[index];
                const esUltima = index === reservas.length - 1;
                const montoReserva = reservas.length === 1
                    ? monto
                    : esUltima
                        ? Number((monto - acumulado).toFixed(2))
                        : Number((monto * (totalPrecios > 0 ? precios[index] / totalPrecios : 1 / reservas.length)).toFixed(2));
                acumulado += montoReserva;

                const response = await fetch(
                    `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=eq.${reserva.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            monto_cobrado: montoReserva,
                            notas_cobro: cobroForm.notas_cobro || null,
                            cobro_registrado_at: new Date().toISOString()
                        })
                    }
                );

                if (!response.ok) {
                    throw new Error(await response.text());
                }
            }

            alert('Cobro real guardado');
            setCobroEditando(null);
            setCobroForm({ monto_cobrado: '', notas_cobro: '' });
            fetchBookings();
        } catch (error) {
            console.error('Error guardando cobro real:', error);
            alert('Error al guardar el cobro real. Verifica que ejecutaste el SQL de cobro real.');
        } finally {
            setGuardandoCobro(false);
        }
    };

    const turnoYaPaso = (bookingData) => {
        if (!bookingData?.fecha) return false;
        const hoy = getCurrentLocalDate();
        if (bookingData.fecha < hoy) return true;
        if (bookingData.fecha > hoy) return false;
        const fin = bookingData.hora_fin || calculateEndTime(bookingData.hora_inicio, bookingData.duracion || 60);
        return timeToMinutes(fin) <= getCurrentLocalMinutes();
    };

    const marcarAusencia = async (bookingData) => {
        if (!puedeGestionarReservas) {
            alert('No tenes permiso para marcar ausencias.');
            return;
        }

        if (!turnoYaPaso(bookingData)) {
            alert('Solo se puede marcar ausencia en turnos que ya pasaron.');
            return;
        }

        const estado = bookingData?.estado;
        if (estado === 'Cancelado' || estado === 'Ausente') {
            alert('Esta cita no se puede marcar como ausencia.');
            return;
        }

        const reservasGrupo = bookingData?._reservasGrupo || [];
        const reservas = reservasGrupo.length > 0 ? reservasGrupo : [bookingData];
        const ids = reservas.map(reserva => reserva.id).filter(Boolean);
        const detalle = reservas.length > 1 ? `la cita completa (${reservas.length} servicios)` : 'esta cita';
        if (!ids.length) return;

        if (!confirm(`Marcar ${detalle} como AUSENTE?`)) return;
        const enviarMensaje = confirm('Quieres enviarle ahora el mensaje de inasistencia por WhatsApp?');

        try {
            const negocioId = getNegocioId();
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&id=in.(${ids.join(',')})`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ estado: 'Ausente' })
                }
            );

            if (!response.ok) {
                throw new Error(await response.text());
            }

            if (enviarMensaje && window.enviarMensajeInasistencia) {
                await window.enviarMensajeInasistencia(bookingData, config);
            }

            alert(enviarMensaje ? 'Ausencia marcada y WhatsApp preparado.' : 'Ausencia marcada.');
            fetchBookings();
        } catch (error) {
            console.error('Error marcando ausencia:', error);
            alert('Error al marcar la ausencia.');
        }
    };

    // ============================================
    // HANDLE CANCEL
    // ============================================
    const handleCancel = async (id, bookingData) => {
        if (!puedeGestionarReservas) {
            alert('Tu nivel de acceso solo permite ver reservas.');
            return;
        }
        const reservasGrupo = bookingData?._reservasGrupo || [];
        if (bookingData?._grupoVisual && reservasGrupo.length > 1) {
            if (!confirm(`¿Cancelar la cita completa de ${bookingData.cliente_nombre}? Se cancelarán ${reservasGrupo.length} servicios.`)) return;

            let todoOk = true;
            for (const reserva of reservasGrupo) {
                const ok = await cancelBooking(reserva.id);
                if (!ok) todoOk = false;
            }

            if (todoOk) {
                console.log('📱 Enviando notificación de cancelación del grupo por admin...');
                bookingData.cancelado_por = 'admin';

                if (window.notificarCancelacion) {
                    await window.notificarCancelacion(bookingData);
                }

                alert('Cita completa cancelada');
                fetchBookings();
            } else {
                alert('Error al cancelar uno o más servicios del grupo');
                fetchBookings();
            }
            return;
        }

        if (!confirm(`¿Cancelar reserva de ${bookingData.cliente_nombre}?`)) return;
        
        const ok = await cancelBooking(id);
        if (ok) {
            console.log('📱 Enviando notificaciones de cancelación por admin...');
            
            bookingData.cancelado_por = 'admin';
            
            if (window.notificarCancelacion) {
                await window.notificarCancelacion(bookingData);
            }
            
            alert('Reserva cancelada');
            fetchBookings();
        } else {
            alert('Error al cancelar');
        }
    };

    const handleLogout = () => {
        if (confirm('¿Cerrar sesión?')) {
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminLoginTime');
            localStorage.removeItem('profesionalAuth');
            localStorage.removeItem('profesionalLoginTime');
            localStorage.removeItem('userRole');
            localStorage.removeItem('clienteAuth');
            localStorage.removeItem('negocioId');
            
            console.log('Sesión cerrada, redirigiendo a index.html');
            window.location.href = 'index.html';
        }
    };

    // ============================================
    // FILTROS
    // ============================================
    const getFilteredBookings = () => {
        console.log('Aplicando filtros a', bookings.length, 'reservas');
        
        let filtradas = filterDate
            ? bookings.filter(b => b.fecha === filterDate)
            : [...bookings];
        
        console.log('Despues filtro fecha:', filtradas.length);
        
        let resultado;
        if (statusFilter === 'activas') {
            resultado = filtradas.filter(b => b.estado === 'Reservado');
        } else if (statusFilter === 'pendientes') {
            resultado = filtradas.filter(b => b.estado === 'Pendiente');
        } else if (statusFilter === 'completadas') {
            resultado = filtradas.filter(b => b.estado === 'Completado');
        } else if (statusFilter === 'ausentes') {
            resultado = filtradas.filter(b => b.estado === 'Ausente');
        } else if (statusFilter === 'canceladas') {
            resultado = filtradas.filter(b => b.estado === 'Cancelado');
        } else {
            resultado = filtradas;
        }
        
        console.log('Resultado final:', resultado.length);
        
        return resultado;
    };

    const activasCount = bookings.filter(b => b.estado === 'Reservado').length;
    const pendientesCount = bookings.filter(b => b.estado === 'Pendiente').length;
    const completadasCount = bookings.filter(b => b.estado === 'Completado').length;
    const ausentesCount = bookings.filter(b => b.estado === 'Ausente').length;
    const canceladasCount = bookings.filter(b => b.estado === 'Cancelado').length;
    const filteredBookings = getFilteredBookings();

    const construirResumenGrupoVisual = (grupo) => {
        if (grupo.length <= 1) return grupo[0];

        const ordenadas = [...grupo].sort((a, b) => String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || '')));
        const primera = ordenadas[0];
        const ultima = ordenadas[ordenadas.length - 1];
        const servicios = ordenadas.map(b => b.servicio).filter(Boolean);
        const profesionales = ordenadas.map(b => {
            const profesional = b.profesional_nombre || b.trabajador_nombre || 'Sin profesional';
            return `${b.servicio}: ${profesional}`;
        });
        const duracionTotal = ordenadas.reduce((total, b) => total + Number(b.duracion || Math.max(0, timeToMinutes(b.hora_fin || b.hora_inicio) - timeToMinutes(b.hora_inicio)) || 0), 0);
        const montoCobradoTotal = ordenadas.reduce((total, b) => total + Number(b.monto_cobrado || 0), 0);
        const notasCobro = ordenadas.map(b => b.notas_cobro).filter(Boolean).join(' | ');

        return {
            ...primera,
            id: primera.id,
            _grupoVisual: true,
            _reservasGrupo: ordenadas,
            _grupoVisualId: `grupo-${ordenadas.map(b => b.id).join('-')}`,
            servicio: servicios.join(' + '),
            profesional_nombre: profesionales.join(' | '),
            trabajador_nombre: profesionales.join(' | '),
            hora_inicio: primera.hora_inicio,
            hora_fin: ultima.hora_fin || calculateEndTime(ultima.hora_inicio, ultima.duracion || 60),
            duracion: duracionTotal,
            monto_cobrado: montoCobradoTotal || primera.monto_cobrado,
            notas_cobro: notasCobro || primera.notas_cobro,
            cobro_registrado_at: ordenadas.find(b => b.cobro_registrado_at)?.cobro_registrado_at || primera.cobro_registrado_at,
            estado: primera.estado
        };
    };

    const agruparReservasVisuales = (reservas) => {
        const normalizarTelefonoLocal = (phone) => String(phone || '').replace(/\D/g, '').replace(/^53/, '');
        const ordenadas = [...reservas].sort((a, b) =>
            String(a.fecha || '').localeCompare(String(b.fecha || '')) ||
            String(a.cliente_whatsapp || '').localeCompare(String(b.cliente_whatsapp || '')) ||
            String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || ''))
        );
        const grupos = [];

        ordenadas.forEach((reserva) => {
            const ultimoGrupo = grupos[grupos.length - 1];
            const ultimaReserva = ultimoGrupo ? ultimoGrupo[ultimoGrupo.length - 1] : null;
            const mismoCliente = ultimaReserva &&
                normalizarTelefonoLocal(ultimaReserva.cliente_whatsapp) === normalizarTelefonoLocal(reserva.cliente_whatsapp) &&
                String(ultimaReserva.cliente_nombre || '').trim().toLowerCase() === String(reserva.cliente_nombre || '').trim().toLowerCase();
            const esConsecutiva = ultimaReserva &&
                ultimaReserva.fecha === reserva.fecha &&
                ultimaReserva.estado === reserva.estado &&
                (ultimaReserva.hora_fin || calculateEndTime(ultimaReserva.hora_inicio, ultimaReserva.duracion || 60)) === reserva.hora_inicio;

            if (mismoCliente && esConsecutiva) {
                ultimoGrupo.push(reserva);
            } else {
                grupos.push([reserva]);
            }
        });

        return grupos
            .map(construirResumenGrupoVisual)
            .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')) || String(a.hora_inicio || '').localeCompare(String(b.hora_inicio || '')));
    };

    const filteredVisualBookings = agruparReservasVisuales(filteredBookings)
        .sort((a, b) => `${b.fecha || ''} ${b.hora_inicio || ''}`.localeCompare(`${a.fecha || ''} ${a.hora_inicio || ''}`));

    const startOfWeek = (date) => {
        const base = new Date(date);
        const day = base.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        base.setDate(base.getDate() + diff);
        base.setHours(0, 0, 0, 0);
        return base;
    };

    const addDays = (date, daysToAdd) => {
        const next = new Date(date);
        next.setDate(next.getDate() + daysToAdd);
        return next;
    };

    const agendaWeekStart = startOfWeek(agendaDate);
    const agendaDays = Array.from({ length: 7 }, (_, index) => addDays(agendaWeekStart, index));
    const agendaStartStr = formatDate(agendaDays[0]);
    const agendaEndStr = formatDate(agendaDays[6]);
    const agendaBookings = agruparReservasVisuales(bookings
        .filter(b => b.fecha >= agendaStartStr && b.fecha <= agendaEndStr && b.estado !== 'Cancelado')
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio)));
    const agendaDateStr = formatDate(agendaDate);
    const agendaDayBookings = agendaBookings.filter(b => b.fecha === agendaDateStr);
    const agendaVisibleBookings = agendaMode === 'dia' ? agendaDayBookings : agendaBookings;
    const agendaToday = getCurrentLocalDate();
    const agendaHours = Array.from({ length: 14 }, (_, index) => index + 7);
    const agendaStartMinutes = 7 * 60;
    const agendaPxPerMinute = 1.2;
    const agendaGridHeight = 14 * 60 * agendaPxPerMinute;
    const agendaStatusStyle = {
        Reservado: 'bg-pink-500 border-pink-600 text-white',
        Pendiente: 'bg-amber-400 border-amber-500 text-amber-950',
        Completado: 'bg-emerald-500 border-emerald-600 text-white',
        Ausente: 'bg-slate-500 border-slate-600 text-white'
    };
    const estadoNormalizado = (estado) => String(estado || '').trim().toLowerCase();
    const puedeEditarReserva = (booking) => {
        const estado = estadoNormalizado(booking.estado);
        if (!puedeGestionarReservas) return false;
        if (userRole === 'profesional' && profesional && Number(booking.profesional_id) !== Number(profesional.id)) return false;
        return estado !== 'cancelado' && estado !== 'cancelada' && estado !== 'completado' && estado !== 'completada' && estado !== 'ausente';
    };

    const getAgendaDayBookings = (date) => {
        const dateStr = formatDate(date);
        return agendaBookings.filter(b => b.fecha === dateStr);
    };

    const getBookingEndMinutes = (booking) => {
        const start = timeToMinutes(booking.hora_inicio);
        const end = timeToMinutes(booking.hora_fin || calculateEndTime(booking.hora_inicio, booking.duracion || 60));
        return end > start ? end : start + Number(booking.duracion || 60);
    };

    const getAgendaLayoutBookings = (dayBookings = []) => {
        const sorted = [...dayBookings].sort((a, b) => {
            const startDiff = timeToMinutes(a.hora_inicio) - timeToMinutes(b.hora_inicio);
            if (startDiff !== 0) return startDiff;
            return getBookingEndMinutes(a) - getBookingEndMinutes(b);
        });

        const clusters = [];
        let cluster = [];
        let clusterEnd = -1;

        sorted.forEach(booking => {
            const start = timeToMinutes(booking.hora_inicio);
            const end = getBookingEndMinutes(booking);

            if (cluster.length === 0 || start < clusterEnd) {
                cluster.push(booking);
                clusterEnd = Math.max(clusterEnd, end);
            } else {
                clusters.push(cluster);
                cluster = [booking];
                clusterEnd = end;
            }
        });

        if (cluster.length > 0) clusters.push(cluster);

        return clusters.flatMap(group => {
            const columnEnds = [];
            const positioned = group.map(booking => {
                const start = timeToMinutes(booking.hora_inicio);
                const end = getBookingEndMinutes(booking);
                let columnIndex = columnEnds.findIndex(columnEnd => start >= columnEnd);

                if (columnIndex === -1) {
                    columnIndex = columnEnds.length;
                    columnEnds.push(end);
                } else {
                    columnEnds[columnIndex] = end;
                }

                return { ...booking, _agendaColumn: columnIndex };
            });

            const columnCount = Math.max(1, columnEnds.length);
            return positioned.map(booking => ({
                ...booking,
                _agendaColumns: columnCount
            }));
        });
    };

    const getAgendaBookingStyle = (booking) => {
        const columns = Math.max(1, booking._agendaColumns || 1);
        const column = Math.min(columns - 1, Math.max(0, booking._agendaColumn || 0));
        const widthPercent = 100 / columns;
        const leftPercent = column * widthPercent;
        const rightPercent = 100 - leftPercent - widthPercent;
        const halfGap = columns > 1 ? 3 : 0;

        return {
            top: `${getBookingTop(booking)}px`,
            height: `${getBookingHeight(booking)}px`,
            left: `calc(${leftPercent}% + 0.5rem + ${column > 0 ? halfGap : 0}px)`,
            right: `calc(${rightPercent}% + 0.5rem + ${column < columns - 1 ? halfGap : 0}px)`
        };
    };

    const getBookingTop = (booking) => {
        return Math.max(0, (timeToMinutes(booking.hora_inicio) - agendaStartMinutes) * agendaPxPerMinute);
    };

    const getBookingHeight = (booking) => {
        const start = timeToMinutes(booking.hora_inicio);
        const end = timeToMinutes(booking.hora_fin || calculateEndTime(booking.hora_inicio, booking.duracion || 60));
        return Math.max(44, (end - start) * agendaPxPerMinute - 4);
    };

    const agendaDayLayoutBookings = getAgendaLayoutBookings(agendaDayBookings);
    const agendaDayMaxColumns = Math.max(1, ...agendaDayLayoutBookings.map(b => b._agendaColumns || 1));
    const agendaDayMinWidth = Math.max(0, 72 + (agendaDayMaxColumns * 180));

    const normalizePhone = (phone) => String(phone || '').replace(/\D/g, '').replace(/^53/, '');

    const getClienteScore = (cliente) => {
        const phone = normalizePhone(cliente.whatsapp);
        const reservasCliente = bookings.filter(b => normalizePhone(b.cliente_whatsapp) === phone);
        const total = reservasCliente.length;
        const completadas = reservasCliente.filter(b => b.estado === 'Completado').length;
        const canceladas = reservasCliente.filter(b => b.estado === 'Cancelado').length;
        const pendientes = reservasCliente.filter(b => b.estado === 'Pendiente').length;
        const activas = reservasCliente.filter(b => b.estado === 'Reservado').length;
        const cancelRate = total ? Math.round((canceladas / total) * 100) : 0;
        const completionRate = total ? Math.round((completadas / total) * 100) : 0;
        const score = Math.max(0, Math.min(100, 50 + completadas * 12 + activas * 4 - canceladas * 18 - pendientes * 3));
        const sorted = [...reservasCliente].sort((a, b) => `${b.fecha} ${b.hora_inicio}`.localeCompare(`${a.fecha} ${a.hora_inicio}`));
        const ultima = sorted[0] || null;

        let label = 'Nuevo';
        let tone = 'bg-gray-100 text-gray-700 border-gray-200';
        if (total >= 3 && cancelRate >= 50) {
            label = 'Riesgo alto';
            tone = 'bg-red-50 text-red-700 border-red-200';
        } else if (score >= 80) {
            label = 'Excelente';
            tone = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (total >= 3) {
            label = 'Frecuente';
            tone = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (pendientes > 0) {
            label = 'Pendiente';
            tone = 'bg-amber-50 text-amber-700 border-amber-200';
        }

        return {
            total,
            completadas,
            canceladas,
            pendientes,
            activas,
            cancelRate,
            completionRate,
            score,
            label,
            tone,
            ultima
        };
    };

    const getAgendaTitle = () => {
        if (agendaMode === 'dia') {
            return agendaDate.toLocaleDateString('es-CU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
        return `${agendaDays[0].toLocaleDateString('es-CU', { day: 'numeric', month: 'short' })} - ${agendaDays[6].toLocaleDateString('es-CU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    };

    const getTabsDisponibles = () => {
        const tabs = [];
        tabs.push({ id: 'reservas', icono: '📅', label: userRole === 'profesional' ? 'Mis Reservas' : 'Reservas' });
        
        tabs.push({ id: 'agenda', icono: '📋', label: 'Agenda' });

        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 2)) {
            tabs.push({ id: 'configuracion', icono: '⚙️', label: 'Configuración' });
            tabs.push({ id: 'clientes', icono: '👥', label: 'Clientes' });
        }
        
        if (userRole === 'admin' || (userRole === 'profesional' && userNivel >= 3)) {
            tabs.push({ id: 'servicios', icono: '💅', label: 'Servicios' });
            tabs.push({ id: 'profesionales', icono: '👩‍💼', label: 'Profesionales' });
        }
        
        return tabs;
    };

    const abrirModalNuevaReserva = () => {
        if (!puedeGestionarReservas) {
            alert('Tu nivel de acceso solo permite ver reservas.');
            return;
        }
        setReservaEditando(null);
        setNuevaReservaData({
            cliente_nombre: '',
            cliente_whatsapp: '',
            servicio: '',
            profesional_id: userRole === 'profesional' ? profesional?.id : '',
            fecha: '',
            hora_inicio: '',
            requiereAnticipo: false
        });
        setCurrentDate(new Date());
        setDiasLaborales([]);
        setFechasConHorarios({});
        setServiciosManualSeleccionados([]);
        setBusquedaClienteManual('');
        loadClientesRegistrados();
        setShowNuevaReservaModal(true);
    };

    const abrirModalReprogramar = (booking) => {
        if (!puedeGestionarReservas) {
            alert('Tu nivel de acceso solo permite ver reservas.');
            return;
        }
        if (userRole === 'profesional' && profesional && Number(booking.profesional_id) !== Number(profesional.id)) {
            alert('Solo podés editar tus propias reservas.');
            return;
        }
        const servicio = serviciosList.find(s => s.nombre === booking.servicio);
        setAgendaDetalleBooking(null);
        setReservaEditando(booking);
        setNuevaReservaData({
            cliente_nombre: booking.cliente_nombre || '',
            cliente_whatsapp: String(booking.cliente_whatsapp || '').replace(/^53/, '').replace(/\D/g, ''),
            servicio: booking.servicio || '',
            profesional_id: booking.profesional_id || '',
            fecha: booking.fecha || '',
            hora_inicio: booking.hora_inicio || '',
            requiereAnticipo: booking.estado === 'Pendiente'
        });
        setCurrentDate(booking.fecha ? new Date(`${booking.fecha}T00:00:00`) : new Date());
        setDiasLaborales([]);
        setFechasConHorarios({});
        setServiciosManualSeleccionados([booking.servicio].filter(Boolean));
        if (booking.fecha && booking.hora_inicio) {
            setHorariosDisponibles(prev => Array.from(new Set([...(prev || []), booking.hora_inicio])).sort());
        }
        setBusquedaClienteManual('');
        loadClientesRegistrados();
        setShowNuevaReservaModal(true);
    };

    const abrirDetalleAgenda = (booking) => {
        setAgendaDetalleBooking(booking);
    };

    const abrirModalDisponibilidad = () => {
        const fechaActual = new Date();
        const profesionalId = profesionalSeleccionadoDispo || profesionalesList[0]?.id || null;
        setDisponibilidadFecha(fechaActual);
        if (profesionalId) {
            setProfesionalSeleccionadoDispo(profesionalId);
        }
        setModoDisponibilidad('mes');
        setShowDisponibilidadModal(true);
        cargarDisponibilidadDelMes(fechaActual, profesionalId);
    };

    const tabsDisponibles = getTabsDisponibles();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const days = getDaysInMonth(currentDate);
    const disponibilidadDays = getDaysInMonth(disponibilidadFecha);

    return (
        <div className="min-h-screen bg-pink-50 p-3 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                
                {/* HEADER CON LOGO */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-l-4 border-pink-500">
                    <div className="flex items-center gap-3">
                        {logoNegocio ? (
                            <img 
                                src={logoNegocio} 
                                alt={nombreNegocio} 
                                className="w-12 h-12 object-contain rounded-xl shadow-lg ring-2 ring-pink-300 bg-white p-1"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    const parent = e.target.parentElement;
                                    if (parent) {
                                        parent.innerHTML = '<div class="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center"><span class="text-2xl text-white"><i class="icon-calendar"></i></span></div>';
                                    }
                                }}
                            />
                        ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-lg flex items-center justify-center">
                                <span className="text-2xl text-white">💅</span>
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold text-pink-800">{nombreNegocio}</h1>
                            <p className="text-xs text-pink-500">Panel de Administración</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {/* BOTÓN NUEVA RESERVA */}
                        <button
                            onClick={abrirModalNuevaReserva}
                            className={`${puedeGestionarReservas ? 'flex' : 'hidden'} items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md border border-green-400 flex-1 sm:flex-none justify-center`}
                        >
                            <span className="text-lg">➕</span>
                            <span className="font-medium">Nueva Reserva</span>
                        </button>

                        {/* BOTÓN CALENDARIO DE DISPONIBILIDAD */}
                        <button
                            onClick={abrirModalDisponibilidad}
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md border border-blue-400 flex-1 sm:flex-none justify-center"
                            title="Ver disponibilidad mensual"
                        >
                            <span className="text-lg">📆</span>
                            <span className="font-medium">Ver Disponibilidad</span>
                        </button>

                        <button
                            onClick={() => window.location.href = 'editar-negocio.html'}
                            className={`${puedeGestionarAvanzado ? 'flex' : 'hidden'} items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all transform hover:scale-105 shadow-md border border-pink-400 flex-1 sm:flex-none justify-center`}
                        >
                            <span className="text-lg">🏢</span>
                            <span className="font-medium">Editar Negocio</span>
                        </button>

                        <button 
                            onClick={() => {
                                cargarConfiguracion();
                                setConfigVersion(prev => prev + 1);
                            }} 
                            className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-all hover:scale-105 border border-pink-200"
                            title="Recargar datos del negocio"
                        >
                            <i className="icon-refresh-cw text-pink-600"></i>
                        </button>

                        <button 
                            onClick={fetchBookings} 
                            className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-all hover:scale-105 border border-pink-200"
                            title="Actualizar reservas"
                        >
                            <i className="icon-refresh-cw text-pink-600"></i>
                        </button>

                        <button 
                            onClick={handleLogout}
                            className="p-2 bg-pink-50 rounded-full hover:bg-pink-100 transition-all hover:scale-105 border border-pink-200"
                            title="Cerrar sesión"
                        >
                            <i className="icon-log-out text-pink-600"></i>
                        </button>
                    </div>
                </div>

                {/* MODAL NUEVA RESERVA */}
                {showNuevaReservaModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">Nueva Reserva Manual</h3>
                                    <button
                                        onClick={() => setShowNuevaReservaModal(false)}
                                        disabled={creandoReservaManual}
                                        className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >×</button>
                            </div>
                            <div className="space-y-4">
                                {!reservaEditando && (
                                    <div className="bg-pink-50/70 border border-pink-100 rounded-xl p-3">
                                        <label className="block text-sm font-semibold text-pink-800 mb-2">
                                            Elegir cliente registrado
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="search"
                                                value={busquedaClienteManual}
                                                onChange={(e) => setBusquedaClienteManual(e.target.value)}
                                                onFocus={() => {
                                                    if (clientesRegistrados.length === 0 && !cargandoClientes) {
                                                        loadClientesRegistrados();
                                                    }
                                                }}
                                                className="w-full border border-pink-200 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                                                placeholder="Buscar por nombre o WhatsApp"
                                            />
                                            <span className="absolute right-3 top-2.5 text-pink-400">🔎</span>
                                        </div>
                                        <p className="text-xs text-pink-600/70 mt-1">
                                            Puedes elegir de la lista o buscar por nombre/WhatsApp. Si no existe, escribe los datos manualmente.
                                        </p>
                                        {cargandoClientes && (
                                            <p className="text-xs text-pink-500 mt-2">Cargando clientes...</p>
                                        )}
                                        {busquedaClienteManual && !cargandoClientes && clientesManualFiltrados.length === 0 && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                No encontramos ese cliente. Puedes escribir los datos manualmente y se guardará al crear la reserva.
                                            </p>
                                        )}
                                        {!cargandoClientes && clientesRegistrados.length === 0 && (
                                            <p className="text-xs text-gray-500 mt-2">Aún no hay clientes registrados.</p>
                                        )}
                                        {clientesManualFiltrados.length > 0 && (
                                            <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-pink-100 bg-white divide-y divide-pink-50">
                                                {clientesManualFiltrados.map(cliente => (
                                                    <button
                                                        key={`${cliente.whatsapp}-${cliente.id || cliente.fecha_registro || cliente.nombre}`}
                                                        type="button"
                                                        onClick={() => seleccionarClienteManual(cliente)}
                                                        className="w-full px-3 py-2 text-left hover:bg-pink-50 flex items-center justify-between gap-3"
                                                    >
                                                        <span className="min-w-0">
                                                            <span className="block font-medium text-gray-800 truncate">{cliente.nombre || 'Cliente sin nombre'}</span>
                                                            <span className="block text-xs text-gray-500">+{String(cliente.whatsapp || '').replace(/\D/g, '')}</span>
                                                        </span>
                                                        <span className="text-xs text-pink-600 font-semibold shrink-0">Usar</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente *</label>
                                    <input type="text" value={nuevaReservaData.cliente_nombre} onChange={(e) => setNuevaReservaData({...nuevaReservaData, cliente_nombre: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="Ej: Juan Pérez" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp del Cliente *</label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50">+53</span>
                                        <input type="tel" value={nuevaReservaData.cliente_whatsapp} onChange={(e) => setNuevaReservaData({...nuevaReservaData, cliente_whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full px-4 py-2 rounded-r-lg border border-gray-300" placeholder="55002272" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Servicio{!reservaEditando ? 's' : ''} *
                                    </label>
                                    {reservaEditando ? (
                                        <select
                                            value={nuevaReservaData.servicio}
                                            onChange={(e) => {
                                                setServiciosManualSeleccionados([e.target.value].filter(Boolean));
                                                setNuevaReservaData({...nuevaReservaData, servicio: e.target.value, fecha: '', hora_inicio: ''});
                                            }}
                                            className="w-full border rounded-lg px-3 py-2"
                                        >
                                            <option value="">Seleccionar servicio</option>
                                            {serviciosList.map(s => (
                                                <option key={s.id} value={s.nombre}>{s.nombre} ({s.duracion} min - ${s.precio})</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="border rounded-xl p-2 max-h-60 overflow-y-auto bg-white space-y-2">
                                            {serviciosList.map(s => {
                                                const seleccionado = serviciosManualSeleccionados.includes(s.nombre);
                                                return (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => toggleServicioManual(s.nombre)}
                                                        className={`w-full text-left p-3 rounded-lg border transition ${seleccionado ? 'bg-pink-50 border-pink-300 text-pink-800' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <span className="font-medium">{s.nombre}</span>
                                                            <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${seleccionado ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-300'}`}>
                                                                {seleccionado ? '✓' : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">{s.duracion} min - ${s.precio}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {!reservaEditando && serviciosManualSeleccionados.length > 0 && (
                                        <p className="text-xs text-pink-600 mt-2">
                                            {serviciosManualSeleccionados.length} servicio{serviciosManualSeleccionados.length === 1 ? '' : 's'} · {getServiciosManualSeleccionados().reduce((total, s) => total + Number(s.duracion || 60), 0)} min
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Profesional *</label>
                                    <select value={nuevaReservaData.profesional_id} onChange={(e) => setNuevaReservaData({...nuevaReservaData, profesional_id: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                                        <option value="">Seleccionar profesional</option>
                                        {profesionalesManualFiltrados.map(p => (<option key={p.id} value={p.id}>{p.nombre} - {p.especialidad}</option>))}
                                    </select>
                                    {nuevaReservaData.servicio && profesionalesManualFiltrados.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">No hay profesionales asignados a este servicio.</p>
                                    )}
                                </div>
                                {userRole === 'admin' && (
                                    <div className="flex items-center gap-3 bg-yellow-50 p-3 rounded-lg">
                                        <input type="checkbox" id="requiereAnticipo" checked={nuevaReservaData.requiereAnticipo} onChange={(e) => setNuevaReservaData({...nuevaReservaData, requiereAnticipo: e.target.checked})} />
                                        <label htmlFor="requiereAnticipo" className="text-sm font-medium text-yellow-800">Requerir anticipo al cliente</label>
                                    </div>
                                )}
                                {nuevaReservaData.servicio && nuevaReservaData.profesional_id && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Fecha *</label>
                                        <div className="bg-white rounded-xl border">
                                            <div className="flex justify-between p-3 bg-gray-50 border-b">
                                                <button onClick={() => cambiarMes(-1)}>›</button>
                                                <span className="font-bold">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                                                <button onClick={() => cambiarMes(1)}>›</button>
                                            </div>
                                            <div className="p-3">
                                                <div className="grid grid-cols-7 mb-2 text-center text-xs text-gray-400">
                                                    {['D','L','M','M','J','V','S'].map(d => <div key={d}>{d}</div>)}
                                                </div>
                                                <div className="grid grid-cols-7 gap-1">
                                                    {days.map((date, idx) => {
                                                        if (!date) return <div key={idx} className="h-10" />;
                                                        const fechaStr = formatDate(date);
                                                        const available = isDateAvailable(date);
                                                        const selected = nuevaReservaData.fecha === fechaStr;
                                                        const esCerrado = diasCerradosFechas.includes(fechaStr);
                                                        const esPasado = fechaStr < getCurrentLocalDate();
                                                        
                                                        let className = "h-10 w-full rounded-lg text-sm font-medium";
                                                        if (selected) className += " bg-pink-500 text-white shadow-md";
                                                        else if (!available || esPasado || esCerrado) className += " text-gray-300 cursor-not-allowed bg-gray-50 line-through";
                                                        else className += " text-gray-700 hover:bg-pink-50 cursor-pointer";
                                                        
                                                        return (
                                                            <button key={idx} onClick={() => handleDateSelect(date)} disabled={!available || esPasado || esCerrado} className={className} title={esCerrado ? "Día cerrado" : esPasado ? "Fecha pasada" : ""}>
                                                                {date.getDate()}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {nuevaReservaData.fecha && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Hora de inicio *</label>
                                        {horariosDisponibles.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {horariosDisponibles.map(hora => (
                                                    <button key={hora} type="button" onClick={() => setNuevaReservaData({...nuevaReservaData, hora_inicio: hora})} className={`py-2 px-3 rounded-lg text-sm font-medium ${nuevaReservaData.hora_inicio === hora ? 'bg-pink-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                                        {formatTo12Hour(hora)}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : <p className="text-sm text-gray-500">No hay horarios disponibles</p>}
                                    </div>
                                )}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => { setShowNuevaReservaModal(false); setReservaEditando(null); setServiciosManualSeleccionados([]); }}
                                        disabled={creandoReservaManual}
                                        className="flex-1 px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancelar
                                    </button>
                                    {puedeGestionarReservas && reservaEditando?.estado === 'Pendiente' && (
                                        <button
                                            onClick={async () => {
                                                await confirmarPago(reservaEditando.id, reservaEditando);
                                                setShowNuevaReservaModal(false);
                                                setReservaEditando(null);
                                            }}
                                            className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg"
                                        >
                                            Confirmar pago
                                        </button>
                                    )}
                                    <button
                                        onClick={handleCrearReservaManual}
                                        disabled={creandoReservaManual}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {creandoReservaManual ? 'Guardando...' : reservaEditando ? 'Guardar cambios' : 'Crear Reserva'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {agendaDetalleBooking && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-xl">
                            <div className="flex items-start justify-between gap-4 border-b pb-3">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-pink-500 font-bold">Detalle de cita</p>
                                    <h3 className="text-xl font-bold text-gray-900">{agendaDetalleBooking.cliente_nombre || 'Cliente sin nombre'}</h3>
                                </div>
                                <button onClick={() => setAgendaDetalleBooking(null)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-sm">
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs font-bold uppercase text-gray-400">Fecha</p>
                                    <p className="font-semibold text-gray-900">{agendaDetalleBooking.fecha}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs font-bold uppercase text-gray-400">Hora</p>
                                    <p className="font-semibold text-gray-900">
                                        {formatTo12Hour(agendaDetalleBooking.hora_inicio)} - {formatTo12Hour(agendaDetalleBooking.hora_fin || calculateEndTime(agendaDetalleBooking.hora_inicio, agendaDetalleBooking.duracion || 60))}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs font-bold uppercase text-gray-400">Servicio</p>
                                    <p className="font-semibold text-gray-900">{agendaDetalleBooking.servicio}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs font-bold uppercase text-gray-400">Profesional</p>
                                    <p className="font-semibold text-gray-900">{agendaDetalleBooking.profesional_nombre || agendaDetalleBooking.trabajador_nombre || 'Sin profesional'}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs font-bold uppercase text-gray-400">Estado</p>
                                    <p className="font-semibold text-gray-900">{agendaDetalleBooking.estado || 'Sin estado'}</p>
                                </div>
                                <div className="rounded-lg bg-gray-50 p-3">
                                    <p className="text-xs font-bold uppercase text-gray-400">WhatsApp</p>
                                    <p className="font-semibold text-gray-900">+{agendaDetalleBooking.cliente_whatsapp || 'Sin numero'}</p>
                                </div>
                            </div>

                            {agendaDetalleBooking._grupoVisual && Array.isArray(agendaDetalleBooking._reservasGrupo) && (
                                <div className="mb-4 rounded-lg border border-pink-100 bg-pink-50 p-3">
                                    <p className="text-xs font-bold uppercase text-pink-500 mb-2">Servicios del turno</p>
                                    <div className="space-y-2">
                                        {agendaDetalleBooking._reservasGrupo.map(item => (
                                            <div key={item.id} className="flex justify-between gap-3 text-sm">
                                                <span className="font-semibold text-gray-800">{item.servicio}</span>
                                                <span className="text-gray-500">{formatTo12Hour(item.hora_inicio)} - {formatTo12Hour(item.hora_fin)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => setAgendaDetalleBooking(null)} className="flex-1 px-4 py-2 border rounded-lg">Cerrar</button>
                                {puedeEditarReserva(agendaDetalleBooking) && (
                                    <button onClick={() => abrirModalReprogramar(agendaDetalleBooking)} className="flex-1 px-4 py-2 bg-pink-500 text-white rounded-lg font-bold hover:bg-pink-600">
                                        Editar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL CALENDARIO DE DISPONIBILIDAD */}
                {showDisponibilidadModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
                        <div className="bg-white rounded-xl max-w-5xl w-full p-3 sm:p-6 max-h-[96vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg sm:text-xl font-bold">📆 Disponibilidad</h3>
                                <button onClick={() => setShowDisponibilidadModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                            </div>
                            
                            {userRole === 'admin' && profesionalesList.length > 0 && (
                                <div className="mb-3">
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Profesional:</label>
                                    <select
                                        value={profesionalSeleccionadoDispo || ''}
                                        onChange={(e) => {
                                            const id = e.target.value ? parseInt(e.target.value) : null;
                                            setProfesionalSeleccionadoDispo(id);
                                            if (modoDisponibilidad === 'semana') cargarDisponibilidadSemanal(disponibilidadFecha, id);
                                            else cargarDisponibilidadDelMes(disponibilidadFecha, id);
                                        }}
                                        className="w-full border rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">Seleccionar profesional</option>
                                        {profesionalesList.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            <div className="flex gap-2 mb-3">
                                <button onClick={() => { setModoDisponibilidad('mes'); cargarDisponibilidadDelMes(disponibilidadFecha, profesionalSeleccionadoDispo); }} className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${modoDisponibilidad === 'mes' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Mensual</button>
                                <button onClick={() => { setModoDisponibilidad('semana'); cargarDisponibilidadSemanal(disponibilidadFecha, profesionalSeleccionadoDispo); }} className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${modoDisponibilidad === 'semana' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Semanal</button>
                            </div>

                            <div className="flex justify-between items-center mb-3">
                                <button onClick={() => modoDisponibilidad === 'semana' ? cambiarSemanaDisponibilidad(-1) : cambiarMesDisponibilidad(-1)} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">‹</button>
                                <span className="text-sm sm:text-lg font-bold text-center px-2">
                                    {modoDisponibilidad === 'semana' ? `${formatDate(getDiasSemanaDisponibilidad(disponibilidadFecha)[0])} - ${formatDate(getDiasSemanaDisponibilidad(disponibilidadFecha)[6])}` : `${monthNames[disponibilidadFecha.getMonth()]} ${disponibilidadFecha.getFullYear()}`}
                                </span>
                                <button onClick={() => modoDisponibilidad === 'semana' ? cambiarSemanaDisponibilidad(1) : cambiarMesDisponibilidad(1)} className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">›</button>
                            </div>
                            
                            {disponibilidadCargando ? (
                                <div className="text-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-pink-500 mx-auto"></div><p className="mt-2">Cargando disponibilidad...</p></div>
                            ) : modoDisponibilidad === 'semana' ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Disponibilidad semanal</p>
                                            <p className="text-xs text-gray-500">Turnos libres en verde para compartir.</p>
                                        </div>
                                        <button
                                            onClick={compartirDisponibilidadSemanal}
                                            disabled={disponibilidadSemanal.length === 0}
                                            className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-green-700 disabled:opacity-50 shadow-sm"
                                        >
                                            Compartir
                                        </button>
                                    </div>

                                    <div className="rounded-2xl border border-pink-100 bg-white overflow-hidden shadow-sm">
                                        <div className="grid grid-cols-7 divide-x divide-gray-200">
                                            {disponibilidadSemanal.map(dia => {
                                                const disponibles = dia.turnos.filter(turno => turno.estado === 'Disponible');
                                                const diaCorto = dia.diaNombre.slice(0, 3);
                                                const fechaCorta = dia.fecha.slice(5);

                                                return (
                                                <div key={dia.fecha} className="bg-gradient-to-b from-white to-pink-50/50 min-w-0 min-h-[190px] sm:min-h-[260px]">
                                                    <div className={`px-1 py-3 sm:p-4 border-b text-center ${dia.libres > 0 ? 'bg-green-50 border-green-100' : 'bg-gray-100 border-gray-200'}`}>
                                                        <p className="font-extrabold text-gray-900 leading-tight text-[11px] sm:text-base uppercase truncate">{diaCorto}</p>
                                                        <p className="text-[9px] sm:text-xs text-gray-500 leading-tight mt-1">{fechaCorta}</p>
                                                    </div>

                                                    <div className="px-1.5 py-3 sm:p-4 space-y-2 sm:space-y-3">
                                                        {disponibles.length === 0 ? (
                                                            <div className="h-24 sm:h-32 rounded-xl border border-dashed border-gray-200 bg-white/70 text-gray-400 text-[9px] sm:text-xs flex items-center justify-center text-center px-1 leading-tight">
                                                                Sin turnos
                                                            </div>
                                                        ) : (
                                                            disponibles.map(turno => (
                                                                <div key={`${dia.fecha}-${turno.hora}`} className="rounded-xl border border-green-600 bg-gradient-to-b from-emerald-400 to-green-600 text-white px-1 py-3 sm:py-4 text-center shadow-md" title={turno.detalle}>
                                                                    <div className="text-[12px] sm:text-lg font-extrabold leading-none whitespace-nowrap">{formatTo12Hour(turno.hora).replace(' ', '')}</div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );})}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-[11px] sm:text-xs text-gray-600">
                                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span>Disponible</span>
                                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></span>Sin turnos</span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="grid grid-cols-7 mb-2 text-center">
                                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => <div key={d} className="text-xs font-medium text-gray-500">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {disponibilidadDays.map((date, idx) => {
                                            if (!date) return <div key={idx} className="h-12" />;
                                            const fechaStr = formatDate(date);
                                            const disponible = disponibilidadDias[fechaStr] === true;
                                            const disponiblesDia = disponibilidadConteos[fechaStr] || 0;
                                            const esCerrado = diasCerradosFechas.includes(fechaStr);
                                            const esPasado = fechaStr < getCurrentLocalDate();
                                            const tonoConteo = disponiblesDia >= 4
                                                ? 'bg-green-100 text-green-700 border-green-300'
                                                : disponiblesDia === 3
                                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                                    : disponiblesDia > 0
                                                        ? 'bg-red-100 text-red-700 border-red-300'
                                                        : 'bg-gray-100 text-gray-400 border-gray-200';
                                            
                                            let className = "h-14 w-full rounded-lg text-sm font-medium flex flex-col items-center justify-center border transition";
                                            if (esCerrado) className += " bg-red-50 text-red-400 border-red-100 line-through";
                                            else if (esPasado) className += " bg-gray-100 text-gray-400 border-gray-200";
                                            else if (disponible) className += " bg-white text-gray-800 border-gray-200 hover:bg-gray-50";
                                            else className += " bg-gray-100 text-gray-400 border-gray-200";
                                            
                                            return (
                                                <div key={idx} className={className} title={esCerrado ? "Día cerrado" : esPasado ? "Fecha pasada" : disponible ? `${disponiblesDia} turno(s) disponible(s)` : "Sin horarios disponibles"}>
                                                    <span className="text-base leading-tight">{date.getDate()}</span>
                                                    {!esCerrado && !esPasado && (
                                                        <span className={`mt-0.5 min-w-5 px-1.5 py-0.5 rounded-full border text-[11px] font-bold leading-none ${tonoConteo}`}>
                                                            {disponiblesDia}
                                                        </span>
                                                    )}
                                                    {esCerrado && <span className="text-xs">x</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {modoDisponibilidad === 'mes' && <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2"><div className="w-5 h-5 bg-green-100 border border-green-300 rounded-full flex items-center justify-center text-[10px] font-bold text-green-700">6</div><span>4+ tranquilo</span></div>
                                    <div className="flex items-center gap-2"><div className="w-5 h-5 bg-yellow-100 border border-yellow-300 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-700">3</div><span>3 medio</span></div>
                                    <div className="flex items-center gap-2"><div className="w-5 h-5 bg-red-100 border border-red-300 rounded-full flex items-center justify-center text-[10px] font-bold text-red-700">2</div><span>1-2 urgente</span></div>
                                    <div className="flex items-center gap-2"><div className="w-5 h-5 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-400">0</div><span>Sin horarios</span></div>
                                </div>
                            </div>}
                        </div>
                    </div>
                )}

                {/* PESTAÑAS */}
                <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                    {tabsDisponibles.map(tab => (
                        <button key={tab.id} onClick={() => setTabActivo(tab.id)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tabActivo === tab.id ? 'bg-pink-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            <span>{tab.icono}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* CONTENIDO */}
                {tabActivo === 'configuracion' && (
                    <ConfigPanel profesionalId={userRole === 'profesional' ? profesional?.id : null} modoRestringido={userRole === 'profesional' && userNivel === 2} />
                )}

                {tabActivo === 'servicios' && (userRole === 'admin' || userNivel >= 3) && (
                    <ServiciosPanel />
                )}

                {tabActivo === 'profesionales' && (userRole === 'admin' || userNivel >= 3) && (
                    <ProfesionalesPanel />
                )}

                {tabActivo === 'clientes' && (userRole === 'admin' || userNivel >= 2) && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
                            <h2 className="text-xl font-bold">Clientes Registrados ({clientesRegistrados.length})</h2>
                            <p className="text-sm text-gray-500">Score calculado con el historial de reservas, completadas y canceladas.</p>
                            <button onClick={() => { setShowClientesRegistrados(!showClientesRegistrados); if (!showClientesRegistrados) { loadClientesRegistrados(); loadClientesBloqueados(); } }} className="px-4 py-2 rounded-lg bg-pink-50 text-pink-600 text-sm font-medium hover:bg-pink-100">
                                {showClientesRegistrados ? '🙈 Ocultar' : '👁️ Mostrar'}
                            </button>
                        </div>
                        {showClientesRegistrados && (
                            <div className="space-y-5 max-h-[42rem] overflow-y-auto pr-1">
                                {(userRole === 'admin' || userNivel >= 3) && (
                                    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                                        <h3 className="font-bold text-red-700 mb-3">Lista negra</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                            <input type="text" value={nuevoBloqueo.nombre} onChange={(e) => setNuevoBloqueo({...nuevoBloqueo, nombre: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" placeholder="Nombre opcional" />
                                            <input type="tel" value={nuevoBloqueo.whatsapp} onChange={(e) => setNuevoBloqueo({...nuevoBloqueo, whatsapp: e.target.value.replace(/\D/g, '')})} className="border rounded-lg px-3 py-2 text-sm" placeholder="WhatsApp" />
                                            <input type="text" value={nuevoBloqueo.motivo} onChange={(e) => setNuevoBloqueo({...nuevoBloqueo, motivo: e.target.value})} className="border rounded-lg px-3 py-2 text-sm" placeholder="Motivo opcional" />
                                            <button onClick={() => handleBloquearCliente()} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700">Bloquear</button>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            {cargandoBloqueados ? <p className="text-sm text-red-600">Cargando lista negra...</p> : clientesBloqueados.length === 0 ? <p className="text-sm text-red-500">No hay clientes bloqueados.</p> :
                                                clientesBloqueados.map((cliente) => (
                                                    <div key={cliente.id || cliente.whatsapp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white border border-red-100 p-3">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{cliente.nombre || 'Sin nombre'} <span className="text-sm text-gray-500">+{cliente.whatsapp}</span></p>
                                                            {cliente.motivo && <p className="text-xs text-gray-500">Motivo: {cliente.motivo}</p>}
                                                        </div>
                                                        <button onClick={() => handleDesbloquearCliente(cliente.whatsapp)} className="px-3 py-2 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">Desbloquear</button>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                                {cargandoClientes ? <p className="text-center text-pink-500">Cargando clientes...</p> : clientesRegistrados.length === 0 ? <p className="text-center text-gray-500">No hay clientes registrados</p> :
                                    clientesRegistrados.map((cliente, idx) => {
                                        const score = getClienteScore(cliente);
                                        const ultimaCita = score.ultima
                                            ? `${window.formatFechaCompleta ? window.formatFechaCompleta(score.ultima.fecha) : score.ultima.fecha} ${formatTo12Hour(score.ultima.hora_inicio)}`
                                            : 'Sin citas';

                                        return (
                                            <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                                                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-bold text-gray-900 truncate">{cliente.nombre}</p>
                                                            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${score.tone}`}>{score.label}</span>
                                                            <span className="px-2.5 py-1 rounded-full bg-white border text-xs font-semibold text-gray-700">Score {score.score}/100</span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 mt-1">+{cliente.whatsapp}</p>
                                                        <p className="text-xs text-gray-500 mt-1">Ultima cita: {ultimaCita}</p>
                                                    </div>

                                                    {(userRole === 'admin' || userNivel >= 3) && (
                                                        <div className="flex flex-wrap gap-2">
                                                            <button onClick={() => handleBloquearCliente(cliente)} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black">
                                                                Bloquear
                                                            </button>
                                                            <button onClick={() => handleEliminarCliente(cliente.whatsapp)} className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600">
                                                                Quitar
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <p className="text-xs text-gray-500">Total</p>
                                                        <p className="text-lg font-bold text-gray-900">{score.total}</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <p className="text-xs text-gray-500">Activas</p>
                                                        <p className="text-lg font-bold text-pink-600">{score.activas}</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <p className="text-xs text-gray-500">Pendientes</p>
                                                        <p className="text-lg font-bold text-amber-600">{score.pendientes}</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <p className="text-xs text-gray-500">Completadas</p>
                                                        <p className="text-lg font-bold text-emerald-600">{score.completadas}</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg p-3 border">
                                                        <p className="text-xs text-gray-500">Canceladas</p>
                                                        <p className="text-lg font-bold text-red-600">{score.canceladas}</p>
                                                    </div>
                                                </div>

                                                <div className="mt-3">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>Completadas {score.completionRate}%</span>
                                                        <span>Cancelación {score.cancelRate}%</span>
                                                    </div>
                                                    <div className="h-2 bg-white rounded-full overflow-hidden border">
                                                        <div className="h-full bg-emerald-400" style={{ width: `${score.completionRate}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                )}

                {/* AGENDA CALENDARIO */}
                {tabActivo === 'agenda' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                        <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-white to-pink-50">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-pink-500 font-bold">Agenda {agendaMode === 'dia' ? 'diaria' : 'semanal'}</p>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {getAgendaTitle()}
                                    </h2>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="inline-flex bg-gray-100 rounded-lg p-1">
                                        <button onClick={() => setAgendaMode('dia')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${agendaMode === 'dia' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-600'}`}>Dia</button>
                                        <button onClick={() => setAgendaMode('semana')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${agendaMode === 'semana' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-600'}`}>Semana</button>
                                    </div>
                                    <button onClick={() => setAgendaDate(addDays(agendaDate, agendaMode === 'dia' ? -1 : -7))} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium">{agendaMode === 'dia' ? 'Día anterior' : 'Semana anterior'}</button>
                                    <button onClick={() => setAgendaDate(new Date())} className="px-3 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 text-sm font-medium">Hoy</button>
                                    <button onClick={() => setAgendaDate(addDays(agendaDate, agendaMode === 'dia' ? 1 : 7))} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium">{agendaMode === 'dia' ? 'Día siguiente' : 'Semana siguiente'}</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mt-5 rounded-xl bg-white border border-gray-100 p-2">
                                {agendaDays.map(day => {
                                    const dateStr = formatDate(day);
                                    const selected = dateStr === agendaDateStr;
                                    const isToday = dateStr === agendaToday;
                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => { setAgendaDate(day); setAgendaMode('dia'); }}
                                            className={`py-2 rounded-lg text-center transition ${selected ? 'bg-gray-900 text-white shadow-sm' : isToday ? 'bg-pink-50 text-pink-700' : 'hover:bg-gray-50 text-gray-700'}`}
                                        >
                                            <span className="block text-xs font-semibold uppercase">{day.toLocaleDateString('es-CU', { weekday: 'short' }).charAt(0)}</span>
                                            <span className="block text-lg font-bold leading-tight">{day.getDate()}</span>
                                            <span className={`mx-auto mt-1 block h-1.5 w-1.5 rounded-full ${getAgendaDayBookings(day).length ? selected ? 'bg-white' : 'bg-pink-500' : 'bg-transparent'}`}></span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                                <div className="rounded-lg border border-pink-100 bg-white p-3">
                                    <p className="text-xs text-gray-500">Turnos</p>
                                    <p className="text-2xl font-bold text-gray-900">{agendaVisibleBookings.length}</p>
                                </div>
                                <div className="rounded-lg border border-amber-100 bg-white p-3">
                                    <p className="text-xs text-gray-500">Pendientes</p>
                                    <p className="text-2xl font-bold text-amber-600">{agendaVisibleBookings.filter(b => b.estado === 'Pendiente').length}</p>
                                </div>
                                <div className="rounded-lg border border-emerald-100 bg-white p-3">
                                    <p className="text-xs text-gray-500">Completados</p>
                                    <p className="text-2xl font-bold text-emerald-600">{agendaVisibleBookings.filter(b => b.estado === 'Completado').length}</p>
                                </div>
                                <div className="rounded-lg border border-blue-100 bg-white p-3">
                                    <p className="text-xs text-gray-500">Profesionales</p>
                                    <p className="text-2xl font-bold text-blue-600">{new Set(agendaVisibleBookings.map(b => b.profesional_id || b.profesional_nombre)).size}</p>
                                </div>
                            </div>
                        </div>

                        {agendaMode === 'dia' && (
                            <div className="p-3 sm:p-5 overflow-x-auto">
                                <div className="relative border rounded-xl overflow-hidden bg-white" style={{ height: `${agendaGridHeight}px`, minWidth: `${agendaDayMinWidth}px` }}>
                                    <div className="absolute left-0 top-0 bottom-0 w-16 bg-gray-50 border-r z-0">
                                        {agendaHours.map(hour => (
                                            <div key={hour} className="relative border-b border-gray-100 text-right pr-2 text-xs text-gray-400" style={{ height: `${60 * agendaPxPerMinute}px` }}>
                                                <span className="relative -top-2">{formatTo12Hour(`${String(hour).padStart(2, '0')}:00`).replace(':00', '')}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="absolute left-16 right-0 top-0 bottom-0">
                                        {agendaHours.map(hour => (
                                            <div key={hour} className="border-b border-gray-100" style={{ height: `${60 * agendaPxPerMinute}px` }}></div>
                                        ))}

                                        {agendaDayBookings.length === 0 && (
                                            <div className="absolute inset-x-4 top-8 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-gray-500">
                                                No hay citas para este día
                                            </div>
                                        )}

                                        {agendaDayLayoutBookings.map(booking => {
                                            const statusClass = agendaStatusStyle[booking.estado] || 'bg-gray-500 border-gray-600 text-white';
                                            const isShort = getBookingHeight(booking) < 76;
                                            return (
                                                <div
                                                    key={booking._grupoVisualId || booking.id}
                                                    className={`absolute rounded-lg border shadow-sm ${isShort ? 'p-2' : 'p-3'} overflow-hidden cursor-pointer ${statusClass}`}
                                                    style={getAgendaBookingStyle(booking)}
                                                    onClick={() => abrirDetalleAgenda(booking)}
                                                >
                                                    <div className="flex h-full flex-col gap-1">
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-bold leading-tight opacity-90">{formatTo12Hour(booking.hora_inicio)} - {formatTo12Hour(booking.hora_fin || calculateEndTime(booking.hora_inicio, booking.duracion || 60))}</p>
                                                            {!isShort && <p className="text-sm font-bold truncate">{booking.cliente_nombre}</p>}
                                                            {!isShort && <p className="text-xs truncate opacity-90">{booking._grupoVisual ? `${booking._reservasGrupo.length} servicios · ${booking.servicio}` : booking.servicio}</p>}
                                                            {!isShort && <p className="text-[11px] truncate opacity-80">{booking.profesional_nombre || booking.trabajador_nombre || 'Sin profesional'}</p>}
                                                        </div>
                                                        <button onClick={(event) => { event.stopPropagation(); abrirDetalleAgenda(booking); }} className="mt-auto w-full rounded-md py-1 text-[11px] bg-white/20 hover:bg-white/30 font-bold">
                                                            Detalles
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {agendaMode === 'semana' && (
                        <div className="overflow-x-auto">
                            <div className="min-w-[1440px]">
                                <div className="grid grid-cols-[72px_repeat(7,minmax(190px,1fr))] border-b bg-white sticky top-0 z-10">
                                    <div className="p-3 text-xs font-semibold text-gray-400 border-r">Hora</div>
                                    {agendaDays.map(day => {
                                        const dateStr = formatDate(day);
                                        const dayBookings = getAgendaDayBookings(day);
                                        const isToday = dateStr === agendaToday;
                                        return (
                                            <div key={dateStr} className={`p-3 border-r last:border-r-0 ${isToday ? 'bg-pink-50' : ''}`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold uppercase text-gray-500">{day.toLocaleDateString('es-CU', { weekday: 'short' })}</p>
                                                        <p className={`text-xl font-bold ${isToday ? 'text-pink-600' : 'text-gray-900'}`}>{day.getDate()}</p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${dayBookings.length ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                        {dayBookings.length}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="grid grid-cols-[72px_repeat(7,minmax(190px,1fr))] relative" style={{ height: `${agendaGridHeight}px` }}>
                                    <div className="border-r bg-gray-50">
                                        {agendaHours.map(hour => (
                                            <div key={hour} className="relative border-b border-gray-100 text-right pr-2 text-xs text-gray-400" style={{ height: `${60 * agendaPxPerMinute}px` }}>
                                                <span className="relative -top-2">{formatTo12Hour(`${String(hour).padStart(2, '0')}:00`)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {agendaDays.map(day => {
                                        const dateStr = formatDate(day);
                                        const dayBookings = getAgendaDayBookings(day);
                                        const dayLayoutBookings = getAgendaLayoutBookings(dayBookings);
                                        const isToday = dateStr === agendaToday;
                                        return (
                                            <div key={dateStr} className={`relative border-r last:border-r-0 ${isToday ? 'bg-pink-50/40' : 'bg-white'}`}>
                                                {agendaHours.map(hour => (
                                                    <div key={hour} className="border-b border-gray-100" style={{ height: `${60 * agendaPxPerMinute}px` }}></div>
                                                ))}

                                                {dayLayoutBookings.map(booking => {
                                                    const statusClass = agendaStatusStyle[booking.estado] || 'bg-gray-500 border-gray-600 text-white';
                                                    const isShort = getBookingHeight(booking) < 76;
                                                    return (
                                                        <div
                                                            key={booking._grupoVisualId || booking.id}
                                                            className={`absolute rounded-lg border shadow-sm p-2 overflow-hidden cursor-pointer ${statusClass}`}
                                                            style={getAgendaBookingStyle(booking)}
                                                            title={`${booking.cliente_nombre} - ${booking._grupoVisual ? `${booking._reservasGrupo.length} servicios: ` : ''}${booking.servicio}`}
                                                            onClick={() => abrirDetalleAgenda(booking)}
                                                        >
                                                            <div className="flex h-full flex-col gap-1">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold leading-tight">{formatTo12Hour(booking.hora_inicio)} - {formatTo12Hour(booking.hora_fin || calculateEndTime(booking.hora_inicio, booking.duracion || 60))}</p>
                                                                    {!isShort && <p className="font-bold text-sm truncate">{booking.cliente_nombre}</p>}
                                                                    {!isShort && <p className="text-xs truncate opacity-90">{booking._grupoVisual ? `${booking._reservasGrupo.length} servicios · ${booking.servicio}` : booking.servicio}</p>}
                                                                    {!isShort && <p className="text-xs truncate opacity-80">{booking.profesional_nombre || booking.trabajador_nombre || 'Sin profesional'}</p>}
                                                                </div>
                                                                <button onClick={(event) => { event.stopPropagation(); abrirDetalleAgenda(booking); }} className="mt-auto w-full bg-white/20 hover:bg-white/30 rounded px-2 py-1 text-[11px] font-bold">
                                                                    Detalles
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        )}

                        <div className="p-4 border-t bg-gray-50 flex flex-wrap gap-3 text-xs">
                            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-pink-500"></span>Reservado</span>
                            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-amber-400"></span>Pendiente</span>
                            <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500"></span>Completado</span>
                        </div>
                    </div>
                )}

                {cobroEditando && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl">
                            <div className="flex items-start justify-between gap-4 border-b pb-3 mb-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-emerald-600 font-bold">Cobro real</p>
                                    <h3 className="text-xl font-bold text-gray-900">{cobroEditando.cliente_nombre || 'Cliente sin nombre'}</h3>
                                    <p className="text-sm text-gray-500">{cobroEditando.servicio}</p>
                                </div>
                                <button onClick={() => setCobroEditando(null)} disabled={guardandoCobro} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto cobrado real</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={cobroForm.monto_cobrado}
                                        onChange={(e) => setCobroForm({...cobroForm, monto_cobrado: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="Ej: 2500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nota opcional</label>
                                    <textarea
                                        value={cobroForm.notas_cobro}
                                        onChange={(e) => setCobroForm({...cobroForm, notas_cobro: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2 min-h-24"
                                        placeholder="Ej: ajuste por diseño extra, descuento, propina..."
                                    />
                                </div>
                                {cobroEditando._grupoVisual && (
                                    <p className="text-xs text-gray-500">
                                        Esta cita tiene varios servicios. El monto se distribuirá entre ellos para que las estadísticas sumen correctamente.
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setCobroEditando(null)} disabled={guardandoCobro} className="flex-1 px-4 py-2 border rounded-lg disabled:opacity-50">Cancelar</button>
                                <button onClick={guardarCobroReal} disabled={guardandoCobro} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold disabled:opacity-60">
                                    {guardandoCobro ? 'Guardando...' : 'Guardar cobro'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* RESERVAS */}
                {tabActivo === 'reservas' && (
                    <>
                        {userRole === 'profesional' && profesional && (
                            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                                <p className="text-pink-800 font-medium">Hola {profesional.nombre} - Mostrando tus reservas ({filteredVisualBookings.length})</p>
                            </div>
                        )}

                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                            <div className="flex flex-wrap gap-3 items-center">
                                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
                                {filterDate && <button onClick={() => setFilterDate('')} className="text-pink-500 text-sm">Limpiar filtro</button>}
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                <button onClick={() => setStatusFilter('activas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'activas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Activas ({activasCount})</button>
                                <button onClick={() => setStatusFilter('pendientes')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'pendientes' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Pendientes ({pendientesCount})</button>
                                <button onClick={() => setStatusFilter('completadas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'completadas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Completadas ({completadasCount})</button>
                                <button onClick={() => setStatusFilter('ausentes')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'ausentes' ? 'bg-slate-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Ausentes ({ausentesCount})</button>
                                <button onClick={() => setStatusFilter('canceladas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'canceladas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Canceladas ({canceladasCount})</button>
                                <button onClick={() => setStatusFilter('todas')} className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === 'todas' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700'}`}>Todas ({bookings.length})</button>
                                {puedeGestionarAvanzado && statusFilter === 'canceladas' && (
                                    <button onClick={borrarCanceladas} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm">🗑️ Borrar todas</button>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div><p className="text-pink-500 mt-4">Cargando reservas...</p></div>
                        ) : (
                            <div className="space-y-3">
                                {filteredVisualBookings.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl"><p className="text-gray-500">No hay reservas para mostrar</p></div>
                                ) : (
                                    filteredVisualBookings.map(b => (
                                        <div key={b._grupoVisualId || b.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                                            b.estado === 'Reservado' ? 'border-l-pink-500' :
                                            b.estado === 'Pendiente' ? 'border-l-yellow-500' :
                                            b.estado === 'Completado' ? 'border-l-green-500' :
                                            b.estado === 'Ausente' ? 'border-l-slate-500' :
                                            'border-l-red-500'
                                        }`}>
                                            <div className="flex justify-between mb-2">
                                                <span className="font-semibold">{window.formatFechaCompleta ? window.formatFechaCompleta(b.fecha) : b.fecha}</span>
                                                <span className="text-sm bg-pink-100 text-pink-700 px-2 py-1 rounded-full">{formatTo12Hour(b.hora_inicio)}{b._grupoVisual ? ` - ${formatTo12Hour(b.hora_fin)}` : ''}</span>
                                            </div>
                                            <div className="text-sm space-y-1">
                                                <p><span className="font-medium">Cliente:</span> {b.cliente_nombre}</p>
                                                <p><span className="font-medium">WhatsApp:</span> {b.cliente_whatsapp}</p>
                                                <p><span className="font-medium">Servicio:</span> {b.servicio}</p>
                                                <p><span className="font-medium">👩‍🎨 Profesional:</span> {b.profesional_nombre || b.trabajador_nombre}</p>
                                                {b._grupoVisual && (
                                                    <div className="mt-2 rounded-lg bg-pink-50 border border-pink-100 p-2 space-y-1">
                                                        <p className="text-xs font-bold text-pink-700">Cita agrupada: {b._reservasGrupo.length} servicios consecutivos</p>
                                                        {b._reservasGrupo.map(item => (
                                                            <p key={item.id} className="text-xs text-gray-700">
                                                                {formatTo12Hour(item.hora_inicio)} - {formatTo12Hour(item.hora_fin || calculateEndTime(item.hora_inicio, item.duracion || 60))} · {item.servicio} · {item.profesional_nombre || item.trabajador_nombre || 'Sin profesional'}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                                {Number(b.monto_cobrado || 0) > 0 && (
                                                    <div className="mt-2 rounded-lg bg-green-50 border border-green-100 p-2">
                                                        <p className="text-xs font-bold text-green-700">Cobro real: ${Number(b.monto_cobrado).toLocaleString('es-CU')}</p>
                                                        {b.notas_cobro && <p className="text-xs text-green-700 mt-1">{b.notas_cobro}</p>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-2 border-t">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.estado === 'Reservado' ? 'bg-pink-100 text-pink-700' : b.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : b.estado === 'Completado' ? 'bg-green-100 text-green-700' : b.estado === 'Ausente' ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-700'}`}>
                                                    {b.estado}
                                                </span>
                                                <div className="flex flex-wrap justify-end gap-2">
                                                    {puedeEditarReserva(b) && (b.estado === 'Pendiente' || b.estado === 'Reservado') && (
                                                        <button onClick={() => abrirModalReprogramar(b)} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">Reprogramar</button>
                                                    )}
                                                    {puedeGestionarReservas && b.estado === 'Pendiente' && (
                                                        <button onClick={() => confirmarPago(b.id, b)} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">Confirmar pago</button>
                                                    )}
                                                    {puedeGestionarReservas && b.estado === 'Reservado' && (
                                                        <button onClick={() => handleCancel(b.id, b)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">❌ Cancelar</button>
                                                    )}
                                                    {puedeGestionarReservas && b.estado === 'Completado' && (
                                                        <button onClick={() => abrirModalCobro(b)} className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                                                            {Number(b.monto_cobrado || 0) > 0 ? 'Editar cobro' : 'Cobro real'}
                                                        </button>
                                                    )}
                                                    {puedeGestionarReservas && turnoYaPaso(b) && b.estado !== 'Cancelado' && b.estado !== 'Ausente' && (
                                                        <button onClick={() => marcarAusencia(b)} className="px-3 py-1 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700">Marcar ausencia</button>
                                                    )}
                                                    {puedeGestionarAvanzado && (b.estado === 'Cancelado' || b.estado === 'Completado' || b.estado === 'Ausente') && (
                                                        <button onClick={() => eliminarReservaHistorial(b)} className="px-3 py-1 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-800">Eliminar</button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AdminApp />);

