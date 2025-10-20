const TEMPLATE = `Usage: pnpm env:pull [options]

Options:
  --project-root <path>    Repository root (defaults to current working directory)
  --apps <names>           Comma separated app names (web,docs,backend)
  --target <name>          Target environment (preview, production, staging, all)
  --help                   Show this message

Examples:
  pnpm env:pull
  pnpm env:pull --apps web,backend
  pnpm env:pull --target preview
`;

export function printEnvPullUsage(scriptPath?: string): void {
  const message = scriptPath ? TEMPLATE.replace("pnpm env:pull", `tsx ${scriptPath}`) : TEMPLATE;
  console.log(message.trimEnd());
}

// EOF
