<script lang="ts">
	import { EncryptDecrypt, natsOnce, State } from '$lib/utils';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let video: HTMLVideoElement;
	let state = State.Start;
	let pc: RTCPeerConnection;

	$: if (state === State.Disconnected) {
		pc.restartIce();
	}

	onMount(async () => {
		// Initialize the encryption/decryption class
		const c = new EncryptDecrypt();
		await c.init(data.code, data.iv);

		// Connect to the NATS server
		const { connect } = await import('nats.ws');
		const nc = await connect({
			servers: 'wss://demo.nats.io:8443'
		});

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
			// Set up the PeerConnection state change handler
			pc.onconnectionstatechange = () => {
				if (pc.connectionState === 'connected' && state !== State.TrackStarted) {
					state = State.Connected;
				} else if (pc.connectionState === 'disconnected') {
					state = State.Disconnected;
				}
			};

			// Set up the track handler
			pc.ontrack = ({ track }) => {
				console.log('track', track);
				// When the remote peer sends a track, add it to the video element
				video.srcObject = new MediaStream([track]);
				state = State.TrackStarted;
			};

			pc.onicecandidate = async ({ candidate }) => {
				if (candidate) {
					// Send the ICE candidate to the remote peer
					nc.publish(`relaying.candidate.host`, await c.encrypt(candidate));
				}
			};

			// Set up the ICE candidate handlers
			const iceSub = nc.subscribe(`relaying.candidate.device`, {
				callback: async (err, msg) => {
					const candidate = await c.decrypt<RTCIceCandidateInit>(msg.data);
					await pc.addIceCandidate(new RTCIceCandidate(candidate));
				}
			});

			// Wait for the remote peer to send their local description
			const answer = await natsOnce<RTCSessionDescriptionInit>(nc, c, 'relaying.offer.device');
			await pc.setRemoteDescription(new RTCSessionDescription(answer));

			// Create an answer and set it as the local description
			await pc.setLocalDescription(await pc.createAnswer());

			// Offer my local description to the remote peer
			nc.publish(`relaying.offer.host`, await c.encrypt(pc.localDescription));
		};
		pc.restartIce();
	});
</script>

<div class="h-screen w-full flex flex-wrap justify-evenly items-center">
	{#if state === State.Start}
		<!-- <h1 class="font-mono text-7xl lg:text-9xl tracking-wide text-slate-700 ">
			{data.code}
		</h1>
		<h1 class="font-mono text-7xl lg:text-9xl tracking-wide text-slate-700 ">
			{data.iv}
		</h1> -->
		<h1 class="font-mono text-7xl lg:text-9xl tracking-wide text-slate-700 ">relay -></h1>
		<div class="w-3/4 sm:w-[unset] sm:h-1/2 aspect-square bg-stone-200 rounded-md">
			{@html data.qrCode}
		</div>
	{/if}

	<video
		autoplay
		muted
		playsinline
		bind:this={video}
		class={state === State.TrackStarted
			? 'absolute top-0 left-0 w-full h-full object-cover'
			: 'hidden'}
	/>
</div>
