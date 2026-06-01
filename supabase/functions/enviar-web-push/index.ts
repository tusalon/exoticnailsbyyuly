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

function base64UrlEncode(input: ArrayBuffer | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string) {
  const cleanPem = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(cleanPem);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getFirebaseAccessToken(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64UrlEncode(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );
  const assertion = `${unsignedToken}.${base64UrlEncode(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) throw new Error(`Firebase auth fallo: ${await response.text()}`);
  const data = await response.json();
  return data.access_token as string;
}

async function sendFirebaseNotification({
  projectId,
  accessToken,
  token,
  title,
  body,
  url,
  tags,
  data,
}: {
  projectId: string;
  accessToken: string;
  token: string;
  title: string;
  body: string;
  url: string;
  tags: string;
  data: Record<string, unknown>;
}) {
  const stringData: Record<string, string> = {
    url,
    tag: tags,
  };
  Object.entries(data || {}).forEach(([key, value]) => {
    stringData[key] = typeof value === "string" ? value : JSON.stringify(value);
  });

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: stringData,
        android: {
          priority: "HIGH",
          notification: {
            channel_id: "default",
            tag: tags,
          },
        },
      },
    }),
  });

  if (!response.ok) throw new Error(`FCM fallo: ${await response.text()}`);
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Metodo no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@rservasroma.com";
  const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID") || "";
  const firebaseClientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL") || "";
  const firebasePrivateKey = Deno.env.get("FIREBASE_PRIVATE_KEY") || "";

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
  const webSubscriptions = subscriptions.filter((row) => row.subscription?.provider !== "fcm");
  const fcmSubscriptions = subscriptions.filter((row) => row.subscription?.provider === "fcm");

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tags || "rservasroma",
    url: payload.url || "/admin.html",
    data: payload.data || {},
  });

  const webResults = await Promise.allSettled(
    webSubscriptions.map((row) => webpush.sendNotification(row.subscription as any, notification))
  );

  const inactiveIds: string[] = [];
  webResults.forEach((result, index) => {
    if (result.status !== "rejected") return;
    const statusCode = Number(result.reason?.statusCode || 0);
    if (statusCode === 404 || statusCode === 410) inactiveIds.push(webSubscriptions[index].id);
  });

  let fcmResults: PromiseSettledResult<unknown>[] = [];
  let fcmSkipped = fcmSubscriptions.length;
  if (fcmSubscriptions.length > 0 && firebaseProjectId && firebaseClientEmail && firebasePrivateKey) {
    const accessToken = await getFirebaseAccessToken(firebaseClientEmail, firebasePrivateKey);
    fcmSkipped = 0;
    fcmResults = await Promise.allSettled(
      fcmSubscriptions.map((row) => sendFirebaseNotification({
        projectId: firebaseProjectId,
        accessToken,
        token: String(row.subscription.token || ""),
        title: payload.title,
        body: payload.body,
        url: payload.url || "/admin.html",
        tags: payload.tags || "rservasroma",
        data: payload.data || {},
      }))
    );
  }

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
    sent: webResults.filter((result) => result.status === "fulfilled").length +
      fcmResults.filter((result) => result.status === "fulfilled").length,
    web: webSubscriptions.length,
    native: fcmSubscriptions.length,
    native_skipped: fcmSkipped,
    inactive: inactiveIds.length,
  });
});
