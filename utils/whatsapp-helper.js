// utils/whatsapp-helper.js - VERSIÓN GENÉRICA COMPLETA
// CON FORMATO EXACTO DE MENSAJE
// + Función unificada para confirmación de reserva
// + Servicio incluido en notificaciones push

console.log('📱 whatsapp-helper.js - VERSIÓN GENÉRICA');

// ============================================
// FUNCIÓN PARA OBTENER CONFIGURACIÓN DEL NEGOCIO
// ============================================
async function getConfigNegocio() {
    try {
        const config = await window.cargarConfiguracionNegocio();
        return {
            nombre: config?.nombre || 'Mi Negocio',
            telefono: config?.telefono || '00000000',
            ntfyTopic: config?.ntfy_topic || 'notificaciones'
        };
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        return {
            nombre: 'Mi Negocio',
            telefono: '00000000',
            ntfyTopic: 'notificaciones'
        };
    }
}

// ============================================
// DETECTOR DE iOS
// ============================================
window.esIOS = function() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /iPad|iPhone|iPod/.test(userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// ============================================
// FUNCIÓN UNIVERSAL WHATSAPP (CORREGIDA - USA api.whatsapp.com Y location.href)
// ============================================
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

// ============================================
// FUNCIÓN PARA ENVIAR NOTIFICACIÓN PUSH
// ============================================
window.enviarNotificacionPush = async function(titulo, mensaje, etiquetas = 'bell', prioridad = 'default') {
    try {
        const config = await getConfigNegocio();
        const topic = config.ntfyTopic;
        
        console.log(`📢 Enviando push a ntfy.sh/${topic}:`, titulo);
        
        const tituloLimpio = titulo.replace(/[^\x00-\x7F]/g, '');
        
        const response = await fetch(`https://ntfy.sh/${topic}`, {
            method: 'POST',
            body: mensaje,
            headers: {
                'Title': tituloLimpio,
                'Priority': prioridad,
                'Tags': etiquetas
            }
        });
        
        if (response.ok) {
            console.log('✅ Push enviado correctamente');
            return true;
        } else {
            console.error('❌ Error en push:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('❌ Error enviando push:', error);
        return false;
    }
};

// ============================================
// FUNCIÓN: ENVIAR MENSAJE DE PAGO PERSONALIZADO (AL CLIENTE Y DUEÑA)
// ============================================
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

        // Calcular monto del anticipo
        let montoAnticipo = 0;
        if (configNegocio.tipo_anticipo === 'fijo') {
            montoAnticipo = configNegocio.valor_anticipo || 0;
        } else {
            let precioServicio = 0;
            if (window.salonServicios) {
                const servicios = await window.salonServicios.getAll(true);
                const servicio = servicios.find(s => s.nombre === booking.servicio);
                if (servicio) {
                    precioServicio = servicio.precio;
                }
            }
            const porcentaje = (configNegocio.valor_anticipo || 0) / 100;
            montoAnticipo = Math.round(precioServicio * porcentaje);
        }

        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;

        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';

        const mensajeFinal = 
`💅 *${configNegocio.nombre || 'Mi Salón'} - Confirmación de Turno*

✅ *SOLICITUD DE TURNO REGISTRADA*

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:* ${booking.servicio}
👩‍🎨 *Profesional:* ${profesional}

💰 *Para confirmar tu turno*, envía el *anticipo de ${montoAnticipo} CUP* por:

🏦 *Transferencia bancaria:* 
   Tárjeta a transferir : ${configNegocio.cbu || 'XXXX XXXX XXXX XXXX'}
   Alias: ${configNegocio.alias || 'alias.no.configurado'}

📱 *Enviar comprobante a este WhatsApp:* 
   +53 ${configNegocio.telefono || '00000000'}

⏳ *Importante:* 
El turno se cancelará automáticamente si no se confirma el pago dentro de las ${configNegocio.tiempo_vencimiento || 2} horas.

¡Gracias por elegirnos! 💖`;

        window.enviarWhatsApp(booking.cliente_whatsapp, mensajeFinal);
        
        console.log('✅ Mensaje de pago enviado al CLIENTE');
        return true;

    } catch (error) {
        console.error('Error en enviarMensajePago:', error);
        return false;
    }
};

// ============================================
// 🆕 FUNCIÓN: ENVIAR CONFIRMACIÓN DE RESERVA (SIN ANTICIPO)
// ============================================
window.enviarConfirmacionReserva = async function(booking, configNegocio) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📱 Enviando confirmación de reserva al cliente (sin anticipo)...');

        if (!configNegocio) {
            configNegocio = await window.cargarConfiguracionNegocio();
        }

        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;

        const mensajeConfirmacion = 
`✅ *${configNegocio?.nombre || 'Mi Salón'} - Turno Confirmado*

Hola *${booking.cliente_nombre}*, tu turno ha sido agendado.

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:*${booking.servicio}
👩‍🎨 *Profesional:* ${booking.profesional_nombre || booking.trabajador_nombre}

¡Te esperamos! ❤️`;

        window.enviarWhatsApp(booking.cliente_whatsapp, mensajeConfirmacion);
        return true;

    } catch (error) {
        console.error('Error en enviarConfirmacionReserva:', error);
        return false;
    }
};

