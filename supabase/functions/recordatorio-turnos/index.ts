// recordatorio-turnos — envía push al admin con los turnos de HOY
// Diseñado para correr a las 8 AM hora Cuba (12:00 UTC)
// Si corre tarde o varias veces no importa — usa push_recordatorio_enviado para no duplicar
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

function fechaHoy(): string {
  // Hora Cuba (UTC-4)
  const now = new Date();
  now.setHours(now.getHours() - 4);
  return now.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl  = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const vapidPublic  = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@rservasroma.com";

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return jsonResponse({ error: "Variables de entorno no configuradas" }, 503);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const body = await req.json().catch(() => ({}));
  const negocioFiltro = body?.negocio_id || null;
  const hoy = fechaHoy();

  // Buscar turnos de HOY que aún NO fueron notificados
  let url = `${supabaseUrl}/rest/v1/reservas?fecha=eq.${hoy}&estado=neq.Cancelado&push_recordatorio_enviado=eq.false&select=id,negocio_id,cliente_nombre,cliente_whatsapp,servicio,hora_inicio`;
  if (negocioFiltro) url += `&negocio_id=eq.${negocioFiltro}`;

  const resReservas = await fetch(url, { headers });
  if (!resReservas.ok) return jsonResponse({ error: "Error consultando reservas" }, 500);
  const reservas = await resReservas.json();

  if (!reservas.length) {
    return jsonResponse({ ok: true, fecha: hoy, enviados: 0, mensaje: "Sin turnos pendientes de notificar" });
  }

  // Agrupar por negocio
  const porNegocio: Record<string, typeof reservas> = {};
  for (const r of reservas) {
    if (!porNegocio[r.negocio_id]) porNegocio[r.negocio_id] = [];
    porNegocio[r.negocio_id].push(r);
  }

  let enviados = 0;
  let sinSuscripcion = 0;
  const notificadosIds: number[] = [];
  const errores: string[] = [];

  for (const [negocioId, turnos] of Object.entries(porNegocio)) {
    // Suscripciones del admin de ese negocio
    const subUrl = `${supabaseUrl}/rest/v1/push_suscripciones?negocio_id=eq.${negocioId}&role=eq.admin&activo=eq.true&select=id,endpoint,subscription`;
    const resSubs = await fetch(subUrl, { headers });
    if (!resSubs.ok) { errores.push(`Error suscripcion admin ${negocioId}`); continue; }
    const subs = await resSubs.json();

    if (!subs.length) { sinSuscripcion += turnos.length; continue; }

    // Construir mensaje con todos los turnos del día
    const lineas = turnos
      .sort((a: any, b: any) => a.hora_inicio.localeCompare(b.hora_inicio))
      .map((r: any) => {
        const [h, m] = r.hora_inicio.split(":").map(Number);
        const hora12 = `${h > 12 ? h - 12 : h || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
        return `• ${hora12} — ${r.cliente_nombre}`;
      });

    const notification = JSON.stringify({
      title: `📅 Hoy tienes ${turnos.length} turno${turnos.length > 1 ? "s" : ""}`,
      body: lineas.join("\n"),
      tag: "recordatorio-admin",
      url: "/admin.html",
    });

    let envioParcial = false;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, notification);
        enviados++;
        envioParcial = true;
      } catch (err: any) {
        const status = err?.statusCode || 0;
        if (status === 404 || status === 410) {
          await fetch(`${supabaseUrl}/rest/v1/push_suscripciones?id=eq.${sub.id}`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ activo: false }),
          });
        }
        errores.push(`Admin ${negocioId}: ${err?.message}`);
      }
    }

    // Marcar como notificados si se envió al menos una vez
    if (envioParcial) {
      const ids = turnos.map((r: any) => r.id);
      notificadosIds.push(...ids);
    }
  }

  // Marcar reservas como notificadas para evitar duplicados
  if (notificadosIds.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/reservas?id=in.(${notificadosIds.join(",")})`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ push_recordatorio_enviado: true }),
    });
  }

  return jsonResponse({
    ok: true,
    fecha: hoy,
    total_reservas: reservas.length,
    enviados,
    sin_suscripcion: sinSuscripcion,
    notificados: notificadosIds,
    errores: errores.length ? errores : undefined,
  });
});
