export class EncryptDecrypt {
	private isInitialized = false;
	private key: CryptoKey = new CryptoKey();
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
		const bytes = await crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: this.iv
			},
			this.key,
			this.enc.encode(JSON.stringify(data))
		);
		return new Uint8Array(bytes);
	}

	/**
	 * @param data - ciphertext
	 * @returns decrypted object
	 **/
	public async decrypt<T = unknown>(data: Uint8Array) {
		if (!this.isInitialized) throw new Error('EncDec not initialized');
		const bytes = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: this.iv
			},
			this.key,
			data
		);
		return JSON.parse(this.dec.decode(bytes)) as T;
	}
}

// /**
//  * @param data - object to encrypt
//  * @param key - base64 encoded key in JWK format
//  * @param iv - base64 encoded iv
//  * @returns ciphertext
//  **/
// export async function encryptBase64JSON(data: unknown, key: string, iv: string) {
// 	const bytes = await encryptBase64(JSON.stringify(data), key, iv);
// 	return bytes;
// }

// /**
//  * @param data - string to encrypt
//  * @param key - base64 encoded key in JWK format
//  * @param iv - base64 encoded iv
//  * @returns ciphertext
//  **/
// export async function encryptBase64(data: string, key: string, iv: string) {
// 	const ivDec = atob(iv);
// 	const enc = new TextEncoder();
// 	const cryptoKey = await crypto.subtle.importKey('jwk', JSON.parse(atob(key)), 'AES-GCM', true, [
// 		'encrypt',
// 		'decrypt'
// 	]);
// 	const bytes = await crypto.subtle.encrypt(
// 		{
// 			name: 'AES-GCM',
// 			iv: enc.encode(ivDec)
// 		},
// 		cryptoKey,
// 		enc.encode(data)
// 	);
// 	return new Uint8Array(bytes);
// }

// /**
//  * @param data - ciphertext
//  * @param key - base64 encoded key in JWK format
//  * @param iv - base64 encoded iv
//  * @returns parsed data
//  **/
// export async function decryptBase64JSON<T>(data: Uint8Array, key: string, iv: string) {
// 	const json = await decryptBase64(data, key, iv);
// 	return JSON.parse(json) as T;
// }

// /**
//  * @param data - ciphertext
//  * @param key - base64 encoded key in JWK format
//  * @param iv - base64 encoded iv
//  * @returns parsed data
//  **/
// export async function decryptBase64(data: Uint8Array, key: string, iv: string) {
// 	const ivDec = atob(iv);
// 	const enc = new TextEncoder();
// 	const dec = new TextDecoder();
// 	const cryptoKey = await crypto.subtle.importKey('jwk', JSON.parse(atob(key)), 'AES-GCM', true, [
// 		'encrypt',
// 		'decrypt'
// 	]);
// 	const bytes = await crypto.subtle.decrypt(
// 		{
// 			name: 'AES-GCM',
// 			iv: enc.encode(ivDec)
// 		},
// 		cryptoKey,
// 		data
// 	);
// 	return dec.decode(bytes);
// }
