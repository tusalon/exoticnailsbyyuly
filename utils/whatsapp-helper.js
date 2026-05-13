// utils/whatsapp-helper.js - Mensajes de WhatsApp y ntfy
// Archivo normalizado en UTF-8.

console.log('📱 whatsapp-helper.js cargado');

function generarLinkCalendarioCliente(booking) {
    if (!booking?.id) return '';

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const basePath = pathParts.length >= 1 ? `/${pathParts[0]}/` : '/';
    const calendarUrl = new URL('calendar.html', `${window.location.origin}${basePath}`);

    calendarUrl.searchParams.set('id', booking.id);
    if (booking.negocio_id) {
        calendarUrl.searchParams.set('negocio', booking.negocio_id);
    }

    return calendarUrl.toString();
}

function generarLineaCalendarioCliente(booking) {
    const link = generarLinkCalendarioCliente(booking);
    return link ? `\n📅 *Agregar a tu calendario:*\n${link}\n` : '';
}

async function getConfigNegocio() {
    try {
        const config = await window.cargarConfiguracionNegocio();
        return {
            ...(config || {}),
            nombre: config?.nombre || 'Mi Negocio',
            telefono: config?.telefono || '00000000',
            direccion: config?.direccion || config?.ubicacion || config?.direccion_negocio || config?.address || '',
            ubicacion: config?.ubicacion || config?.direccion || config?.direccion_negocio || config?.address || '',
            ntfyTopic: config?.ntfy_topic || config?.ntfyTopic || 'notificaciones'
        };
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        return {
            nombre: 'Mi Negocio',
            telefono: '00000000',
            direccion: '',
            ubicacion: '',
            ntfyTopic: 'notificaciones'
        };
    }
}

async function calcularMontoAnticipo(configNegocio, servicioNombre) {
    if (!configNegocio) return 0;

    if (configNegocio.tipo_anticipo === 'fijo') {
        return configNegocio.valor_anticipo || 0;
    }

    let precioServicio = 0;
    if (window.salonServicios) {
        const servicios = await window.salonServicios.getAll(true);
        const nombres = String(servicioNombre || '').split(' + ').map(nombre => nombre.trim()).filter(Boolean);
        const serviciosEncontrados = servicios.filter(s => nombres.includes(s.nombre));
        if (serviciosEncontrados.length > 0) {
            precioServicio = serviciosEncontrados.reduce((total, servicio) => total + (parseFloat(servicio.precio) || 0), 0);
        } else {
            const servicio = servicios.find(s => s.nombre === servicioNombre);
            if (servicio) precioServicio = servicio.precio || 0;
        }
    }

    const porcentaje = (configNegocio.valor_anticipo || 0) / 100;
    return Math.round(precioServicio * porcentaje);
}

function getFechaHora(booking) {
    const fechaConDia = window.formatFechaCompleta ? window.formatFechaCompleta(booking.fecha) : booking.fecha;
    const horaFormateada = window.formatTo12Hour ? window.formatTo12Hour(booking.hora_inicio) : booking.hora_inicio;
    return { fechaConDia, horaFormateada };
}

function getProfesional(booking) {
    return booking.profesional_nombre || booking.trabajador_nombre || booking.barbero_nombre || 'No asignada';
}

function generarLineaDireccion(configNegocio) {
    const direccion = String(
        configNegocio?.direccion ||
        configNegocio?.ubicacion ||
        configNegocio?.direccion_negocio ||
        configNegocio?.address ||
        ''
    ).trim();
    return direccion ? `\n📍 *Dirección:* ${direccion}\n` : '';
}

function aplicarPlantillaPago(configNegocio, booking, datos) {
    const plantilla = String(configNegocio?.mensaje_pago || '').trim();
    if (!plantilla) return '';

    const reemplazos = {
        monto_anticipo: datos.montoAnticipo,
        cbu: configNegocio?.cbu || configNegocio?.tarjeta || 'No configurado',
        alias: configNegocio?.alias || 'No configurado',
        titular: configNegocio?.titular || configNegocio?.nombre || 'No configurado',
        tiempo_vencimiento: configNegocio?.tiempo_vencimiento || 2,
        nombre_negocio: configNegocio?.nombre || 'Mi Salón',
        cliente: booking?.cliente_nombre || '',
        servicio: booking?.servicio || '',
        fecha: datos.fechaConDia || '',
        hora: datos.horaFormateada || '',
        profesional: datos.profesional || '',
        direccion: String(configNegocio?.direccion || configNegocio?.ubicacion || configNegocio?.direccion_negocio || configNegocio?.address || '').trim()
    };

    return plantilla.replace(/\$\{?monto_anticipo\}?|\{([^}]+)\}/g, (match, key) => {
        if (match.includes('monto_anticipo')) return reemplazos.monto_anticipo;
        return reemplazos[key] ?? match;
    });
}

