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
	frontend?: OptionFrontend;
};
