import type { BBox, KeyCoverage, KeyMap, OptionMap } from './options';

// --- Types ---

export type QuadNode = number | [QuadNode, QuadNode, QuadNode, QuadNode];

export interface SizeIndex {
	levels: Record<string, QuadNode>;
}

export interface SizeEstimate {
	mapKey: KeyMap;
	mapLabel: string;
	bytes: number;
}

// --- Geo-to-tile conversion ---

export function lon2tileX(lon: number, z: number): number {
	return Math.floor(((lon + 180) / 360) * (1 << z));
}

export function lat2tileY(lat: number, z: number): number {
	const latRad = (lat * Math.PI) / 180;
	return Math.floor(
		((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * (1 << z)
	);
}

// --- Quadtree traversal ---

export function estimateSize(
	node: QuadNode,
	nodeX: number,
	nodeY: number,
	nodeSize: number,
	qxMin: number,
	qyMin: number,
	qxMax: number,
	qyMax: number
): number {
	// No overlap
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

// --- Index loading with cache ---

const indexCache = new Map<string, SizeIndex>();

export async function loadSizeIndex(mapKey: KeyMap, basePath: string): Promise<SizeIndex> {
	const cached = indexCache.get(mapKey);
	if (cached) return cached;

	const url = `${basePath}/data/size-index-${mapKey}.json`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to load size index for ${mapKey}: ${res.status}`);
	const index: SizeIndex = await res.json();
	indexCache.set(mapKey, index);
	return index;
}

export function clearIndexCache(): void {
	indexCache.clear();
}

// --- Main exported function ---

export const BORDER = 3;

export async function estimateDownloadSizes(
	maps: OptionMap[],
	coverage: KeyCoverage,
	basePath: string,
	bbox?: BBox
): Promise<SizeEstimate[]> {
	const results: SizeEstimate[] = [];

	for (const map of maps) {
		const index = await loadSizeIndex(map.key, basePath);
		let totalBytes = 0;

		for (const [zStr, root] of Object.entries(index.levels)) {
			const z = parseInt(zStr, 10);
			const gridSize = 1 << z;

			if (coverage === 'global' || !bbox) {
				// Full extent
				totalBytes += estimateSize(root, 0, 0, gridSize, 0, 0, gridSize, gridSize);
			} else {
				const [west, south, east, north] = bbox;
				const txMin = Math.max(0, lon2tileX(west, z) - BORDER);
				const txMax = Math.min(gridSize - 1, lon2tileX(east, z) + BORDER);
				const tyMin = Math.max(0, lat2tileY(north, z) - BORDER);
				const tyMax = Math.min(gridSize - 1, lat2tileY(south, z) + BORDER);
				totalBytes += estimateSize(root, 0, 0, gridSize, txMin, tyMin, txMax + 1, tyMax + 1);
			}
		}

		results.push({ mapKey: map.key, mapLabel: map.label, bytes: totalBytes });
	}

	return results;
}

// --- Utility ---

export function formatBytes(bytes: number): string {
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`;
}
