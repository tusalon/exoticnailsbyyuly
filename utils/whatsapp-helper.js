// utils/whatsapp-helper.js - VERSIÃ“N GENÃ‰RICA COMPLETA
// CON FORMATO EXACTO DE MENSAJE
// + FunciÃ³n unificada para confirmaciÃ³n de reserva
// + Servicio incluido en notificaciones push

console.log('ðŸ“± whatsapp-helper.js - VERSIÃ“N GENÃ‰RICA');

// ============================================
// FUNCIÃ“N PARA OBTENER CONFIGURACIÃ“N DEL NEGOCIO
// ============================================
function generarLinkCalendarioCliente(booking) {
    if (!booking?.id) return '';

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const basePath = pathParts.length > 1 ? `/${pathParts[0]}/` : '/';
    const calendarUrl = new URL('calendar.html', `${window.location.origin}${basePath}`);

    calendarUrl.searchParams.set('id', booking.id);
    if (booking.negocio_id) {
        calendarUrl.searchParams.set('negocio', booking.negocio_id);
    }

    return calendarUrl.toString();
}

function generarLineaCalendarioCliente(booking) {
    const link = generarLinkCalendarioCliente(booking);
    return link ? `\n*Agregar a tu calendario:*\n${link}\n` : '';
}

async function getConfigNegocio() {
    try {
        const config = await window.cargarConfiguracionNegocio();
        return {
            nombre: config?.nombre || 'Mi Negocio',
            telefono: config?.telefono || '00000000',
            ntfyTopic: config?.ntfy_topic || 'notificaciones'
        };
    } catch (error) {
        console.error('Error obteniendo configuraciÃ³n:', error);
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
// FUNCIÃ“N UNIVERSAL WHATSAPP (CORREGIDA - USA api.whatsapp.com Y location.href)
// ============================================
window.enviarWhatsApp = function(telefono, mensaje) {
    try {
        console.log('ðŸ“¤ enviarWhatsApp llamado a:', telefono);
        
        const telefonoLimpio = telefono.toString().replace(/\D/g, '');
        let numeroCompleto = telefonoLimpio;
        if (!numeroCompleto.startsWith('53')) {
            numeroCompleto = `53${telefonoLimpio}`;
        }
        
        const mensajeCodificado = encodeURIComponent(mensaje);
        
        const url = `https://api.whatsapp.com/send?phone=${numeroCompleto}&text=${mensajeCodificado}`;
        
        console.log('ðŸ”— Abriendo WhatsApp:', url);
        
        window.location.href = url;
        return true;
    } catch (error) {
        console.error('âŒ Error en enviarWhatsApp:', error);
        return false;
    }
};

// ============================================
// FUNCIÃ“N PARA ENVIAR NOTIFICACIÃ“N PUSH
// ============================================
window.enviarNotificacionPush = async function(titulo, mensaje, etiquetas = 'bell', prioridad = 'default') {
    try {
        const config = await getConfigNegocio();
        const topic = config.ntfyTopic;
        
        console.log(`ðŸ“¢ Enviando push a ntfy.sh/${topic}:`, titulo);
        
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
            console.log('âœ… Push enviado correctamente');
            return true;
        } else {
            console.error('âŒ Error en push:', await response.text());
            return false;
        }
    } catch (error) {
        console.error('âŒ Error enviando push:', error);
        return false;
    }
};

// ============================================
// FUNCIÃ“N: ENVIAR MENSAJE DE PAGO PERSONALIZADO (AL CLIENTE Y DUEÃ‘A)
// ============================================
window.enviarMensajePago = async function(booking, configNegocio) {
    try {
        if (!booking) {
            console.error('âŒ No hay datos de reserva');
            return false;
        }

        console.log('ðŸ’° Enviando mensaje de pago personalizado...');

        if (!configNegocio) {
            configNegocio = await window.cargarConfiguracionNegocio();
        }

        if (!configNegocio?.requiere_anticipo) {
            console.log('â„¹ï¸ El negocio no requiere anticipo, no se envÃ­a mensaje de pago');
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
        const lineaCalendario = generarLineaCalendarioCliente(booking);

        const mensajeFinal = 
`*${configNegocio.nombre || 'Mi Salon'} - Confirmacion de Turno*

*SOLICITUD DE TURNO REGISTRADA*

*Fecha:* ${fechaConDia}
*Hora:* ${horaFormateada}
*Servicio:* ${booking.servicio}
*Profesional:* ${profesional}

*Para confirmar tu turno*, envia el *anticipo de ${montoAnticipo} CUP* por:

*Transferencia bancaria:* 
   Tarjeta a transferir: ${configNegocio.cbu || 'XXXX XXXX XXXX XXXX'}
   Alias: ${configNegocio.alias || 'alias.no.configurado'}

*Enviar comprobante a este WhatsApp:* 
   +53 ${configNegocio.telefono || '00000000'}

*Importante:* 
El turno se cancelara automaticamente si no se confirma el pago dentro de las ${configNegocio.tiempo_vencimiento || 2} horas.

${lineaCalendario}
Cuando confirmemos tu pago, tu turno quedara reservado.

Gracias por elegirnos.`;

        window.enviarWhatsApp(booking.cliente_whatsapp, mensajeFinal);
        
        console.log('âœ… Mensaje de pago enviado al CLIENTE');
        return true;

    } catch (error) {
        console.error('Error en enviarMensajePago:', error);
        return false;
    }
};

// ============================================
// ðŸ†• FUNCIÃ“N: ENVIAR CONFIRMACIÃ“N DE RESERVA (SIN ANTICIPO)
// ============================================
window.enviarConfirmacionReserva = async function(booking, configNegocio) {
    try {
        if (!booking) {
            console.error('âŒ No hay datos de reserva');
            return false;
        }

        console.log('ðŸ“± Enviando confirmaciÃ³n de reserva al cliente (sin anticipo)...');

        if (!configNegocio) {
            configNegocio = await window.cargarConfiguracionNegocio();
        }

        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
        const lineaCalendario = generarLineaCalendarioCliente(booking);

        const mensajeConfirmacion = 
`*${configNegocio?.nombre || 'Mi Salon'} - Turno Confirmado*

Hola *${booking.cliente_nombre}*, tu turno ha sido agendado.

*Fecha:* ${fechaConDia}
*Hora:* ${horaFormateada}
*Servicio:* ${booking.servicio}
*Profesional:* ${booking.profesional_nombre || booking.trabajador_nombre}

${lineaCalendario}

Te esperamos.`;

        window.enviarWhatsApp(booking.cliente_whatsapp, mensajeConfirmacion);
        return true;

    } catch (error) {
        console.error('Error en enviarConfirmacionReserva:', error);
        return false;
    }
};

// ============================================
// FUNCIÃ“N: ENVIAR CONFIRMACIÃ“N DE PAGO (CUANDO EL ADMIN CONFIRMA)
// ============================================
window.enviarConfirmacionPago = async function(booking, configNegocio) {
    try {
        if (!booking) {
            console.error('âŒ No hay datos de reserva');
            return false;
        }

        console.log('ðŸŽ‰ Enviando confirmaciÃ³n de pago al cliente...');

        if (!configNegocio) {
            configNegocio = await window.cargarConfiguracionNegocio();
        }

        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;

        const nombreNegocio = configNegocio?.nombre || 'Mi SalÃ³n';

        const mensajeConfirmacion = 
`ðŸ’… *${nombreNegocio} - Turno Confirmado* ðŸŽ‰

Hola *${booking.cliente_nombre}*, Â¡tu turno ha sido CONFIRMADO!

ðŸ“… *Fecha:* ${fechaConDia}
â° *Hora:* ${horaFormateada}
ðŸ’… *Servicio:* ${booking.servicio}
ðŸ‘©â€ðŸŽ¨ *Profesional:* ${booking.profesional_nombre || booking.trabajador_nombre}

âœ… *Pago recibido correctamente*

Te esperamos â¤ï¸
Cualquier cambio, podÃ©s cancelarlo desde la app con hasta 1 hora de anticipaciÃ³n.`;

        window.enviarWhatsApp(booking.cliente_whatsapp, mensajeConfirmacion);
        
        console.log('âœ… Mensaje de confirmaciÃ³n de pago enviado');
        return true;

    } catch (error) {
        console.error('Error en enviarConfirmacionPago:', error);
        return false;
    }
};

// ============================================
// NOTIFICACIÃ“N DE NUEVA RESERVA (SIN ANTICIPO) - CON PUSH
// ============================================
window.notificarNuevaReserva = async function(booking) {
    try {
        if (!booking) {
            console.error('âŒ No hay datos de reserva');
            return false;
        }

        console.log('ðŸ“¤ Procesando notificaciÃ³n de NUEVA RESERVA (CONFIRMADA)');

        const config = await getConfigNegocio();
        
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        
        const mensajeWhatsApp = 
`ðŸŽ‰ *NUEVA RESERVA - ${config.nombre}*

ðŸ‘¤ *Cliente:* ${booking.cliente_nombre}
ðŸ“± *WhatsApp:* ${booking.cliente_whatsapp}
ðŸ’… *Servicio:* ${booking.servicio} (${booking.duracion} min)
ðŸ“… *Fecha:* ${fechaConDia}
â° *Hora:* ${horaFormateada}
ðŸ‘©â€ðŸŽ¨ *Profesional:* ${profesional}

âœ… Reserva confirmada automÃ¡ticamente.`;

        window.enviarWhatsApp(config.telefono, mensajeWhatsApp);
        
        const mensajePush = 
`ðŸ†• NUEVA RESERVA - ${config.nombre}
ðŸ‘¤ Cliente: ${booking.cliente_nombre}
ðŸ’… Servicio: ${booking.servicio}
ðŸ“… Fecha: ${fechaConDia}
â° Hora: ${horaFormateada}`;

        await window.enviarNotificacionPush(
            `ðŸ“… ${config.nombre} - Nuevo turno`,
            mensajePush,
            'calendar',
            'default'
        );
        
        console.log('âœ… Notificaciones de nueva reserva enviadas (WhatsApp + Push)');
        return true;
    } catch (error) {
        console.error('Error en notificarNuevaReserva:', error);
        return false;
    }
};

// ============================================
// NOTIFICACIÃ“N DE RESERVA PENDIENTE (CON ANTICIPO) - CON DATOS DE PAGO A LA DUEÃ‘A
// ============================================
window.notificarReservaPendiente = async function(booking) {
    try {
        if (!booking) {
            console.error('âŒ No hay datos de reserva');
            return false;
        }

        console.log('ðŸ“¤ Procesando notificaciÃ³n de RESERVA PENDIENTE (CON DATOS DE PAGO A LA DUEÃ‘A)');

        const configNegocio = await window.cargarConfiguracionNegocio();
        
        if (window.enviarMensajePago) {
            console.log('ðŸ’° Enviando mensaje con datos de pago a la DUEÃ‘A');
            
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
`ðŸ’… *${configNegocio.nombre || 'Mi SalÃ³n'} - ConfirmaciÃ³n de Turno*

âœ… *SOLICITUD DE TURNO REGISTRADA*

ðŸ“… *Fecha:* ${fechaConDia}
â° *Hora:* ${horaFormateada}
ðŸ’… *Servicio:* ${booking.servicio}
ðŸ‘©â€ðŸŽ¨ *Profesional:* ${profesional}

ðŸ’° *Para confirmar tu turno*, envÃ­a el *anticipo de ${montoAnticipo} CUP* por:

ðŸ¦ *Transferencia bancÃ¡ria:* 
   TÃ¡rjeta a transferir : ${configNegocio.cbu || 'XXXX XXXX XXXX XXXX'}
   Alias: ${configNegocio.alias || 'alias.no.configurado'}

ðŸ“± *Enviar comprobante a este WhatsApp:* 
   +53 ${configNegocio.telefono || '00000000'}

â³ *Importante:* 
El turno se cancelarÃ¡ automÃ¡ticamente si no se confirma el pago dentro de las ${configNegocio.tiempo_vencimiento || 2} horas.

Â¡Gracias por elegirnos! ðŸ’–`;

            window.enviarWhatsApp(configNegocio.telefono, mensajeFinal);
            
            const mensajePush = 
`ðŸ†• RESERVA PENDIENTE - ${configNegocio.nombre}
ðŸ‘¤ Cliente: ${booking.cliente_nombre}
ðŸ’… Servicio: ${booking.servicio}
ðŸ’° Monto: $${montoAnticipo}`;

            await window.enviarNotificacionPush(
                `ðŸ’° ${configNegocio.nombre} - Pago pendiente`,
                mensajePush,
                'moneybag',
                'high'
            );
            
            console.log('âœ… DueÃ±a notificada con DATOS DE PAGO + Push');
            return true;
        }
        
        console.log('âš ï¸ Usando notificaciÃ³n simple (fallback)');
        const config = await getConfigNegocio();
        
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        
        const mensajeWhatsApp = 
`ðŸ†• *RESERVA PENDIENTE DE PAGO - ${config.nombre}*

ðŸ‘¤ *Cliente:* ${booking.cliente_nombre}
ðŸ“± *WhatsApp:* ${booking.cliente_whatsapp}
ðŸ’… *Servicio:* ${booking.servicio} (${booking.duracion} min)
ðŸ“… *Fecha:* ${fechaConDia}
â° *Hora:* ${horaFormateada}
ðŸ‘©â€ðŸŽ¨ *Profesional:* ${profesional}
ðŸ’° *Estado:* Pendiente de pago

âœ… IngresÃ¡ al panel para confirmar el pago:`;

        window.enviarWhatsApp(config.telefono, mensajeWhatsApp);
        
        const mensajePush = 
`ðŸ†• RESERVA PENDIENTE - ${config.nombre}
ðŸ‘¤ Cliente: ${booking.cliente_nombre}
ðŸ’… Servicio: ${booking.servicio}
ðŸ’° Estado: Pendiente de pago`;

        await window.enviarNotificacionPush(
            `ðŸ’° ${config.nombre} - Pago pendiente`,
            mensajePush,
            'moneybag',
            'high'
        );
        
        console.log('âœ… NotificaciÃ³n de reserva pendiente enviada (WhatsApp simple + Push)');
        return true;
        
    } catch (error) {
        console.error('Error en notificarReservaPendiente:', error);
        return false;
    }
};

// ============================================
// NOTIFICACIÃ“N DE CANCELACIÃ“N (CORREGIDA)
// ============================================
window.notificarCancelacion = async function(booking) {
    try {
        if (!booking) {
            console.error('âŒ No hay datos de reserva');
            return false;
        }

        console.log('ðŸ“¤ Procesando notificaciÃ³n de CANCELACIÃ“N');

        const config = await getConfigNegocio();
        
        const fechaConDia = window.formatFechaCompleta ? 
            window.formatFechaCompleta(booking.fecha) : 
            booking.fecha;
        
        const horaFormateada = window.formatTo12Hour ? 
            window.formatTo12Hour(booking.hora_inicio) : 
            booking.hora_inicio;
            
        const profesional = booking.profesional_nombre || booking.trabajador_nombre || 'No asignada';
        const canceladoPor = booking.cancelado_por || 'admin';
        
        // Mensaje para el dueÃ±o (si cancelÃ³ el cliente)
        const mensajeDuenno = 
`âŒ *CANCELACIÃ“N - ${config.nombre}*

ðŸ‘¤ *Cliente:* ${booking.cliente_nombre}
ðŸ“± *WhatsApp:* ${booking.cliente_whatsapp}
ðŸ’… *Servicio:* ${booking.servicio}
ðŸ“… *Fecha:* ${fechaConDia}
â° *Hora:* ${horaFormateada}
ðŸ‘©â€ðŸŽ¨ *Profesional:* ${profesional}

El cliente cancelÃ³ su turno.`;

        // Mensaje para el cliente (si cancelÃ³ el admin)
        const mensajeCliente = 
`âŒ *CANCELACIÃ“N DE TURNO - ${config.nombre}*

Hola *${booking.cliente_nombre}*, lamentamos informarte que tu turno ha sido cancelado.

ðŸ“… *Fecha:* ${fechaConDia}
â° *Hora:* ${horaFormateada}
ðŸ’… *Servicio:* ${booking.servicio}
ðŸ‘©â€ðŸŽ¨ *Profesional:* ${profesional}

ðŸ”” *Motivo:* CancelaciÃ³n por administraciÃ³n

ðŸ“± *Â¿QuerÃ©s reprogramar?* PodÃ©s hacerlo desde la app`;

        // Enviar segÃºn quiÃ©n cancelÃ³
        if (canceladoPor === 'cliente') {
            // El cliente cancelÃ³: avisar al admin
            window.enviarWhatsApp(config.telefono, mensajeDuenno);
            console.log('ðŸ“± Admin notificado de cancelaciÃ³n por cliente');
        } else {
            // El admin cancelÃ³: avisar al cliente
            const telefonoCliente = booking.cliente_whatsapp.replace(/\D/g, '');
            window.enviarWhatsApp(telefonoCliente, mensajeCliente);
            console.log('ðŸ“± Cliente notificado de cancelaciÃ³n por admin');
        }

        // NotificaciÃ³n push (siempre, para ambos casos)
        const mensajePush = 
`âŒ CANCELACION - ${config.nombre}
ðŸ‘¤ Cliente: ${booking.cliente_nombre}
ðŸ“± WhatsApp: ${booking.cliente_whatsapp}
ðŸ’… Servicio: ${booking.servicio}
ðŸ“… Fecha: ${fechaConDia}
${canceladoPor === 'cliente' ? 'ðŸ”” Cancelado por cliente' : 'ðŸ”” Cancelado por admin'}`;

        await window.enviarNotificacionPush(
            `âŒ ${config.nombre} - CancelaciÃ³n`,
            mensajePush,
            'x',
            'default'
        );
        
        console.log('âœ… Notificaciones de cancelaciÃ³n enviadas');
        return true;
    } catch (error) {
        console.error('Error en notificarCancelacion:', error);
        return false;
    }
};

console.log('âœ… whatsapp-helper.js - VERSIÃ“N GENÃ‰RICA CARGADA (CON FORMATO EXACTO)');
