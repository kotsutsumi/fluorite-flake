# Repository Guidelines

## Project Structure & Module Organization
- `src/cli.ts` hosts the Commander-based CLI with chalk-powered output; keep CLI-only utilities here.
- `src/index.ts` exposes reusable helpers (`greet`, `rainbow`) for library consumers; export new APIs from this module.
- `dist/` stores compiled JS and declaration artifacts created by `pnpm build`; never edit generated files by hand.
- `tsconfig.json` pins strict TypeScript settings with `src` as `rootDir`; mirror that layout when adding folders.
- `biome.json` defines project-wide formatting and linting; update rules centrally rather than per-file overrides.

## Build, Test, and Development Commands
- `pnpm install` installs dependencies for Node ≥18.
- `pnpm dev` runs the CLI through `tsx src/cli.ts` for rapid iteration (auto-restarts on changes).
- `pnpm build` compiles TypeScript to `dist/` and emits type declarations; run before publishing.
- `pnpm lint` and `pnpm check` apply Biome’s lint + analyzer suites; resolve warnings before opening a PR.
- `pnpm format` rewrites sources to match the enforced style; run after broad edits.

## Coding Style & Naming Conventions
- Biome enforces LF line endings, two-space indentation, single quotes, and semicolons; commit only formatted code.
- Prefer descriptive `camelCase` for functions/variables, `PascalCase` for exported types or classes, and kebab-case for command names.
- Keep modules small: CLI command wiring stays in `cli.ts`, pure logic belongs in dedicated helpers imported by both CLI and library.

## Testing Guidelines
- A formal test runner is not configured yet; when adding coverage, place `*.test.ts` files under `src/` (the compiler excludes them) and execute them via `pnpm exec tsx path/to/test.ts`.
- Provide repro scripts or CLI snapshots in the PR when fixing bugs.
- Manually validate key flows (`pnpm dev`, `fluorite-flake greet`, `fluorite-flake status`) and document expected output in the PR description.

## Commit & Pull Request Guidelines
- Follow short, present-tense commit subjects (e.g., `Add rainbow helper`) with concise bodies when needed; group unrelated changes into separate commits.
- Ensure every PR includes: summary of changes, testing notes, screenshots or terminal captures for CLI updates, and references to issues or discussions.
- Confirm `pnpm lint`, `pnpm check`, and `pnpm build` succeed before requesting review; link to the command output if failures are unresolved.
