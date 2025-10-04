/**
 * Flutter用.gitignoreファイルを作成するヘルパー関数
 * Flutterプロジェクトに特化したgit無視設定を生成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Flutter用.gitignoreファイルを作成する
 * @param config プロジェクト設定
 */
export async function createFlutterGitignore(config: ProjectConfig) {
    const gitignoreContent = `# Miscellaneous
*.class
*.log
*.pyc
*.swp
.DS_Store
.atom/
.buildlog/
.history
.svn/
migrate_working_dir/

# IntelliJ related
*.iml
*.ipr
*.iws
.idea/

# The .vscode folder contains launch configuration and tasks you configure in
# VS Code which you may wish to be included in version control, so this line
# is commented out by default.
#.vscode/

# Flutter/Dart/Pub related
**/doc/api/
**/ios/Flutter/.last_build_id
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
/build/

# Symbolication related
app.*.symbols

# Obfuscation related
app.*.map.json

# Android Studio will place build artifacts here
/android/app/debug
/android/app/profile
/android/app/release
`;

    await fs.writeFile(path.join(config.projectPath, '.gitignore'), gitignoreContent);
}
