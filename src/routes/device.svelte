<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	interface Resolution {
		width: number;
		height: number;
		name?: string;
	}

	let code: string = $page.url.searchParams.get('code') ?? '';
	let devices: MediaDeviceInfo[] = [];
	let deviceIndex = 0;
	let resolutionIndex = 3;

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
	async function connect() {
		const { Peer } = await import('peerjs');

		const stream = await navigator.mediaDevices.getUserMedia({
			video: { deviceId: devices[deviceIndex].deviceId, width: resolutions[resolutionIndex].width },
			audio: false
		});

		console.log(stream);
		const peer = new Peer({
			debug: 3,
			host: 'peerjs-server-production.up.railway.app'
		});

		peer.on('error', (err) => {
			console.error(err);
		});
		await new Promise((res) => peer.once('open', res));
		peer.call(code, stream, {
			// sdpTransform: (sdp: string) => {
			// 	const parsed = sdpTransform.parse(sdp);
			// 	parsed.media[0].rtp[0].codec = 'H265';
			// 	return sdpTransform.write(parsed);
			// }
		});
	}
</script>

<div class="w-full h-screen grid place-items-center bg-slate-300">
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
				on:click={connect}>Connect</button
			>
		</div>
	</div>
</div>
