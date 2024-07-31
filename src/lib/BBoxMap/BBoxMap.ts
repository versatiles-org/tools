

import type { Feature, GeoJSON, Position } from 'geojson';
import { type Point } from 'maplibre-gl';


export type BBox = [number, number, number, number];
export type BBoxDrag = 'x0' | 'x1' | 'y0' | 'y1' | '00' | '01' | '10' | '11' | false;

export function getBBoxDrag(point: Point, bboxPixel: BBox): BBoxDrag {
	const maxDistance = 4;

	const { x, y } = point;
	const [x0, y0, x1, y1] = bboxPixel;

	// Don't think outside the box
	if (x < x0 - maxDistance) return false;
	if (x > x1 + maxDistance) return false;
	if (y < y0 - maxDistance) return false;
	if (y > y1 + maxDistance) return false;

	const drag: [boolean, boolean, boolean, boolean] = [
		Math.abs(x0 - x) < maxDistance,
		Math.abs(y0 - y) < maxDistance,
		Math.abs(x1 - x) < maxDistance,
		Math.abs(y1 - y) < maxDistance
	];

	if (drag[0] && drag[2]) {
		if (Math.abs(x0 - x) < Math.abs(x1 - x)) {
			drag[2] = false;
		} else {
			drag[0] = false;
		}
	}

	if (drag[1] && drag[3]) {
		if (Math.abs(y0 - y) < Math.abs(y1 - y)) {
			drag[3] = false;
		} else {
			drag[1] = false;
		}
	}

	if (drag[0]) {
		if (drag[1]) return '00';
		if (drag[3]) return '01';
		return 'x0';
	} else if (drag[1]) {
		if (drag[2]) return '10';
		return 'y0';
	} else if (drag[2]) {
		if (drag[3]) return '11';
		return 'x1';
	} else if (drag[3]) {
		return 'y1';
	} else return false;
}

export function getCursor(drag: BBoxDrag): string | false {
	switch (drag) {
		case '00': return 'nwse-resize';
		case '01': return 'nesw-resize';
		case '10': return 'nesw-resize';
		case '11': return 'nwse-resize';
		case 'x0': return 'ew-resize';
		case 'x1': return 'ew-resize';
		case 'y0': return 'ns-resize';
		case 'y1': return 'ns-resize';
	}
	return false;
}

export function getBBoxGeometry(bbox: BBox): GeoJSON {
	return {
		type: 'FeatureCollection',
		features: [polygon(getRing([-180, -86, 180, 86]), getRing(bbox)), linestring(getRing(bbox))]
	};
	function polygon(...coordinates: Position[][]): Feature {
		return {
			type: 'Feature',
			geometry: {
				type: 'Polygon',
				coordinates
			},
			properties: {}
		};
	}
	function linestring(coordinates: Position[]): Feature {
		return {
			type: 'Feature',
			geometry: {
				type: 'LineString',
				coordinates
			},
			properties: {}
		};
	}
	function getRing(bbox: BBox): Position[] {
		return [
			[bbox[0], bbox[1]],
			[bbox[2], bbox[1]],
			[bbox[2], bbox[3]],
			[bbox[0], bbox[3]],
			[bbox[0], bbox[1]]
		];
	}
}

export async function loadBBoxes(cb: (entries: { key: string, value: BBox }[]) => void) {
	const data = (await import('./bboxes.json')).default;
	const entries: { key: string, value: BBox }[] = data.map(e => {
		let key = e[0] as string;

		const value = e.slice(1, 5) as BBox;
		value[2] = Math.round((value[2] + value[0]) * 1e5) / 1e5;
		value[3] = Math.round((value[3] + value[1]) * 1e5) / 1e5;

		return { key, value }
	})
	cb(entries);
}
