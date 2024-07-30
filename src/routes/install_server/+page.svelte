<!-- InstallationGuide.svelte -->
<script lang="ts">
	import FormOptionGroup from './FormOptionGroup.svelte';

	let selectedOS = '';

	function handleOSChange(key: string) {
		selectedOS = key;
	}

	const osOptions = [
		{ key: 'mac', title: 'MacOS' },
		{ key: 'linux', title: 'Linux' }
	];
</script>

<svelte:head>
	<title>Install VersaTiles</title>
	<meta name="description" content="How to install VersaTiles?" />
</svelte:head>

<section>
	<h1>How to install VersaTiles?</h1>
	<h2>1. Install Server</h2>
	<p>Select your operating System:</p>
	<p>
		<FormOptionGroup group="os" options={osOptions} onChange={handleOSChange} />
	</p>
</section>
