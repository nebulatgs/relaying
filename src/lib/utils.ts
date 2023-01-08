import type { NatsConnection } from 'nats.ws';

export class EncryptDecrypt {
	private isInitialized = false;
	private key?: CryptoKey;
	private iv: Uint8Array = new Uint8Array(12);
	private enc = new TextEncoder();
	private dec = new TextDecoder();

	/**
	 * @param key - base64 encoded key in JWK format
	 * @param iv - base64 encoded iv
	 **/
	public async init(key: string, iv: string) {
		if (this.isInitialized) return;

		// Base64 decode the key and convert it to a CryptoKey (importing from JWK format)
		this.key = await crypto.subtle.importKey('jwk', JSON.parse(atob(key)), 'AES-GCM', true, [
			'encrypt',
			'decrypt'
		]);

		// Base64 decode the IV and convert it to a Uint8Array
		this.iv = this.enc.encode(atob(iv));
		this.isInitialized = true;
	}

	/**
	 * @param data - object to encrypt
	 * @returns ciphertext
	 **/
	public async encrypt(data: unknown) {
		if (!this.isInitialized) throw new Error('EncDec not initialized');

		// Encrypt the data
		const bytes = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: this.iv
			},
			this.key!,

			// Get a binary representation of the data (JSON encoded)
			this.enc.encode(JSON.stringify(data))
		);

		// Return the ciphertext as a Uint8Array
		return new Uint8Array(bytes);
	}

	/**
	 * @param data - ciphertext
	 * @returns decrypted object
	 **/
	public async decrypt<T = unknown>(data: Uint8Array) {
		if (!this.isInitialized) throw new Error('EncDec not initialized');

		// Decrypt the ciphertext
		const bytes = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: this.iv
			},
			this.key!,
			data
		);

		// Return the decrypted data as an object
		return JSON.parse(this.dec.decode(bytes)) as T;
	}
}

export function natsOnce<T = unknown>(nc: NatsConnection, c: EncryptDecrypt, subject: string) {
	return new Promise<T>((res, rej) => {
		const sub = nc.subscribe(subject, {
			callback: async (err, msg) => {
				if (err) {
					rej(err);
					return;
				}
				const answer = await c.decrypt<T>(msg.data);
				res(answer);
			}
		});
		sub.unsubscribe(1);
	});
}
