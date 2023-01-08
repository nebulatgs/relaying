<script lang="ts">
	import { EncryptDecrypt, natsOnce } from '$lib/utils';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let video: HTMLVideoElement;
	let connected = false;

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
		const pc = new RTCPeerConnection({
			iceServers: [
				// No TURN server (this is meant to be used on a local network)
				{
					// Using Google's public STUN server
					urls: 'stun:stun.l.google.com:19302'
				}
			]
		});

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

		// Wait for the ICE gathering to complete
		pc.onicegatheringstatechange = async () => {
			if (pc.iceGatheringState === 'complete') {
				// ICE gathering is complete, we can stop listening for ICE candidates
				iceSub.unsubscribe();
				pc.onicecandidate = null;

				// Send a message to the remote peer to tell them that we're done
				nc.publish(`relaying.done.host`, await c.encrypt(''));
			}
		};

		// Wait for the remote peer to tell us that they're done
		await natsOnce(nc, c, 'relaying.done.device');

		pc.ontrack = ({ track }) => {
			// When the remote peer sends a track, add it to the video element
			video.srcObject = new MediaStream([track]);
			connected = true;
		};
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
		</div>
	{/if}

	<video
		autoplay
		playsinline
		bind:this={video}
		class={connected ? 'absolute top-0 left-0 w-full h-full object-cover' : 'hidden'}
	/>
</div>
