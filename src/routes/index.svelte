<script lang="ts">
	import type { MediaConnection, Peer } from 'peerjs';
	import { onMount } from 'svelte';

	export let code: string;
	export let qrCode: string;
	let peer: Peer;
	let video: HTMLVideoElement;
	let connected = false;

	onMount(async () => {
		const { Peer } = await import('peerjs');
		peer = new Peer(code, {
			debug: 3,
			host: 'peerjs.hop.sh',
			key: 'relaying',
			secure: true
		});
		peer.on('error', (err) => {
			console.log(err);
		});
		const onCall = (conn: MediaConnection) => {
			conn.answer();
			console.log(conn);
			conn.on('iceStateChanged', (state) => (state === 'disconnected' ? location.reload() : null));
			conn.on('stream', (stream) => {
				connected = true;
				video.srcObject = stream;
			});
		};
		peer.once('call', onCall);
	});
</script>

<div class="h-screen w-full flex flex-wrap justify-evenly items-center">
	{#if !connected}
		<h1 class="font-mono text-7xl lg:text-9xl tracking-wide text-slate-700 ">
			{code}
		</h1>
		<div class="w-3/4 sm:w-[unset] sm:h-1/2 aspect-square bg-stone-200 rounded-md">
			{@html qrCode}
		</div>
	{/if}

	<video
		autoplay
		playsinline
		bind:this={video}
		class={connected ? 'absolute top-0 left-0 w-full h-full object-cover' : 'hidden'}
	/>
</div>
