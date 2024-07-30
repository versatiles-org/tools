<!-- +page.svelte -->
<script lang="ts">
	import FormOptionGroup from './FormOptionGroup.svelte';
	import CodeBlock from './CodeBlock.svelte';

	let selectedOS = '';
	let selectedMethod = '';
	let selectedFrontend = '';
	let code = '';

	function handleOSChange(key: string) {
		selectedOS = key;
		selectedMethod = '';
		updateCode();
	}

	function handleMethodChange(key: string) {
		selectedMethod = key;
		updateCode();
	}

	function handleFrontendChange(key: string) {
		selectedFrontend = key;
		updateCode();
	}

	const osOptions = [
		{
			key: 'linux',
			title: 'Linux',
			methodOptions: [
				{ key: 'script', title: 'Install Script' },
				{ key: 'compile', title: 'Compile with Rust' }
			]
		},
		{
			key: 'mac',
			title: 'MacOS',
			methodOptions: [
				{ key: 'homebrew', title: 'Homebrew' },
				{ key: 'compile', title: 'Compile with Rust' }
			]
		}
	];

	const frontendOptions = [
		{ key: 'yes', title: 'Yes, please!' },
		{ key: 'no', title: 'Nope' }
	];

	$: currentOS = osOptions.find((option) => option.key === selectedOS);
	$: methodOptions = currentOS ? currentOS.methodOptions : [];

	function updateCode() {
		const lines = [];

		switch (selectedMethod) {
			case 'homebrew':
				lines.push(
					'# Install VersaTiles',
					'brew tap versatiles-org/versatiles',
					'brew install versatiles'
				);
				break;
			case 'script':
				lines.push(
					'# Install VersaTiles',
					'curl -Ls "https://github.com/versatiles-org/versatiles-rs/raw/main/helpers/install-linux.sh" | bash'
				);
				break;
			case 'compile':
				lines.push(
					'# Install Rust',
					'curl https://sh.rustup.rs -sSf | sh',
					'# Compile and Install VersaTiles',
					'cargo install versatiles'
				);
				break;
		}

		switch (selectedFrontend) {
			case 'yes':
				lines.push(
					'\n# Download Frontend',
					'wget "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend.br.tar"'
				);
				break;
		}

		code = lines.join('\n');
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
		<p>
			<FormOptionGroup group="method" options={methodOptions} onChange={handleMethodChange} />
		</p>
	{/if}

	{#if selectedMethod}
		<h2>3. Do you want to include a Frontend</h2>
		<p>
			<FormOptionGroup group="frontend" options={frontendOptions} onChange={handleFrontendChange} />
		</p>
	{/if}

	<hr />

	<h2>Instructions</h2>
	<CodeBlock {code} />
</section>

<style>
	hr {
		margin: 3em;
	}
</style>