// ============================================
// FUNCIÓN: ENVIAR CONFIRMACIÓN DE PAGO (CUANDO EL ADMIN CONFIRMA)
// ============================================
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

        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;

        const nombreNegocio = configNegocio?.nombre || 'Mi Salón';

        const mensajeConfirmacion = 
`💅 *${nombreNegocio} - Turno Confirmado* 🎉

Hola *${booking.cliente_nombre}*, ¡tu turno ha sido CONFIRMADO!

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:* ${booking.servicio}
👩‍🎨 *Profesional:* ${booking.profesional_nombre || booking.trabajador_nombre}

✅ *Pago recibido correctamente*

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

// ============================================
// NOTIFICACIÓN DE NUEVA RESERVA (SIN ANTICIPO) - CON PUSH
// ============================================
window.notificarNuevaReserva = async function(booking) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📤 Procesando notificación de NUEVA RESERVA (CONFIRMADA)');

        const config = await getConfigNegocio();
        
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        
        const mensajeWhatsApp = 
`🎉 *NUEVA RESERVA - ${config.nombre}*

👤 *Cliente:* ${booking.cliente_nombre}
📱 *WhatsApp:* ${booking.cliente_whatsapp}
💅 *Servicio:* ${booking.servicio} (${booking.duracion} min)
📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
👩‍🎨 *Profesional:* ${profesional}

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
        
        console.log('✅ Notificaciones de nueva reserva enviadas (WhatsApp + Push)');
        return true;
    } catch (error) {
        console.error('Error en notificarNuevaReserva:', error);
        return false;
    }
};

// ============================================
// NOTIFICACIÓN DE RESERVA PENDIENTE (CON ANTICIPO) - CON DATOS DE PAGO A LA DUEÑA
// ============================================
window.notificarReservaPendiente = async function(booking) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📤 Procesando notificación de RESERVA PENDIENTE (CON DATOS DE PAGO A LA DUEÑA)');

        const configNegocio = await window.cargarConfiguracionNegocio();
        
        if (window.enviarMensajePago) {
            console.log('💰 Enviando mensaje con datos de pago a la DUEÑA');
            
            let montoAnticipo = 0;
            if (configNegocio.tipo_anticipo === 'fijo') {
                montoAnticipo = configNegocio.valor_anticipo || 0;
            } else {
                let precioServicio = 0;
                if (window.salonServicios) {
                    const servicios = await window.salonServicios.getAll(true);
                    const servicio = servicios.find(s => s.nombre === booking.servicio);
                    if (servicio) {
                        precioServicio = servicio.precio;
                    }
                }
                const porcentaje = (configNegocio.valor_anticipo || 0) / 100;
                montoAnticipo = Math.round(precioServicio * porcentaje);
            }

            const fechaConDia = window.formatFechaCompleta ? 
                window.formatFechaCompleta(booking.fecha) : 
                booking.fecha;
            
            const horaFormateada = window.formatTo12Hour ? 
                window.formatTo12Hour(booking.hora_inicio) : 
                booking.hora_inicio;

            const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';

            const mensajeFinal = 
`💅 *${configNegocio.nombre || 'Mi Salón'} - Confirmación de Turno*

✅ *SOLICITUD DE TURNO REGISTRADA*

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:* ${booking.servicio}
👩‍🎨 *Profesional:* ${profesional}

💰 *Para confirmar tu turno*, envía el *anticipo de ${montoAnticipo} CUP* por:

🏦 *Transferencia bancária:* 
   Tárjeta a transferir : ${configNegocio.cbu || 'XXXX XXXX XXXX XXXX'}
   Alias: ${configNegocio.alias || 'alias.no.configurado'}

📱 *Enviar comprobante a este WhatsApp:* 
   +53 ${configNegocio.telefono || '00000000'}

⏳ *Importante:* 
El turno se cancelará automáticamente si no se confirma el pago dentro de las ${configNegocio.tiempo_vencimiento || 2} horas.

¡Gracias por elegirnos! 💖`;

            window.enviarWhatsApp(configNegocio.telefono, mensajeFinal);
            
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
            
            console.log('✅ Dueña notificada con DATOS DE PAGO + Push');
            return true;
        }
        
        console.log('⚠️ Usando notificación simple (fallback)');
        const config = await getConfigNegocio();
        
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        
        const mensajeWhatsApp = 
