<script lang="ts">
	import { page } from '$app/stores';
	import Quality from '$lib/components/Quality.svelte';
	import Rotate from '$lib/components/Rotate.svelte';
	import { EncryptDecrypt, natsOnce, State } from '$lib/utils';
	import { onMount } from 'svelte';

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
	let state = State.Start;
	let video: HTMLVideoElement;
	let pc: RTCPeerConnection;

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

	$: if (state === State.Disconnected) {
		pc.restartIce();
	}

	onMount(async () => {
		// Get the user's camera
		await navigator.mediaDevices.getUserMedia({ video: true });

		// Get the list of available cameras
		devices = (await navigator.mediaDevices.enumerateDevices()).filter(
			(d) => d.kind === 'videoinput'
		);

		const stream = await navigator.mediaDevices.getUserMedia({
			video: { deviceId: devices[deviceIndex].deviceId, width: resolutions[resolutionIndex].width },
			audio: false
		});
		video.srcObject = stream;
	});

	async function connectRTC() {
		// Display loading state
		state = State.Connecting;

		// Initialize the encryption/decryption class
		const c = new EncryptDecrypt();
		await c.init(code, iv);

		// Connect to the NATS server
		const { connect } = await import('nats.ws');
		const nc = await connect({
			servers: 'wss://demo.nats.io:8443'
		});

		// Grab user media
		const stream = await navigator.mediaDevices.getUserMedia({
			video: { deviceId: devices[deviceIndex].deviceId, width: resolutions[resolutionIndex].width },
			audio: false
		});
		video.srcObject = stream;

		// Open a new PeerConnection
		pc = new RTCPeerConnection({
			iceServers: [
				// No TURN server (this is meant to be used on a local network)
				{
					// Using Google's public STUN server
					urls: 'stun:stun.l.google.com:19302'
				}
			]
		});
		pc.onnegotiationneeded = async () => {
			state = State.Connecting;
			// Set up the PeerConnection state change handler
			pc.onconnectionstatechange = () => {
				if (pc.connectionState === 'connected') {
					state = State.Connected;
				} else if (pc.connectionState === 'disconnected') {
					state = State.Disconnected;
				}
			};

			// Set up the ICE candidate handlers
			pc.onicecandidate = async ({ candidate }) => {
				if (candidate) {
					// Send the ICE candidate to the remote peer
					nc.publish(`relaying.candidate.device`, await c.encrypt(candidate));
				}
			};

			const iceSub = nc.subscribe(`relaying.candidate.host`, {
				callback: async (err, msg) => {
					const candidate = await c.decrypt<RTCIceCandidateInit>(msg.data);
					await pc.addIceCandidate(new RTCIceCandidate(candidate));
				}
			});

			// Create an offer and set it as the local description
			await pc.setLocalDescription(await pc.createOffer());

			// Offer my local description to the remote peer
			nc.publish(`relaying.offer.device`, await c.encrypt(pc.localDescription));

			// Wait for the remote peer to send their local description
			const answer = await natsOnce<RTCSessionDescriptionInit>(nc, c, 'relaying.offer.host');
			await pc.setRemoteDescription(new RTCSessionDescription(answer));
		};

		// Add the user's media to the PeerConnection
		stream.getTracks().forEach((track) => pc.addTrack(track, stream));
	}
</script>

<div class="w-full ios-fill grid place-items-center bg-black">
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
		Connecting to host...
	{:else if state === State.Disconnected}
		Disconnected from host, close this page and scan the QR code again.
	{/if}
	<video
		autoplay
		muted
		playsinline
		bind:this={video}
		class="fixed top-0 left-0 w-full h-screen object-cover"
	/>
	<div
		class:backdrop-blur-lg={state !== State.Connected}
		class="transition-all duration-500 p-10 fixed top-0 left-0 w-full h-full flex items-center justify-end portrait:flex-col landscape:flex-row"
	>
		<div
			class="flex landscape:flex-col portrait:flex-row items-center justify-around landscape:h-full portrait:w-full landscape:py-8 portrait:px-8"
		>
			<button
				on:click={() => {
					pc.restartIce();
				}}
			>
				<div class="p-2 bg-white/20 grid place-items-center rounded-full text-white">
					<Rotate />
				</div>
			</button>
			<button on:click={connectRTC}>
				<div
					class="border-[3px] border-white p-[2px] rounded-full animate-spin"
					class:border-x-transparent={state === State.Connecting}
				>
					<div class="bg-red-600 border-2 border-transparent w-12 h-12 rounded-full" />
				</div>
			</button>
			<div class="p-2 bg-white/20 grid place-items-center rounded-full text-white">
				<Quality />
			</div>
		</div>
	</div>
</div>
