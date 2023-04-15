import * as QRcode from 'qrcode';
import type { PageServerLoad } from './$types';

export const generateCode = () =>
	[...crypto.getRandomValues(new Uint8Array(4))]
		.map((v) => v.toString(16).padStart(2, '0').toLocaleUpperCase())
		.join('');

const generateKey = async () =>
	btoa(
		JSON.stringify(
			await crypto.subtle.exportKey(
				'jwk',
				await crypto.subtle.generateKey(
					{
						name: 'AES-GCM',
						length: 256
					},
					true,
					['encrypt', 'decrypt']
				)
			)
		)
	);

const generateIv = async () => btoa(generateCode());

export const load: PageServerLoad = async ({ url }) => {
	const code = await generateKey();
	const iv = await generateIv();
	const qrData = `${url}device/?code=${code}&iv=${iv}`;
	const qrCode = await QRcode.toString(qrData, {
		errorCorrectionLevel: 'L',
		type: 'svg',
		margin: 2,
		color: { light: '#fff0', dark: '#0F172A' }
	});
	return {
		code,
		iv,
		qrCode
	};
};
