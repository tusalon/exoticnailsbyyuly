// components/admin/SetupWizard.js

function SetupWizard() {
    const [step, setStep] = React.useState(1);
    const [negocioId, setNegocioId] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [guardando, setGuardando] = React.useState(false);
    const [error, setError] = React.useState('');
    const [exito, setExito] = React.useState(false);
    const [config, setConfig] = React.useState({
        // Paso 1: Datos básicos
        nombre: '',
        telefono_whatsapp: '',
        email: '',
        direccion: '',
        
        // Paso 2: Personalización visual
        color_primario: '#c49b63',
        color_secundario: '#f59e0b',
        logo: null,
        logo_preview: '',
        
        // Paso 3: Mensajes
        mensaje_bienvenida: '¡Bienvenido a nuestro salón!',
        mensaje_confirmacion: 'Tu turno ha sido reservado con éxito',
        
        // Paso 4: Redes
        instagram: '',
        facebook: '',
        horario_atencion: 'Lun-Vie 9:00-20:00, Sáb 9:00-18:00'
    });

    // Obtener negocio_id del localStorage
    React.useEffect(() => {
        const id = localStorage.getItem('negocioId');
        if (!id) {
            window.location.href = 'admin-login.html';
            return;
        }
        setNegocioId(id);
        
        // Cargar datos actuales del negocio
        cargarDatosNegocio(id);
    }, []);

    const cargarDatosNegocio = async (id) => {
        try {
            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${id}&select=nombre,telefono,email`,
                {
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data && data[0]) {
                    setConfig(prev => ({
                        ...prev,
                        nombre: data[0].nombre || '',
                        telefono_whatsapp: data[0].telefono || '',
                        email: data[0].email || ''
                    }));
                }
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setCargando(false);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            if (!config.nombre.trim()) {
                setError('El nombre del negocio es obligatorio');
                return;
            }
            if (!config.telefono_whatsapp || config.telefono_whatsapp.length < 8) {
                setError('El teléfono debe tener 8 dígitos');
                return;
            }
            if (config.email && !config.email.includes('@')) {
                setError('El email no es válido');
                return;
            }
        }
        setError('');
        setStep(step + 1);
    };

    const handlePrev = () => setStep(step - 1);

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Solo se permiten imágenes');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                setError('La imagen no puede superar los 2MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig({
                    ...config,
                    logo: file,
                    logo_preview: reader.result
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const subirLogo = async () => {
        if (!config.logo) return null;
        
        try {
            const fileExt = config.logo.name.split('.').pop();
            const fileName = `logo-${negocioId}-${Date.now()}.${fileExt}`;
            
            const response = await fetch(
                `${window.SUPABASE_URL}/storage/v1/object/negocios-logos/${fileName}`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    },
                    body: config.logo
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                console.error('Error subiendo logo:', error);
                return null;
            }
            
            return `${window.SUPABASE_URL}/storage/v1/object/public/negocios-logos/${fileName}`;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    };

    const handleGuardar = async () => {
        setGuardando(true);
        setError('');
        
        try {
            // Subir logo si existe
            let logo_url = null;
            if (config.logo) {
                logo_url = await subirLogo();
                if (!logo_url) {
                    setError('Error al subir el logo. Intentá de nuevo.');
                    setGuardando(false);
                    return;
                }
            }
            
            // Preparar datos para actualizar
            const datosActualizar = {
                nombre: config.nombre,
                telefono: config.telefono_whatsapp,
                email: config.email || null,
                direccion: config.direccion || null,
                color_primario: config.color_primario,
                color_secundario: config.color_secundario,
                mensaje_bienvenida: config.mensaje_bienvenida,
                mensaje_confirmacion: config.mensaje_confirmacion,
                instagram: config.instagram || null,
                facebook: config.facebook || null,
                horario_atencion: config.horario_atencion || null,
                configurado: true,
                updated_at: new Date().toISOString()
            };

            if (logo_url) {
                datosActualizar.logo_url = logo_url;
            }

            console.log('📤 Guardando configuración:', datosActualizar);

            const response = await fetch(
                `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${negocioId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(datosActualizar)
                }
            );
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error('Error guardando configuración');
            }
            
            setExito(true);
            
            // Redirigir al panel después de 2 segundos
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error:', error);
            setError('Error al guardar la configuración');
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    if (exito) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center animate-fade-in">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="icon-check text-4xl text-white"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Todo listo!</h2>
                    <p className="text-gray-600 mb-4">
                        Tu negocio ha sido configurado correctamente.
                    </p>
                    <div className="bg-green-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-green-700">
                            Redirigiendo al panel de administración...
                        </p>
                    </div>
                    <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center">
                            <i className="icon-settings text-3xl text-white"></i>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Configurá tu negocio
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Completá estos datos para personalizar tu sistema de reservas
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-between mb-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className="flex-1 text-center">
                            <div className={`
                                w-10 h-10 rounded-full mx-auto flex items-center justify-center font-bold transition-all
                                ${s === step ? 'bg-amber-600 text-white shadow-md scale-110' : 
                                  s < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'}
                            `}>
                                {s < step ? '✓' : s}
                            </div>
                            <div className="text-xs mt-1 text-gray-600">
                                {s === 1 && 'Datos básicos'}
                                {s === 2 && 'Personalización'}
                                {s === 3 && 'Mensajes'}
                                {s === 4 && 'Finalizar'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Error message */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <i className="icon-alert-circle"></i>
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Step 1: Datos básicos */}
                {step === 1 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <i className="icon-building text-amber-500"></i>
                            Datos del negocio
                        </h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre del negocio *
                            </label>
                            <input
                                type="text"
                                value={config.nombre}
                                onChange={(e) => setConfig({...config, nombre: e.target.value})}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                placeholder="Ej: BennetSalón"
                                autoFocus
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                WhatsApp *
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                                    +53
                                </span>
                                <input
                                    type="tel"
                                    value={config.telefono_whatsapp}
                                    onChange={(e) => setConfig({...config, telefono_whatsapp: e.target.value.replace(/\D/g, '')})}
                                    className="w-full px-4 py-2 rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    placeholder="54438629"
                                    maxLength="8"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">8 dígitos después del +53</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={config.email}
                                onChange={(e) => setConfig({...config, email: e.target.value})}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                placeholder="gisellebenettlc@gmail.com"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dirección
                            </label>
                            <input
                                type="text"
                                value={config.direccion}
                                onChange={(e) => setConfig({...config, direccion: e.target.value})}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                placeholder="Calle Principal 123"
                            />
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 mt-2">
                            <div className="flex items-start gap-2">
                                <i className="icon-info mt-0.5"></i>
                                <span>Podés cambiar estos datos después desde el panel de configuración.</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Personalización visual */}
                {step === 2 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <i className="icon-palette text-amber-500"></i>
                            Personalización
                        </h2>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Color principal
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config.color_primario}
                                        onChange={(e) => setConfig({...config, color_primario: e.target.value})}
                                        className="w-10 h-10 rounded border"
                                    />
                                    <input
                                        type="text"
                                        value={config.color_primario}
                                        onChange={(e) => setConfig({...config, color_primario: e.target.value})}
                                        className="flex-1 border rounded-lg px-3 py-2"
                                        placeholder="#c49b63"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Botones, headers</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Color secundario
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={config.color_secundario}
                                        onChange={(e) => setConfig({...config, color_secundario: e.target.value})}
                                        className="w-10 h-10 rounded border"
                                    />
                                    <input
                                        type="text"
                                        value={config.color_secundario}
                                        onChange={(e) => setConfig({...config, color_secundario: e.target.value})}
                                        className="flex-1 border rounded-lg px-3 py-2"
                                        placeholder="#f59e0b"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Acentos, detalles</p>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Logo del negocio
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-amber-500 transition cursor-pointer"
                                 onClick={() => document.getElementById('logo-input').click()}>
                                <input
                                    id="logo-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="hidden"
                                />
                                {config.logo_preview ? (
                                    <div className="space-y-2">
                                        <img src={config.logo_preview} alt="Preview" className="h-24 object-contain mx-auto" />
                                        <p className="text-xs text-gray-500">Hacé clic para cambiar</p>
                                    </div>
                                ) : (
                                    <div className="py-4">
                                        <i className="icon-upload-cloud text-4xl text-gray-400 mb-2"></i>
                                        <p className="text-gray-600">Hacé clic para subir un logo</p>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG hasta 2MB</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Horario de atención
                            </label>
                            <input
                                type="text"
                                value={config.horario_atencion}
                                onChange={(e) => setConfig({...config, horario_atencion: e.target.value})}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                placeholder="Lun-Vie 9:00-20:00, Sáb 9:00-18:00"
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Mensajes personalizados */}
                {step === 3 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <i className="icon-message-square text-amber-500"></i>
                            Mensajes
                        </h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mensaje de bienvenida
                            </label>
                            <textarea
                                value={config.mensaje_bienvenida}
                                onChange={(e) => setConfig({...config, mensaje_bienvenida: e.target.value})}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                rows="3"
                                placeholder="¡Bienvenido a nuestro salón!"
                            />
                            <p className="text-xs text-gray-400 mt-1">Se muestra al abrir la app</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirmación de reserva
                            </label>
                            <textarea
                                value={config.mensaje_confirmacion}
                                onChange={(e) => setConfig({...config, mensaje_confirmacion: e.target.value})}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                rows="3"
                                placeholder="Tu turno ha sido reservado con éxito"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Instagram
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50">
                                    @
                                </span>
                                <input
                                    type="text"
                                    value={config.instagram}
                                    onChange={(e) => setConfig({...config, instagram: e.target.value})}
                                    className="w-full px-4 py-2 rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    placeholder="bennetsalon"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Facebook
                            </label>
                            <input
                                type="text"
                                value={config.facebook}
                                onChange={(e) => setConfig({...config, facebook: e.target.value})}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                placeholder="/bennetsalon"
                            />
                        </div>
                    </div>
                )}

                {/* Step 4: Resumen */}
                {step === 4 && (
                    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 animate-fade-in">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <i className="icon-check-circle text-green-500"></i>
                            Todo listo
                        </h2>
                        
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <i className="icon-check-circle text-green-600 text-xl"></i>
                                <div>
                                    <p className="text-green-800 font-medium">
                                        Revisá que todos los datos sean correctos
                                    </p>
                                    <p className="text-sm text-green-600 mt-1">
                                        Después de guardar, podrás editar la configuración desde el panel.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <h3 className="font-semibold text-gray-700">📋 Resumen</h3>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="text-gray-500">Negocio:</span>
                                <span className="font-medium">{config.nombre}</span>
                                
                                <span className="text-gray-500">WhatsApp:</span>
                                <span className="font-medium">+53 {config.telefono_whatsapp}</span>
                                
                                <span className="text-gray-500">Email:</span>
                                <span className="font-medium">{config.email || '—'}</span>
                                
                                <span className="text-gray-500">Color principal:</span>
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded" style={{backgroundColor: config.color_primario}}></span>
                                    {config.color_primario}
                                </span>
                                
                                <span className="text-gray-500">Instagram:</span>
                                <span className="font-medium">@{config.instagram || '—'}</span>
                            </div>
                            
                            {config.logo && (
                                <div className="mt-2">
                                    <span className="text-gray-500 text-sm">Logo:</span>
                                    <img src={config.logo_preview} alt="Logo" className="h-12 object-contain mt-1" />
                                </div>
                            )}
                        </div>

                        <div className="bg-amber-50 p-4 rounded-lg">
                            <p className="text-sm text-amber-700 flex items-center gap-2">
                                <i className="icon-info"></i>
                                Al hacer clic en "Finalizar", se guardará toda la configuración.
                            </p>
                        </div>
                    </div>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between mt-6">
                    {step > 1 ? (
                        <button
                            onClick={handlePrev}
                            className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition flex items-center gap-2"
                            disabled={guardando}
                        >
                            <i className="icon-arrow-left"></i>
                            Atrás
                        </button>
                    ) : (
                        <div></div>
                    )}
                    
                    {step < 4 ? (
                        <button
                            onClick={handleNext}
                            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2"
                            disabled={guardando}
                        >
                            Continuar
                            <i className="icon-arrow-right"></i>
                        </button>
                    ) : (
                        <button
                            onClick={handleGuardar}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                            disabled={guardando}
                        >
                            {guardando ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <i className="icon-check"></i>
                                    Finalizar
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Progress text */}
                <div className="text-center mt-4 text-sm text-gray-500">
                    Paso {step} de 4
                </div>
            </div>
        </div>
    );
}

// Renderizar
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<SetupWizard />);