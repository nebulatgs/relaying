<script lang="ts">
	import { EncryptDecrypt } from '$lib/utils';
	import type { NatsConnection } from 'nats.ws';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let video: HTMLVideoElement;
	let connected = false;
	let nc: NatsConnection | null = null;

	onMount(async () => {
		const c = new EncryptDecrypt();
		await c.init(data.code, data.iv);

		const pc = new RTCPeerConnection({
			iceServers: [
				{
					urls: 'stun:stun.l.google.com:19302'
				}
			]
		});
		// const enc = new TextEncoder();
		// const dec = new TextDecoder();
		// const key = await crypto.subtle.importKey('jwk', JSON.parse(atob(data.code)), 'AES-GCM', true, [
		// 	'encrypt',
		// 	'decrypt'
		// ]);
		await pc.setLocalDescription(await pc.createOffer());

		const { connect } = await import('nats.ws');
		nc = await connect({
			servers: 'wss://demo.nats.io:8443'
		});

		const iv = atob(data.iv);
		nc.subscribe('relaying.offer', {
			callback: async (err, msg) => {
				// const offer = JSON.parse(
				// 	dec.decode(
				// 		await crypto.subtle.decrypt({ name: 'AES-GCM', iv: enc.encode(iv) }, key, msg.data)
				// 	)
				// );
				// console.log(offer);
				const offer = await c.decrypt<RTCSessionDescriptionInit>(msg.data);
				await pc.setRemoteDescription(new RTCSessionDescription(offer));
				await pc.setLocalDescription(await pc.createAnswer());
				nc!.publish(
					'relaying.answer',
					// new Uint8Array(
					// 	await crypto.subtle.encrypt(
					// 		{ name: 'AES-GCM', iv: enc.encode(iv) },
					// 		key,
					// 		enc.encode(JSON.stringify(pc.localDescription))
					// 	)
					// )
					await c.encrypt(pc.localDescription)
				);
			}
		});

		// pc.onnegotiationneeded = async () => {
		// 	try {
		// 		await pc.setLocalDescription(await pc.createOffer());
		// 		// Send the offer to the other peer.
		// 		offer = JSON.stringify(pc.localDescription);
		// 	} catch (err) {
		// 		console.error(err);
		// 	}
		// };
		pc.onicecandidate = async (a) => {
			console.log(a);
		};
		// const { default: SimplePeer } = await import('simple-peer');
		// peer = new SimplePeer({ initiator: true });
		// peer.on('signal', (data) => {
		// 	offer = JSON.stringify(data);
		// });
		// peer.on('error', (err) => {
		// 	console.log(err);
		// });
		// const onCall = (conn: MediaConnection) => {
		// 	conn.answer();
		// 	console.log(conn);
		// 	conn.on('iceStateChanged', (state) => (state === 'disconnected' ? location.reload() : null));
		// 	conn.on('stream', (stream) => {
		// 		connected = true;
		// 		video.srcObject = stream;
		// 	});
		// };
		// peer.
	});
</script>

<div class="h-screen w-full flex flex-wrap justify-evenly items-center">
	{#if !connected}
		<h1 class="font-mono text-7xl lg:text-9xl tracking-wide text-slate-700 ">
			{data.code}
		</h1>
		<h1 class="font-mono text-7xl lg:text-9xl tracking-wide text-slate-700 ">
			{data.iv}
		</h1>
		<div class="w-3/4 sm:w-[unset] sm:h-1/2 aspect-square bg-stone-200 rounded-md">
			{@html data.qrCode}
			<!-- <pre>{offer}</pre> -->
		</div>
	{/if}

	<video
		autoplay
		playsinline
		bind:this={video}
		class={connected ? 'absolute top-0 left-0 w-full h-full object-cover' : 'hidden'}
	/>
</div>
