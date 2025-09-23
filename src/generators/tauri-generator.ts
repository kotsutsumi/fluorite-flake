import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../commands/create.js';

export async function generateTauriProject(config: ProjectConfig) {
  // Create project directory
  await fs.ensureDir(config.projectPath);

  // Create Tauri app structure
  await createTauriAppStructure(config);

  // Setup package.json for Tauri
  await generateTauriPackageJson(config);

  // Setup TypeScript
  await setupTauriTypeScript(config);

  // Setup Tauri configuration
  await setupTauriConfig(config);

  // Setup Rust backend
  await setupRustBackend(config);

  // Setup Vite configuration
  await setupVite(config);

  // Create initial web frontend
  await createWebFrontend(config);

  // Setup .gitignore
  await createTauriGitignore(config);
}

async function createTauriAppStructure(config: ProjectConfig) {
  const dirs = [
    'src',
    'src/components',
    'src/styles',
    'src/utils',
    'src-tauri',
    'src-tauri/src',
    'public',
  ];

  for (const dir of dirs) {
    await fs.ensureDir(path.join(config.projectPath, dir));
  }
}

async function generateTauriPackageJson(config: ProjectConfig) {
  const packageJson = {
    name: config.projectName,
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: {
      dev: 'tauri dev',
      build: 'tauri build',
      preview: 'vite preview',
      tauri: 'tauri',
      'build:web': 'vite build',
      'dev:web': 'vite',
      'check:rust': 'cd src-tauri && cargo check',
      'build:rust': 'cd src-tauri && cargo build',
    },
    dependencies: {
      '@tauri-apps/api': '^2.1.1',
      '@tauri-apps/plugin-shell': '^2.0.0',
    },
    devDependencies: {
      '@tauri-apps/cli': '^2.1.0',
      typescript: '^5.7.2',
      vite: '^6.0.5',
      '@vitejs/plugin-react': '^4.3.4',
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      '@types/react': '^18.3.17',
      '@types/react-dom': '^18.3.5',
    },
  };

  await fs.writeJSON(path.join(config.projectPath, 'package.json'), packageJson, {
    spaces: 2,
  });
}

async function setupTauriTypeScript(config: ProjectConfig) {
  const tsConfig = {
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      paths: {
        '@/*': ['./src/*'],
      },
    },
    include: ['src/**/*.ts', 'src/**/*.tsx'],
    references: [{ path: './tsconfig.node.json' }],
  };

  await fs.writeJSON(path.join(config.projectPath, 'tsconfig.json'), tsConfig, { spaces: 2 });

  // Node.js TypeScript config
  const nodeConfig = {
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
      strict: true,
      noEmit: true,
    },
    include: ['vite.config.ts'],
  };

  await fs.writeJSON(path.join(config.projectPath, 'tsconfig.node.json'), nodeConfig, {
    spaces: 2,
  });
}

async function setupTauriConfig(config: ProjectConfig) {
  const tauriConfig = {
    productName: config.projectName,
    version: '0.0.0',
    identifier: `com.${config.projectName.toLowerCase()}.app`,
    build: {
      beforeDevCommand: 'npm run dev:web',
      beforeBuildCommand: 'npm run build:web',
      devUrl: 'http://localhost:1420',
      frontendDist: '../dist',
    },
    bundle: {
      active: true,
      targets: 'all',
      category: 'DeveloperTool',
      copyright: '',
      deb: {
        depends: [],
      },
      externalBin: [],
      icon: [
        'icons/32x32.png',
        'icons/128x128.png',
        'icons/128x128@2x.png',
        'icons/icon.icns',
        'icons/icon.ico',
      ],
      resources: [],
      shortDescription: '',
      longDescription: '',
    },
    security: {
      csp: null,
    },
    app: {
      windows: [
        {
          fullscreen: false,
          resizable: true,
          title: config.projectName,
          width: 800,
          height: 600,
          minWidth: 400,
          minHeight: 300,
        },
      ],
      security: {
        csp: null,
      },
    },
    plugins: {},
  };

  await fs.writeJSON(path.join(config.projectPath, 'src-tauri/tauri.conf.json'), tauriConfig, {
    spaces: 2,
  });
}

