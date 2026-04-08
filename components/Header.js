// components/Header.js

function Header({ cliente, onLogout, onMisReservas, onGoBack, userRol, showBackButton }) {
    const [mostrarOpcionesAdmin, setMostrarOpcionesAdmin] = React.useState(false);
    const [nombreNegocio, setNombreNegocio] = React.useState('Mi Salón');

    React.useEffect(() => {
        window.getNombreNegocio().then(nombre => {
            setNombreNegocio(nombre);
        });
    }, []);

    const goToAdmin = () => {
        const isAdmin = localStorage.getItem('adminAuth') === 'true';
        const profesionalAuth = localStorage.getItem('profesionalAuth');
        
        if (isAdmin || profesionalAuth) {
            window.location.href = 'admin.html';
        }
    };

    const tieneAcceso = userRol === 'admin' || userRol === 'profesional';

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    {showBackButton && onGoBack && (
                        <button
                            onClick={onGoBack}
                            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors mr-2"
                            title="Volver"
                        >
                            <i className="icon-arrow-left text-gray-600"></i>
                        </button>
                    )}
                    
                    <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white">
                        <i className="icon-calendar text-lg"></i>
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">{nombreNegocio}</h1>
                </div>
                
                <div className="flex items-center gap-3">
                    {cliente && (
                        <div className="hidden sm:flex items-center gap-1 text-sm text-gray-600">
                            <i className="icon-user-check text-green-500"></i>
                            <span className="font-medium">{cliente.nombre}</span>
                        </div>
                    )}
                    
                    {cliente && onMisReservas && userRol === 'cliente' && (
                        <button
                            onClick={onMisReservas}
                            className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-full transition-all"
                            title="Mis Reservas"
                        >
                            <i className="icon-calendar"></i>
                            <span className="text-sm font-medium hidden sm:inline">Mis Reservas</span>
                        </button>
                    )}
                    
                    {tieneAcceso && (
                        <div className="relative">
                            <button
                                onClick={goToAdmin}
                                className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white px-3 py-2 rounded-full transition-all transform hover:scale-105 shadow-md border border-amber-400"
                                title={userRol === 'admin' ? 'Panel de Administración' : 'Mi Panel de Trabajo'}
                                onMouseEnter={() => setMostrarOpcionesAdmin(true)}
                                onMouseLeave={() => setMostrarOpcionesAdmin(false)}
                            >
                                <i className={userRol === 'admin' ? 'icon-shield-check' : 'icon-briefcase'}></i>
                                <span className="text-sm font-medium hidden sm:inline">
                                    {userRol === 'admin' ? 'Admin' : 'Mi Panel'}
                                </span>
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            </button>
                            
                            {mostrarOpcionesAdmin && (
                                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-amber-700 p-2 text-xs text-gray-300 z-50">
                                    {userRol === 'admin' ? (
                                        <div className="space-y-1">
                                            <p className="font-semibold text-amber-400">👑 Acceso como administrador</p>
                                            <p className="text-gray-400">Puede gestionar todo el sistema</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="font-semibold text-amber-400">✂️ Acceso como profesional</p>
                                            <p className="text-gray-400">Bienvenido, {cliente?.nombre}</p>
                                            <p className="text-gray-500 text-xs">Puede ver tus reservas</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {cliente && onLogout && (
                        <button
                            onClick={onLogout}
                            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors group relative"
                            title="Cerrar sesión"
                        >
                            <i className="icon-log-out text-gray-500 group-hover:text-red-600"></i>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}