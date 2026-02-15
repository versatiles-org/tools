import { readFileSync } from 'node:fs';

// --- Types ---

type QuadNode = number | [QuadNode, QuadNode, QuadNode, QuadNode];

interface SizeIndex {
	levels: Record<string, QuadNode>;
}

// --- WGS84 / Web Mercator conversions ---

function lon2tileX(lon: number, z: number): number {
	return Math.floor(((lon + 180) / 360) * (1 << z));
}

function lat2tileY(lat: number, z: number): number {
	const latRad = (lat * Math.PI) / 180;
	return Math.floor(
		((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * (1 << z)
	);
}

// --- Quadtree traversal ---

function estimateSize(
	node: QuadNode,
	nodeX: number,
	nodeY: number,
	nodeSize: number,
	qxMin: number,
	qyMin: number,
	qxMax: number,
	qyMax: number
): number {
	// No overlap check
	if (nodeX >= qxMax || nodeX + nodeSize <= qxMin || nodeY >= qyMax || nodeY + nodeSize <= qyMin) {
		return 0;
	}

	if (typeof node === 'number') {
		// Leaf: count overlapping tiles
		const oxMin = Math.max(nodeX, qxMin);
		const oyMin = Math.max(nodeY, qyMin);
		const oxMax = Math.min(nodeX + nodeSize, qxMax);
		const oyMax = Math.min(nodeY + nodeSize, qyMax);
		const count = (oxMax - oxMin) * (oyMax - oyMin);
		return count * node;
	}

	// Branch: recurse into 4 children
	const half = nodeSize / 2;
	return (
		estimateSize(node[0], nodeX, nodeY, half, qxMin, qyMin, qxMax, qyMax) +
		estimateSize(node[1], nodeX + half, nodeY, half, qxMin, qyMin, qxMax, qyMax) +
		estimateSize(node[2], nodeX, nodeY + half, half, qxMin, qyMin, qxMax, qyMax) +
		estimateSize(node[3], nodeX + half, nodeY + half, half, qxMin, qyMin, qxMax, qyMax)
	);
}

// --- Utilities ---

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${Math.round(bytes)} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// --- Main ---

function main(): void {
	const args = process.argv.slice(2);
	if (args.length < 7) {
		console.error(
			'Usage: npx tsx dev/estimate-size.ts <index.json> <west> <south> <east> <north> <zoomMin> <zoomMax>'
		);
		process.exit(1);
	}

	const indexPath = args[0];
	const west = parseFloat(args[1]);
	const south = parseFloat(args[2]);
	const east = parseFloat(args[3]);
	const north = parseFloat(args[4]);
	const zoomMin = parseInt(args[5], 10);
	const zoomMax = parseInt(args[6], 10);

	const index: SizeIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));

	console.time('Estimation');
	let totalSize = 0;
	let totalTiles = 0;

	console.log('Zoom | Tiles       | Est. Size');
	console.log('-----|-------------|----------');

	for (let z = zoomMin; z <= zoomMax; z++) {
		const root = index.levels[z];
		if (root === undefined) {
			console.log(`${String(z).padStart(4)} | ${String(0).padStart(11)} | 0 B`);
			continue;
		}

		const gridSize = 1 << z;

		// Convert bbox to tile coordinates
		// Note: higher latitude = smaller tile Y
		const BORDER = 3;
		const txMin = Math.max(0, lon2tileX(west, z) - BORDER);
		const txMax = Math.min(gridSize - 1, lon2tileX(east, z) + BORDER);
		const tyMin = Math.max(0, lat2tileY(north, z) - BORDER);
		const tyMax = Math.min(gridSize - 1, lat2tileY(south, z) + BORDER);

		const tileCount = (txMax - txMin + 1) * (tyMax - tyMin + 1);
		// Query uses exclusive upper bounds
		const size = estimateSize(root, 0, 0, gridSize, txMin, tyMin, txMax + 1, tyMax + 1);

		totalSize += size;
		totalTiles += tileCount;

		console.log(
			`${String(z).padStart(4)} | ${String(tileCount).padStart(11)} | ${formatBytes(size)}`
		);
	}

	console.log('-----|-------------|----------');
	console.log(`     | ${String(totalTiles).padStart(11)} | ${formatBytes(totalSize)}`);
	console.timeEnd('Estimation');
}

main();
