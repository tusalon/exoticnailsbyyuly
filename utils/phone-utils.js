// utils/phone-utils.js - Normalizacion internacional de telefonos

(function() {
    const DEFAULT_COUNTRY_CODE = '53';
    const COUNTRIES = [
        { id: 'CU', nombre: 'Cuba',      bandera: '\uD83C\uDDE8\uD83C\uDDFA', codigo: '53',  ejemplo: '53066647',    localLength: 8  },
        { id: 'ES', nombre: 'Espana',     bandera: '\uD83C\uDDEA\uD83C\uDDF8', codigo: '34',  ejemplo: '612345678',   localLength: 9  },
        { id: 'MX', nombre: 'Mexico',     bandera: '\uD83C\uDDF2\uD83C\uDDFD', codigo: '52',  ejemplo: '5512345678',  localLength: 10 },
        { id: 'US', nombre: 'USA',        bandera: '\uD83C\uDDFA\uD83C\uDDF8', codigo: '1',   ejemplo: '3055551234',  localLength: 10 },
        { id: 'RU', nombre: 'Rusia',      bandera: '\uD83C\uDDF7\uD83C\uDDFA', codigo: '7',   ejemplo: '9123456789',  localLength: 10 },
        { id: 'VE', nombre: 'Venezuela',  bandera: '\uD83C\uDDFB\uD83C\uDDEA', codigo: '58',  ejemplo: '4121234567',  localLength: 10 },
        { id: 'CO', nombre: 'Colombia',   bandera: '\uD83C\uDDE8\uD83C\uDDF4', codigo: '57',  ejemplo: '3001234567',  localLength: 10 },
        { id: 'GY', nombre: 'Guyana',     bandera: '\uD83C\uDDEC\uD83C\uDDFE', codigo: '592', ejemplo: '6123456',     localLength: 7  },
        { id: 'VN', nombre: 'Vietnam',    bandera: '\uD83C\uDDFB\uD83C\uDDF3', codigo: '84',  ejemplo: '912345678',   localLength: 9  },
        { id: 'AR', nombre: 'Argentina',  bandera: '\uD83C\uDDE6\uD83C\uDDF7', codigo: '54',  ejemplo: '91123456789', localLength: 10 },
        { id: 'PE', nombre: 'Peru',       bandera: '\uD83C\uDDF5\uD83C\uDDEA', codigo: '51',  ejemplo: '912345678',   localLength: 9  },
        { id: 'CL', nombre: 'Chile',      bandera: '\uD83C\uDDE8\uD83C\uDDF1', codigo: '56',  ejemplo: '912345678',   localLength: 9  },
        { id: 'EC', nombre: 'Ecuador',    bandera: '\uD83C\uDDEA\uD83C\uDDE8', codigo: '593', ejemplo: '991234567',   localLength: 9  },
        { id: 'PT', nombre: 'Portugal',   bandera: '\uD83C\uDDF5\uD83C\uDDF9', codigo: '351', ejemplo: '912345678',   localLength: 9  },
        { id: 'IT', nombre: 'Italia',     bandera: '\uD83C\uDDEE\uD83C\uDDF9', codigo: '39',  ejemplo: '3123456789',  localLength: 10 },
        { id: 'FR', nombre: 'Francia',    bandera: '\uD83C\uDDEB\uD83C\uDDF7', codigo: '33',  ejemplo: '612345678',   localLength: 9  },
        { id: 'CN', nombre: 'China',      bandera: '\uD83C\uDDE8\uD83C\uDDF3', codigo: '86',  ejemplo: '13123456789', localLength: 11 },
        { id: 'DE', nombre: 'Alemania',   bandera: '\uD83C\uDDE9\uD83C\uDDEA', codigo: '49',  ejemplo: '15123456789', localLength: 11 }
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

        const codigoExplicito = codigoPais !== null && codigoPais !== undefined && String(codigoPais).trim() !== '';
        const country = getCountryByCode(codigoPais || getCodigoPaisTelefono());
        const longitudInternacionalEsperada = country.codigo.length + country.localLength;

        if (!codigoExplicito && digits.startsWith(country.codigo) && digits.length >= longitudInternacionalEsperada) {
            return digits.slice(country.codigo.length);
        }

        return digits;
    }

    function normalizarTelefonoInternacional(value, codigoPais = null) {
        const digits = onlyDigits(value);
        const codigoExplicito = codigoPais !== null && codigoPais !== undefined && String(codigoPais).trim() !== '';

        if (!codigoExplicito) {
            const telefonoInternacional = detectarTelefonoInternacional(digits);
            if (telefonoInternacional) return digits;
        }

        const country = getCountryByCode(codigoPais || getCodigoPaisTelefono());
        if (codigoExplicito && digits.startsWith(country.codigo) && digits.length > country.localLength) {
            return digits;
        }

        if (codigoExplicito) {
            const otroPais = detectarTelefonoInternacional(digits);
            if (otroPais && otroPais.codigo !== country.codigo) return digits;
        }

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
    window.detectarPaisTelefono = (value) => detectarTelefonoInternacional(onlyDigits(value));
    window.getPhoneCountryConfig = (config = null) => getCountryByCode(getCodigoPaisTelefono(config));
    window.getCodigoPaisTelefono = getCodigoPaisTelefono;
    window.setCodigoPaisTelefono = setCodigoPaisTelefono;
    window.normalizarTelefonoLocal = normalizarTelefonoLocal;
    window.normalizarTelefonoInternacional = normalizarTelefonoInternacional;
    window.formatearTelefono = formatearTelefono;

    console.log('phone-utils.js cargado');
})();
