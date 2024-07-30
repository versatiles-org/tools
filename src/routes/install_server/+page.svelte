<!-- +page.svelte -->
<script lang="ts">
	import FormOptionGroup from './FormOptionGroup.svelte';
	import CodeBlock from './CodeBlock.svelte';

	let selectedOS = '';
	let selectedMethod = '';
	let code = [];

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

	function getCode(): string {
		const code = [];
		switch (selectedMethod) {
			case 'homebrew':
				code.push(
					'# Install VersaTiles',
					'brew tap versatiles-org/versatiles',
					'brew install versatiles'
				);
				break;
			case 'script':
				code.push(
					'# Install VersaTiles',
					'curl -Ls "https://github.com/versatiles-org/versatiles-rs/raw/main/helpers/install-linux.sh" | bash'
				);
				break;
			case 'compile':
				code.push(
					'# Install Rust',
					'curl https://sh.rustup.rs -sSf | sh',
					'# Compile and Install VersaTiles',
					'cargo install versatiles'
				);
				break;
		}
		return code.join('\n');
	}
</script>

<svelte:head>
	<title>Install VersaTiles</title>
	<meta name="description" content="How to install VersaTiles?" />
</svelte:head>

<section>
	<h1>How to install VersaTiles?</h1>

	<h2>1. Select your Operating System</h2>
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

	<hr />

	<h2>Instructions</h2>
	<CodeBlock code={getCode()} />
</section>

<style>
	hr {
		margin: 3em;
	}
</style>
