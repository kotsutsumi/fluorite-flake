# Style and Conventions
- Source written in strict TypeScript modules (ESM) with `src` as the root directory.
- Biome enforces two-space indentation, LF endings, single quotes, required semicolons, max line width 100, organized imports.
- Use `camelCase` for variables/functions, `PascalCase` for types/classes, kebab-case for CLI command names.
- Keep CLI wiring in `src/cli.ts`; place reusable logic in separate helpers exported from `src/index.ts`.
- Generated code in `dist/` should never be edited manually.