window.generarLinkCalendarioCliente = generarLinkCalendarioCliente;
window.generarLineaCalendarioCliente = generarLineaCalendarioCliente;

window.esIOS = function() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /iPad|iPhone|iPod/.test(userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

window.enviarWhatsApp = function(telefono, mensaje) {
    try {
        console.log('📤 enviarWhatsApp llamado a:', telefono);

        const telefonoLimpio = telefono.toString().replace(/\D/g, '');
        let numeroCompleto = telefonoLimpio;
        if (!numeroCompleto.startsWith('53')) {
            numeroCompleto = `53${telefonoLimpio}`;
        }

        const mensajeCodificado = encodeURIComponent(mensaje);
        const url = `https://api.whatsapp.com/send?phone=${numeroCompleto}&text=${mensajeCodificado}`;

        console.log('🔗 Abriendo WhatsApp:', url);
        window.location.href = url;
        return true;
    } catch (error) {
        console.error('❌ Error en enviarWhatsApp:', error);
        return false;
    }
};

function sanitizeNtfyHeader(value, fallback = '') {
    const cleanValue = String(value || fallback)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/[\r\n]+/g, ' ')
        .trim();

    return cleanValue || fallback;
}

window.enviarNotificacionPush = async function(titulo, mensaje, etiquetas = 'bell', prioridad = 'default') {
    try {
        const config = await getConfigNegocio();
        const topic = config.ntfyTopic || 'notificaciones';
        const safeTitle = sanitizeNtfyHeader(titulo, `${config.nombre || 'Reserva'} - Notificacion`);
        const safeTags = sanitizeNtfyHeader(etiquetas, 'bell');
        const safePriority = sanitizeNtfyHeader(prioridad, 'default');

        console.log(`📢 Enviando push a ntfy.sh/${topic}:`, titulo);

        const response = await fetch(`https://ntfy.sh/${topic}`, {
            method: 'POST',
            body: mensaje,
            headers: {
                'Title': safeTitle,
                'Priority': safePriority,
                'Tags': safeTags
            }
        });

        if (response.ok) {
            console.log('✅ Push enviado correctamente');
            return true;
        }

        console.error('❌ Error en push:', await response.text());
        return false;
    } catch (error) {
        console.error('❌ Error enviando push:', error);
        return false;
    }
};

window.enviarMensajePago = async function(booking, configNegocio) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('💰 Enviando mensaje de pago personalizado...');

        if (!configNegocio) {
            configNegocio = await window.cargarConfiguracionNegocio();
        }

        if (!configNegocio?.requiere_anticipo) {
            console.log('ℹ️ El negocio no requiere anticipo, no se envía mensaje de pago');
            return false;
        }

        const montoAnticipo = await calcularMontoAnticipo(configNegocio, booking.servicio);
        const { fechaConDia, horaFormateada } = getFechaHora(booking);
        const profesional = getProfesional(booking);
        const lineaCalendario = generarLineaCalendarioCliente(booking);
        const lineaDireccion = generarLineaDireccion(configNegocio);
        const mensajePagoConfig = aplicarPlantillaPago(configNegocio, booking, {
            montoAnticipo,
            fechaConDia,
            horaFormateada,
            profesional
        });

        const mensajeFinal =
`💅 *${configNegocio.nombre || 'Mi Salón'} - Confirmación de Turno*

✅ *SOLICITUD DE TURNO REGISTRADA*

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:* ${booking.servicio}
👩‍🎨 *Profesional:* ${profesional}
${lineaDireccion}

${mensajePagoConfig || `
💰 *Para confirmar tu turno*, envía el *anticipo de ${montoAnticipo} CUP* por:

🏦 *Transferencia bancaria:*
   Tarjeta a transferir: ${configNegocio.cbu || 'XXXX XXXX XXXX XXXX'}
   Alias: ${configNegocio.alias || 'alias.no.configurado'}

📱 *Enviar comprobante a este WhatsApp:*
   +53 ${configNegocio.telefono || '00000000'}

