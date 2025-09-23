// Main library exports for programmatic usage
import chalk from 'chalk';

export interface GreetOptions {
  uppercase?: boolean;
  color?: string;
}

export function greet(name = 'World', options: GreetOptions = {}): string {
  const displayName = options.uppercase ? name.toUpperCase() : name;

  // Get the color function from chalk
  let colorFn = chalk.cyan;
  if (options.color && typeof chalk[options.color as keyof typeof chalk] === 'function') {
    colorFn = chalk[options.color as keyof typeof chalk] as typeof chalk.cyan;
  }

  return colorFn(`Hello, ${displayName}!`);
}

export function rainbow(text: string): string {
  const colors = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.blue, chalk.magenta];

  return text
    .split('')
    .map((char, index) => colors[index % colors.length](char))
    .join('');
}

export { chalk };
