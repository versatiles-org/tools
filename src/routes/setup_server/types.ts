import type {
	BBox,
	OptionCoverage,
	OptionFrontend,
	OptionMap,
	OptionMethod,
	OptionOS
} from './options';

export type SetupState = {
	os?: OptionOS;
	method?: OptionMethod;
	maps: OptionMap[];
	coverage?: OptionCoverage;
	bbox?: BBox;
	minZoom?: number;
	maxZoom?: number;
	frontend?: OptionFrontend;
	// Server settings: only used for the generated code, never stored in the share link
	domain?: string;
	email?: string;
	port?: number;
};