`🆕 *RESERVA PENDIENTE DE PAGO - ${config.nombre}*

👤 *Cliente:* ${booking.cliente_nombre}
📱 *WhatsApp:* ${booking.cliente_whatsapp}
💅 *Servicio:* ${booking.servicio} (${booking.duracion} min)
📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
👩‍🎨 *Profesional:* ${profesional}
💰 *Estado:* Pendiente de pago

✅ Ingresá al panel para confirmar el pago:`;

        window.enviarWhatsApp(config.telefono, mensajeWhatsApp);
        
        const mensajePush = 
`🆕 RESERVA PENDIENTE - ${config.nombre}
👤 Cliente: ${booking.cliente_nombre}
💅 Servicio: ${booking.servicio}
💰 Estado: Pendiente de pago`;

        await window.enviarNotificacionPush(
            `💰 ${config.nombre} - Pago pendiente`,
            mensajePush,
            'moneybag',
            'high'
        );
        
        console.log('✅ Notificación de reserva pendiente enviada (WhatsApp simple + Push)');
        return true;
        
    } catch (error) {
        console.error('Error en notificarReservaPendiente:', error);
        return false;
    }
};

// ============================================
// NOTIFICACIÓN DE CANCELACIÓN (CORREGIDA)
// ============================================
window.notificarCancelacion = async function(booking) {
    try {
        if (!booking) {
            console.error('❌ No hay datos de reserva');
            return false;
        }

        console.log('📤 Procesando notificación de CANCELACIÓN');

        const config = await getConfigNegocio();
        
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        const canceladoPor = booking.cancelado_por || 'admin';
        
        // Mensaje para el dueño (si canceló el cliente)
        const mensajeDuenno = 
`❌ *CANCELACIÓN - ${config.nombre}*

👤 *Cliente:* ${booking.cliente_nombre}
📱 *WhatsApp:* ${booking.cliente_whatsapp}
💅 *Servicio:* ${booking.servicio}
📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
👩‍🎨 *Profesional:* ${profesional}

El cliente canceló su turno.`;

        // Mensaje para el cliente (si canceló el admin)
        const mensajeCliente = 
`❌ *CANCELACIÓN DE TURNO - ${config.nombre}*

Hola *${booking.cliente_nombre}*, lamentamos informarte que tu turno ha sido cancelado.

📅 *Fecha:* ${fechaConDia}
⏰ *Hora:* ${horaFormateada}
💅 *Servicio:* ${booking.servicio}
👩‍🎨 *Profesional:* ${profesional}

🔔 *Motivo:* Cancelación por administración

📱 *¿Querés reprogramar?* Podés hacerlo desde la app`;

        // Enviar según quién canceló
        if (canceladoPor === 'cliente') {
            // El cliente canceló: avisar al admin
            window.enviarWhatsApp(config.telefono, mensajeDuenno);
            console.log('📱 Admin notificado de cancelación por cliente');
        } else {
            // El admin canceló: avisar al cliente
            const telefonoCliente = booking.cliente_whatsapp.replace(/\D/g, '');
            window.enviarWhatsApp(telefonoCliente, mensajeCliente);
            console.log('📱 Cliente notificado de cancelación por admin');
        }

        // Notificación push (siempre, para ambos casos)
        const mensajePush = 
`❌ CANCELACION - ${config.nombre}
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

console.log('✅ whatsapp-helper.js - VERSIÓN GENÉRICA CARGADA (CON FORMATO EXACTO)');