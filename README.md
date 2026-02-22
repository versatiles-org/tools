[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/tools/ci.yml)](https://github.com/versatiles-org/tools/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

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

| `npm run ...`      | Description                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **`dev`**          | **Starts the development server with hot module reloading.**                                                                         |
| **`build`**        | **Builds the size index, updates HTML, and builds the Svelte app.**                                                                  |
| `build:html`       | Updates the static HTML files using the `update_html.ts` script so they match the style of [versatiles.org](https://versatiles.org). |
| `build:svelte`     | Synchronizes SvelteKit and builds the Svelte application using Vite.                                                                 |
| `build:size-index` | Generates the size index used for download size estimates.                                                                           |
| **`preview`**      | **Serves the built application locally for previewing the production build.**                                                        |
| **`check`**        | **Formats code, checks Svelte types, lints, and runs tests.**                                                                        |
| `check:svelte`     | Runs Svelte type checking.                                                                                                           |
| **`test`**         | **Runs unit tests with Vitest.**                                                                                                     |
| `test:integration` | Runs integration smoke tests against generated install scripts.                                                                      |
| `test:coverage`    | Runs unit tests with coverage reporting.                                                                                             |
| `format`           | Formats all project files using Prettier.                                                                                            |
| `format:check`     | Checks formatting without modifying files.                                                                                           |
| `lint`             | Runs ESLint for code quality.                                                                                                        |
| `upgrade`          | Updates dependencies, removes lock files and `node_modules`, and reinstalls packages.                                                |

## Tools

### Setup Server Tool

This tool is implemented in [src/routes/setup_server](./src/routes/setup_server):

- The form is defined in [+page.svelte](./src/routes/setup_server/+page.svelte).
- Options are defined in [options.ts](./src/routes/setup_server/options.ts).
- The shell code is generated in [generate_code.ts](./src/routes/setup_server/generate_code.ts).
- The tool uses [FormOption/FormOptionGroup.svelte](./src/routes/setup_server/FormOption/FormOptionGroup.svelte) to render the button groups.
