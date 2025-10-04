/**
 * コード解析オプションファイルを設定するヘルパー関数
 * Dart/Flutterのコード品質と一貫性を保つための設定を行う
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * コード解析オプションファイル（analysis_options.yaml）を設定する
 * @param config プロジェクト設定
 */
export async function setupAnalysisOptions(config: ProjectConfig) {
    const analysisOptions = `# This file configures the analyzer, which statically analyzes Dart code to
# check for errors, warnings, and lints.
#
# The issues identified by the analyzer are surfaced in the UI of Dart-enabled
# IDEs (https://dart.dev/tools#ides-and-editors). The analyzer can also be
# invoked from the command line by running \`flutter analyze\`.

# The following line activates a set of recommended lints for Flutter apps,
# packages, and plugins designed to encourage good coding practices.
include: package:flutter_lints/flutter.yaml

linter:
  # The lint rules applied to this project can be customized in the
  # section below to disable rules from the \`package:flutter_lints/flutter.yaml\`
  # included above or to enable additional rules. A list of all available lints
  # and their documentation is published at https://dart.dev/lints.
  #
  # Instead of disabling a lint rule for the entire project in the
  # section below, it can also be suppressed for a single line of code
  # or a specific dart file by using the \`// ignore: name_of_lint\` and
  # \`// ignore_for_file: name_of_lint\` syntax on the line or in the file
  # producing the lint.
  rules:
    prefer_single_quotes: true
    require_trailing_commas: true
    sort_child_properties_last: true
`;

    await fs.writeFile(path.join(config.projectPath, 'analysis_options.yaml'), analysisOptions);
}
