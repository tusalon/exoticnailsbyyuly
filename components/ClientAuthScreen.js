// components/ClientAuthScreen.js - Login por teléfono con registro automático

function ClientAuthScreen({ onAccessGranted, onGoBack }) {
    const [config, setConfig] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [imagenCargada, setImagenCargada] = React.useState(false);
    const [nombre, setNombre] = React.useState('');
    const [whatsapp, setWhatsapp] = React.useState('');
    const [error, setError] = React.useState('');
    const [clienteBloqueado, setClienteBloqueado] = React.useState(null);
    const [verificando, setVerificando] = React.useState(false);
    const [necesitaNombre, setNecesitaNombre] = React.useState(false);
    const [esProfesional, setEsProfesional] = React.useState(false);
    const [profesionalInfo, setProfesionalInfo] = React.useState(null);
    const [esAdmin, setEsAdmin] = React.useState(false);

    React.useEffect(() => {
        const cargarDatos = async () => {
            const configData = await window.cargarConfiguracionNegocio();
            setConfig(configData);
            setCargando(false);
        };
        cargarDatos();

        const img = new Image();
        img.src = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2071&auto=format&fit=crop';
        img.onload = () => setImagenCargada(true);
        img.onerror = () => setImagenCargada(true);
    }, []);

    const getNegocioActual = () => {
        return window.NEGOCIO_ID_POR_DEFECTO ||
            (typeof window.getNegocioId === 'function' ? window.getNegocioId() : localStorage.getItem('negocioId'));
    };

    const guardarNegocioEnSesion = () => {
        const negocioId = getNegocioActual();
        if (negocioId) localStorage.setItem('negocioId', negocioId);
        if (config?.nombre) localStorage.setItem('negocioNombre', config.nombre);
    };

    const resetCliente = () => {
        setNecesitaNombre(false);
        setClienteBloqueado(null);
        setEsProfesional(false);
        setProfesionalInfo(null);
        setEsAdmin(false);
        setError('');
    };

    const verificarNumero = async (numero) => {
        const digitos = numero.replace(/\D/g, '');
        const numeroLimpio = digitos.startsWith('53') && digitos.length > 8 ? digitos.slice(2) : digitos;
        setWhatsapp(numeroLimpio);

        if (numeroLimpio.length < 8) {
            resetCliente();
            return;
        }

        setVerificando(true);
        setError('');
        setNecesitaNombre(false);
        setClienteBloqueado(null);

        const numeroCompleto = `53${numeroLimpio}`;

        try {
            if (numeroLimpio === config?.telefono?.replace(/\D/g, '')) {
                guardarNegocioEnSesion();

                const loginTime = localStorage.getItem('adminLoginTime');
                const tieneSesion = loginTime && (Date.now() - parseInt(loginTime)) < 8 * 60 * 60 * 1000;
                window.location.href = tieneSesion ? 'admin.html' : 'admin-login.html';
                return;
            }

            if (window.verificarProfesionalPorTelefono) {
                const profesional = await window.verificarProfesionalPorTelefono(numeroLimpio);
                if (profesional) {
                    setEsProfesional(true);
                    setProfesionalInfo(profesional);
                    setEsAdmin(false);
                    setNecesitaNombre(false);
                    return;
                }
            }

            const bloqueo = await window.getClienteBloqueado?.(numeroCompleto);
            if (bloqueo) {
                setClienteBloqueado(bloqueo);
                setNecesitaNombre(false);
                setError('Este número no tiene permiso para registrarse ni reservar. Contactá al negocio.');
                return;
            }

            const cliente = await window.verificarAccesoCliente(numeroCompleto);
            if (cliente) {
                guardarNegocioEnSesion();
                onAccessGranted(cliente.nombre, numeroCompleto);
                return;
            }

            setNecesitaNombre(true);
        } catch (err) {
            console.error('Error verificando teléfono:', err);
            setError('Error verificando el número. Intentá más tarde.');
        } finally {
            setVerificando(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const digitos = whatsapp.replace(/\D/g, '');
        const numeroLimpio = digitos.startsWith('53') && digitos.length > 8 ? digitos.slice(2) : digitos;
        const numeroCompleto = `53${numeroLimpio}`;

        if (numeroLimpio.length < 8) {
            setError('Ingresá un número de WhatsApp válido.');
            return;
        }

        if (esAdmin || esProfesional) return;

        if (!necesitaNombre) {
            await verificarNumero(numeroLimpio);
            return;
        }

        if (!nombre.trim()) {
            setError('Ingresá tu nombre completo para registrarte.');
            return;
        }

        setVerificando(true);
        setError('');

        try {
            const bloqueo = await window.getClienteBloqueado?.(numeroCompleto);
            if (bloqueo) {
                setClienteBloqueado(bloqueo);
                setError('Este número no tiene permiso para registrarse ni reservar. Contactá al negocio.');
                return;
            }

            const clienteExistente = await window.verificarAccesoCliente(numeroCompleto);
            if (clienteExistente) {
                guardarNegocioEnSesion();
                onAccessGranted(clienteExistente.nombre, numeroCompleto);
                return;
            }

            const nuevoCliente = await window.crearCliente(nombre.trim(), numeroCompleto);
            if (nuevoCliente) {
                guardarNegocioEnSesion();
                onAccessGranted(nuevoCliente.nombre || nombre.trim(), numeroCompleto);
            } else {
                setError(window.ultimoErrorCliente || 'Error al crear el cliente. Intentá más tarde.');
            }
        } catch (err) {
            console.error('Error registrando cliente:', err);
            setError('Error en el sistema. Intentá más tarde.');
        } finally {
            setVerificando(false);
        }
    };

    if (cargando || !imagenCargada) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-pink-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    const nombreNegocio = config?.nombre || 'Mi Salón';
    const logoUrl = config?.logo_url;
    const especialidad = (config?.especialidad || '').toLowerCase();
    const sticker = especialidad.includes('uña') ? '💅' :
                    especialidad.includes('pelo') ? '💇‍♀️' :
                    especialidad.includes('belleza') ? '🌸' : '💖';

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 z-0">
                <img
                    src="https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2071&auto=format&fit=crop"
                    alt="Fondo de salón"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40"></div>
            </div>

            {onGoBack && (
                <button
                    onClick={onGoBack}
                    className="absolute top-4 left-4 z-20 w-10 h-10 bg-pink-500/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors border border-pink-300"
                    title="Volver"
                >
                    <i className="icon-arrow-left text-white text-xl"></i>
                </button>
            )}

            <div className="relative z-10 max-w-md w-full mx-auto">
                <div className="bg-black/15 backdrop-blur-[1px] p-8 rounded-2xl shadow-2xl border border-pink-300/25">
                    <div className="text-center mb-6">
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={nombreNegocio}
                                className="w-20 h-20 object-contain mx-auto rounded-xl ring-4 ring-pink-300/35 bg-white/70"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-xl mx-auto flex items-center justify-center bg-pink-500 ring-4 ring-pink-300/35">
                                <span className="text-3xl">{sticker}</span>
                            </div>
                        )}
                        <h1 className="text-3xl font-bold text-white mt-4">{nombreNegocio}</h1>
                        <p className="text-pink-300 mt-1">🌸 Espacio de belleza y cuidado 🌸</p>
                    </div>

                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2 bg-pink-500/30 p-3 rounded-lg">
                        <span>📱</span>
                        Ingresá con tu WhatsApp
                        <span>✨</span>
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-1">
                                Tu WhatsApp
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-pink-300/30 bg-black/20 text-pink-300 text-sm">
                                    +53
                                </span>
                                <input
                                    type="tel"
                                    value={whatsapp}
                                    onChange={(e) => verificarNumero(e.target.value)}
                                    className="w-full px-4 py-3 rounded-r-lg border border-pink-300/30 bg-black/20 text-white placeholder-pink-200/70 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
                                    placeholder="51234567"
                                    required
                                />
                            </div>
                            <p className="text-xs text-pink-300/70 mt-1">
                                Si ya estás registrada, entrarás directo. Si no, te pediremos tu nombre.
                            </p>
                        </div>

                        {necesitaNombre && !clienteBloqueado && !esAdmin && !esProfesional && (
                            <div>
                                <label className="block text-sm font-medium text-white mb-1">
                                    Tu nombre completo
                                </label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-pink-300/30 bg-black/20 text-white placeholder-pink-200/70 focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
                                    placeholder="Ej: María Pérez"
                                />
                            </div>
                        )}

                        {verificando && (
                            <div className="text-pink-300 text-sm bg-pink-500/20 p-2 rounded-lg flex items-center gap-2 border border-pink-300/30">
                                <div className="animate-spin h-4 w-4 border-2 border-pink-300 border-t-transparent rounded-full"></div>
                                Verificando...
                            </div>
                        )}

                        {esProfesional && profesionalInfo && !verificando && (
                            <div className="bg-pink-500/30 border border-pink-300/50 rounded-lg p-4">
                                <p className="text-white font-bold text-xl">¡Hola {profesionalInfo.nombre}!</p>
                                <p className="text-pink-200 text-sm">Accedé a tu panel profesional.</p>
                            </div>
                        )}

                        {necesitaNombre && !verificando && !clienteBloqueado && !esAdmin && !esProfesional && (
                            <div className="bg-pink-500/20 border border-pink-300/30 rounded-lg p-3 text-pink-100 text-sm">
                                No encontramos ese WhatsApp. Completá tu nombre para registrarte y reservar.
                            </div>
                        )}

                        {error && !esAdmin && !esProfesional && (
                            <div className="text-sm p-3 rounded-lg flex items-start gap-2 bg-red-500/20 text-red-300 border border-red-500/30">
                                <i className="icon-triangle-alert mt-0.5"></i>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-3 pt-2">
                            {esProfesional && profesionalInfo && !verificando && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        localStorage.setItem('profesionalAuth', JSON.stringify({
                                            id: profesionalInfo.id,
                                            nombre: profesionalInfo.nombre,
                                            telefono: profesionalInfo.telefono,
                                            nivel: profesionalInfo.nivel || 1
                                        }));
                                        window.location.href = 'admin.html';
                                    }}
                                    className="w-full bg-white text-pink-600 py-4 rounded-xl font-bold hover:bg-pink-50 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg text-lg border border-pink-200/70"
                                >
                                    <span className="text-xl">✂️</span>
                                    Ingresar como Profesional
                                </button>
                            )}

                            {!esProfesional && !clienteBloqueado && (
                                <button
                                    type="submit"
                                    disabled={verificando}
                                    className="w-full bg-pink-500 text-white py-4 rounded-xl font-bold hover:bg-pink-600 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-lg border border-pink-200/70"
                                >
                                    <span className="text-xl">{necesitaNombre ? '💅' : '📱'}</span>
                                    {verificando ? 'Verificando...' : necesitaNombre ? 'Registrarme y reservar' : 'Continuar'}
                                    <span className="text-xl">✨</span>
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="absolute -bottom-6 -right-6 text-7xl opacity-20 rotate-12 select-none">💇‍♀️</div>
                    <div className="absolute -top-6 -left-6 text-7xl opacity-20 -rotate-12 select-none">💅</div>
                    <div className="absolute top-1/2 -translate-y-1/2 -right-8 text-5xl opacity-10 select-none">🌸</div>
                </div>
            </div>
        </div>
    );
}
