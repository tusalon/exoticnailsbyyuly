-- Web Push opcional para RservasRoma.
-- Guarda suscripciones web y tokens nativos APK por dispositivo sin afectar ntfy ni WhatsApp.
--
-- Para APK Android con Firebase, agrega tambien estos secretos en Supabase Edge Functions:
-- FIREBASE_PROJECT_ID
-- FIREBASE_CLIENT_EMAIL
-- FIREBASE_PRIVATE_KEY
--
-- En GitHub Actions agrega el secreto ANDROID_GOOGLE_SERVICES_JSON con el contenido completo
-- del archivo android/app/google-services.json de Firebase.

create table if not exists public.push_suscripciones (
    id uuid primary key default gen_random_uuid(),
    negocio_id uuid not null references public.negocios(id) on delete cascade,
    role text not null default 'admin',
    endpoint text not null unique,
    subscription jsonb not null,
    user_agent text,
    activo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists push_suscripciones_negocio_role_idx
on public.push_suscripciones (negocio_id, role, activo);

alter table public.push_suscripciones enable row level security;

drop policy if exists "push_suscripciones_insert_public" on public.push_suscripciones;
create policy "push_suscripciones_insert_public"
on public.push_suscripciones for insert
with check (true);

drop policy if exists "push_suscripciones_update_public" on public.push_suscripciones;
create policy "push_suscripciones_update_public"
on public.push_suscripciones for update
using (true)
with check (true);
