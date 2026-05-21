// utils/storage.js - Imagenes de servicios en Cloudinary

console.log('storage.js cargado (Cloudinary)');

const CLOUDINARY_MAX_ORIGINAL_MB = 8;
const CLOUDINARY_MAX_DIMENSION = 1200;
const CLOUDINARY_IMAGE_QUALITY = 0.75;

function getCloudinaryConfig() {
    return {
        cloudName: window.CLOUDINARY_CLOUD_NAME || localStorage.getItem('cloudinaryCloudName') || '',
        uploadPreset: window.CLOUDINARY_UPLOAD_PRESET || localStorage.getItem('cloudinaryUploadPreset') || ''
    };
}

function slugArchivoImagen(valor) {
    return String(valor || 'servicio')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'servicio';
}

function cargarImagenEnCanvas(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('No se pudo leer la imagen'));
        };
        image.src = objectUrl;
    });
}

async function comprimirImagenServicio(file) {
    const image = await cargarImagenEnCanvas(file);
    const scale = Math.min(1, CLOUDINARY_MAX_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, width, height);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob || file);
        }, 'image/jpeg', CLOUDINARY_IMAGE_QUALITY);
    });
}

window.subirImagenServicio = async function(file, servicioId) {
    try {
        if (!file) {
            console.error('No se proporciono archivo');
            return null;
        }

        if (!file.type.startsWith('image/')) {
            alert('Solo se permiten archivos de imagen');
            return null;
        }

        if (file.size > CLOUDINARY_MAX_ORIGINAL_MB * 1024 * 1024) {
            alert(`La imagen no puede superar los ${CLOUDINARY_MAX_ORIGINAL_MB}MB`);
            return null;
        }

        const { cloudName, uploadPreset } = getCloudinaryConfig();
        if (!cloudName || !uploadPreset || cloudName.includes('TU_') || uploadPreset.includes('TU_')) {
            alert('Falta configurar Cloudinary: CLOUDINARY_CLOUD_NAME y CLOUDINARY_UPLOAD_PRESET.');
            return null;
        }

        const imagenComprimida = await comprimirImagenServicio(file);
        const formData = new FormData();
        formData.append('file', imagenComprimida, `${slugArchivoImagen(servicioId)}.jpg`);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'servicios');
        formData.append('tags', 'servicio,exoticnailsbyyuly');

        console.log('Subiendo imagen de servicio a Cloudinary');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Error al subir imagen:', error);
            alert('No se pudo subir la imagen a Cloudinary.');
            return null;
        }

        const data = await response.json();
        console.log('Imagen subida:', data.secure_url);

        return {
            url: data.secure_url,
            publicId: data.public_id,
            width: data.width,
            height: data.height,
            bytes: data.bytes
        };
    } catch (error) {
        console.error('Error en subirImagenServicio:', error);
        alert('Error al procesar la imagen.');
        return null;
    }
};

window.eliminarImagenServicio = async function() {
    console.warn('Para borrar imagenes de Cloudinary hace falta una firma segura desde backend.');
    return true;
};

console.log('storage.js funciones Cloudinary disponibles');
