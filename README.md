[![CI status](https://img.shields.io/github/actions/workflow/status/versatiles-org/tools/ci.yml)](https://github.com/versatiles-org/tools/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

# VersaTiles Tools

This repository contains a collection of tools for working with the VersaTiles
project.

It deploys the site at: https://versatiles.org/tools/

## Installing Locally

Requires Node.js 22.17 or later.

```bash
git clone https://github.com/versatiles-org/tools.git
cd tools
npm i
npm run dev
```

Two things are not part of a fresh checkout:

- **Size indices.** The download size estimates in the setup tool read
  `static/data/size-index-*.json`. These files are generated and not committed.
  Without them the tool shows "Download size estimate is not available." and
  everything else works. Run `npm run build:size-index` to create them. This
  reads the tile indices of the public tile sources over the network and takes
  about 20 minutes.
- **Browsers for the end-to-end tests.** Run `npx playwright install chromium`
  once before `npm run test:e2e` or `npm run check`.

## NPM Scripts

The following NPM scripts are available:

| `npm run ...`      | Description                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| **`dev`**          | **Starts the development server with hot module reloading.**                                   |
| **`build`**        | **Builds the size index, updates the page template, and builds the Svelte app.**               |
| `build:size-index` | Generates the size indices used for download size estimates (network, about 20 minutes).       |
| `build:html`       | Regenerates `src/app.html` from the page template of [versatiles.org](https://versatiles.org). |
| `build:svelte`     | Synchronizes SvelteKit and builds the static site into `build/`.                               |
| **`preview`**      | **Serves the built site locally for previewing the production build.**                         |
| **`check`**        | **Formats code, checks types, lints, and runs unit and end-to-end tests.**                     |
| `check:svelte`     | Runs type checking for the app, the scripts and the tests.                                     |
| `check:watch`      | Runs type checking in watch mode.                                                              |
| **`test`**         | **Runs unit tests with Vitest.**                                                               |
| `test:coverage`    | Runs unit tests with coverage reporting.                                                       |
| `test:e2e`         | Runs end-to-end tests with Playwright against the development server.                          |
| `test:integration` | Runs smoke tests that execute the generated install scripts (see [Testing](#testing)).         |
| `format`           | Formats all project files using Prettier.                                                      |
| `format:check`     | Checks formatting without modifying files.                                                     |
| `lint`             | Runs ESLint for code quality.                                                                  |
| `upgrade`          | Upgrades all dependencies to their latest versions.                                            |

`npm run build:html` fetches the page template (header, navigation, footer and
styles) from versatiles.org and overwrites the committed `src/app.html`, so a
build can leave that file modified. Title, description and social media tags
are not part of the template; each page sets them with
[PageMeta.svelte](./src/lib/PageMeta/PageMeta.svelte).

## Tools

### Setup Server Tool

An interactive guide that generates the shell commands to install and run a
VersaTiles server. It is implemented in
[src/routes/setup_server](./src/routes/setup_server):

- The form is defined in [+page.svelte](./src/routes/setup_server/+page.svelte).
- Options are defined in [options.ts](./src/routes/setup_server/options.ts).
- The shell code is generated in [generate_code.ts](./src/routes/setup_server/generate_code.ts).
- The current selection is stored in the URL hash by [hash.ts](./src/routes/setup_server/hash.ts), which is what the "copy link" button shares.
- Domain, email address and port can be filled in above the generated code. They are validated in [server_settings.ts](./src/routes/setup_server/server_settings.ts) and are not part of the shared link.
- The tool uses [components/FormOptionGroup.svelte](./src/routes/setup_server/components/FormOptionGroup.svelte) to render the button groups.
- Download sizes are estimated by [components/SizeEstimate.svelte](./src/routes/setup_server/components/SizeEstimate.svelte) and [components/size_estimate.ts](./src/routes/setup_server/components/size_estimate.ts) from the size indices. An index is a quadtree of average tile sizes per zoom level, built by [scripts/build-size-index.ts](./scripts/build-size-index.ts).

### Bounding Box Tool

A map for selecting a geographic region and copying its bounding box. It is
implemented in [src/routes/bounding_box](./src/routes/bounding_box).

### External Tools

The start page also links to two tools that are not part of this repository:

- the map style editor at https://versatiles.org/maplibre-versatiles-styler/
  ([maplibre-versatiles-styler](https://github.com/versatiles-org/maplibre-versatiles-styler))
- the map editor at https://tiles.versatiles.org/editor/

## Testing

There are three layers of tests:

- **Unit tests** (`npm test`) live next to the code as `*.test.ts` and cover
  code generation, options, the URL hash and the size estimate.
- **End-to-end tests** (`npm run test:e2e`) live in [e2e](./e2e) and drive the
  site in a browser. They start their own development server and do not depend
  on the size indices.
- **Integration tests** live in [tests/integration](./tests/integration) and
  check the generated install scripts themselves:
  - `npx tsx tests/integration/extract_code.ts` writes the scripts for all
    combinations of operating system and method to
    `tests/integration/fixtures/generated/`.
  - `bash tests/integration/validate_syntax.sh` checks them with `shellcheck`
    and the PowerShell parser. Locally, a missing tool is skipped.
  - `npm run test:integration` executes the scripts for the current operating
    system, waits for the server and checks its HTTP endpoints.

The smoke tests really run the generated scripts: on this machine they install
VersaTiles (using `sudo`, Homebrew, Cargo or Docker, depending on the method)
and download map data. To be fast, they download a single map source at low
zoom levels only.

```bash
npm run test:integration -- script docker   # only these methods
npm run test:integration -- script:none     # method with a specific frontend
npm run test:integration -- script --full   # all map sources and zoom levels
```

With `--container`, the script for Linux runs inside a Docker container of the
given distribution instead, as a regular user with `sudo`. Nothing is installed
on this machine, so this also works on macOS and Windows. After the test on the
default port, the server is restarted on port 80: without `sudo` it has to fail,
with the generated command it has to work.

```bash
npm run test:integration -- script --container debian:stable-slim
npm run test:integration -- script --container fedora:latest
```

## Deployment

The [CI workflow](./.github/workflows/ci.yml) checks every pull request. On
`main` it additionally runs the smoke tests on Linux, macOS and Windows, builds
the site and deploys it to GitHub Pages. A weekly scheduled run keeps the size
indices and the page template up to date. The size indices are cached and only
rebuilt when a tile source or the build script has changed.
