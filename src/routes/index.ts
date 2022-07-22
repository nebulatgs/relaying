import type { RequestHandler } from "@sveltejs/kit";
import * as QRcode from 'qrcode';

export const generateCode = () =>
    [...crypto.getRandomValues(new Uint8Array(4))]
        .map((v) => v.toString(16).padStart(2, '0').toLocaleUpperCase())
        .join('');

export const GET: RequestHandler = async ({ url }) => {
    const code = generateCode();
    const qrData = `${url}device/?code=${code}`;
    const qrCode = await QRcode.toString(qrData, {
        errorCorrectionLevel: 'L',
        type: 'svg',
        margin: 2,
        color: { light: '#fff0', dark: '#0F172A' }
    });
    return {
        body: {
            code,
            qrCode
        }
    }
};