async function setupRustBackend(config: ProjectConfig) {
  // Cargo.toml
  const cargoToml = `[package]
name = "${config.projectName}"
version = "0.0.0"
description = "A Tauri App"
authors = ["you"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.1", features = ["shell-open"] }
tauri-plugin-shell = "2.0"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[features]
# This feature is used for production builds or when a dev server is not specified, DO NOT REMOVE!!
custom-protocol = ["tauri/custom-protocol"]
`;

  await fs.writeFile(path.join(config.projectPath, 'src-tauri/Cargo.toml'), cargoToml);

  // build.rs
  const buildRs = `fn main() {
    tauri_build::build()
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src-tauri/build.rs'), buildRs);

  // main.rs
  const mainRs = `// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src-tauri/src/main.rs'), mainRs);

  // Create icons directory and placeholder
  const iconsDir = path.join(config.projectPath, 'src-tauri/icons');
  await fs.ensureDir(iconsDir);

  const iconsReadme = `# Icons

Add the following icon files:
- 32x32.png
- 128x128.png
- 128x128@2x.png
- icon.icns (macOS)
- icon.ico (Windows)

You can generate these from a single high-resolution icon using tools like:
- Tauri Icon Tool (tauri icon)
- Online icon generators
- Design software like Figma, Sketch, etc.

For now, placeholders will be generated during build.
`;

  await fs.writeFile(path.join(iconsDir, 'README.md'), iconsReadme);
}

async function setupVite(config: ProjectConfig) {
  const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching \`src-tauri\`
      ignored: ['**/src-tauri/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Tauri supports es2021
    target: process.env.TAURI_DEBUG ? 'es2021' : 'chrome100',
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
}));
`;

  await fs.writeFile(path.join(config.projectPath, 'vite.config.ts'), viteConfig);
}

