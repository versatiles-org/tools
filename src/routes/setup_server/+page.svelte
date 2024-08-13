<!-- +page.svelte -->
<script lang="ts">
	import BBoxMap from '$lib/BBoxMap/BBoxMap.svelte';
	import CodeBlock from '$lib/CodeBlock/CodeBlock.svelte';
	import FormOptionGroup from '$lib/FormOption/FormOptionGroup.svelte';

	type Option = { title: string };
	type OSOption = Option & {
		key: 'linux' | 'mac' | 'windows';
		methodOptions: MethodOption[];
	};
	type MethodOption = Option & {
		key: 'cargo' | 'homebrew' | 'script_unix' | 'script_windows' | 'source_code';
	};
	type FrontendOption = Option & { key: 'yes' | 'no' };
	type DataOption = Option & { key: 'world' | 'bbox' };

	let selectedOS: OSOption = undefined;
	let selectedMethod: MethodOption = undefined;
	let selectedFrontend: FrontendOption = undefined;
	let selectedData: DataOption = undefined;
	let selectedBBox: [number, number, number, number];
	let code = '';

	const osOptions: OSOption[] = [
		{
			key: 'linux',
			title: 'Linux',
			methodOptions: [
				{ key: 'script_unix', title: 'Install Script' },
				{ key: 'cargo', title: 'Compile with Rust' }
			]
		},
		{
			key: 'mac',
			title: 'MacOS',
			methodOptions: [
				{ key: 'homebrew', title: 'Homebrew' },
				{ key: 'script_unix', title: 'Install Script' },
				{ key: 'cargo', title: 'Compile with Rust' }
			]
		},
		{
			key: 'windows',
			title: 'Windows',
			methodOptions: [
				{ key: 'script_windows', title: 'Install Script' },
				{ key: 'cargo', title: 'Compile with Rust' }
			]
		}
	];

	const frontendOptions: FrontendOption[] = [
		{ key: 'yes', title: 'Yes, please!' },
		{ key: 'no', title: 'Nope' }
	];

	const dataOptions: DataOption[] = [
		{ key: 'world', title: 'World' },
		{ key: 'bbox', title: 'Just a part of it' }
	];

	$: {
		if (selectedOS || selectedMethod || selectedFrontend || selectedData || selectedBBox) {
			updateCode();
		}
	}

	function updateCode() {
		const isBash = selectedOS?.key != 'windows';
		const lines = [];

		switch (selectedMethod?.key) {
			case 'cargo':
				lines.push(
					'# install rust, also see: https://www.rust-lang.org/tools/install',
					isBash
						? 'curl --proto "=https" --tlsv1.2 -sSf "https://sh.rustup.rs" | sh'
						: 'Invoke-WebRequest https://win.rustup.rs/ -OutFile rustup-init.exe\n.\\rustup-init.exe',
					'# compile and install versatiles',
					'cargo install versatiles'
				);
				break;
			case 'homebrew':
				lines.push(
					'# install versatiles',
					'brew tap versatiles-org/versatiles',
					'brew install versatiles'
				);
				break;
			case 'script_unix':
				lines.push(
					'# install versatiles',
					'curl -Ls "https://github.com/versatiles-org/versatiles-rs/raw/main/helpers/install-unix.sh" | bash'
				);
				break;
			case 'script_windows':
				lines.push(
					'# install versatiles',
					'Invoke-WebRequest -Uri "https://github.com/versatiles-org/versatiles-rs/raw/main/helpers/install-windows.ps1" -OutFile "$env:TEMP\\install-windows.ps1"\n. "$env:TEMP\\install-windows.ps1"'
				);
				break;
		}

		if (selectedFrontend?.key == 'yes') {
			lines.push(
				'\n# download frontend',
				isBash
					? 'wget -Ls "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend.br.tar"'
					: 'Invoke-WebRequest -Uri "https://github.com/versatiles-org/versatiles-frontend/releases/latest/download/frontend.br.tar" -OutFile "frontend.br.tar"'
			);
		}

		if (selectedData?.key == 'world') {
			lines.push(
				'\n# download map data',
				isBash
					? `wget -c -O osm.versatiles "https://download.versatiles.org/osm.versatiles"`
					: 'Invoke-WebRequest -Uri "https://download.versatiles.org/osm.versatiles" -OutFile "osm.versatiles"'
			);
		} else if (selectedBBox && selectedData?.key == 'bbox') {
			lines.push(
				'\n# download map data',
				[
					`versatiles${isBash ? '' : '.exe'} convert`,
					'--bbox-border 3',
					`--bbox "${selectedBBox.join(',')}"`,
					'"https://download.versatiles.org/osm.versatiles"',
					'"osm.versatiles"'
				].join(' ')
			);
		}

		if (selectedData) {
			let start = isBash ? 'versatiles' : 'versatiles.exe';
			start += ' server -p 80';
			if (selectedFrontend?.key === 'yes') start += ' -s "frontend.br.tar"';
			start += ` "osm.versatiles"`;
			lines.push('\n# start server at port 80', start);
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
	<FormOptionGroup options={osOptions} bind:selectedOption={selectedOS} />

	{#if selectedOS}
		<h2>2. Choose Installation Method</h2>
		<FormOptionGroup options={selectedOS?.methodOptions} bind:selectedOption={selectedMethod} />
	{/if}

	{#if selectedMethod}
		<h2>3. Do you want to include a Frontend</h2>
		<FormOptionGroup options={frontendOptions} bind:selectedOption={selectedFrontend} />
	{/if}

	{#if selectedFrontend}
		<h2>4. Select Map Data</h2>
		<FormOptionGroup options={dataOptions} bind:selectedOption={selectedData} />

		{#if selectedData?.key == 'bbox'}
			<div
				style="width:80vmin; height:60vmin; max-width:600px; max-height:450px; margin:0.2em auto"
			>
				<BBoxMap bind:selectedBBox />
			</div>
		{/if}
	{/if}

	{#if selectedMethod}
		<hr />
		<h2>Paste these Instructions to your Shell</h2>
		<CodeBlock {code} />
	{/if}
</section>

<style>
	hr {
		margin: 5em auto 2em;
		border: none;
		height: 1px;
		background: #888;
		width: 100vw;
	}
</style>
