import webpush from "npm:web-push@3.6.7";

type PushRow = {
  id: string;
  endpoint: string;
  subscription: Record<string, unknown>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metodo no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@rservasroma.com";

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: "Web Push no configurado en variables de entorno" }, 503);
  }

  const payload = await req.json().catch(() => null);
  if (!payload?.negocio_id || !payload?.title || !payload?.body) {
    return jsonResponse({ error: "Faltan negocio_id, title o body" }, 400);
  }

  const role = payload.role || "admin";
  const selectUrl = new URL(`${supabaseUrl}/rest/v1/push_suscripciones`);
  selectUrl.searchParams.set("negocio_id", `eq.${payload.negocio_id}`);
  selectUrl.searchParams.set("role", `eq.${role}`);
  selectUrl.searchParams.set("activo", "eq.true");
  selectUrl.searchParams.set("select", "id,endpoint,subscription");

  const subscriptionsResponse = await fetch(selectUrl, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!subscriptionsResponse.ok) {
    return jsonResponse({ error: await subscriptionsResponse.text() }, 500);
  }

  const subscriptions = await subscriptionsResponse.json() as PushRow[];
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tags || "rservasroma",
    url: payload.url || "/admin.html",
    data: payload.data || {},
  });

  const results = await Promise.allSettled(
    subscriptions.map((row) => webpush.sendNotification(row.subscription as any, notification))
  );

  const inactiveIds: string[] = [];
  results.forEach((result, index) => {
    if (result.status !== "rejected") return;
    const statusCode = Number(result.reason?.statusCode || 0);
    if (statusCode === 404 || statusCode === 410) inactiveIds.push(subscriptions[index].id);
  });

  if (inactiveIds.length > 0) {
    await fetch(`${supabaseUrl}/rest/v1/push_suscripciones?id=in.(${inactiveIds.join(",")})`, {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ activo: false, updated_at: new Date().toISOString() }),
    });
  }

  return jsonResponse({
    ok: true,
    total: subscriptions.length,
    sent: results.filter((result) => result.status === "fulfilled").length,
    inactive: inactiveIds.length,
  });
});