⏳ *Importante:*
El turno se cancelará automáticamente si no se confirma el pago dentro de las ${configNegocio.tiempo_vencimiento || 2} horas.`}
${lineaCalendario}
Cuando confirmemos tu pago, tu turno quedará reservado.

¡Gracias por elegirnos! 💖`;

        window.enviarWhatsApp(booking.cliente_whatsapp, mensajeFinal);
        console.log('✅ Mensaje de pago enviado al CLIENTE');
        return true;
    } catch (error) {
        console.error('Error en enviarMensajePago:', error);
        return false;
    }
};

window.enviarConfirmacionReserva = async function(booking, configNegocio) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📱 Enviando confirmación de reserva al cliente...');

        if (!configNegocio) {
            configNegocio = await window.cargarConfiguracionNegocio();
        }

        const { fechaConDia, horaFormateada } = getFechaHora(booking);
        const lineaCalendario = generarLineaCalendarioCliente(booking);
        const lineaDireccion = generarLineaDireccion(configNegocio);

        const mensajeConfirmacion =
`✅ *${configNegocio?.nombre || 'Mi Salón'} - Turno Confirmado*

Hola *${booking.cliente_nombre}*, tu turno ha sido agendado.

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:* ${booking.servicio}
👩‍🎨 *Profesional:* ${getProfesional(booking)}
${lineaDireccion}
${lineaCalendario}
¡Te esperamos! ❤️`;

        window.enviarWhatsApp(booking.cliente_whatsapp, mensajeConfirmacion);
        return true;
    } catch (error) {
        console.error('Error en enviarConfirmacionReserva:', error);
        return false;
    }
};

window.enviarConfirmacionPago = async function(booking, configNegocio) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('🎉 Enviando confirmación de pago al cliente...');

        if (!configNegocio) {
            configNegocio = await window.cargarConfiguracionNegocio();
        }

        const { fechaConDia, horaFormateada } = getFechaHora(booking);
        const nombreNegocio = configNegocio?.nombre || 'Mi Salón';
        const lineaCalendario = generarLineaCalendarioCliente(booking);
        const lineaDireccion = generarLineaDireccion(configNegocio);

        const mensajeConfirmacion =
`💅 *${nombreNegocio} - Turno Confirmado* 🎉

Hola *${booking.cliente_nombre}*, ¡tu turno ha sido CONFIRMADO!

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:* ${booking.servicio}
👩‍🎨 *Profesional:* ${getProfesional(booking)}
${lineaDireccion}

✅ *Pago recibido correctamente*
${lineaCalendario}
Te esperamos ❤️
Cualquier cambio, podés cancelarlo desde la app con hasta 1 hora de anticipación.`;

        window.enviarWhatsApp(booking.cliente_whatsapp, mensajeConfirmacion);
        console.log('✅ Mensaje de confirmación de pago enviado');
        return true;
    } catch (error) {
        console.error('Error en enviarConfirmacionPago:', error);
        return false;
    }
};

window.notificarNuevaReserva = async function(booking) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📤 Procesando notificación de NUEVA RESERVA');

        const config = await getConfigNegocio();
        const { fechaConDia, horaFormateada } = getFechaHora(booking);
        const profesional = getProfesional(booking);
        const lineaCalendario = generarLineaCalendarioCliente(booking);
        const lineaDireccion = generarLineaDireccion(config);

        const mensajeWhatsApp =
`🎉 *NUEVA RESERVA - ${config.nombre}*

👤 *Cliente:* ${booking.cliente_nombre}
📱 *WhatsApp:* ${booking.cliente_whatsapp}
💅 *Servicio:* ${booking.servicio} (${booking.duracion} min)
📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
👩‍🎨 *Profesional:* ${profesional}
${lineaDireccion}
${lineaCalendario}

✅ Reserva confirmada automáticamente.`;

        window.enviarWhatsApp(config.telefono, mensajeWhatsApp);

        const mensajePush =
`🆕 NUEVA RESERVA - ${config.nombre}
👤 Cliente: ${booking.cliente_nombre}
💅 Servicio: ${booking.servicio}
📅 Fecha: ${fechaConDia}
⏰ Hora: ${horaFormateada}`;

        await window.enviarNotificacionPush(
            `📅 ${config.nombre} - Nuevo turno`,
            mensajePush,
            'calendar',
            'default'
        );

        console.log('✅ Notificaciones de nueva reserva enviadas');
        return true;
    } catch (error) {
        console.error('Error en notificarNuevaReserva:', error);
        return false;
    }
};

