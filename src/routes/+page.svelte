<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<p>Available Apps:</p>
	<ul>
		<li><a href="setup_server">Setup Server</a></li>
		<li><a href="bounding_box">Find a bounding box</a></li>
	</ul>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}
</style>
