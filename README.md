# fluorite-flake ✨

A beautiful CLI utility with ANSI colors for terminal output styling.

## Features

- 🎨 **Beautiful ANSI colors** - Rich color support using chalk
- 🌈 **Rainbow text** - Display text in rainbow colors
- ⚡ **Fast and lightweight** - Built with TypeScript and modern tooling
- 📦 **Global installation** - Use anywhere on your system
- 🔧 **TypeScript support** - Fully typed for better developer experience

## Installation

Install globally via pnpm:

```bash
pnpm add -g fluorite-flake
```

Or use locally in your project:

```bash
pnpm add fluorite-flake
```

## Usage

### CLI Commands

After global installation, you can use the `fluorite-flake` command:

```bash
# Show help
fluorite-flake --help

# Greet someone
fluorite-flake greet John
fluorite-flake greet John --uppercase
fluorite-flake greet John --color green

# Display rainbow text
fluorite-flake rainbow "Hello World"

# Show system status with colors
fluorite-flake status
```

### Programmatic Usage

You can also use it as a library in your Node.js projects:

```typescript
import { greet, rainbow, chalk } from 'fluorite-flake';

// Greet function
console.log(greet('World')); // Hello, World! (in cyan)
console.log(greet('World', { uppercase: true, color: 'magenta' })); // Hello, WORLD! (in magenta)

// Rainbow text
console.log(rainbow('Colorful text!'));

// Direct chalk usage
console.log(chalk.bold.green('Success!'));
```

## Development

### Setup

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm run dev

# Build the project
pnpm run build

# Format code with Biome
pnpm run format

# Lint code
pnpm run lint

# Run checks
pnpm run check
```

### Project Structure

```
fluorite-flake/
├── src/
│   ├── cli.ts      # CLI entry point
│   └── index.ts    # Library exports
├── dist/           # Compiled output
├── package.json    # Package configuration
├── tsconfig.json   # TypeScript configuration
└── biome.json      # Biome formatter/linter configuration
```

### Tools & Technologies

- **TypeScript** - Type-safe JavaScript
- **Biome** - Fast formatter and linter
- **Husky** - Git hooks for code quality
- **Commander** - CLI framework
- **Chalk** - Terminal string styling
- **Ora** - Elegant terminal spinners

## Publishing to npm

1. Make sure you're logged in to npm registry:
   ```bash
   pnpm login
   ```

2. Build the project:
   ```bash
   pnpm run build
   ```

3. Publish to npm:
   ```bash
   pnpm publish
   ```

## License

MIT © Fluorite Flake Contributors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
