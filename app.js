// admin-app.js - LAG.barberia (VERSIÓN COMPLETA CORREGIDA)

// ============================================
// FUNCIONES DE SUPABASE
// ============================================
async function getAllBookings() {
    try {
        const res = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?select=*&order=fecha.desc,hora_inicio.asc`,
            {
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            }
        );
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return [];
    }
}

async function cancelBooking(id) {
    try {
        const res = await fetch(
            `${window.SUPABASE_URL}/rest/v1/reservas?id=eq.${id}`,
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
        return res.ok;
    } catch (error) {
        console.error('Error cancel booking:', error);
        return false;
    }
}

async function createBooking(bookingData) {
    try {
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
                body: JSON.stringify(bookingData)
            }
        );
        
        if (!res.ok) {
            const error = await res.text();
            throw new Error(error);
        }
        
        const data = await res.json();
        return { success: true, data: Array.isArray(data) ? data[0] : data };
    } catch (error) {
        console.error('Error creating booking:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
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

const getMinAllowedTime = () => {
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();
    const totalMinutosActual = horaActual * 60 + minutosActuales;
    const minAllowedMinutes = totalMinutosActual + 120;
    
    return {
        totalMinutes: minAllowedMinutes,
        hours: Math.floor(minAllowedMinutes / 60),
        minutes: minAllowedMinutes % 60,
        formatted: `${Math.floor(minAllowedMinutes / 60).toString().padStart(2, '0')}:${(minAllowedMinutes % 60).toString().padStart(2, '0')}`
    };
};

const getCurrentLocalDate = () => {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = (ahora.getMonth() + 1).toString().padStart(2, '0');
    const day = ahora.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const indiceToHoraLegible = (indice) => {
    const horas = Math.floor(indice / 2);
    const minutos = indice % 2 === 0 ? '00' : '30';
    return `${horas.toString().padStart(2, '0')}:${minutos}`;
};

// ============================================
// 🔥 FUNCIÓN CORREGIDA PARA VERIFICAR SI UN TURNO YA PASÓ
// ============================================
const turnoYaPaso = (fecha, horaInicio) => {
    try {
        const ahora = new Date();
        const [year, month, day] = fecha.split('-').map(Number);
        const [hours, minutes] = horaInicio.split(':').map(Number);
        
        // Crear fecha del turno (sin comparar hora aún)
        const fechaTurno = new Date(year, month - 1, day);
        const fechaHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        
        console.log('🔍 Comparando turno:', {
            fechaTurno: fechaTurno.toLocaleDateString(),
            fechaHoy: fechaHoy.toLocaleDateString(),
            horaTurno: `${hours}:${minutes}`,
            horaActual: `${ahora.getHours()}:${ahora.getMinutes()}`
        });
        
        // 🔥 CORRECCIÓN: Comparar fechas primero
        if (fechaTurno > fechaHoy) {
            // Fecha futura - NO pasó
            console.log(`📅 Turno ${fecha} ${horaInicio} es FUTURO - NO PASÓ`);
            return false;
        }
        
        if (fechaTurno < fechaHoy) {
            // Fecha pasada - SÍ pasó
            console.log(`📅 Turno ${fecha} ${horaInicio} es FECHA PASADA - COMPLETAR`);
            return true;
        }
        
        // Es hoy - comparar hora
        const horaActual = ahora.getHours();
        const minutosActuales = ahora.getMinutes();
        const totalMinutosActual = horaActual * 60 + minutosActuales;
        const totalMinutosTurno = hours * 60 + minutes + 60; // +60 para considerar la duración
        
        const paso = totalMinutosTurno < totalMinutosActual;
        console.log(`📅 Turno HOY ${fecha} ${horaInicio}: ${paso ? 'YA PASÓ' : 'AÚN NO PASA'}`);
        
        return paso;
    } catch (error) {
        console.error('Error verificando si el turno pasó:', error);
        return false;
    }
};

// ============================================
// FUNCIÓN PARA ENVIAR MENSAJE DE CANCELACIÓN POR WHATSAPP (VERSIÓN API)
// ============================================
const enviarCancelacionWhatsApp = (bookingData) => {
    try {
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(bookingData.fecha) : 
            bookingData.fecha;
        
        const mensaje = 
`❌ *CANCELACIÓN DE TURNO - LAG.barberia*

Hola *${bookingData.cliente_nombre}*, lamentamos informarte que tu turno ha sido cancelado.

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${formatTo12Hour(bookingData.hora_inicio)}
💈 *Servicio:* ${bookingData.servicio}
👨‍🎨 *Barbero:* ${bookingData.barbero_nombre || bookingData.trabajador_nombre || 'No asignado'}

🔔 *Motivo:* Cancelación por administración

📱 *¿Querés reprogramar?*
Podés hacerlo desde la app

Disculpá las molestias. Esperamos verte pronto en LAG.barberia ✂️

LAG.barberia - Nivel que se nota`;

        const telefono = bookingData.cliente_whatsapp.replace(/\D/g, '');
        const encodedText = encodeURIComponent(mensaje);
        
        window.open(`https://api.whatsapp.com/send?phone=${telefono}&text=${encodedText}`, '_blank');
        
        console.log('📤 Mensaje de cancelación enviado a:', telefono);
    } catch (error) {
        console.error('Error enviando mensaje de cancelación:', error);
    }
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
function AdminApp() {
    // Estados principales
    const [bookings, setBookings] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filterDate, setFilterDate] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('activas');
    
    // Detectar rol del usuario y nivel
    const [userRole, setUserRole] = React.useState('admin');
    const [userNivel, setUserNivel] = React.useState(3);
    const [barbero, setBarbero] = React.useState(null);
    
    // Pestaña activa
    const [tabActivo, setTabActivo] = React.useState('reservas');
    
    // Estados para clientes pendientes
    const [showClientesPendientes, setShowClientesPendientes] = React.useState(false);
    const [clientesPendientes, setClientesPendientes] = React.useState([]);
    const [showClientesAutorizados, setShowClientesAutorizados] = React.useState(false);
    const [clientesAutorizados, setClientesAutorizados] = React.useState([]);
    const [errorClientes, setErrorClientes] = React.useState('');
    const [cargandoClientes, setCargandoClientes] = React.useState(false);

    // ============================================
    // MODAL PARA CREAR RESERVA MANUAL
    // ============================================
    const [showNuevaReservaModal, setShowNuevaReservaModal] = React.useState(false);
    const [nuevaReservaData, setNuevaReservaData] = React.useState({
        cliente_nombre: '',
        cliente_whatsapp: '',
        servicio: '',
        barbero_id: '',
        fecha: '',
        hora_inicio: ''
    });

    const [serviciosList, setServiciosList] = React.useState([]);
    const [barberosList, setBarberosList] = React.useState([]);
    const [horariosDisponibles, setHorariosDisponibles] = React.useState([]);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [diasLaborales, setDiasLaborales] = React.useState([]);
    const [fechasConHorarios, setFechasConHorarios] = React.useState({});

    // ============================================
    // DETECTAR ROL Y NIVEL DEL USUARIO AL INICIAR
    // ============================================
    React.useEffect(() => {
        const barberoAuth = window.getBarberoAutenticado?.();
        if (barberoAuth) {
            console.log('👤 Usuario detectado como barbero:', barberoAuth);
            setUserRole('barbero');
            setBarbero(barberoAuth);
            setUserNivel(barberoAuth.nivel || 1);
            
            setNuevaReservaData(prev => ({
                ...prev,
                barbero_id: barberoAuth.id
            }));
        } else {
            console.log('👑 Usuario detectado como admin');
            setUserRole('admin');
            setUserNivel(3);
        }
    }, []);

    // Cargar datos para el modal
    React.useEffect(() => {
        const cargarDatosModal = async () => {
            if (window.salonServicios) {
                const servicios = await window.salonServicios.getAll(true);
                setServiciosList(servicios || []);
            }
            if (window.salonBarberos) {
                const barberos = await window.salonBarberos.getAll(true);
                setBarberosList(barberos || []);
            }
        };
        cargarDatosModal();
    }, []);

    // Cargar días laborales cuando se selecciona barbero
    React.useEffect(() => {
        const cargarDiasLaborales = async () => {
            if (nuevaReservaData.barbero_id) {
                try {
                    const horarios = await window.salonConfig.getHorariosBarbero(nuevaReservaData.barbero_id);
                    setDiasLaborales(horarios.dias || []);
                    
                    await cargarDisponibilidadMes(currentDate, nuevaReservaData.barbero_id);
                } catch (error) {
                    console.error('Error cargando días laborales:', error);
                    setDiasLaborales([]);
                }
            }
        };
        cargarDiasLaborales();
    }, [nuevaReservaData.barbero_id]);

    // ============================================
    // FUNCIÓN PARA CARGAR HORARIOS DISPONIBLES
    // ============================================
    React.useEffect(() => {
        const cargarHorarios = async () => {
            if (!nuevaReservaData.barbero_id || !nuevaReservaData.fecha || !nuevaReservaData.servicio) {
                setHorariosDisponibles([]);
                return;
            }

            try {
                const servicio = serviciosList.find(s => s.nombre === nuevaReservaData.servicio);
                if (!servicio) return;

                const horarios = await window.salonConfig.getHorariosBarbero(nuevaReservaData.barbero_id);
                const horasTrabajo = horarios.horas || [];
                
                const slotsTrabajo = horasTrabajo.map(indice => indiceToHoraLegible(indice));
                
                const response = await fetch(
                    `${window.SUPABASE_URL}/rest/v1/reservas?fecha=eq.${nuevaReservaData.fecha}&barbero_id=eq.${nuevaReservaData.barbero_id}&estado=neq.Cancelado&select=hora_inicio,hora_fin`,
                    {
                        headers: {
                            'apikey': window.SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                        }
                    }
                );
                
                const reservas = await response.json();

                const ahora = new Date();
                const horaActual = ahora.getHours();
                const minutosActuales = ahora.getMinutes();
                const totalMinutosActual = horaActual * 60 + minutosActuales;
                const minAllowedMinutes = totalMinutosActual + 120;

                const hoy = new Date().toISOString().split('T')[0];
                const esHoy = nuevaReservaData.fecha === hoy;

                const disponibles = slotsTrabajo.filter(slot => {
                    const [horas, minutos] = slot.split(':').map(Number);
                    const slotStart = horas * 60 + minutos;
                    const slotEnd = slotStart + servicio.duracion;

                    if (esHoy && slotStart < minAllowedMinutes) {
                        return false;
                    }

                    const tieneConflicto = reservas.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });

                    return !tieneConflicto;
                });

                disponibles.sort((a, b) => {
                    const [hA, mA] = a.split(':').map(Number);
                    const [hB, mB] = b.split(':').map(Number);
                    return (hA * 60 + mA) - (hB * 60 + mB);
                });

                setHorariosDisponibles(disponibles);

            } catch (error) {
                console.error('Error cargando horarios:', error);
                setHorariosDisponibles([]);
            }
        };

        cargarHorarios();
    }, [nuevaReservaData.barbero_id, nuevaReservaData.fecha, nuevaReservaData.servicio, serviciosList]);

    // Función para cargar disponibilidad de un mes completo
    const cargarDisponibilidadMes = async (fecha, barberoId) => {
        if (!barberoId) return;
        
        try {
            const year = fecha.getFullYear();
            const month = fecha.getMonth();
            
            const horarios = await window.salonConfig.getHorariosBarbero(barberoId);
            const horasTrabajo = horarios.horas || [];
            
            if (horasTrabajo.length === 0) {
                setFechasConHorarios({});
                return;
            }
            
            const primerDia = new Date(year, month, 1);
            const ultimoDia = new Date(year, month + 1, 0);
            
            const fechaInicio = primerDia.toISOString().split('T')[0];
            const fechaFin = ultimoDia.toISOString().split('T')[0];
            
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/reservas?fecha=gte.${fechaInicio}&fecha=lte.${fechaFin}&barbero_id=eq.${barberoId}&estado=neq.Cancelado&select=fecha,hora_inicio,hora_fin`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            const reservas = await response.json();
            
            const reservasPorFecha = {};
            (reservas || []).forEach(r => {
                if (!reservasPorFecha[r.fecha]) {
                    reservasPorFecha[r.fecha] = [];
                }
                reservasPorFecha[r.fecha].push(r);
            });
            
            const disponibilidad = {};
            const diasEnMes = ultimoDia.getDate();
            
            for (let d = 1; d <= diasEnMes; d++) {
                const fechaStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                
                let tieneDisponibilidad = false;
                
                for (const horaIndice of horasTrabajo) {
                    const slotStr = indiceToHoraLegible(horaIndice);
                    const [horas, minutos] = slotStr.split(':').map(Number);
                    const slotStart = horas * 60 + minutos;
                    const slotEnd = slotStart + 60;
                    
                    const reservasDia = reservasPorFecha[fechaStr] || [];
                    const tieneConflicto = reservasDia.some(reserva => {
                        const reservaStart = timeToMinutes(reserva.hora_inicio);
                        const reservaEnd = timeToMinutes(reserva.hora_fin);
                        return (slotStart < reservaEnd) && (slotEnd > reservaStart);
                    });
                    
                    if (!tieneConflicto) {
                        tieneDisponibilidad = true;
                        break;
                    }
                }
                
                disponibilidad[fechaStr] = tieneDisponibilidad;
            }
            
            setFechasConHorarios(disponibilidad);
        } catch (error) {
            console.error('Error cargando disponibilidad:', error);
        }
    };

    const cambiarMes = (direccion) => {
        const nuevaFecha = new Date(currentDate);
        nuevaFecha.setMonth(currentDate.getMonth() + direccion);
        setCurrentDate(nuevaFecha);
        
        if (nuevaReservaData.barbero_id) {
            cargarDisponibilidadMes(nuevaFecha, nuevaReservaData.barbero_id);
        }
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
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
        if (!date || !nuevaReservaData.barbero_id) return false;
        
        const fechaStr = formatDate(date);
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

    // ============================================
    // FUNCIÓN PARA CREAR RESERVA MANUAL
    // ============================================
    const handleCrearReservaManual = async () => {
        if (!nuevaReservaData.cliente_nombre || !nuevaReservaData.cliente_whatsapp || 
            !nuevaReservaData.servicio || !nuevaReservaData.barbero_id || 
            !nuevaReservaData.fecha || !nuevaReservaData.hora_inicio) {
            alert('Completá todos los campos');
            return;
        }

        try {
            const servicio = serviciosList.find(s => s.nombre === nuevaReservaData.servicio);
            if (!servicio) {
                alert('Servicio no encontrado');
                return;
            }
            
            const barbero = barberosList.find(b => b.id === parseInt(nuevaReservaData.barbero_id));
            if (!barbero) {
                alert('Barbero no encontrado');
                return;
            }
            
            const endTime = calculateEndTime(nuevaReservaData.hora_inicio, servicio.duracion);
            
            const bookingData = {
                cliente_nombre: nuevaReservaData.cliente_nombre,
                cliente_whatsapp: `53${nuevaReservaData.cliente_whatsapp.replace(/\D/g, '')}`,
                servicio: nuevaReservaData.servicio,
                duracion: servicio.duracion,
                barbero_id: nuevaReservaData.barbero_id,
                barbero_nombre: barbero.nombre,
                fecha: nuevaReservaData.fecha,
                hora_inicio: nuevaReservaData.hora_inicio,
                hora_fin: endTime,
                estado: "Reservado"
            };

            console.log('📤 Creando reserva manual:', bookingData);
            
            const result = await createBooking(bookingData);
            
            if (result.success) {
                alert('✅ Reserva creada exitosamente');
                
                setShowNuevaReservaModal(false);
                setNuevaReservaData({
                    cliente_nombre: '',
                    cliente_whatsapp: '',
                    servicio: '',
                    barbero_id: userRole === 'barbero' ? barbero?.id : '',
                    fecha: '',
                    hora_inicio: ''
                });
                
                fetchBookings();
            }
        } catch (error) {
            console.error('Error creando reserva:', error);
            alert('❌ Error al crear la reserva: ' + error.message);
        }
    };

    // ============================================
    // FUNCIONES DE CLIENTES
    // ============================================
    
    const loadClientesPendientes = async () => {
        console.log('🔄 Cargando clientes pendientes...');
        setCargandoClientes(true);
        try {
            if (typeof window.getClientesPendientes !== 'function') {
                console.error('❌ getClientesPendientes no está definida');
                setErrorClientes('Error: Sistema de clientes no disponible');
                setClientesPendientes([]);
                return;
            }
            
            const pendientes = await window.getClientesPendientes();
            console.log('📋 Pendientes obtenidos:', pendientes);
            
            if (Array.isArray(pendientes)) {
                setClientesPendientes(pendientes);
            } else {
                console.error('❌ pendientes no es un array:', pendientes);
                setClientesPendientes([]);
            }
            setErrorClientes('');
        } catch (error) {
            console.error('Error cargando pendientes:', error);
            setErrorClientes('Error al cargar solicitudes');
            setClientesPendientes([]);
        } finally {
            setCargandoClientes(false);
        }
    };

    const loadClientesAutorizados = async () => {
        console.log('🔄 Cargando clientes autorizados...');
        setCargandoClientes(true);
        try {
            if (typeof window.getClientesAutorizados !== 'function') {
                console.error('❌ getClientesAutorizados no está definida');
                setClientesAutorizados([]);
                return;
            }
            
            const autorizados = await window.getClientesAutorizados();
            console.log('📋 Autorizados obtenidos:', autorizados);
            
            if (Array.isArray(autorizados)) {
                setClientesAutorizados(autorizados);
            } else {
                console.error('❌ autorizados no es un array:', autorizados);
                setClientesAutorizados([]);
            }
        } catch (error) {
            console.error('Error cargando autorizados:', error);
            setClientesAutorizados([]);
        } finally {
            setCargandoClientes(false);
        }
    };

    const handleAprobarCliente = async (whatsapp) => {
        console.log('✅ Aprobando:', whatsapp);
        try {
            if (typeof window.aprobarCliente !== 'function') {
                alert('Error: Sistema de clientes no disponible');
                return;
            }
            const cliente = await window.aprobarCliente(whatsapp);
            if (cliente) {
                await loadClientesPendientes();
                await loadClientesAutorizados();
                alert(`✅ Cliente ${cliente.nombre} aprobado`);
                
                const mensaje = `✅ ¡Hola ${cliente.nombre}! Tu acceso a LAG.barberia ha sido APROBADO. Ya podés reservar turnos desde la app.`;
                const telefono = cliente.whatsapp.replace(/\D/g, '');
                const encodedText = encodeURIComponent(mensaje);
                window.open(`https://api.whatsapp.com/send?phone=${telefono}&text=${encodedText}`, '_blank');
            }
        } catch (error) {
            console.error('Error aprobando:', error);
            alert('Error al aprobar cliente');
        }
    };

    const handleRechazarCliente = async (whatsapp) => {
        if (!confirm('¿Rechazar esta solicitud?')) return;
        console.log('❌ Rechazando:', whatsapp);
        try {
            if (typeof window.rechazarCliente !== 'function') {
                alert('Error: Sistema de clientes no disponible');
                return;
            }
            const resultado = await window.rechazarCliente(whatsapp);
            if (resultado) {
                await loadClientesPendientes();
            }
        } catch (error) {
            console.error('Error rechazando:', error);
            alert('Error al rechazar cliente');
        }
    };

    const handleEliminarAutorizado = async (whatsapp) => {
        if (!confirm('¿Seguro que querés eliminar este cliente autorizado? Perderá el acceso a la app.')) return;
        console.log('🗑️ Eliminando autorizado:', whatsapp);
        try {
            if (typeof window.eliminarClienteAutorizado !== 'function') {
                alert('Error: Función no disponible');
                return;
            }
            const resultado = await window.eliminarClienteAutorizado(whatsapp);
            if (resultado) {
                await loadClientesAutorizados();
                alert(`✅ Cliente eliminado`);
            }
        } catch (error) {
            console.error('Error eliminando autorizado:', error);
            alert('Error al eliminar cliente');
        }
    };

    // ============================================
    // FUNCIONES DE RESERVAS
    // ============================================
    const fetchBookings = async () => {
        setLoading(true);
        try {
            let data;
            
            if (userRole === 'barbero' && barbero) {
                console.log(`📋 Cargando reservas de barbero ${barbero.id}...`);
                data = await window.getReservasPorBarbero?.(barbero.id, false) || [];
            } else {
                data = await getAllBookings();
            }
            
            if (Array.isArray(data)) {
                data.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio));
                setBookings(data);
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
        fetchBookings();
        
        if (userRole === 'admin' || (userRole === 'barbero' && userNivel >= 2)) {
            loadClientesAutorizados();
        }
        
        console.log('🔍 Verificando auth:', {
            userRole,
            userNivel,
            barbero
        });
    }, [userRole, userNivel, barbero]);

    // ============================================
    // FUNCIÓN DE CANCELACIÓN CON WHATSAPP
    // ============================================
    const handleCancel = async (id, bookingData) => {
        if (!confirm(`¿Cancelar reserva de ${bookingData.cliente_nombre}?`)) return;
        
        const ok = await cancelBooking(id);
        if (ok) {
            enviarCancelacionWhatsApp(bookingData);
            alert('✅ Reserva cancelada y cliente notificado');
            fetchBookings();
        } else {
            alert('❌ Error al cancelar');
        }
    };

    const handleLogout = () => {
        if (confirm('¿Cerrar sesión?')) {
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('adminLoginTime');
            localStorage.removeItem('barberoAuth');
            localStorage.removeItem('userRole');
            window.location.href = 'admin-login.html';
        }
    };

    // ============================================
    // FILTROS CORREGIDOS
    // ============================================
    const getFilteredBookings = () => {
        console.log('🔄 Aplicando filtros... Total bookings:', bookings.length);
        
        // Primero, filtrar por fecha si hay filtro activo
        let filtered = filterDate
            ? bookings.filter(b => b.fecha === filterDate)
            : [...bookings];
        
        console.log('📊 Después de filtro por fecha:', filtered.length);
        
        // 🔥 CORRECCIÓN: Solo ocultar turnos pasados si son Reservados
        const antesFiltro = filtered.length;
        filtered = filtered.filter(b => {
            // Si el estado es Cancelado, lo mostramos siempre
            if (b.estado === 'Cancelado') {
                return true;
            }
            
            // Verificar si el turno ya pasó (solo para Reservados)
            const paso = turnoYaPaso(b.fecha, b.hora_inicio);
            if (paso) {
                console.log(`🗑️ Ocultando turno pasado: ${b.fecha} ${b.hora_inicio} - ${b.cliente_nombre}`);
                return false;
            }
            return true;
        });
        
        console.log(`📊 Se ocultaron ${antesFiltro - filtered.length} turnos pasados`);
        
        // Luego filtrar por estado
        if (statusFilter === 'activas') {
            filtered = filtered.filter(b => b.estado === 'Reservado');
        } else if (statusFilter === 'canceladas') {
            filtered = filtered.filter(b => b.estado === 'Cancelado');
        } else if (statusFilter === 'completadas') {
            filtered = filtered.filter(b => b.estado === 'Completado');
        }
        
        console.log('📊 Total después de todos los filtros:', filtered.length);
        
        return filtered;
    };

    const activasCount = bookings.filter(b => b.estado === 'Reservado').length;
    const completadasCount = bookings.filter(b => b.estado === 'Completado').length;
    const canceladasCount = bookings.filter(b => b.estado === 'Cancelado').length;
    const filteredBookings = getFilteredBookings();

    const getTabsDisponibles = () => {
        const tabs = [];
        tabs.push({ id: 'reservas', icono: '📅', label: userRole === 'barbero' ? 'Mis Reservas' : 'Reservas' });
        
        if (userRole === 'admin' || (userRole === 'barbero' && userNivel >= 2)) {
            tabs.push({ id: 'configuracion', icono: '⚙️', label: 'Configuración' });
            tabs.push({ id: 'clientes', icono: '👤', label: 'Clientes' });
        }
        
        if (userRole === 'admin' || (userRole === 'barbero' && userNivel >= 3)) {
            tabs.push({ id: 'servicios', icono: '💈', label: 'Servicios' });
            tabs.push({ id: 'barberos', icono: '👥', label: 'Barberos' });
        }
        
        return tabs;
    };

    const abrirModalNuevaReserva = () => {
        setNuevaReservaData({
            cliente_nombre: '',
            cliente_whatsapp: '',
            servicio: '',
            barbero_id: userRole === 'barbero' ? barbero?.id : '',
            fecha: '',
            hora_inicio: ''
        });
        setCurrentDate(new Date());
        setDiasLaborales([]);
        setFechasConHorarios({});
        setShowNuevaReservaModal(true);
    };

    const tabsDisponibles = getTabsDisponibles();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const days = getDaysInMonth();

    return (
        <div className="min-h-screen bg-gray-100 p-3 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                
                {/* HEADER */}
                <div className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center flex-wrap gap-2">
                    <div>
                        <h1 className="text-xl font-bold">
                            {userRole === 'barbero' 
                                ? `Panel de ${barbero?.nombre}`
                                : 'Panel Admin - LAG.barberia'
                            }
                        </h1>
                        {userRole === 'barbero' && (
                            <p className="text-xs mt-1">
                                <span className={`px-2 py-0.5 rounded-full ${
                                    userNivel === 1 ? 'bg-gray-100 text-gray-600' :
                                    userNivel === 2 ? 'bg-blue-100 text-blue-600' :
                                    'bg-purple-100 text-purple-600'
                                }`}>
                                    {userNivel === 1 && '🔰 Nivel Básico'}
                                    {userNivel === 2 && '⭐ Nivel Intermedio'}
                                    {userNivel === 3 && '👑 Nivel Avanzado'}
                                </span>
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={abrirModalNuevaReserva}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition transform hover:scale-105 shadow-md"
                            title="Crear reserva para un cliente"
                        >
                            <span>📅</span>
                            <span className="hidden sm:inline">Nueva Reserva</span>
                        </button>
                        <button 
                            onClick={fetchBookings} 
                            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                            title="Actualizar"
                        >
                            🔄
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition"
                            title="Cerrar sesión"
                        >
                            🚪
                        </button>
                    </div>
                </div>

                {/* MODAL NUEVA RESERVA */}
                {showNuevaReservaModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">📅 Nueva Reserva Manual</h3>
                                <button 
                                    onClick={() => setShowNuevaReservaModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Nombre del cliente */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre del Cliente *
                                    </label>
                                    <input
                                        type="text"
                                        value={nuevaReservaData.cliente_nombre}
                                        onChange={(e) => setNuevaReservaData({...nuevaReservaData, cliente_nombre: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>

                                {/* WhatsApp del cliente */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        WhatsApp del Cliente *
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                                            +53
                                        </span>
                                        <input
                                            type="tel"
                                            value={nuevaReservaData.cliente_whatsapp}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                setNuevaReservaData({...nuevaReservaData, cliente_whatsapp: value});
                                            }}
                                            className="w-full px-4 py-2 rounded-r-lg border border-gray-300"
                                            placeholder="55002272"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">8 dígitos después del +53</p>
                                </div>

                                {/* Selección de servicio */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Servicio *
                                    </label>
                                    <select
                                        value={nuevaReservaData.servicio}
                                        onChange={(e) => setNuevaReservaData({...nuevaReservaData, servicio: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        <option value="">Seleccionar servicio</option>
                                        {serviciosList.map(s => (
                                            <option key={s.id} value={s.nombre}>
                                                {s.nombre} ({s.duracion} min - ${s.precio})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Selección de barbero */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Barbero *
                                    </label>
                                    {userRole === 'barbero' && userNivel <= 2 ? (
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <p className="text-sm text-blue-700">
                                                Reserva asignada a vos: <strong>{barbero?.nombre}</strong>
                                            </p>
                                        </div>
                                    ) : (
                                        <select
                                            value={nuevaReservaData.barbero_id}
                                            onChange={(e) => setNuevaReservaData({...nuevaReservaData, barbero_id: e.target.value})}
                                            className="w-full border rounded-lg px-3 py-2"
                                        >
                                            <option value="">Seleccionar barbero</option>
                                            {barberosList.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.nombre} - {b.especialidad}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Calendario de fechas */}
                                {nuevaReservaData.barbero_id && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Fecha *
                                        </label>
                                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-100">
                                                <button 
                                                    onClick={() => cambiarMes(-1)} 
                                                    className="p-2 hover:bg-white rounded-full transition-colors"
                                                >
                                                    ◀
                                                </button>
                                                <span className="font-bold text-gray-800">
                                                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                                                </span>
                                                <button 
                                                    onClick={() => cambiarMes(1)} 
                                                    className="p-2 hover:bg-white rounded-full transition-colors"
                                                >
                                                    ▶
                                                </button>
                                            </div>

                                            <div className="p-3">
                                                <div className="grid grid-cols-7 mb-2 text-center text-xs font-medium text-gray-400">
                                                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                                                        <div key={i}>{d}</div>
                                                    ))}
                                                </div>
                                                
                                                <div className="grid grid-cols-7 gap-1">
                                                    {days.map((date, idx) => {
                                                        if (!date) {
                                                            return <div key={idx} className="h-10" />;
                                                        }

                                                        const fechaStr = formatDate(date);
                                                        const available = isDateAvailable(date);
                                                        const selected = nuevaReservaData.fecha === fechaStr;
                                                        
                                                        let className = "h-10 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-all relative";
                                                        
                                                        if (selected) {
                                                            className += " bg-amber-600 text-white shadow-md ring-2 ring-amber-300";
                                                        } else if (!available) {
                                                            className += " text-gray-300 cursor-not-allowed bg-gray-50";
                                                        } else {
                                                            className += " text-gray-700 hover:bg-amber-50 hover:text-amber-600 hover:scale-105 cursor-pointer";
                                                        }
                                                        
                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleDateSelect(date)}
                                                                disabled={!available}
                                                                className={className}
                                                            >
                                                                {date.getDate()}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Horarios disponibles */}
                                {nuevaReservaData.fecha && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Hora de inicio *
                                        </label>
                                        {horariosDisponibles.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {horariosDisponibles.map(hora => (
                                                    <button
                                                        key={hora}
                                                        type="button"
                                                        onClick={() => setNuevaReservaData({...nuevaReservaData, hora_inicio: hora})}
                                                        className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                                                            nuevaReservaData.hora_inicio === hora
                                                                ? 'bg-amber-600 text-white'
                                                                : 'bg-gray-100 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {formatTo12Hour(hora)}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                                No hay horarios disponibles para esta fecha
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Botones de acción */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setShowNuevaReservaModal(false)}
                                        className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCrearReservaManual}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                        Crear Reserva
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PESTAÑAS */}
                <div className="bg-white p-2 rounded-xl shadow-sm flex flex-wrap gap-2">
                    {tabsDisponibles.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setTabActivo(tab.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                tabActivo === tab.id 
                                    ? 'bg-amber-600 text-white shadow-md scale-105' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span>{tab.icono}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* CONTENIDO */}
                {tabActivo === 'configuracion' && (
                    <ConfigPanel 
                        barberoId={userRole === 'barbero' ? barbero?.id : null}
                        modoRestringido={userRole === 'barbero' && userNivel === 2}
                    />
                )}

                {tabActivo === 'servicios' && (userRole === 'admin' || userNivel >= 3) && (
                    <ServiciosPanel />
                )}

                {tabActivo === 'barberos' && (userRole === 'admin' || userNivel >= 3) && (
                    <BarberosPanel />
                )}

                {tabActivo === 'clientes' && (userRole === 'admin' || userNivel >= 2) && (
                    <div className="space-y-4">
                        {cargandoClientes && (
                            <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                <span className="text-blue-600">Cargando datos...</span>
                            </div>
                        )}

                        {/* CLIENTES AUTORIZADOS */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                            <button
                                onClick={() => {
                                    setShowClientesAutorizados(!showClientesAutorizados);
                                    if (!showClientesAutorizados) loadClientesAutorizados();
                                }}
                                className="flex items-center justify-between w-full"
                            >
                                <div className="flex items-center gap-2">
                                    <span>✅</span>
                                    <span className="font-medium">Clientes Autorizados</span>
                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                        {clientesAutorizados.length}
                                    </span>
                                </div>
                                <span>{showClientesAutorizados ? '▲' : '▼'}</span>
                            </button>
                            
                            {showClientesAutorizados && (
                                <div className="mt-4">
                                    <div className="space-y-3 max-h-80 overflow-y-auto">
                                        {clientesAutorizados.length === 0 ? (
                                            <div className="text-center py-6 text-gray-500">
                                                <p>No hay clientes autorizados</p>
                                            </div>
                                        ) : (
                                            clientesAutorizados.map((cliente, index) => (
                                                <div key={index} className="bg-green-50 p-4 rounded-lg border border-green-200">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-gray-800">{cliente.nombre}</p>
                                                            <p className="text-sm text-gray-600">📱 +{cliente.whatsapp}</p>
                                                        </div>
                                                        {(userRole === 'admin' || userNivel >= 3) && cliente.whatsapp !== '55002272' && (
                                                            <button
                                                                onClick={() => handleEliminarAutorizado(cliente.whatsapp)}
                                                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                                                            >
                                                                Quitar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CLIENTES PENDIENTES */}
                        {(userRole === 'admin' || userNivel >= 3) && (
                            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
                                <button
                                    onClick={() => {
                                        setShowClientesPendientes(!showClientesPendientes);
                                        if (!showClientesPendientes) loadClientesPendientes();
                                    }}
                                    className="flex items-center justify-between w-full"
                                >
                                    <div className="flex items-center gap-2">
                                        <span>⏳</span>
                                        <span className="font-medium">Solicitudes Pendientes</span>
                                        {clientesPendientes.length > 0 && (
                                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                                                {clientesPendientes.length}
                                            </span>
                                        )}
                                    </div>
                                    <span>{showClientesPendientes ? '▲' : '▼'}</span>
                                </button>
                                
                                {showClientesPendientes && (
                                    <div className="mt-4">
                                        <div className="space-y-3 max-h-80 overflow-y-auto">
                                            {clientesPendientes.length === 0 ? (
                                                <div className="text-center py-6 text-gray-500">
                                                    <p>No hay solicitudes pendientes</p>
                                                </div>
                                            ) : (
                                                clientesPendientes.map((cliente, index) => (
                                                    <div key={index} className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-bold text-gray-800">{cliente.nombre}</p>
                                                                <p className="text-sm text-gray-600">📱 +{cliente.whatsapp}</p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleAprobarCliente(cliente.whatsapp)}
                                                                    className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                                                                >
                                                                    Aprobar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRechazarCliente(cliente.whatsapp)}
                                                                    className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                                                                >
                                                                    Rechazar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* RESERVAS */}
                {tabActivo === 'reservas' && (
                    <>
                        {userRole === 'barbero' && barbero && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-blue-800 font-medium">
                                    Hola {barbero.nombre} 👋 - Mostrando tus reservas ({filteredBookings.length})
                                </p>
                            </div>
                        )}

                        <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                            <div className="flex flex-wrap gap-3 items-center">
                                <input 
                                    type="date" 
                                    value={filterDate} 
                                    onChange={(e) => setFilterDate(e.target.value)} 
                                    className="border rounded-lg px-3 py-2 text-sm"
                                />
                                {filterDate && (
                                    <button onClick={() => setFilterDate('')} className="text-red-500 text-sm">
                                        Limpiar filtro
                                    </button>
                                )}
                                <span className="text-xs text-gray-400">
                                    (Filtros: Activas | Completadas | Canceladas)
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setStatusFilter('activas')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                        statusFilter === 'activas' 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    Activas ({activasCount})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('completadas')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                        statusFilter === 'completadas' 
                                            ? 'bg-blue-500 text-white' 
                                            : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    Completadas ({completadasCount})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('canceladas')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                        statusFilter === 'canceladas' 
                                            ? 'bg-red-500 text-white' 
                                            : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    Canceladas ({canceladasCount})
                                </button>
                                <button
                                    onClick={() => setStatusFilter('todas')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                        statusFilter === 'todas' 
                                            ? 'bg-gray-800 text-white' 
                                            : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    Todas ({bookings.length})
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
                                <p className="text-gray-500 mt-4">Cargando reservas...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredBookings.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl">
                                        <p className="text-gray-500">No hay reservas para mostrar</p>
                                        {bookings.length > filteredBookings.length && (
                                            <p className="text-xs text-gray-400 mt-2">
                                                (Hay {bookings.length} reservas en total)
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    filteredBookings.map(b => (
                                        <div key={b.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                                            b.estado === 'Reservado' ? 'border-l-amber-500' :
                                            b.estado === 'Completado' ? 'border-l-green-500' :
                                            'border-l-red-500'
                                        }`}>
                                            <div className="flex justify-between mb-2">
                                                <span className="font-semibold">
                                                    {window.formatFechaCompleta ? window.formatFechaCompleta(b.fecha) : b.fecha}
                                                </span>
                                                <span className="text-sm bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                                    {formatTo12Hour(b.hora_inicio)}
                                                </span>
                                            </div>
                                            <div className="text-sm space-y-1">
                                                <p><span className="font-medium">👤 Cliente:</span> {b.cliente_nombre}</p>
                                                <p><span className="font-medium">📱 WhatsApp:</span> {b.cliente_whatsapp}</p>
                                                <p><span className="font-medium">💈 Servicio:</span> {b.servicio}</p>
                                                <p><span className="font-medium">👨‍🎨 Barbero:</span> {b.barbero_nombre || b.trabajador_nombre}</p>
                                            </div>
                                            <div className="flex justify-between items-center mt-3 pt-2 border-t">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                    ${b.estado === 'Reservado' ? 'bg-yellow-100 text-yellow-700' : 
                                                      b.estado === 'Completado' ? 'bg-green-100 text-green-700' : 
                                                      'bg-red-100 text-red-700'}`}>
                                                    {b.estado}
                                                </span>
                                                {b.estado === 'Reservado' && (
                                                    <button 
                                                        onClick={() => handleCancel(b.id, b)} 
                                                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 flex items-center gap-1"
                                                    >
                                                        <span>❌</span> Cancelar
                                                    </button>
                                                )}
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