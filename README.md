# VersaTiles Tools

This repository contains a collection of tools for working with the VersaTiles
project.

It deploys the site at: https://versatiles.org/tools/

## Installing Locally

Install:

```bash
git clone https://github.com/versatiles-org/tools.git
cd tools
npm i
```

## NPM Scripts

The following NPM scripts are available:

| `npm run ...`  | Description                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **`build`**    | **Runs both the HTML and Svelte build processes.**                                                                                   |
| `build-html`   | Updates the static HTML files using the `update_html.ts` script so they match the style of [versatiles.org](https://versatiles.org). |
| `build-svelte` | Synchronizes SvelteKit and builds the Svelte application using Vite.                                                                 |
| **`preview`**  | **Serves the built application locally for previewing the production build.**                                                        |
| **`dev`**      | **Starts the development server with hot module reloading.**                                                                         |
| **`check`**    | **Formats code, lints the project, and runs Svelte type checks.**                                                                    |
| `format`       | Formats all project files using Prettier.                                                                                            |
| `lint`         | Checks code formatting with Prettier and runs ESLint for code quality.                                                               |
| `upgrade`      | Updates dependencies, removes lock files and `node_modules`, and reinstalls packages.                                                |

## Tools

### Setup Server Tool

This tool is implemented in [src/routes/setup_server](./src/routes/setup_server):

- The form is defined in [+page.svelte](./src/routes/setup_server/+page.svelte).
- Options are defined in [options.ts](./src/routes/setup_server/options.ts).
- The shell code is generated in [generate_code.ts](./src/routes/setup_server/generate_code.ts).
- The tool uses [FormOptions/FormOptionGroup.svelte](./src/routes/setup_server/FormOptions/FormOptionGroup.svelte) to render the button groups.