window.notificarReservaPendiente = async function(booking) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📤 Procesando notificación de RESERVA PENDIENTE');

        const configNegocio = await window.cargarConfiguracionNegocio();
        const montoAnticipo = await calcularMontoAnticipo(configNegocio, booking.servicio);
        const { fechaConDia, horaFormateada } = getFechaHora(booking);
        const profesional = getProfesional(booking);
        const lineaCalendario = generarLineaCalendarioCliente(booking);
        const lineaDireccion = generarLineaDireccion(configNegocio);
        const mensajePagoConfig = aplicarPlantillaPago(configNegocio, booking, {
            montoAnticipo,
            fechaConDia,
            horaFormateada,
            profesional
        });

        const mensajeFinal =
`💅 *${configNegocio.nombre || 'Mi Salón'} - Confirmación de Turno*

✅ *SOLICITUD DE TURNO REGISTRADA*

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:* ${booking.servicio}
👩‍🎨 *Profesional:* ${profesional}
${lineaDireccion}

${mensajePagoConfig || `
💰 *Para confirmar tu turno*, envía el *anticipo de ${montoAnticipo} CUP* por:

🏦 *Transferencia bancaria:*
   Tarjeta a transferir: ${configNegocio.cbu || 'XXXX XXXX XXXX XXXX'}
   Alias: ${configNegocio.alias || 'alias.no.configurado'}

📱 *Enviar comprobante a este WhatsApp:*
   +53 ${configNegocio.telefono || '00000000'}

⏳ *Importante:*
El turno se cancelará automáticamente si no se confirma el pago dentro de las ${configNegocio.tiempo_vencimiento || 2} horas.`}
${lineaCalendario}

¡Gracias por elegirnos! 💖`;

        window.enviarWhatsApp(booking.cliente_whatsapp, mensajeFinal);

        const mensajePush =
`🆕 RESERVA PENDIENTE - ${configNegocio.nombre}
👤 Cliente: ${booking.cliente_nombre}
💅 Servicio: ${booking.servicio}
💰 Monto: $${montoAnticipo}`;

        await window.enviarNotificacionPush(
            `💰 ${configNegocio.nombre} - Pago pendiente`,
            mensajePush,
            'moneybag',
            'high'
        );

        console.log('✅ Cliente notificada con datos de pago + Push a la dueña');
        return true;
    } catch (error) {
        console.error('Error en notificarReservaPendiente:', error);
        return false;
    }
};

window.notificarCancelacion = async function(booking) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📤 Procesando notificación de CANCELACIÓN');

        const config = await getConfigNegocio();
        const { fechaConDia, horaFormateada } = getFechaHora(booking);
        const profesional = getProfesional(booking);
        const canceladoPor = booking.cancelado_por || 'admin';

        const mensajeDuenno =
`❌ *CANCELACIÓN - ${config.nombre}*

👤 *Cliente:* ${booking.cliente_nombre}
📱 *WhatsApp:* ${booking.cliente_whatsapp}
💅 *Servicio:* ${booking.servicio}
📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
👩‍🎨 *Profesional:* ${profesional}

El cliente canceló su turno.`;

        const mensajeCliente =
`❌ *CANCELACIÓN DE TURNO - ${config.nombre}*

Hola *${booking.cliente_nombre}*, lamentamos informarte que tu turno ha sido cancelado.

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:* ${booking.servicio}
👩‍🎨 *Profesional:* ${profesional}

🔔 *Motivo:* Cancelación por administración

📱 *¿Querés reprogramar?* Podés hacerlo desde la app`;

        if (canceladoPor === 'cliente') {
            window.enviarWhatsApp(config.telefono, mensajeDuenno);
            console.log('📱 Admin notificado de cancelación por cliente');
        } else {
            const telefonoCliente = booking.cliente_whatsapp.replace(/\D/g, '');
            window.enviarWhatsApp(telefonoCliente, mensajeCliente);
            console.log('📱 Cliente notificado de cancelación por admin');
        }

        const mensajePush =
`❌ CANCELACIÓN - ${config.nombre}
👤 Cliente: ${booking.cliente_nombre}
📱 WhatsApp: ${booking.cliente_whatsapp}
💅 Servicio: ${booking.servicio}
📅 Fecha: ${fechaConDia}
${canceladoPor === 'cliente' ? '🔔 Cancelado por cliente' : '🔔 Cancelado por admin'}`;

        await window.enviarNotificacionPush(
            `❌ ${config.nombre} - Cancelación`,
            mensajePush,
            'x',
            'default'
        );

        console.log('✅ Notificaciones de cancelación enviadas');
        return true;
    } catch (error) {
        console.error('Error en notificarCancelacion:', error);
        return false;
    }
};

console.log('✅ whatsapp-helper.js cargado correctamente');
