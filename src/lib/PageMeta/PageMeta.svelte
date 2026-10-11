<!-- PageMeta.svelte -->
<script lang="ts">
	const SITE_URL = 'https://versatiles.org/tools/';

	let {
		title,
		description,
		// Path of the page relative to the site root, e.g. 'setup_server'
		path = '',
		image = 'https://versatiles.org/assets/social.png'
	}: {
		title: string;
		description: string;
		path?: string;
		image?: string;
	} = $props();

	let url = $derived(SITE_URL + path);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href={url} />

	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={url} />
	<meta property="og:image" content={image} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
</svelte:head>
