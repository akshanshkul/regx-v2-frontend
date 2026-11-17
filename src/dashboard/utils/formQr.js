/**
 * A form's link as a QR code image with "RegX" in the middle.
 *
 * Drawn on a canvas and saved as a PNG. The highest error-correction level is
 * used so the logo covering the centre still scans.
 */
export const downloadFormQr = async (url, name = 'form') => {
    const QRCode = (await import('qrcode')).default;

    const size = 1024;
    const canvas = document.createElement('canvas');

    await QRCode.toCanvas(canvas, url, {
        errorCorrectionLevel: 'H',
        width: size,
        margin: 4,
        color: { dark: '#111315', light: '#FFFFFF' },
    });

    const ctx = canvas.getContext('2d');
    const box = Math.round(size * 0.24);
    const x = (size - box) / 2;

    // A white plate with a thin border, then the wordmark on it.
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#E7E3DC';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(x, x, box, box, 28);
    ctx.fill();
    ctx.stroke();

    const font = `700 ${Math.round(box * 0.34)}px "Space Grotesk", "DM Sans", Arial, sans-serif`;
    ctx.font = font;
    ctx.textBaseline = 'middle';

    const reg = 'Reg';
    const mark = 'X';
    const total = ctx.measureText(reg).width + ctx.measureText(mark).width;
    let cursor = (size - total) / 2;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#111315';
    ctx.fillText(reg, cursor, size / 2 + 2);
    cursor += ctx.measureText(reg).width;
    ctx.fillStyle = '#EC4D2D';
    ctx.fillText(mark, cursor, size / 2 + 2);

    const link = document.createElement('a');

    link.href = canvas.toDataURL('image/png');
    link.download = `${String(name).replace(/[^\w.-]+/g, '_')}-qr.png`;
    link.click();
};
