<script lang="ts">
	import { page } from '$app/stores';
	import { EncryptDecrypt } from '$lib/utils';
	import type { NatsConnection } from 'nats.ws';
	import { onMount } from 'svelte';

	enum State {
		Start = 'start',
		Connecting = 'connecting',
		Connected = 'connected',
		Disconnected = 'disconnected'
	}

	interface Resolution {
		width: number;
		height: number;
		name?: string;
	}

	let code: string = $page.url.searchParams.get('code') ?? '';
	let iv: string = $page.url.searchParams.get('iv') ?? '';
	let devices: MediaDeviceInfo[] = [];
	let deviceIndex = 0;
	let resolutionIndex = 3;
	let nc: NatsConnection | null = null;
	let state = State.Start;

	const errors = {
		resolution: 'The specified resolution is unavailable',
		connection: 'Connection failed'
	};

	const resolutions: Resolution[] = [
		{ width: 3840, height: 2160, name: '4K' },
		{ width: 2560, height: 1440, name: '2K' },
		{ width: 1920, height: 1080, name: 'Full HD' },
		{ width: 1280, height: 720, name: 'HD' },
		{ width: 854, height: 480 },
		{ width: 640, height: 360 },
		{ width: 426, height: 240 }
	];
	onMount(async () => {
		await navigator.mediaDevices.getUserMedia({ video: true });
		devices = (await navigator.mediaDevices.enumerateDevices()).filter(
			(d) => d.kind === 'videoinput'
		);
	});
	async function connectRTC() {
		state = State.Connecting;

		const c = new EncryptDecrypt();
		await c.init(code, iv);

		const { connect } = await import('nats.ws');
		nc = await connect({
			servers: 'wss://demo.nats.io:8443'
		});

		const stream = await navigator.mediaDevices.getUserMedia({
			video: { deviceId: devices[deviceIndex].deviceId, width: resolutions[resolutionIndex].width },
			audio: false
		});

		const pc = new RTCPeerConnection({
			iceServers: [
				{
					urls: 'stun:stun.l.google.com:19302'
				}
			]
		});
		await pc.setLocalDescription(await pc.createOffer());
		// const key = await crypto.subtle.importKey('jwk', JSON.parse(atob(code)), 'AES-GCM', true, [
		// 	'encrypt',
		// 	'decrypt'
		// ]);
		// const enc = new TextEncoder();
		// const dec = new TextDecoder();

		// const ivDec = atob(iv);

		nc.publish(
			`relaying.offer`,
			// new Uint8Array(
			// 	await crypto.subtle.encrypt(
			// 		{ name: 'AES-GCM', iv: enc.encode(ivDec) },
			// 		key,
			// 		enc.encode(JSON.stringify(pc.localDescription))
			// 	)
			// )
			await c.encrypt(pc.localDescription)
		);
		const answerSub = nc.subscribe('relaying.answer', {
			callback: async (err, msg) => {
				// const answer = JSON.parse(
				// 	dec.decode(
				// 		await crypto.subtle.decrypt({ name: 'AES-GCM', iv: enc.encode(ivDec) }, key, msg.data)
				// 	)
				// );
				const answer = await c.decrypt<RTCSessionDescriptionInit>(msg.data);
				await pc.setRemoteDescription(new RTCSessionDescription(answer));
			}
		});

		// console.log(stream);
		// const peer = new Peer({
		// 	debug: 3,
		// 	host: 'peerjs.hop.sh',
		// 	key: 'relaying',
		// 	config: {
		// 		iceServers: [
		// 			{
		// 				urls: 'stun:stun.l.google.com:19302'
		// 			},
		// 			{
		// 				urls: 'stun:stun1.l.google.com:19302'
		// 			}
		// 		]
		// 	} satisfies RTCConfiguration,
		// 	secure: true
		// });

		// peer.on('error', (err) => {
		// 	console.error(err);
		// });

		// await new Promise((res) => peer.once('open', res));

		// let connection = peer.call(code, stream);
		// connection.on('stream', (stream) => {
		// 	state = State.Connected;
		// });
	}
</script>

<div class="w-full h-screen grid place-items-center bg-slate-300">
	{#if state === State.Start}
		<div class="flex flex-col gap-4">
			<h1 class="text-4xl text-slate-700 text-center uppercase font-mono">Pairing Code</h1>
			<input
				class="rounded-md p-2 text-center uppercase text-slate-700 tracking-widest text-2xl outline-none bg-stone-100"
				type="text"
				placeholder="..."
				name="Pairing Code"
				id="code"
				bind:value={code}
			/>
			<input
				class="rounded-md p-2 text-center uppercase text-slate-700 tracking-widest text-2xl outline-none bg-stone-100"
				type="text"
				placeholder="..."
				name="IV"
				id="code"
				bind:value={iv}
			/>
			<select class="text-center rounded-md p-1" name="Camera" id="camera" bind:value={deviceIndex}>
				{#each devices as device, i}
					<option value={i}>{device.label}</option>
				{/each}
			</select>
			<div class="flex flex-col text-center">
				<select
					class="text-center rounded-md p-1"
					name="Resolution"
					id="resolution"
					bind:value={resolutionIndex}
				>
					{#each resolutions as resolution, i}
						<option value={i}
							>{`${resolution.width} x ${resolution.height}`}
							{resolution.name ? `(${resolution.name})` : ''}</option
						>
					{/each}
				</select>
			</div>
			<div class="flex items-center justify-center">
				<button
					class="p-4 py-2 rounded-md bg-zinc-800 text-white font-mono uppercase tracking-wide hover:bg-zinc-700 transition-colors"
					on:click={connectRTC}>Connect</button
				>
			</div>
		</div>
	{:else if state === State.Connecting}
		a
	{/if}
</div>
