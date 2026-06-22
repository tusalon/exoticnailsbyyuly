// recordatorio-turnos — envía push a clientas con turno mañana
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fechaManana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl   = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const vapidPublic   = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivate  = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject  = Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@rservasroma.com";

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return jsonResponse({ error: "Variables de entorno no configuradas" }, 503);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  // Filtrar por negocio si se pasa en el body
  const body = await req.json().catch(() => ({}));
  const negocioFiltro = body?.negocio_id || null;
  const manana = fechaManana();

  // 1. Buscar reservas de mañana activas
  let reservasUrl = `${supabaseUrl}/rest/v1/reservas?fecha=eq.${manana}&estado=neq.Cancelado&select=id,negocio_id,cliente_nombre,cliente_whatsapp,servicio,hora_inicio,profesional_nombre`;
  if (negocioFiltro) reservasUrl += `&negocio_id=eq.${negocioFiltro}`;

  const resReservas = await fetch(reservasUrl, { headers });
  if (!resReservas.ok) return jsonResponse({ error: "Error consultando reservas" }, 500);
  const reservas = await resReservas.json();

  if (!reservas.length) return jsonResponse({ ok: true, enviados: 0, mensaje: `Sin turnos para ${manana}` });

  // 2. Para cada reserva buscar suscripción push de esa clienta
  let enviados = 0;
  let sinSuscripcion = 0;
  const errores: string[] = [];

  for (const reserva of reservas) {
    if (!reserva.cliente_whatsapp) { sinSuscripcion++; continue; }

    const subUrl = `${supabaseUrl}/rest/v1/push_suscripciones?negocio_id=eq.${reserva.negocio_id}&cliente_whatsapp=eq.${encodeURIComponent(reserva.cliente_whatsapp)}&activo=eq.true&select=id,endpoint,subscription`;
    const resSubs = await fetch(subUrl, { headers });
    if (!resSubs.ok) { errores.push(`Error consultando suscripcion ${reserva.cliente_whatsapp}`); continue; }
    const subs = await resSubs.json();

    if (!subs.length) { sinSuscripcion++; continue; }

    // Formatear hora a 12h
    const [h, m] = reserva.hora_inicio.split(":").map(Number);
    const hora12 = `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;

    const notification = JSON.stringify({
      title: `💅 Recordatorio de tu cita`,
      body: `Hola ${reserva.cliente_nombre}! Mañana tienes ${reserva.servicio} a las ${hora12}. Te esperamos!`,
      tag: "recordatorio",
      url: `/${reserva.negocio_id}/`,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, notification);
        enviados++;
      } catch (err: any) {
        const status = err?.statusCode || 0;
        if (status === 404 || status === 410) {
          // Suscripción inválida — marcar inactiva
          await fetch(`${supabaseUrl}/rest/v1/push_suscripciones?id=eq.${sub.id}`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ activo: false }),
          });
        }
        errores.push(`${reserva.cliente_nombre}: ${err?.message || err}`);
      }
    }
  }

  return jsonResponse({
    ok: true,
    fecha: manana,
    total_reservas: reservas.length,
    enviados,
    sin_suscripcion: sinSuscripcion,
    errores: errores.length ? errores : undefined,
  });
});
