<h1 align="center">
  <img width="36" height="36" src="assets/icon.png"/><br/>
  Shinkai apps
</h1>
<p align="center">Shinkai apps unlock the full capabilities/automation of first-class LLM (AI) support in the web browser. It enables creating multiple agents, each connected to either local or 3rd-party LLMs (ex. OpenAI GPT), which have permissioned (meaning secure) access to act in every webpage you visit.
<br/>
<br/>
There is a companion repo called Shinkai Node, that allows you to set up the node anywhere as the central unit of the Shinkai Network, handling tasks such as agent management, job processing, and secure communications.
You can find it <a href="https://github.com/dcSpark/shinkai-node">here</a>.</p><br/>

## Demo

https://github.com/user-attachments/assets/bc5bb7da-7ca5-477d-838a-8239951b6c01


## Documentation

General Documentation: [https://docs.shinkai.com](https://docs.shinkai.com)

## Projects

### Apps

- shinkai-visor: Shinkai Visor is a chrome extension to interact with shinkai-node.
- shinkai-desktop: Shinkai Desktop is a desktop app to interact with shinkai-node.

### Libs

- shinkai-message-ts: Typescript library that implements the features and networking layer to enable systems to interact with shinkai-nodes.
- shinkai-node-state: Typescript library which using @tanstack/react-query enables apps to interact with shinkai-node managing the state, caching and evictions.
- shinkai-ui: React UI library to build shinkai apps.

## Getting started

To get started first clone this repo:

```
$ git clone https://github.com/dcSpark/shinkai-apps
```

### Download side binaries:

#### Macos
```
ARCH="aarch64-apple-darwin" \
OLLAMA_VERSION="v0.6.6" \
SHINKAI_NODE_VERSION="v1.0.0" \
npx ts-node ./ci-scripts/download-side-binaries.ts
```

#### Linux
```
ARCH="x86_64-unknown-linux-gnu" \
OLLAMA_VERSION="v0.6.6" \
SHINKAI_NODE_VERSION="v1.0.0" \
npx ts-node ./ci-scripts/download-side-binaries.ts
```

#### Windows
```
$ENV:OLLAMA_VERSION="v0.6.6";
$ENV:SHINKAI_NODE_VERSION="v1.0.0";
$ENV:ARCH="x86_64-pc-windows-msvc";
npx ts-node ./ci-scripts/download-side-binaries.ts
```

### Run one of the projects
Once you have done that simply use `npm` to compile/serve it yourself:

```
cd shinkai-apps
nvm use
npm ci
npx nx serve {project-name} # IE: npx nx serve shinkai-desktop
```

### Project specific configurations

- shinkai-visor: As this is a Chrome Extension, after build, developers needs to load it in chrome:

  1. Open Chrome.
  2. Navigate to `chrome://extensions`.
  3. Enable _Developer mode_.
  4. Click _Load unpacked_.
  5. Select the `./dist/apps/shinkai-visor` folder which contains the output of the building process using commands like `npx nx serve shinkai-visor`.

- shinkai-desktop: For development and building purposes
  - Run as a Desktop App using Vite:
    Run `npx nx serve:tauri shinkai-desktop` and it will automatically launch the Shinkai Desktop application.
  - Run as a Web App:
    Run `npx nx serve shinkai-desktop` and open a browser and navigate to `http://localhost:1420`.

### Useful Commands

Every command, if it's needed, build projects and it's dependencies according to the project dependency tree inferred from imports between them.

- Run a single task

  Command: `npx nx [target] [project-name]`

  Params:

  - target: build | serve | lint | test | e2e

  IE:

  - `npx nx build shinkai-visor`
  - `npx nx lint shinkai-message-ts`
  - `npx nx e2e shinkai-visor`
  - `npx nx serve shinkai-desktop`

- Run many tasks

  Command: `npx nx run-many --target=[target]`

  Params:

  - target: build | serve | lint | test | e2e

  IE:

  - `npx nx run-many --target=build`
  - `npx nx run-many --target=lint`
  - `npx nx run-many --target=test`
  - `npx nx run-many --target=e2e`
  - `npx nx run-many --target=serve`

- Run on affected projects

  Command: `npx nx affected --target=[target]`

  Params:

  - target: build | serve | lint | test | e2e

  IE:

  - `npx nx affected --target=build`

> When you build a project, NX builds a cache (to make it faster), if you want to skip it just add the parameter `--skip-nx-cache` to the previous commands.

- Create a dev build
  - `NODE_OPTIONS="--max_old_space_size=8192" npx nx build shinkai-desktop --config="./src-tauri/tauri.conf.development.json"`

- Update ollama models repository
  - `npx ts-node ./ci-scripts/generate-ollama-models-repository.ts`

## Dev conventions

### Monorepo

To orchestrate all the tasks, dependencies and hierarchy between different projects, this repository uses [NX](https://nx.dev/) as a monorepo tooling.

### Third party dependencies

All projects share the same base of dependencies defined `./package.json` file found in the root of the repository. Nested package json files are used just to override or extends base attributes.

### UI Libraries

To build the UI there are 3 core libraries:

- [radix](https://www.radix-ui.com/) to have base unstyled components.
- [shadcn](https://ui.shadcn.com/) to obtain ready to use components.
- [tailwindcss](https://tailwindui.com/) to implement css customizations, structures, layouts and helpers.

### State management

To implement state management there are two different libraries:

- [zustand](https://docs.pmnd.rs/zustand/getting-started/introduction): To implement UI State
- [react-query](https://tanstack.com/query/v4): To implement data state
