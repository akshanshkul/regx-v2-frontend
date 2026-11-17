/**
 * Shrinks an image before it is uploaded.
 *
 * A logo picked straight off a phone is routinely 5–10 MB, which is larger than
 * PHP's post_max_size and far larger than anything a banner needs to be. The
 * browser already has the decoder, so resizing here costs nothing, keeps the
 * upload well inside the server's limits, and means the file S3 stores is the
 * one the page will actually render.
 *
 * Anything that is not a raster image — an SVG, a PDF — is passed straight
 * through, since re-encoding it would destroy it.
 */

/** Defaults suit an event banner; a logo passes smaller bounds. */
const DEFAULTS = {
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 0.85,
    // Below this, re-encoding usually makes the file bigger, not smaller.
    skipUnder: 200 * 1024,
};

const COMPRESSIBLE = ['image/jpeg', 'image/png', 'image/webp'];

export const formatBytes = (bytes) =>
    bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

const loadImage = (file) =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('That file could not be read as an image.'));
        };

        image.src = url;
    });

/**
 * @returns {Promise<File>} The original file when it is already small enough or
 *                          cannot be re-encoded, otherwise a smaller one.
 */
export const compressImage = async (file, options = {}) => {
    const { maxWidth, maxHeight, quality, skipUnder } = { ...DEFAULTS, ...options };

    if (!(file instanceof File) || !COMPRESSIBLE.includes(file.type) || file.size <= skipUnder) {
        return file;
    }

    let image;

    try {
        image = await loadImage(file);
    } catch {
        // Not decodable here — let the server decide what to do with it.
        return file;
    }

    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // PNGs with transparency stay PNG; everything else becomes JPEG, which is
    // where the real saving is.
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));

    if (!blob || blob.size >= file.size) {
        return file;
    }

    const name = file.name.replace(/\.[^.]+$/, '') + (type === 'image/png' ? '.png' : '.jpg');

    return new File([blob], name, { type, lastModified: Date.now() });
};

/**
 * Compresses if it can, then reports anything still too large so the upload is
 * refused here with a clear reason rather than dying mid-flight.
 *
 * @returns {Promise<{file: File, saved: number, error: string|null}>}
 */
export const prepareUpload = async (file, { maxBytes = 8 * 1024 * 1024, ...options } = {}) => {
    if (!file) {
        return { file, saved: 0, error: null };
    }

    const compressed = await compressImage(file, options);

    return {
        file: compressed,
        saved: file.size - compressed.size,
        error:
            compressed.size > maxBytes
                ? `${file.name} is ${formatBytes(compressed.size)} — the limit is ${formatBytes(maxBytes)}.`
                : null,
    };
};
