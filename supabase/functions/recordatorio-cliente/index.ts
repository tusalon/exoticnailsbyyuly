// recordatorio-cliente — push a la clienta el día antes y 1 hora antes de su cita
// Corre via pg_cron:
//   - 8 PM Cuba (00:00 UTC) → tipo "dia" → turnos de mañana
//   - Cada 30 min → tipo "hora" → turnos en los próximos 60-90 min

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

function getCubaDate(offsetDays = 0): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Havana",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(p => [p.type, p.value]));
  const base = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return base.toISOString().slice(0, 10);
}

function hora12(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const vapidPublic  = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@rservasroma.com";

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return jsonResponse({ error: "Variables no configuradas" }, 503);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  const body = await req.json().catch(() => ({}));
  const tipo = body?.tipo || "dia"; // "dia" o "hora"
  const negocioFiltro = body?.negocio_id || null;

  let reservasUrl = "";
  let flagCampo = "";
  let buildMensaje: (r: any, nombreNegocio: string) => { title: string; body: string } ;

  if (tipo === "dia") {
    // Recordatorio del día siguiente — corre a las 8 PM Cuba
    const manana = getCubaDate(1);
    flagCampo = "push_recordatorio_dia_enviado";
    reservasUrl = `${supabaseUrl}/rest/v1/reservas?fecha=eq.${manana}&estado=neq.Cancelado&push_recordatorio_dia_enviado=eq.false&select=id,negocio_id,cliente_nombre,cliente_whatsapp,servicio,hora_inicio`;
    buildMensaje = (r, neg) => ({
      title: `📅 Recordatorio — ${neg}`,
      body: `Hola ${r.cliente_nombre}! Mañana tienes ${r.servicio} a las ${hora12(r.hora_inicio)}. Te esperamos!`,
    });
  } else {
    // Recordatorio 1 hora antes — corre cada 30 min
    flagCampo = "push_recordatorio_hora_enviado";
    // Buscar citas entre ahora+50min y ahora+90min (ventana de 40 min para cubrir la ejecución cada 30)
    const ahora = new Date();
    const desde = new Date(ahora.getTime() + 50 * 60000);
    const hasta = new Date(ahora.getTime() + 90 * 60000);
    const fecha = getCubaDate(0);
    const horaDesde = desde.toLocaleTimeString("en-GB", { timeZone: "America/Havana", hour: "2-digit", minute: "2-digit" });
    const horaHasta = hasta.toLocaleTimeString("en-GB", { timeZone: "America/Havana", hour: "2-digit", minute: "2-digit" });
    reservasUrl = `${supabaseUrl}/rest/v1/reservas?fecha=eq.${fecha}&estado=neq.Cancelado&push_recordatorio_hora_enviado=eq.false&hora_inicio=gte.${horaDesde}&hora_inicio=lte.${horaHasta}&select=id,negocio_id,cliente_nombre,cliente_whatsapp,servicio,hora_inicio`;
    buildMensaje = (r, neg) => ({
      title: `⏰ Tu cita es en 1 hora — ${neg}`,
      body: `${r.cliente_nombre}, tienes ${r.servicio} a las ${hora12(r.hora_inicio)}. ¡Nos vemos pronto!`,
    });
  }

  if (negocioFiltro) reservasUrl += `&negocio_id=eq.${negocioFiltro}`;

  const resReservas = await fetch(reservasUrl, { headers });
  if (!resReservas.ok) return jsonResponse({ error: "Error consultando reservas" }, 500);
  const reservas = await resReservas.json();

  if (!reservas.length) return jsonResponse({ ok: true, tipo, enviados: 0, mensaje: "Sin turnos pendientes" });

  // Obtener nombres y URLs de negocios
  const negocioIds = [...new Set(reservas.map((r: any) => r.negocio_id))];
  const negociosRes = await fetch(`${supabaseUrl}/rest/v1/negocios?id=in.(${negocioIds.join(",")})&select=id,nombre,sitio_web,slug`, { headers });
  const negocios = negociosRes.ok ? await negociosRes.json() : [];
  const nombreNegocioById: Record<string, string> = Object.fromEntries(negocios.map((n: any) => [n.id, n.nombre]));
  const urlNegocioById: Record<string, string> = Object.fromEntries(negocios.map((n: any) => [n.id, n.sitio_web || `https://tusalon.github.io/${n.slug}/`]));

  let enviados = 0;
  const notificadosIds: number[] = [];
  const errores: string[] = [];

  for (const reserva of reservas) {
    if (!reserva.cliente_whatsapp) continue;

    const nombreNegocio = nombreNegocioById[reserva.negocio_id] || "Tu salón";
    const urlNegocio = urlNegocioById[reserva.negocio_id] || "https://tusalon.github.io/";

    // Buscar suscripción push de esta clienta en este negocio
    const subUrl = `${supabaseUrl}/rest/v1/push_suscripciones?negocio_id=eq.${reserva.negocio_id}&cliente_whatsapp=eq.${encodeURIComponent(reserva.cliente_whatsapp)}&activo=eq.true&select=id,endpoint,subscription`;
    const resSubs = await fetch(subUrl, { headers });
    const subs = resSubs.ok ? await resSubs.json() : [];

    if (!subs.length) continue;

    const { title, body: msgBody } = buildMensaje(reserva, nombreNegocio);
    const notification = JSON.stringify({ title, body: msgBody, tag: `recordatorio-${tipo}`, url: urlNegocio });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, notification);
        enviados++;
        notificadosIds.push(reserva.id);
      } catch (err: any) {
        const status = err?.statusCode || 0;
        if (status === 404 || status === 410) {
          await fetch(`${supabaseUrl}/rest/v1/push_suscripciones?id=eq.${sub.id}`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ activo: false }),
          });
        }
        errores.push(`${reserva.cliente_nombre}: ${err?.message}`);
      }
    }
  }

  // Marcar como notificadas para no duplicar
  if (notificadosIds.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/reservas?id=in.(${[...new Set(notificadosIds)].join(",")})`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ [flagCampo]: true }),
    });
  }

  return jsonResponse({ ok: true, tipo, total: reservas.length, enviados, notificados: notificadosIds.length, errores: errores.length ? errores : undefined });
});
