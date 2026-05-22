// utils/hero-backgrounds.js - Opciones de fondo para la app de clientes

(function() {
    const DEFAULT_HERO_BACKGROUND = 'unas';

    const HERO_BACKGROUND_OPTIONS = [
        {
            id: 'unas',
            label: 'Manicurista / unas',
            description: 'Ideal para estudios de unas y nail art.',
            image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=2071&auto=format&fit=crop'
        },
        {
            id: 'belleza',
            label: 'Salon de belleza',
            description: 'Para salones generales, spa y estetica.',
            image: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?q=80&w=2070&auto=format&fit=crop'
        },
        {
            id: 'barberia',
            label: 'Barberia',
            description: 'Para barberias y servicios masculinos.',
            image: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?q=80&w=2070&auto=format&fit=crop'
        },
        {
            id: 'peluqueria',
            label: 'Salon de peluqueria',
            description: 'Para cortes, color, peinados y tratamientos.',
            image: 'https://images.unsplash.com/photo-1701976333339-1d41dad8138b?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&w=2070&auto=format&fit=crop'
        },
        {
            id: 'lashes',
            label: 'Salon de lashes',
            description: 'Para pestanas, cejas y mirada.',
            image: 'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&w=2070&auto=format&fit=crop'
        }
    ];

    function getHeroBackgroundOption(id) {
        const normalizedId = String(id || DEFAULT_HERO_BACKGROUND).trim().toLowerCase();
        return HERO_BACKGROUND_OPTIONS.find(option => option.id === normalizedId) || HERO_BACKGROUND_OPTIONS[0];
    }

    window.DEFAULT_HERO_BACKGROUND = DEFAULT_HERO_BACKGROUND;
    window.HERO_BACKGROUND_OPTIONS = HERO_BACKGROUND_OPTIONS;
    window.getHeroBackgroundOption = getHeroBackgroundOption;
})();
