# Project Overview
- TypeScript-based CLI utility (`fluorite-flake`) that styles terminal output with ANSI colors.
- Ships both a CLI entry point (`src/cli.ts`) and reusable library exports (`src/index.ts`).
- Uses Commander for argument parsing, Chalk for colors, and Ora for spinners.
- Build artifacts live in `dist/` and are published via npm (package.json `bin` maps to `dist/cli.js`).
- Tooling: pnpm workspace, TypeScript (strict config), TSX for dev runs, Biome for formatting/linting, Husky for Git hooks (prepare script).
