// components/WelcomeScreen.js - Versión con REDES SOCIALES (CORREGIDA - SIN DESBORDAMIENTO)

function WelcomeScreen({ onStart, onGoBack, cliente, userRol }) {
    const [config, setConfig] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [imagenCargada, setImagenCargada] = React.useState(false);

    React.useEffect(() => {
        const cargarDatos = async () => {
            const configData = await window.cargarConfiguracionNegocio();
            console.log('📱 WelcomeScreen - Config cargada:', configData);
            setConfig(configData);
            setCargando(false);
        };
        cargarDatos();

        // Precargar la imagen de fondo
        const img = new Image();
        img.src = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2071&auto=format&fit=crop';
        img.onload = () => setImagenCargada(true);
    }, []);

    if (cargando || !imagenCargada) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-pink-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    const colorPrimario = config?.color_primario || '#ec4899';
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
        
        const telefonoLimpio = config.telefono.replace(/\D/g, '');
        const mensaje = encodeURIComponent(`Hola! Quiero consultar sobre turnos en ${config?.nombre || 'el salón'}`);
        
        // Abrir WhatsApp
        window.open(`https://wa.me/${telefonoLimpio}?text=${mensaje}`, '_blank');
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
            className="relative min-h-screen w-full overflow-y-auto"
        >
            {/* Imagen de fondo fija */}
            <div className="fixed inset-0 z-0">
                <img 
                    src="https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2071&auto=format&fit=crop"
                    alt="Fondo de salón" 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40"></div>
            </div>

            {/* Botón volver - fijo en la parte superior */}
            {onGoBack && (
                <button
                    onClick={onGoBack}
                    className="fixed top-4 left-4 z-20 w-10 h-10 bg-pink-500/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors border border-pink-300"
                    title="Volver"
                >
                    <i className="icon-arrow-left text-white text-xl"></i>
                </button>
            )}

            {/* Contenido scrolleable */}
            <div className="relative z-10 min-h-screen flex items-start justify-center py-16 px-4">
                <div className="w-full max-w-2xl bg-white/20 backdrop-blur-md p-6 sm:p-10 rounded-3xl shadow-2xl border border-pink-300/50 my-auto">
                    <div className="text-center space-y-6">
                        {/* Logo o sticker */}
                        {config?.logo_url ? (
                            <img 
                                src={config.logo_url} 
                                alt={config.nombre} 
                                className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto rounded-2xl shadow-2xl ring-4 ring-pink-300/50"
                            />
                        ) : (
                            <div 
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl mx-auto flex items-center justify-center shadow-2xl ring-4 ring-pink-300/50"
                                style={{ backgroundColor: colorPrimario }}
                            >
                                <span className="text-4xl sm:text-5xl">{sticker}</span>
                            </div>
                        )}
                        
                        {/* 🔥 TÍTULO CORREGIDO - SIN DESBORDAMIENTO */}
                        <div className="space-y-2">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-tight drop-shadow-lg">
                                Bienvenida a
                            </h1>
                            <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-pink-300 break-words px-2">
                                {config?.nombre || 'Mi Salón'}
                            </div>
                        </div>
                        
                        {cliente && (
                            <p className="text-white/90 text-base sm:text-lg bg-black/20 inline-block px-4 py-1 rounded-full">
                                ✨ {cliente.nombre} ✨
                            </p>
                        )}
                        
                        <p className="text-white/90 text-base sm:text-lg md:text-xl max-w-lg mx-auto px-2">
                            {config?.mensaje_bienvenida || '¡Bienvenida a nuestro salón!'}
                        </p>

                        {/* BOTONES DE REDES SOCIALES */}
                        {tieneRedes && (
                            <div className="flex justify-center gap-3 sm:gap-4 pt-4 flex-wrap">
                                {tieneWhatsApp && (
                                    <button
                                        onClick={abrirWhatsApp}
                                        className="w-12 h-12 sm:w-14 sm:h-14 bg-[#25D366] rounded-full flex items-center justify-center hover:scale-110 transition-all transform hover:shadow-xl border-2 border-white/50 group relative"
                                        title="Contactar por WhatsApp"
                                    >
                                        <i className="icon-message-circle text-white text-xl sm:text-2xl"></i>
                                        <span className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                            WhatsApp
                                        </span>
                                    </button>
                                )}
                                
                                {tieneInstagram && (
                                    <button
                                        onClick={abrirInstagram}
                                        className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center hover:scale-110 transition-all transform hover:shadow-xl border-2 border-white/50 group relative"
                                        title="Instagram"
                                    >
                                        <i className="icon-instagram text-white text-xl sm:text-2xl"></i>
                                        <span className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                            Instagram
                                        </span>
                                    </button>
                                )}
                                
                                {tieneFacebook && (
                                    <button
                                        onClick={abrirFacebook}
                                        className="w-12 h-12 sm:w-14 sm:h-14 bg-[#1877F2] rounded-full flex items-center justify-center hover:scale-110 transition-all transform hover:shadow-xl border-2 border-white/50 group relative"
                                        title="Facebook"
                                    >
                                        <i className="icon-facebook text-white text-xl sm:text-2xl"></i>
                                        <span className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                            Facebook
                                        </span>
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="pt-4 sm:pt-6">
                            <button 
                                onClick={onStart}
                                className="text-white text-base sm:text-lg font-bold py-3 sm:py-4 px-8 sm:px-10 rounded-full shadow-2xl transition-all transform hover:scale-110 active:scale-95 flex items-center justify-center gap-2 mx-auto border-2 border-pink-300 w-full sm:w-auto"
                                style={{ backgroundColor: colorPrimario }}
                            >
                                <span className="text-lg sm:text-xl">💖</span>
                                <span>Reservar Turno</span>
                                <span className="text-lg sm:text-xl">✨</span>
                            </button>
                        </div>

                        {/* Horario de atención si está configurado */}
                        {config?.horario_atencion && (
                            <div className="text-xs sm:text-sm text-white/80 bg-black/20 p-3 rounded-lg mt-4">
                                <span className="font-semibold">🕐 Horario:</span> {config.horario_atencion}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stickers flotantes decorativos (fijos) */}
            <div className="fixed bottom-4 left-4 text-3xl sm:text-4xl opacity-30 rotate-12 select-none pointer-events-none">💅</div>
            <div className="fixed top-20 right-4 text-3xl sm:text-4xl opacity-30 -rotate-12 select-none pointer-events-none">🌸</div>
        </div>
    );
}