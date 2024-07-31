<!-- +page.svelte -->
<script lang="ts">
	import BBoxMap from '$lib/BBoxMap/BBoxMap.svelte';
	import CodeBlock from '$lib/CodeBlock/CodeBlock.svelte';
	import FormOptionGroup from '$lib/FormOption/FormOptionGroup.svelte';

	let selectedOS = null;
	let selectedMethod = null;
	let selectedFrontend = null;
	let selectedData = null;
	let selectedBBox: [number, number, number, number];
	let code = '';

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
		{ key: 'bbox', title: 'Just a part of it' }
	];

	$: {
		if (selectedOS || selectedMethod || selectedFrontend || selectedData) {
			updateCode();
		}
	}

	function updateCode() {
		const lines = [];

		switch (selectedMethod?.key) {
			case 'homebrew':
				lines.push(
					'# install versatiles',
					'brew tap versatiles-org/versatiles',
					'brew install versatiles'
				);
				break;
			case 'script':
				lines.push(
					'# install versatiles',
					'curl -Ls "https://github.com/versatiles-org/versatiles-rs/raw/main/helpers/install-linux.sh" | bash'
				);
				break;
			case 'compile':
				lines.push(
					'# install rust',
					'curl https://sh.rustup.rs -sSf | sh',
					'# compile and install versatiles',
					'cargo install versatiles'
				);
				break;
		}

		switch (selectedFrontend?.key) {
			case 'yes':
				lines.push(
					'\n# download frontend',
					'wget -Ls "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend.br.tar"'
				);
				break;
		}

		switch (selectedData?.key) {
			case 'world':
				lines.push(
					'\n# download map data',
					`wget -c -O osm.versatiles "https://download.versatiles.org/osm.versatiles"`
				);
				break;
			case 'berlin':
				lines.push(
					'\n# download map data',
					`versatiles convert --bbox-border 3 --bbox "13.1,52.3,13.7,52.7" https://download.versatiles.org/osm.versatiles osm.versatiles`
				);
				break;
		}

		if (selectedData) {
			const start = ['versatiles server -p 80'];
			if (selectedFrontend?.key === 'yes') start.push('-s frontend.br.tar');
			start.push(`osm.versatiles`);
			lines.push('\n# start server', start.join(' '));
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
	<FormOptionGroup group="os" options={osOptions} bind:selectedOption={selectedOS} />

	{#if selectedOS}
		<h2>2. Choose Installation Method</h2>
		<FormOptionGroup
			group="method"
			options={selectedOS?.methodOptions}
			bind:selectedOption={selectedMethod}
		/>
	{/if}

	{#if selectedMethod}
		<h2>3. Do you want to include a Frontend</h2>
		<FormOptionGroup
			group="frontend"
			options={frontendOptions}
			bind:selectedOption={selectedFrontend}
		/>
	{/if}

	{#if selectedFrontend}
		<h2>4. Select Map Data</h2>
		<FormOptionGroup group="data" options={dataOptions} bind:selectedOption={selectedData} />

		{#if selectedData?.key == 'bbox'}
			<div></div>
		{/if}
	{/if}
	<BBoxMap bind:selectedBBox />

	{#if selectedMethod}
		<hr />
		<h2>Instructions</h2>
		<CodeBlock {code} />
	{/if}
</section>

<style>
	hr {
		margin: 3em;
	}
</style>
