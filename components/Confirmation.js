// components/Confirmation.js - VERSIÓN SIMPLIFICADA (SIN ENVÍO AUTOMÁTICO)

function Confirmation({ booking, onReset }) {
    const [telefonoDuenno, setTelefonoDuenno] = React.useState('55002272');
    const [nombreNegocio, setNombreNegocio] = React.useState('Negocio de Prueba');

    React.useEffect(() => {
        // Cargar datos del negocio
        const cargarDatos = async () => {
            try {
                const tel = await window.getTelefonoDuenno();
                const nombre = await window.getNombreNegocio();
                setTelefonoDuenno(tel);
                setNombreNegocio(nombre);
            } catch (error) {
                console.error('Error cargando datos:', error);
            }
        };
        cargarDatos();
    }, []);

    // ⚡ ELIMINADO: useEffect con setTimeout que causaba problemas en iOS
    // Ahora el WhatsApp se envía en BookingForm.js inmediatamente

    if (!booking) {
        console.error('❌ booking no definido');
        return null;
    }

    const fechaConDia = window.formatFechaCompleta ? 
        window.formatFechaCompleta(booking.fecha) : 
        booking.fecha;

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

            <div className="flex flex-col gap-3 w-full max-w-xs">
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
                   <span>Contacto: +{telefonoDuenno}</span>
                </div>
            </div>
        </div>
    );
}