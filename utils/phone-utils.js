// utils/phone-utils.js - Normalizacion internacional de telefonos

(function() {
    const DEFAULT_COUNTRY_CODE = '53';
    const COUNTRIES = [
        { id: 'CU', nombre: 'Cuba', bandera: '🇨🇺', codigo: '53', ejemplo: '53066647', localLength: 8 },
        { id: 'ES', nombre: 'Espana', bandera: '🇪🇸', codigo: '34', ejemplo: '612345678', localLength: 9 },
        { id: 'MX', nombre: 'Mexico', bandera: '🇲🇽', codigo: '52', ejemplo: '5512345678', localLength: 10 },
        { id: 'US', nombre: 'USA', bandera: '🇺🇸', codigo: '1', ejemplo: '3055551234', localLength: 10 },
        { id: 'VE', nombre: 'Venezuela', bandera: '🇻🇪', codigo: '58', ejemplo: '4121234567', localLength: 10 },
        { id: 'CO', nombre: 'Colombia', bandera: '🇨🇴', codigo: '57', ejemplo: '3001234567', localLength: 10 },
        { id: 'GY', nombre: 'Guyana', bandera: '🇬🇾', codigo: '592', ejemplo: '6123456', localLength: 7 }
    ];

    const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

    function normalizarCodigoPais(value) {
        const digits = onlyDigits(value);
        return digits || DEFAULT_COUNTRY_CODE;
    }

    function getCountryByCode(code) {
        const codigo = normalizarCodigoPais(code);
        return COUNTRIES.find(country => country.codigo === codigo) || {
            id: 'OTRO',
            nombre: `+${codigo}`,
            codigo,
            ejemplo: '',
            localLength: 8
        };
    }

    function detectarTelefonoInternacional(digits) {
        return COUNTRIES
            .slice()
            .sort((a, b) => b.codigo.length - a.codigo.length)
            .find(country => digits.startsWith(country.codigo) && digits.length > country.localLength);
    }

    function getStorageKey() {
        const negocioId = (typeof window.getNegocioId === 'function' && window.getNegocioId()) ||
            window.NEGOCIO_ID_POR_DEFECTO ||
            localStorage.getItem('negocioId') ||
            'default';
        return `codigoPaisTelefono:${negocioId}`;
    }

    function getCodigoPaisTelefono(config = null) {
        const rawConfig = config?.codigo_pais || config?.codigo_pais_telefono || config?.codigo_telefono;
        if (rawConfig) return normalizarCodigoPais(rawConfig);
        return normalizarCodigoPais(localStorage.getItem(getStorageKey()) || DEFAULT_COUNTRY_CODE);
    }

    function setCodigoPaisTelefono(code) {
        const codigo = normalizarCodigoPais(code);
        localStorage.setItem(getStorageKey(), codigo);
        return codigo;
    }

    function normalizarTelefonoLocal(value, codigoPais = null) {
        const digits = onlyDigits(value);
        if (!digits) return '';

        const country = getCountryByCode(codigoPais || getCodigoPaisTelefono());
        if (digits.startsWith(country.codigo) && digits.length > country.localLength) {
            return digits.slice(country.codigo.length);
        }

        return digits;
    }

    function normalizarTelefonoInternacional(value, codigoPais = null) {
        const digits = onlyDigits(value);
        const telefonoInternacional = detectarTelefonoInternacional(digits);
        if (telefonoInternacional) return digits;

        const country = getCountryByCode(codigoPais || getCodigoPaisTelefono());
        const local = normalizarTelefonoLocal(digits, country.codigo);
        return local ? `${country.codigo}${local}` : '';
    }

    function formatearTelefono(value, codigoPais = null) {
        const country = getCountryByCode(codigoPais || getCodigoPaisTelefono());
        const local = normalizarTelefonoLocal(value, country.codigo);
        return local ? `+${country.codigo} ${local}` : `+${country.codigo}`;
    }

    window.PHONE_COUNTRIES = COUNTRIES;
    window.DEFAULT_PHONE_COUNTRY_CODE = DEFAULT_COUNTRY_CODE;
    window.onlyPhoneDigits = onlyDigits;
    window.getPhoneCountryConfig = (config = null) => getCountryByCode(getCodigoPaisTelefono(config));
    window.getCodigoPaisTelefono = getCodigoPaisTelefono;
    window.setCodigoPaisTelefono = setCodigoPaisTelefono;
    window.normalizarTelefonoLocal = normalizarTelefonoLocal;
    window.normalizarTelefonoInternacional = normalizarTelefonoInternacional;
    window.formatearTelefono = formatearTelefono;

    console.log('phone-utils.js cargado');
})();
