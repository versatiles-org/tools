<!-- InstallationGuide.svelte -->
<script lang="ts">
	import FormOptionGroup from './FormOptionGroup.svelte';

	let selectedOS = '';
	let selectedMethod = '';

	function handleOSChange(key: string) {
		selectedOS = key;
		selectedMethod = ''; // Reset the selected method when OS changes
	}

	function handleMethodChange(key: string) {
		selectedMethod = key;
	}

	const osOptions = [
		{
			key: 'mac',
			title: 'MacOS',
			methodOptions: [
				{ key: 'homebrew', title: 'Homebrew' },
				{ key: 'compile', title: 'Compile from GitHub' }
			]
		},
		{
			key: 'linux',
			title: 'Linux',
			methodOptions: [
				{ key: 'script', title: 'Install Script' },
				{ key: 'compile', title: 'Compile from GitHub' }
			]
		}
	];

	$: currentOS = osOptions.find((option) => option.key === selectedOS);
	$: methodOptions = currentOS ? currentOS.methodOptions : [];
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

	{#if selectedOS}
		<h2>2. Choose Installation Method</h2>
		<p>Select how you want to install the software:</p>
		<p>
			<FormOptionGroup group="method" options={methodOptions} onChange={handleMethodChange} />
		</p>
	{/if}

	{#if selectedMethod}
		<h2>3. Follow the Instructions</h2>
		{#if selectedMethod === 'homebrew'}
			<p>Install using Homebrew:</p>
			<pre>
				brew tap versatiles-org/versatiles
				brew install versatiles
			</pre>
		{/if}
		{#if selectedMethod === 'script'}
			<p>Install using Install Script:</p>
			<pre>curl -Ls "https://github.com/versatiles-org/versatiles-rs/raw/main/helpers/install-linux.sh" | bash</pre>
		{/if}
		{#if selectedMethod === 'compile'}
			<p>Compile with Rust:</p>
			<pre>
				# Install Rust
				curl https://sh.rustup.rs -sSf | sh
				# Compile and Install VersaTiles
				cargo install versatiles
			  </pre>
		{/if}
	{/if}
</section>
