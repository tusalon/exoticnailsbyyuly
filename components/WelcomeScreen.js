// components/WelcomeScreen.js - Versión con REDES SOCIALES (CORREGIDA - SIN DESBORDAMIENTO)

function WelcomeScreen({ onStart, onGoBack, cliente, userRol }) {
    const [config, setConfig] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [imagenCargada, setImagenCargada] = React.useState(false);
    const [pushEstado, setPushEstado] = React.useState('');
    const [activandoPush, setActivandoPush] = React.useState(false);
    const [pushMensaje, setPushMensaje] = React.useState('');

    React.useEffect(() => {
        if (!('Notification' in window)) { setPushEstado('unsupported'); return; }
        const permiso = Notification.permission;
        setPushEstado(permiso);
        // Si ya tiene permiso pero no suscripción guardada, suscribirse automáticamente
        if (permiso === 'granted' && !localStorage.getItem('rservasPushActivo')) {
            if (typeof window.solicitarPushRservasRoma === 'function') {
                window.solicitarPushRservasRoma({ permission: 'granted', defaultRole: 'cliente' })
                    .then(res => { if (res?.ok) console.log('[Push] suscripcion auto-guardada'); })
                    .catch(() => {});
            }
        }
    }, []);

    const activarNotificaciones = () => {
        if (!('Notification' in window)) { setPushEstado('unsupported'); return; }
        setActivandoPush(true);
        setPushMensaje('');

        pedirPermisoYSuscribir();

        function pedirPermisoYSuscribir() {
            const permissionPromise = Notification.permission === 'default'
                ? Notification.requestPermission()
                : Promise.resolve(Notification.permission);

            permissionPromise.then(permiso => {
                setPushEstado(permiso);
                if (permiso !== 'granted') {
                    setPushMensaje(permiso === 'denied' ? 'Permiso bloqueado en el navegador' : 'Permiso no concedido');
                    setActivandoPush(false);
                    return;
                }
                if (typeof window.solicitarPushRservasRoma !== 'function') {
                    setPushEstado('granted');
                    setActivandoPush(false);
                    return;
                }
                window.solicitarPushRservasRoma({ permission: permiso, defaultRole: 'cliente' })
                    .then(res => {
                        if (res?.ok) {
                            setPushMensaje('');
                        } else {
                            const msg = res?.error || 'error';
                            console.warn('Push resultado:', msg);
                            if (msg === 'sw_not_ready') {
                                setPushMensaje('Instala la app en tu pantalla de inicio para recibir avisos');
                            } else if (msg.includes('applicationServerKey') || msg.includes('VAPID') || msg.includes('key')) {
                                setPushMensaje('Recarga la app y vuelve a intentarlo');
                            } else {
                                setPushMensaje('No se pudo activar: ' + msg.substring(0, 60));
                            }
                        }
                    })
                    .catch(err => {
                        console.warn('Push error:', err);
                        setPushMensaje('Error: ' + String(err).substring(0, 60));
                    })
                    .finally(() => setActivandoPush(false));
            }).catch(() => setActivandoPush(false));
        }
    };

    React.useEffect(() => {
        const cargarDatos = async () => {
            const configData = await window.cargarConfiguracionNegocio();
            console.log('📱 WelcomeScreen - Config cargada:', configData);
            setConfig(configData);
            setCargando(false);

            const fondo = window.getHeroBackgroundOption
                ? window.getHeroBackgroundOption(configData?.imagen_fondo_tipo)
                : { image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2071&auto=format&fit=crop' };
            const img = new Image();
            img.src = fondo.image;
            img.onload = () => setImagenCargada(true);
            img.onerror = () => setImagenCargada(true);
        };
        cargarDatos();

    }, []);

    if (cargando || !imagenCargada) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-pink-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    const colorPrimario = config?.color_primario || '#ec4899';
    const colorSecundario = config?.color_secundario || '#f9a8d4';
    const hexToRgba = (hex, alpha = 1) => {
        const limpio = String(hex || '').replace('#', '');
        if (limpio.length !== 6) return `rgba(236, 72, 153, ${alpha})`;
        const r = parseInt(limpio.slice(0, 2), 16);
        const g = parseInt(limpio.slice(2, 4), 16);
        const b = parseInt(limpio.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    const fondoPortada = window.getHeroBackgroundOption
        ? window.getHeroBackgroundOption(config?.imagen_fondo_tipo)
        : { image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2071&auto=format&fit=crop', label: 'Fondo de salon' };
    const sticker = config?.especialidad?.toLowerCase().includes('uñas') ? '💅' :
                    config?.especialidad?.toLowerCase().includes('pelo') ? '💇‍♀️' :
                    config?.especialidad?.toLowerCase().includes('belleza') ? '🌸' : '💖';

    // ============================================
    // FUNCIONES PARA ABRIR REDES SOCIALES
    // ============================================
    
    const abrirWhatsApp = () => {
        if (!config?.telefono) {
            alert('📱 El número de WhatsApp no está configurado');
            return;
        }
        
        const telefonoWhatsApp = window.normalizarTelefonoInternacional
            ? window.normalizarTelefonoInternacional(config.telefono, config.codigo_pais)
            : config.telefono.replace(/\D/g, '');
        const mensaje = encodeURIComponent(`Hola! Quiero consultar sobre turnos en ${config?.nombre || 'el salón'}`);
        
        // Abrir WhatsApp
        window.open(`https://wa.me/${telefonoWhatsApp}?text=${mensaje}`, '_blank');
    };

    const abrirInstagram = () => {
        if (!config?.instagram) {
            alert('📷 El usuario de Instagram no está configurado');
            return;
        }
        
        // Limpiar el usuario (quitar @ si lo tiene)
        let usuario = config.instagram.replace('@', '').trim();
        
        // Abrir Instagram (app o web)
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Intentar abrir la app primero
            window.location.href = `instagram://user?username=${usuario}`;
            
            // Si no abre la app, abrir web después de 1 segundo
            setTimeout(() => {
                window.open(`https://instagram.com/${usuario}`, '_blank');
            }, 1000);
        } else {
            // Desktop: abrir web directamente
            window.open(`https://instagram.com/${usuario}`, '_blank');
        }
    };

    const abrirFacebook = () => {
        if (!config?.facebook) {
            alert('👤 La página de Facebook no está configurada');
            return;
        }
        
        // Limpiar la URL/página
        let pagina = config.facebook.trim();
        
        // Si solo es el nombre, construir URL
        if (!pagina.startsWith('http')) {
            // Sacar @ si tiene
            pagina = pagina.replace('@', '');
            pagina = `https://facebook.com/${pagina}`;
        }
        
        // Abrir Facebook
        window.open(pagina, '_blank');
    };

    // Verificar qué redes están configuradas
    const tieneWhatsApp = config?.telefono && config.telefono.length >= 8;
    const tieneInstagram = config?.instagram && config.instagram.trim() !== '';
    const tieneFacebook = config?.facebook && config.facebook.trim() !== '';
    
    const tieneRedes = tieneWhatsApp || tieneInstagram || tieneFacebook;

    return (
        <div 
            className="client-welcome-screen relative min-h-screen w-full overflow-y-auto"
        >
            {/* Imagen de fondo fija */}
            <div className="client-welcome-background fixed inset-0 z-0">
                <img 
                    src={fondoPortada.image}
                    alt="Fondo de salón" 
                    className="client-welcome-background-image w-full h-full object-cover"
                />
                <div className="client-welcome-overlay absolute inset-0 bg-black/40"></div>
            </div>

            {/* Botón volver - fijo en la parte superior */}
            {onGoBack && (
                <button
                    onClick={onGoBack}
                    className="client-welcome-back fixed top-4 left-4 z-20 w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors border"
                    style={{
                        backgroundColor: hexToRgba(colorPrimario, 0.86),
                        borderColor: hexToRgba(colorSecundario, 0.75)
                    }}
                    title="Volver"
                >
                    <i className="icon-arrow-left text-white text-xl"></i>
                </button>
            )}

            {/* Contenido — altura fija, todo visible sin scroll */}
            <div className="client-welcome-content relative z-10 flex flex-col items-center justify-center px-4"
                style={{ minHeight: '100svh', paddingTop: 'max(56px, env(safe-area-inset-top))', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <div
                    className="client-welcome-card w-full max-w-sm bg-black/15 backdrop-blur-[1px] p-4 rounded-2xl shadow-2xl border"
                    style={{
                        borderColor: hexToRgba(colorSecundario, 0.42),
                        boxShadow: `0 16px 48px ${hexToRgba(colorPrimario, 0.22)}`
                    }}
                >
                    <div className="text-center space-y-3">

                        {/* Logo o sticker */}
                        {config?.logo_url ? (
                            <img src={config.logo_url} alt={config.nombre}
                                className="w-14 h-14 object-contain mx-auto rounded-xl shadow-lg ring-2"
                                style={{ '--tw-ring-color': hexToRgba(colorSecundario, 0.45) }} />
                        ) : (
                            <div className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center shadow-lg ring-2"
                                style={{ background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`, '--tw-ring-color': hexToRgba(colorSecundario, 0.45) }}>
                                <span className="text-3xl">{sticker}</span>
                            </div>
                        )}

                        {/* Título */}
                        <div>
                            <p className="text-sm font-medium text-white/80">Bienvenida a</p>
                            <div className="text-xl font-bold break-words leading-tight"
                                style={{ color: colorSecundario, textShadow: `0 2px 12px ${hexToRgba(colorPrimario, 0.45)}` }}>
                                {config?.nombre || 'Mi Salón'}
                            </div>
                        </div>

                        {/* Nombre cliente */}
                        {cliente && (
                            <p className="text-white/90 text-sm bg-black/20 inline-block px-3 py-0.5 rounded-full">
                                ✨ {cliente.nombre} ✨
                            </p>
                        )}

                                        {/* Mensaje bienvenida */}
                        <p className="text-white/80 text-xs max-w-xs mx-auto leading-snug">
                            {config?.mensaje_bienvenida || '¡Bienvenida a nuestro salón!'}
                        </p>

                        {/* Redes sociales */}
                        {tieneRedes && (
                            <div className="flex justify-center gap-3">
                                {tieneWhatsApp && (
                                    <button onClick={abrirWhatsApp} title="WhatsApp"
                                        className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center border border-white/30 hover:scale-105 transition-transform">
                                        <i className="icon-message-circle text-white text-lg"></i>
                                    </button>
                                )}
                                {tieneInstagram && (
                                    <button onClick={abrirInstagram} title="Instagram"
                                        className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center border border-white/30 hover:scale-105 transition-transform">
                                        <i className="icon-instagram text-white text-lg"></i>
                                    </button>
                                )}
                                {tieneFacebook && (
                                    <button onClick={abrirFacebook} title="Facebook"
                                        className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center border border-white/30 hover:scale-105 transition-transform">
                                        <i className="icon-facebook text-white text-lg"></i>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Botón notificaciones */}
                        {pushEstado !== 'unsupported' && pushEstado !== 'denied' && (
                            <div className="space-y-1">
                                {pushEstado === 'granted' ? (
                                    <p className="text-white/60 text-xs flex items-center justify-center gap-1">🔔 Recordatorios activados</p>
                                ) : (
                                    <button onClick={activarNotificaciones} disabled={activandoPush}
                                        className="text-white/80 text-xs border border-white/30 rounded-full px-4 py-1.5 hover:bg-white/10 transition flex items-center gap-1.5 mx-auto disabled:opacity-50">
                                        🔔 {activandoPush ? 'Activando...' : 'Activar recordatorios'}
                                    </button>
                                )}
                                {pushMensaje && (
                                    <p className="text-yellow-300/80 text-xs text-center">{pushMensaje}</p>
                                )}
                            </div>
                        )}

                        {/* Botón principal */}
                        <button onClick={onStart}
                            className="w-full text-white font-bold py-3 rounded-full shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 border"
                            style={{
                                background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`,
                                borderColor: hexToRgba(colorSecundario, 0.7),
                                boxShadow: `0 10px 28px ${hexToRgba(colorPrimario, 0.35)}`
                            }}>
                            <span>💖</span>
                            <span>Reservar Turno</span>
                            <span>✨</span>
                        </button>

                        {/* Horario */}
                        {config?.horario_atencion && (
                            <p className="text-xs text-white/70">
                                🕐 {config.horario_atencion}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
