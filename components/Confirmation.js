// components/Confirmation.js - VERSIÓN SIMPLIFICADA (SIN ENVÍO AUTOMÁTICO)

function Confirmation({ booking, onReset }) {
    const [telefonoDuenno, setTelefonoDuenno] = React.useState('55002272');
    const [nombreNegocio, setNombreNegocio] = React.useState('Negocio de Prueba');
    const [estrellas, setEstrellas] = React.useState(0);
    const [valoracionEnviada, setValoracionEnviada] = React.useState(false);
    const [hoverEstrella, setHoverEstrella] = React.useState(0);

    React.useEffect(() => {
        const cargarDatos = async () => {
            try {
                const tel = await window.getTelefonoDuenno();
                const nombre = await window.getNombreNegocio();
                setTelefonoDuenno(tel);
                setNombreNegocio(nombre);
            } catch (error) {}
        };
        cargarDatos();
        // Ver si ya valoró esta reserva
        if (booking?.id) {
            const ya = localStorage.getItem(`val_${booking.id}`);
            if (ya) { setEstrellas(parseInt(ya)); setValoracionEnviada(true); }
        }
    }, []);

    const enviarValoracion = (n) => {
        setEstrellas(n);
        setValoracionEnviada(true);
        if (booking?.id) localStorage.setItem(`val_${booking.id}`, String(n));
    };

    // ⚡ ELIMINADO: useEffect con setTimeout que causaba problemas en iOS
    // Ahora el WhatsApp se envía en BookingForm.js inmediatamente

    if (!booking) {
        console.error('❌ booking no definido');
        return null;
    }

    const fechaConDia = window.formatFechaCompleta ? 
        window.formatFechaCompleta(booking.fecha) : 
        booking.fecha;
    const calendarLink = window.generarLinkCalendarioCliente ? 
        window.generarLinkCalendarioCliente(booking) : 
        '';
    const telefonoContacto = window.formatearTelefono ? window.formatearTelefono(telefonoDuenno) : `+${telefonoDuenno}`;

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in bg-gradient-to-b from-pink-50 to-pink-100">
            <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center mb-6 shadow-xl ring-4 ring-pink-300">
                <span className="text-4xl text-white">✅</span>
            </div>
            
            <h2 className="text-2xl font-bold text-pink-800 mb-2">✨ ¡Turno Reservado! ✨</h2>
            <p className="text-pink-600 mb-6 max-w-xs mx-auto">Tu cita ha sido agendada correctamente</p>

            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border-2 border-pink-300 w-full max-w-sm mb-6">
                <div className="space-y-4 text-left">
                    <div>
                        <div className="text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1">Cliente</div>
                        <div className="font-medium text-pink-700 text-lg">{booking.cliente_nombre}</div>
                    </div>
                    
                    <div>
                        <div className="text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1">WhatsApp</div>
                        <div className="font-medium text-pink-700">{booking.cliente_whatsapp}</div>
                    </div>
                    
                    <div>
                        <div className="text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1">Servicio</div>
                        <div className="font-medium text-pink-700">{booking.servicio}</div>
                        <div className="text-sm text-pink-500">{booking.duracion} min</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1">Fecha</div>
                            <div className="font-medium text-pink-700 text-sm">{fechaConDia}</div>
                        </div>
                        <div>
                            <div className="text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1">Hora</div>
                            <div className="font-medium text-pink-700">{window.formatTo12Hour ? window.formatTo12Hour(booking.hora_inicio) : booking.hora_inicio}</div>
                        </div>
                    </div>
                    
                    <div>
                        <div className="text-xs text-pink-400 uppercase tracking-wider font-semibold mb-1">Profesional</div>
                        <div className="font-medium text-pink-700">{booking.profesional_nombre || booking.trabajador_nombre || 'No asignada'}</div>
                    </div>
                </div>
            </div>

            <div className="bg-pink-100 border border-pink-300 rounded-lg p-4 mb-6 max-w-sm w-full">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center text-white text-xl">
                        📱
                    </div>
                    <div className="text-left">
                        <p className="font-medium text-pink-800">Administradora notificada</p>
                        <p className="text-xs text-pink-600">✅ Notificaciones enviadas</p>
                    </div>
                </div>
            </div>

            {/* Valoración */}
            <div className="w-full max-w-sm mb-4 bg-white/90 backdrop-blur-sm p-5 rounded-2xl border-2 border-pink-200 shadow-sm text-center">
                {!valoracionEnviada ? (
                    <>
                        <p className="font-semibold text-pink-800 mb-1">¿Cómo fue tu experiencia?</p>
                        <p className="text-xs text-pink-500 mb-3">Tu opinión nos ayuda a mejorar</p>
                        <div className="flex justify-center gap-2">
                            {[1,2,3,4,5].map(n => (
                                <button key={n}
                                    onClick={() => enviarValoracion(n)}
                                    onMouseEnter={() => setHoverEstrella(n)}
                                    onMouseLeave={() => setHoverEstrella(0)}
                                    className="text-3xl transition-transform hover:scale-110 active:scale-95"
                                    style={{ filter: (hoverEstrella || estrellas) >= n ? 'none' : 'grayscale(1) opacity(0.4)' }}>
                                    ⭐
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-1 text-2xl mb-1">
                            {[1,2,3,4,5].map(n => (
                                <span key={n} style={{ filter: estrellas >= n ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</span>
                            ))}
                        </div>
                        <p className="font-semibold text-pink-700">
                            {estrellas >= 5 ? '¡Gracias, eso nos encanta!' :
                             estrellas >= 4 ? '¡Gracias por tu valoración!' :
                             estrellas >= 3 ? 'Gracias, seguiremos mejorando.' :
                             'Gracias, tomaremos nota para mejorar.'}
                        </p>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
                {calendarLink && (
                    <a
                        href={calendarLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-white text-pink-700 border-2 border-pink-300 py-4 rounded-xl font-bold hover:bg-pink-50 transition-colors flex items-center justify-center gap-2 text-lg shadow-sm"
                    >
                        <i className="icon-calendar text-xl"></i>
                        Agregar al calendario
                    </a>
                )}

                <button 
                    onClick={onReset}
                    className="w-full bg-pink-500 text-white py-4 rounded-xl font-bold hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 text-lg shadow-md"
                >
                    <span>✨</span>
                    Reservar otro turno
                    <span>💅</span>
                </button>
                
                <div className="text-sm text-pink-600 bg-white/80 backdrop-blur-sm p-4 rounded-lg flex items-center justify-center gap-2 border border-pink-300">
                   <span className="text-pink-500 text-xl">📱</span>
                   <span>Contacto: {telefonoContacto}</span>
                </div>
            </div>
        </div>
    );
}
