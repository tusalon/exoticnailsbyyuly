// utils/offline-panel.js - Cache local de turnos y panel sin conexion.

(function() {
    const STORAGE_KEY = 'rservas_offline_data';

    function getNegocioIdOffline() {
        return localStorage.getItem('negocioId') ||
            window.NEGOCIO_ID_POR_DEFECTO ||
            (typeof window.getNegocioIdFromConfig === 'function' ? window.getNegocioIdFromConfig() : '') ||
            '';
    }

    function pad(value) {
        return String(value).padStart(2, '0');
    }

    function toDateKey(date) {
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    function addDays(date, days) {
        const copy = new Date(date);
        copy.setDate(copy.getDate() + days);
        return copy;
    }

    function todayKey() {
        return toDateKey(new Date());
    }

    function maxDateKey() {
        return toDateKey(addDays(new Date(), 7));
    }

    function sortBookings(a, b) {
        return `${a.fecha} ${a.hora_inicio || ''}`.localeCompare(`${b.fecha} ${b.hora_inicio || ''}`);
    }

    function normalizeBooking(booking = {}) {
        return {
            cliente_nombre: booking.cliente_nombre || booking.cliente || 'Cliente',
            fecha: booking.fecha || '',
            hora_inicio: booking.hora_inicio || '',
            hora_fin: booking.hora_fin || '',
            servicio: booking.servicio || 'Servicio',
            profesional_nombre: booking.profesional_nombre || booking.trabajador_nombre || booking.barbero_nombre || 'Profesional'
        };
    }

    function filterUpcoming(bookings = []) {
        const start = todayKey();
        const end = maxDateKey();
        return (bookings || [])
            .filter(booking => booking?.fecha >= start && booking?.fecha <= end)
            .map(normalizeBooking)
            .sort(sortBookings);
    }

    function saveOfflineData(bookings = []) {
        try {
            const payload = {
                negocio_id: getNegocioIdOffline(),
                synced_at: new Date().toISOString(),
                bookings: filterUpcoming(bookings)
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            return payload;
        } catch (error) {
            console.warn('No se pudo guardar el panel offline:', error);
            return null;
        }
    }

    function loadOfflineData() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        } catch {
            return null;
        }
    }

    async function isOnline() {
        if (!navigator.onLine) return false;
        if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return true;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        try {
            const response = await fetch(`${window.SUPABASE_URL}/rest/v1/negocios?select=id&limit=1`, {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal,
                headers: {
                    apikey: window.SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`
                }
            });
            return response.ok;
        } catch {
            return false;
        } finally {
            clearTimeout(timer);
        }
    }

    async function redirectIfOffline() {
        const online = await isOnline();
        const alreadyOfflinePanel = /offline-panel\.html$/i.test(window.location.pathname);
        if (!online && !alreadyOfflinePanel) {
            goToOfflinePanel();
            return true;
        }
        return false;
    }

    function goToOfflinePanel() {
        if (/offline-panel\.html$/i.test(window.location.pathname)) return;
        window.location.href = new URL('offline-panel.html', window.location.href).href;
    }

    function enableAutoRedirect() {
        window.addEventListener('offline', goToOfflinePanel);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !navigator.onLine) goToOfflinePanel();
        });
        window.addEventListener('pageshow', () => {
            if (!navigator.onLine) goToOfflinePanel();
        });
    }

    async function syncFromSupabase() {
        const negocioId = getNegocioIdOffline();
        if (!negocioId || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;
        if (!(await isOnline())) return null;

        const url = `${window.SUPABASE_URL}/rest/v1/reservas?negocio_id=eq.${negocioId}&fecha=gte.${todayKey()}&fecha=lte.${maxDateKey()}&select=cliente_nombre,fecha,hora_inicio,hora_fin,servicio,profesional_nombre,trabajador_nombre,barbero_nombre&order=fecha.asc,hora_inicio.asc`;
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                apikey: window.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        if (!response.ok) return null;
        return saveOfflineData(await response.json());
    }

    function formatTime(value) {
        if (!value) return '';
        if (window.formatTo12Hour) return window.formatTo12Hour(value);
        const [hourRaw, minute = '00'] = String(value).split(':');
        const hour = Number(hourRaw);
        if (!Number.isFinite(hour)) return value;
        const suffix = hour >= 12 ? 'PM' : 'AM';
        const normalized = hour % 12 || 12;
        return `${normalized}:${minute} ${suffix}`;
    }

    function formatDateTitle(dateKey) {
        const [year, month, day] = String(dateKey).split('-').map(Number);
        const date = new Date(year, (month || 1) - 1, day || 1);
        return date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
    }

    function relativeDayLabel(dateKey) {
        const today = todayKey();
        const tomorrow = toDateKey(addDays(new Date(), 1));
        const afterTomorrow = toDateKey(addDays(new Date(), 2));
        if (dateKey === today) return 'Hoy';
        if (dateKey === tomorrow) return 'Mañana';
        if (dateKey === afterTomorrow) return 'Pasado mañana';
        return formatDateTitle(dateKey);
    }

    function formatSyncDate(iso) {
        if (!iso) return 'sin fecha de sincronizacion';
        const date = new Date(iso);
        return `Datos del ${date.toLocaleDateString('es')} a las ${date.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' })}`;
    }

    function bookingCard(booking) {
        const hora = `${formatTime(booking.hora_inicio)}${booking.hora_fin ? ` - ${formatTime(booking.hora_fin)}` : ''}`;
        return `
            <article class="offline-card">
                <div class="offline-time">${hora}</div>
                <div class="offline-main">
                    <strong>${escapeHtml(booking.cliente_nombre)}</strong>
                    <span>${escapeHtml(booking.servicio)}</span>
                    <small>${escapeHtml(booking.profesional_nombre)}</small>
                </div>
            </article>
        `;
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[char]));
    }

    function renderOfflinePanel() {
        const root = document.getElementById('offline-root');
        if (!root) return;

        const data = loadOfflineData();
        const bookings = Array.isArray(data?.bookings) ? data.bookings : [];
        if (!bookings.length) {
            root.innerHTML = `
                <main class="offline-shell">
                    <section class="offline-empty">
                        <h1>📋 Modo sin conexión</h1>
                        <p>No hay datos guardados. Abre la app con internet al menos una vez para habilitar el modo offline.</p>
                    </section>
                </main>
            `;
            return;
        }

        const today = todayKey();
        const todaysBookings = bookings.filter(booking => booking.fecha === today);
        const weekBookings = bookings.filter(booking => booking.fecha > today);
        const grouped = weekBookings.reduce((acc, booking) => {
            if (!acc[booking.fecha]) acc[booking.fecha] = [];
            acc[booking.fecha].push(booking);
            return acc;
        }, {});

        root.innerHTML = `
            <main class="offline-shell">
                <header class="offline-header">
                    <p class="offline-kicker">Panel guardado</p>
                    <h1>📋 Modo sin conexión</h1>
                    <p>${formatSyncDate(data.synced_at)}</p>
                </header>

                <section class="offline-section">
                    <h2>Hoy</h2>
                    ${todaysBookings.length ? todaysBookings.map(bookingCard).join('') : '<p class="offline-muted">No hay turnos guardados para hoy.</p>'}
                </section>

                <section class="offline-section">
                    <h2>Esta semana</h2>
                    ${Object.keys(grouped).sort().length ? Object.keys(grouped).sort().map(dateKey => `
                        <div class="offline-day">
                            <h3>${relativeDayLabel(dateKey)}</h3>
                            ${grouped[dateKey].map(bookingCard).join('')}
                        </div>
                    `).join('') : '<p class="offline-muted">No hay turnos guardados para los proximos dias.</p>'}
                </section>
            </main>
        `;
    }

    window.RservasOffline = {
        STORAGE_KEY,
        saveOfflineData,
        loadOfflineData,
        syncFromBookings: saveOfflineData,
        syncFromSupabase,
        redirectIfOffline,
        enableAutoRedirect,
        renderOfflinePanel,
        isOnline
    };

    enableAutoRedirect();
})();
