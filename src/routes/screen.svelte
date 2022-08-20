<script lang="ts">
	let code: string;

	async function connect() {
		const { Peer } = await import('peerjs');

		const stream = await navigator.mediaDevices.getDisplayMedia({ audio: false, video: true });

		console.log(stream);
		const peer = new Peer({
			debug: 3,
			host: 'peerjs.hop.sh',
			key: 'relaying',
			secure: true
		});
		peer.on('error', (err) => {
			console.log(err);
		});
		await new Promise((res) => setTimeout(res, 1000));
		peer.call(code, stream);
	}
</script>

<input type="text" name="Pairing Code" id="code" bind:value={code} />
<button on:click={connect}>Connect</button>
