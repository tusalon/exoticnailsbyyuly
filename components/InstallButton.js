// components/InstallButton.js - Botón de instalación PWA (VERSIÓN MEJORADA)

function InstallButton() {
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);
    const [isInstallable, setIsInstallable] = React.useState(false);
    const [isInstalled, setIsInstalled] = React.useState(false);
    const [platform, setPlatform] = React.useState('');

    React.useEffect(() => {
        // Detectar plataforma
        const ua = navigator.userAgent;
        if (/android/i.test(ua)) {
            setPlatform('android');
        } else if (/iphone|ipad|ipod/i.test(ua)) {
            setPlatform('ios');
        } else {
            setPlatform('desktop');
        }

        // Detectar si ya está instalada (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            setIsInstalled(true);
        }

        // Capturar el evento beforeinstallprompt (solo Android/Desktop)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
            console.log('✅ beforeinstallprompt capturado');
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Detectar cuando se instaló
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
            console.log('✅ App instalada correctamente');
        };

        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (platform === 'ios') {
            // iOS no soporta beforeinstallprompt, mostrar instrucciones
            alert('📱 Para instalar en iPhone:\n\n1. Tocá el botón Compartir (📤)\n2. Seleccioná "Agregar a pantalla de inicio"\n3. Confirmá');
            return;
        }

        // Si tenemos el prompt guardado, usarlo
        if (deferredPrompt) {
            // Mostrar el prompt de instalación
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`✅ Resultado de la instalación: ${outcome}`);
            setDeferredPrompt(null);
            setIsInstallable(false);
            return;
        }

        // Si no hay prompt (Android pero no se disparó), mostrar instrucciones
        if (platform === 'android') {
            alert('📱 Para instalar en Android:\n\n1. Tocá el menú de 3 puntos (arriba derecha)\n2. Seleccioná "Instalar aplicación"\n3. Confirmá');
        } else {
            // Desktop sin prompt
            alert('📱 Para instalar en tu computadora:\n\nBuscá el icono de instalación en la barra de direcciones');
        }
    };

    // No mostrar el botón si ya está instalada
    if (isInstalled) return null;

    // En iOS, siempre mostrar el botón con instrucciones
    if (platform === 'ios') {
        return (
            <button
                onClick={handleInstallClick}
                className="fixed bottom-6 left-6 z-50 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-full shadow-2xl hover:from-pink-600 hover:to-pink-700 transition-all transform hover:scale-110 flex items-center gap-3 border-2 border-pink-300"
                title="Instalar aplicación"
            >
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">📱</span>
                </div>
                <div className="text-left">
                    <div className="font-bold text-sm">Instalar App</div>
                    <div className="text-xs text-pink-200">iPhone: Compartir → Pantalla inicio</div>
                </div>
            </button>
        );
    }

    // En Android/Desktop, SIEMPRE mostrar el botón (con o sin prompt)
    return (
        <button
            onClick={handleInstallClick}
            className="fixed bottom-6 left-6 z-50 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-full shadow-2xl hover:from-pink-600 hover:to-pink-700 transition-all transform hover:scale-110 flex items-center gap-3 border-2 border-pink-300"
            title="Instalar aplicación"
        >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white text-lg">
                    {platform === 'android' ? '📲' : '📱'}
                </span>
            </div>
            <div className="text-left">
                <div className="font-bold text-sm">Instalar App</div>
                <div className="text-xs text-pink-200">
                    {platform === 'android' 
                        ? 'Android: Tocá aquí' 
                        : platform === 'desktop'
                            ? 'Acceso directo'
                            : 'Instalar'}
                </div>
            </div>
        </button>
    );
}