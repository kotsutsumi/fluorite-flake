/**
 * README.mdの内容を生成するユーティリティ
 */
import type { ProjectConfig } from "../../commands/create/types.js";
import { getMessages } from "../../i18n.js";

/**
 * プロジェクト設定に基づいてREADME.mdの内容を生成する
 */
export function generateReadmeContent(config: ProjectConfig): string {
    const { readme } = getMessages();

    if (config.monorepo) {
        return generateMonorepoReadme(config, readme);
    }
    return generateSimpleReadme(config, readme);
}

/**
 * シンプルプロジェクト用のREADME内容を生成
 */
function generateSimpleReadme(
    config: ProjectConfig,
    readme: ReturnType<typeof getMessages>["readme"]
): string {
    const { name, type, template } = config;

    // 基本的なコマンドリストを作成
    const gettingStartedCommands = readme.gettingStartedCommands
        .map((cmd: string) => `\`\`\`bash\n${cmd}\n\`\`\``)
        .join("\n\n");

    return `# ${readme.title.replace("{name}", name)}

${readme.description.replace("{type}", type)}

## ${readme.gettingStartedHeading}

${gettingStartedCommands}

## ${readme.learnMoreHeading}

${readme.templateDescription.replace("{template}", template || "typescript")}

## ${readme.convertToMonorepoHeading}

${readme.convertToMonorepoDescription}
\`\`\`bash
${readme.convertToMonorepoCommand}
\`\`\`
`;
}

/**
 * モノレポプロジェクト用のREADME内容を生成
 */
function generateMonorepoReadme(
    config: ProjectConfig,
    readme: ReturnType<typeof getMessages>["readme"]
): string {
    const { name } = config;

    // 開発コマンドリストを作成
    const developmentCommands = readme.developmentCommands
        .map((cmd: string) => `\`\`\`bash\n${cmd}\n\`\`\``)
        .join("\n\n");

    // ビルドコマンドリストを作成
    const buildingCommands = readme.buildingCommands
        .map((cmd: string) => `\`\`\`bash\n${cmd}\n\`\`\``)
        .join("\n\n");

    // テストコマンドリストを作成
    const testingCommands = readme.testingCommands
        .map((cmd: string) => `\`\`\`bash\n${cmd}\n\`\`\``)
        .join("\n\n");

    return `# ${readme.title.replace("{name}", name)}

${readme.monorepoDescription}

## ${readme.workspaceStructureHeading}

${readme.workspaceStructureDescription}

\`\`\`
${name}/
├── apps/
│   └── web/          # メインWebアプリケーション
├── packages/         # 共有パッケージ
├── package.json      # ワークスペース設定
├── pnpm-workspace.yaml
└── turbo.json        # Turbo設定
\`\`\`

## ${readme.developmentHeading}

${developmentCommands}

## ${readme.buildingHeading}

${buildingCommands}

## ${readme.testingHeading}

${testingCommands}
`;
}

// EOF