async function createWebFrontend(config: ProjectConfig) {
  // HTML entry point
  const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

  await fs.writeFile(path.join(config.projectPath, 'index.html'), indexHtml);

  // Main TypeScript entry
  const mainTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;

  await fs.writeFile(path.join(config.projectPath, 'src/main.tsx'), mainTsx);

  // Main App component
  const appTsx = `import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './styles/App.css';

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');

  async function greet() {
    setGreetMsg(await invoke('greet', { name }));
  }

  return (
    <main className="container">
      <h1>Welcome to ${config.projectName}!</h1>

      <div className="row">
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src="/react.svg" className="logo react" alt="React logo" />
        </a>
      </div>

      <p>Click on the Tauri and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
          value={name}
        />
        <button type="submit">Greet</button>
      </form>

      <p>{greetMsg}</p>

      <div className="features">
        <h2>✨ Features</h2>
        <ul>
          <li>🦀 Rust backend with Tauri</li>
          <li>⚛️ React frontend with TypeScript</li>
          <li>⚡ Vite for fast development</li>
          <li>🖥️ Cross-platform desktop app</li>
          <li>🔒 Secure by default</li>
        </ul>
      </div>

      <div className="commands">
        <h2>📋 Development Commands</h2>
        <ul>
          <li><code>${config.packageManager} run dev</code> - Start development server</li>
          <li><code>${config.packageManager} run build</code> - Build for production</li>
          <li><code>${config.packageManager} run check:rust</code> - Check Rust code</li>
        </ul>
      </div>
    </main>
  );
}

export default App;
`;

  await fs.writeFile(path.join(config.projectPath, 'src/App.tsx'), appTsx);

  // Global CSS
  const globalsCss = `:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f23;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

.container {
  margin: 0;
  padding-top: 10vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.react:hover {
  filter: drop-shadow(0 0 2em #61dafbaa);
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  .logo.react {
    animation: logo-spin infinite 20s linear;
  }
}

.row {
  display: flex;
  justify-content: center;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}

a:hover {
  color: #535bf2;
}

h1 {
  text-align: center;
}

input,
button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  color: #0f0f23;
  background-color: #ffffff;
  transition: border-color 0.25s;
  box-shadow: 0 2px 2px #f0f0f0;
}

button {
  cursor: pointer;
}

button:hover {
  border-color: #396cd8;
}

button:active {
  border-color: #396cd8;
  background-color: #e8e8e8;
}

input,
button {
  outline: none;
}

#greet-input {
  margin-right: 5px;
}

.features,
.commands {
  max-width: 600px;
  margin: 2rem auto;
  text-align: left;
}

.features ul,
.commands ul {
  list-style: none;
  padding: 0;
}

.features li,
.commands li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.commands code {
  background: #f4f4f4;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    color: #f6f6f6;
    background-color: #2f2f2f;
  }

  a:hover {
    color: #24c8db;
  }

  input,
  button {
    color: #ffffff;
    background-color: #0f0f0f98;
  }

  button:active {
    background-color: #0f0f0f69;
  }

  .features li,
  .commands li {
    border-bottom-color: #444;
  }

  .commands code {
    background: #444;
    color: #f6f6f6;
  }
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/styles/globals.css'), globalsCss);

  // App-specific CSS
  const appCss = `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
`;

  await fs.writeFile(path.join(config.projectPath, 'src/styles/App.css'), appCss);

  // Public assets
  const publicDir = path.join(config.projectPath, 'public');

  // Create simple SVG logos as placeholders
  const tauriSvg = `<svg width="206" height="231" viewBox="0 0 206 231" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M143.143 84C143.143 96.1503 133.293 106 121.143 106C108.992 106 99.1426 96.1503 99.1426 84C99.1426 71.8497 108.992 62 121.143 62C133.293 62 143.143 71.8497 143.143 84Z" fill="#FFC131"/>
</svg>`;

  const reactSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="35.93" height="32" viewBox="0 0 256 228">
<path fill="#00D8FF" d="M210.483 73.824c-2.1-.4-4.3-.8-6.6-1.2-2.6-11.9-6.8-22.9-12.8-32.3c2.9-2.5 5.7-4.8 8.5-7.1c14.2-11.7 26.2-20.4 35.2-25.4c3.3-1.8 6.2-3.2 8.9-4.1l1.7-.6c1.2-.3 2.4-.4 3.6-.4c4.8 0 9.6 2.1 13.1 6.2c3.5 4.1 5.1 9.7 4.4 15.3c-.7 5.6-3.1 11.1-6.9 15.9c-3.8 4.8-8.8 8.8-14.6 11.6l-1.8.9c-3.3 1.7-6.8 3.2-10.5 4.6zm-22.4-49.5c4.8 8.1 8.7 17.1 11.1 26.9c-3.4.7-6.9 1.5-10.5 2.4c-1.2-10.1-3.2-19.7-6.2-28.7c1.9-.5 3.8-.9 5.6-1.6zm-20.1 114.4c-1.1 1.2-2.2 2.4-3.4 3.5c-11.2 10.5-23.4 18.1-36.4 22.6c-5.9 2.1-11.6 3.5-17.2 4.3c-2.7.4-5.4.6-8.1.6c-10.3 0-19.9-2.2-28.6-6.6c-8.7-4.4-16.1-10.7-21.8-18.2s-9.7-15.9-12.4-24.9c-2.7-9.1-3.6-18.5-2.8-27.7c.8-9.2 3.2-18.1 7.1-26.6c3.9-8.5 9.2-16.3 15.6-23.1l1.9-2c2.9-3.1 6.1-6 9.5-8.6zm-52.8 25.5c-5.2 7.8-8.3 16.6-9.1 25.4c-.8 8.8 0 17.9 2.3 26.2c-3.3-.4-6.7-.9-10.1-1.6c-1.8-8.9-2.6-18.2-2.4-27.2c.2-9 1.2-17.9 3.2-26.4c5.4-.6 10.8-1.1 16.1-1.4zm39.3-11.7c-.2.2-.5.4-.7.6c-.5-.1-1-.1-1.5-.2c-.9-7.7-2.3-15.1-4.2-22.2c2.1-.9 4.2-1.8 6.4-2.7c1-.6 2-.8 3.1-.7c1.1.1 2.2.6 3.1 1.4c1.5 1.4 2.7 3 3.5 4.9c.8 1.9 1.1 4.1.8 6.1c-.4 2.2-1.3 4.3-2.7 6.1c-1.4 1.8-3.2 3.1-5.2 4l-.6.4zm-16.4-32.3c.4-.9.7-1.8 1.1-2.8c6.8-15.9 12.1-33.4 15.6-51.9c1.3-7.3 2.3-14.8 2.9-22.3c.3-3.7.5-7.5.5-11.2c0-3.4-.2-6.8-.6-10.2c-.4-3.4-1.1-6.7-2.1-9.9c-.5-1.6-1.1-3.2-1.9-4.7c-.4-.7-.8-1.5-1.3-2.2c-.2-.4-.5-.7-.8-1.1c-.1-.2-.3-.4-.4-.5c-.1-.1-.3-.3-.4-.4c-.2-.1-.4-.3-.7-.4c-.5-.2-1.2-.4-1.9-.5c-1.4-.2-2.9-.2-4.4-.1c-3 .3-6.1.9-9.1 1.7c-6.1 1.6-12.1 4.4-17.7 8.1c-11.3 7.4-21.2 18.4-29.4 31.1c-.8 1.2-1.5 2.5-2.2 3.8c-2.8-1.6-5.7-3.1-8.6-4.5c7.2-14.1 16.2-26.7 26.8-37.3c10.7-10.6 22.8-19.3 36.1-25.8c6.6-3.2 13.4-5.6 20.6-7.2c3.6-.8 7.2-1.4 10.9-1.7c1.8-.2 3.7-.2 5.5-.1c.9.1 1.8.2 2.6.4c.4.1.8.2 1.2.3c.2.1.4.1.6.2c.1 0 .3.1.4.1c.1 0 .1.1.2.1c.1 0 .1.1.2.1c.1.1.2.1.3.2c.2.2.4.4.6.7c.2.3.4.7.5 1.1c.3.8.5 1.7.6 2.6c.2 1.8.2 3.7.1 5.6c-.2 3.8-.7 7.6-1.4 11.4c-1.4 7.6-3.6 15.1-6.4 22.4c-5.8 14.7-13.8 28.4-23.8 40.4c-.5.6-1 1.2-1.6 1.8c-1.2-1.4-2.7-2.6-4.3-3.7c.5-.6 1-1.3 1.4-1.9z"/>
</svg>`;

  const viteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 257">
<defs>
<linearGradient id="IconifyId1813088fe1fbc01fb466" x1="-.828%" x2="57.636%" y1="7.652%" y2="78.411%">
<stop offset="0%" stop-color="#41D1FF"/>
<stop offset="100%" stop-color="#BD34FE"/>
</linearGradient>
<linearGradient id="IconifyId1813088fe1fbc01fb467" x1="43.376%" x2="50.316%" y1="2.242%" y2="89.03%">
<stop offset="0%" stop-color="#FFEA83"/>
<stop offset="8.333%" stop-color="#FFDD35"/>
<stop offset="100%" stop-color="#FFA800"/>
</linearGradient>
</defs>
<path fill="url(#IconifyId1813088fe1fbc01fb466)" d="M255.153 37.938L134.897 252.976c-2.483 4.44-8.862 4.466-11.382.048L.875 37.958c-2.746-4.814 1.371-10.646 6.827-9.67l120.385 21.517a6.537 6.537 0 0 0 2.322-.004l117.867-21.483c5.438-.991 9.574 4.796 6.877 9.62Z"/>
<path fill="url(#IconifyId1813088fe1fbc01fb467)" d="M185.432.063L96.44 17.501a3.268 3.268 0 0 0-2.634 3.014l-5.474 92.456a3.268 3.268 0 0 0 3.997 3.378l24.777-5.718c2.318-.535 4.413 1.507 3.936 3.838l-7.361 36.047c-.495 2.426 1.782 4.5 4.151 3.78l15.304-4.649c2.372-.72 4.652 1.36 4.15 3.788l-11.698 56.621c-.732 3.542 3.979 5.473 5.943 2.437l1.313-2.028l72.516-144.72c1.215-2.423-.88-5.186-3.54-4.672l-25.505 4.922c-2.396.462-4.435-1.77-3.759-4.114l16.646-57.705c.677-2.35-1.37-4.583-3.769-4.113Z"/>
</svg>`;

  await fs.writeFile(path.join(publicDir, 'tauri.svg'), tauriSvg);
  await fs.writeFile(path.join(publicDir, 'react.svg'), reactSvg);
  await fs.writeFile(path.join(publicDir, 'vite.svg'), viteSvg);
}

async function createTauriGitignore(config: ProjectConfig) {
  const gitignoreContent = `# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Tauri
/src-tauri/target
/src-tauri/Cargo.lock
`;

  await fs.writeFile(path.join(config.projectPath, '.gitignore'), gitignoreContent);
}
