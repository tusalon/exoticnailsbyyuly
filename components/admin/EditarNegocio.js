// components/admin/EditarNegocio.js - VERSIÓN SIN COLORES (CONSERVA LOGO Y HORARIO)
// + NUEVA SECCIÓN DE ANTICIPOS

function EditarNegocio() {
    const [negocioId, setNegocioId] = React.useState(null);
    const [cargando, setCargando] = React.useState(true);
    const [guardando, setGuardando] = React.useState(false);
    const [error, setError] = React.useState('');
    const [exito, setExito] = React.useState(false);
    const [config, setConfig] = React.useState({
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        logo_url: '',
        logo_preview: '',
        logo_file: null,
        mensaje_bienvenida: '',
        mensaje_confirmacion: '',
        instagram: '',
        facebook: '',
        horario_atencion: '',
        // 🆕 NUEVOS CAMPOS DE ANTICIPO
        requiere_anticipo: false,
        tipo_anticipo: 'fijo',
        valor_anticipo: '',
        mensaje_pago: 'Para confirmar tu turno, realizá el pago del anticipo de ${monto_anticipo} a la siguiente cuenta:\n\nCBU: {cbu}\nAlias: {alias}\nTitular: {titular}\n\nTenés {tiempo_vencimiento} horas para realizar el pago. Si no se confirma el pago en ese tiempo, el turno se cancelará automáticamente.',
        cbu: '',
        alias: '',
        titular: '',
        banco: '',
        tiempo_vencimiento: 2
    });

    // Cargar datos al iniciar
    React.useEffect(() => {
        const id = localStorage.getItem('negocioId');
        console.log('📌 negocioId desde localStorage:', id);
        
        if (!id) {
            console.log('🚫 No hay negocioId, redirigiendo a login');
            window.location.href = 'admin-login.html';
            return;
        }
        setNegocioId(id);
        cargarDatos(id);
    }, []);

    const cargarDatos = async (id) => {
        try {
            console.log('📥 Cargando configuración del negocio...');
            const configData = await window.cargarConfiguracionNegocio(true);
            
            if (configData) {
                console.log('✅ Datos cargados:', configData);
                setConfig({
                    nombre: configData.nombre || '',
                    telefono: configData.telefono || '',
                    email: configData.email || '',
                    direccion: configData.direccion || '',
                    logo_url: configData.logo_url || '',
                    logo_preview: configData.logo_url || '',
                    logo_file: null,
                    mensaje_bienvenida: configData.mensaje_bienvenida || '¡Bienvenido!',
                    mensaje_confirmacion: configData.mensaje_confirmacion || 'Tu turno ha sido reservado',
                    instagram: configData.instagram || '',
                    facebook: configData.facebook || '',
                    horario_atencion: configData.horario_atencion || '',
                    // 🆕 CARGAR CAMPOS DE ANTICIPO
                    requiere_anticipo: configData.requiere_anticipo || false,
                    tipo_anticipo: configData.tipo_anticipo || 'fijo',
                    valor_anticipo: configData.valor_anticipo || '',
                    mensaje_pago: configData.mensaje_pago || 'Para confirmar tu turno, realizá el pago del anticipo de ${monto_anticipo} a la siguiente cuenta:\n\nCBU: {cbu}\nAlias: {alias}\nTitular: {titular}\n\nTenés {tiempo_vencimiento} horas para realizar el pago. Si no se confirma el pago en ese tiempo, el turno se cancelará automáticamente.',
                    cbu: configData.cbu || '',
                    alias: configData.alias || '',
                    titular: configData.titular || '',
                    banco: configData.banco || '',
                    tiempo_vencimiento: configData.tiempo_vencimiento || 2
                });
            }
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            setError('Error al cargar los datos');
        } finally {
            setCargando(false);
        }
    };

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
                    logo_file: file,
                    logo_preview: reader.result
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const subirLogo = async () => {
        if (!config.logo_file) return config.logo_url;
        
        try {
            const fileExt = config.logo_file.name.split('.').pop();
            const fileName = `logo-${negocioId}-${Date.now()}.${fileExt}`;
            
            console.log('📤 Subiendo logo:', fileName);
            
            const response = await fetch(
                `${window.SUPABASE_URL}/storage/v1/object/negocios-logos/${fileName}`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': window.SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    },
                    body: config.logo_file
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                console.error('❌ Error subiendo logo:', error);
                return config.logo_url;
            }
            
            const publicUrl = `${window.SUPABASE_URL}/storage/v1/object/public/negocios-logos/${fileName}`;
            console.log('✅ Logo subido:', publicUrl);
            return publicUrl;
        } catch (error) {
            console.error('❌ Error en subirLogo:', error);
            return config.logo_url;
        }
    };

    const handleGuardar = async () => {
        setGuardando(true);
        setError('');
        
        try {
            console.log('🔍 Verificando negocioId:', negocioId);
            
            if (!negocioId) {
                throw new Error('No hay ID de negocio. Por favor, iniciá sesión nuevamente.');
            }

            // Subir logo si hay uno nuevo
            let logo_url = config.logo_url;
            if (config.logo_file) {
                const nuevaLogoUrl = await subirLogo();
                if (nuevaLogoUrl) {
                    logo_url = nuevaLogoUrl;
                }
            }
            
            // Preparar todos los datos para actualizar
            const datosActualizar = {
                nombre: config.nombre,
                telefono: config.telefono,
                email: config.email || null,
                direccion: config.direccion || null,
                mensaje_bienvenida: config.mensaje_bienvenida,
                mensaje_confirmacion: config.mensaje_confirmacion,
                instagram: config.instagram || null,
                facebook: config.facebook || null,
                horario_atencion: config.horario_atencion || null,
                logo_url: logo_url,
                // 🆕 INCLUIR CAMPOS DE ANTICIPO
                requiere_anticipo: config.requiere_anticipo,
                tipo_anticipo: config.tipo_anticipo,
                valor_anticipo: config.valor_anticipo ? parseFloat(config.valor_anticipo) : null,
                mensaje_pago: config.mensaje_pago || null,
                cbu: config.cbu || null,
                alias: config.alias || null,
                titular: config.titular || null,
                banco: config.banco || null,
                tiempo_vencimiento: config.tiempo_vencimiento ? parseInt(config.tiempo_vencimiento) : 2,
                updated_at: new Date().toISOString()
            };

            console.log('📤 Enviando datos completos:', datosActualizar);
            
            const url = `${window.SUPABASE_URL}/rest/v1/negocios?id=eq.${negocioId}`;
            console.log('🔗 URL:', url);
            
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'apikey': window.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(datosActualizar)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('✅ Datos guardados:', data);
            
            setExito(true);
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error completo:', error);
            setError(`Error al guardar: ${error.message}`);
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Cambios guardados!</h2>
                    <p className="text-gray-600 mb-4">La configuración se actualizó correctamente.</p>
                    <p className="text-sm text-gray-500">Redirigiendo al panel...</p>
                    <div className="animate-spin h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full mx-auto mt-4"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center">
                                <i className="icon-building text-2xl text-white"></i>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Editar Negocio</h1>
                                <p className="text-sm text-gray-500">Modificá los datos de tu negocio</p>
                            </div>
                        </div>
                        <button
                            onClick={() => window.location.href = 'admin.html'}
                            className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition flex items-center gap-2"
                        >
                            <i className="icon-x"></i>
                            Cancelar
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
                            <i className="icon-alert-circle"></i>
                            {error}
                        </div>
                    )}

                    <div className="space-y-8">
                        {/* SECCIÓN 1: Datos básicos */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <i className="icon-info text-amber-500"></i>
                                Datos básicos
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre del negocio
                                    </label>
                                    <input
                                        type="text"
                                        value={config.nombre}
                                        onChange={(e) => setConfig({...config, nombre: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                                            +53
                                        </span>
                                        <input
                                            type="text"
                                            value={config.telefono}
                                            onChange={(e) => setConfig({...config, telefono: e.target.value.replace(/\D/g, '')})}
                                            className="w-full px-4 py-2 rounded-r-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                            maxLength="8"
                                        />
                                    </div>
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
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: Personalización visual */}
                        <div className="pt-4 border-t">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <i className="icon-palette text-amber-500"></i>
                                Personalización
                            </h2>
                            
                            {/* Logo */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Logo del negocio
                                </label>
                                <div 
                                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-amber-500 transition cursor-pointer"
                                    onClick={() => document.getElementById('logo-input').click()}
                                >
                                    <input
                                        id="logo-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoChange}
                                        className="hidden"
                                    />
                                    {config.logo_preview ? (
                                        <div className="space-y-3">
                                            <img src={config.logo_preview} alt="Logo" className="h-24 object-contain mx-auto" />
                                            <p className="text-sm text-gray-600">Hacé clic para cambiar el logo</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <i className="icon-upload-cloud text-5xl text-gray-400 mb-3"></i>
                                            <p className="text-gray-600">Hacé clic para subir un logo</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG hasta 2MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Horario de atención */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Horario de atención
                                </label>
                                <input
                                    type="text"
                                    value={config.horario_atencion}
                                    onChange={(e) => setConfig({...config, horario_atencion: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="Lun-Vie 9:00-20:00, Sáb 9:00-18:00"
                                />
                            </div>
                        </div>

                        {/* 🆕 SECCIÓN 3: Anticipos (NUEVA) */}
                        <div className="pt-4 border-t">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <i className="icon-coin-stack text-amber-500"></i>
                                💰 Anticipos
                            </h2>
                            
                            <div className="space-y-4">
                                {/* Switch Requerir anticipo */}
                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                                    <div>
                                        <label className="font-medium text-gray-700">Requerir anticipo para reservas</label>
                                        <p className="text-xs text-gray-500 mt-1">Si activás, los clientes deberán pagar un anticipo para confirmar el turno</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.requiere_anticipo}
                                            onChange={(e) => setConfig({...config, requiere_anticipo: e.target.checked})}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                    </label>
                                </div>

                                {config.requiere_anticipo && (
                                    <>
                                        {/* Tipo de anticipo */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Tipo de anticipo
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setConfig({...config, tipo_anticipo: 'fijo'})}
                                                    className={`p-4 rounded-lg border-2 transition-all ${
                                                        config.tipo_anticipo === 'fijo'
                                                            ? 'border-amber-600 bg-amber-50'
                                                            : 'border-gray-200 hover:border-amber-300'
                                                    }`}
                                                >
                                                    <div className="text-2xl mb-2">💰</div>
                                                    <div className="font-medium">Monto fijo</div>
                                                    <div className="text-xs text-gray-500 mt-1">Ej: $500 por turno</div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfig({...config, tipo_anticipo: 'porcentaje'})}
                                                    className={`p-4 rounded-lg border-2 transition-all ${
                                                        config.tipo_anticipo === 'porcentaje'
                                                            ? 'border-amber-600 bg-amber-50'
                                                            : 'border-gray-200 hover:border-amber-300'
                                                    }`}
                                                >
                                                    <div className="text-2xl mb-2">📊</div>
                                                    <div className="font-medium">Porcentaje</div>
                                                    <div className="text-xs text-gray-500 mt-1">Ej: 30% del servicio</div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Valor del anticipo */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {config.tipo_anticipo === 'fijo' ? 'Monto del anticipo ($)' : 'Porcentaje del servicio (%)'}
                                            </label>
                                            <input
                                                type="number"
                                                value={config.valor_anticipo}
                                                onChange={(e) => setConfig({...config, valor_anticipo: e.target.value})}
                                                className="w-full border rounded-lg px-3 py-2"
                                                placeholder={config.tipo_anticipo === 'fijo' ? 'Ej: 500' : 'Ej: 30'}
                                                min="0"
                                                step={config.tipo_anticipo === 'fijo' ? "1" : "0.1"}
                                            />
                                        </div>

                                        {/* Tiempo de vencimiento */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Tiempo para pagar (horas)
                                            </label>
                                            <select
                                                value={config.tiempo_vencimiento}
                                                onChange={(e) => setConfig({...config, tiempo_vencimiento: parseInt(e.target.value)})}
                                                className="w-full border rounded-lg px-3 py-2"
                                            >
                                                <option value="1">1 hora</option>
                                                <option value="2">2 horas</option>
                                                <option value="3">3 horas</option>
                                                <option value="6">6 horas</option>
                                                <option value="12">12 horas</option>
                                                <option value="24">24 horas</option>
                                                <option value="48">48 horas</option>
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">Si no paga en este tiempo, la reserva se cancela automáticamente</p>
                                        </div>

                                        {/* Datos bancarios */}
                                        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                                            <h3 className="font-medium text-gray-700">Datos de la cuenta</h3>
                                            
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Banco</label>
                                                <input
                                                    type="text"
                                                    value={config.banco}
                                                    onChange={(e) => setConfig({...config, banco: e.target.value})}
                                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                                    placeholder="Ej: Banco Santander"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">CBU (22 dígitos)</label>
                                                <input
                                                    type="text"
                                                    value={config.cbu}
                                                    onChange={(e) => setConfig({...config, cbu: e.target.value.replace(/\D/g, '')})}
                                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                                    placeholder="0000000000000000000000"
                                                    maxLength="22"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Alias</label>
                                                <input
                                                    type="text"
                                                    value={config.alias}
                                                    onChange={(e) => setConfig({...config, alias: e.target.value})}
                                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                                    placeholder="Ej: SALON.BELLEZA"
                                                />
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Titular</label>
                                                <input
                                                    type="text"
                                                    value={config.titular}
                                                    onChange={(e) => setConfig({...config, titular: e.target.value})}
                                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                                    placeholder="Ej: María González"
                                                />
                                            </div>
                                        </div>

                                        {/* Mensaje personalizado */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Mensaje para el cliente
                                            </label>
                                            <textarea
                                                value={config.mensaje_pago}
                                                onChange={(e) => setConfig({...config, mensaje_pago: e.target.value})}
                                                className="w-full border rounded-lg px-3 py-2"
                                                rows="8"
                                            />
                                            <div className="bg-blue-50 p-3 rounded-lg mt-2 text-xs">
                                                <p className="font-medium text-blue-700 mb-2">Variables disponibles:</p>
                                                <div className="grid grid-cols-2 gap-2 text-blue-600">
                                                    <span><code>{'{monto_anticipo}'}</code> - Monto calculado</span>
                                                    <span><code>{'{servicio}'}</code> - Nombre del servicio</span>
                                                    <span><code>{'{fecha}'}</code> - Fecha del turno</span>
                                                    <span><code>{'{hora}'}</code> - Hora del turno</span>
                                                    <span><code>{'{profesional}'}</code> - Profesional</span>
                                                    <span><code>{'{cbu}'}</code> - CBU</span>
                                                    <span><code>{'{alias}'}</code> - Alias</span>
                                                    <span><code>{'{titular}'}</code> - Titular</span>
                                                    <span><code>{'{banco}'}</code> - Banco</span>
                                                    <span><code>{'{tiempo_vencimiento}'}</code> - Horas para pagar</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* SECCIÓN 4: Mensajes */}
                        <div className="pt-4 border-t">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <i className="icon-message-square text-amber-500"></i>
                                Mensajes
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mensaje de bienvenida
                                    </label>
                                    <textarea
                                        value={config.mensaje_bienvenida}
                                        onChange={(e) => setConfig({...config, mensaje_bienvenida: e.target.value})}
                                        className="w-full border rounded-lg px-3 py-2"
                                        rows="3"
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
                                        className="w-full border rounded-lg px-3 py-2"
                                        rows="3"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 5: Redes sociales */}
                        <div className="pt-4 border-t">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <i className="icon-share-2 text-amber-500"></i>
                                Redes sociales
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                            className="w-full px-4 py-2 rounded-r-lg border border-gray-300"
                                            placeholder="usuario"
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
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="/página"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                        <button
                            onClick={() => window.location.href = 'admin.html'}
                            className="px-6 py-2 border rounded-lg hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleGuardar}
                            disabled={guardando}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {guardando ? (
                                <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <i className="icon-check"></i>
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Renderizar
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<EditarNegocio />);