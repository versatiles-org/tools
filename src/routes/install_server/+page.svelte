<!-- +page.svelte -->
<script lang="ts">
	import FormOptionGroup from './FormOptionGroup.svelte';
	import CodeBlock from './CodeBlock.svelte';

	let selectedOS = '';
	let selectedMethod = '';
	let selectedFrontend = '';
	let selectedData = '';
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

	function handleDataChange(key: string) {
		selectedData = key;
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

	const dataOptions = [
		{ key: 'world', title: 'World' },
		{ key: 'berlin', title: 'Berlin' }
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
					'wget -Ls "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend.br.tar"'
				);
				break;
		}

		switch (selectedData) {
			case 'world':
				lines.push(
					`\n# Download Data\nwget -c -O ${selectedData}.versatiles "https://download.versatiles.org/osm.versatiles"`
				);
				break;
			case 'berlin':
				lines.push(
					'\n# Download Data',
					`versatiles convert --bbox-border 3 --bbox "13.1,52.3,13.7,52.7" https://download.versatiles.org/osm.versatiles ${selectedData}.versatiles`
				);
				break;
		}

		if (selectedData) {
			const start = ['versatiles server -p 80'];
			if (selectedFrontend === 'yes') start.push('-s frontend.br.tar');
			start.push(`[osm]${selectedData}.versatiles`);
			lines.push('\n# Start Server', start.join(' '));
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

	{#if selectedFrontend}
		<h2>4. Select Map Data</h2>
		<p>
			<FormOptionGroup group="data" options={dataOptions} onChange={handleDataChange} />
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
