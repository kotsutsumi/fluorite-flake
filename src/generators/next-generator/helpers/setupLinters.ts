/**
 * Biome（コードフォーマッター・リンター）の設定を行うヘルパー関数
 * Next.jsプロジェクト用に最適化されたBiome設定を生成する
 */

import path from 'node:path';
import fs from 'fs-extra';
import type { ProjectConfig } from '../../../commands/create/types.js';

/**
 * Biome（コードフォーマッター・リンター）の設定を行う
 * @param config プロジェクト設定
 */
export async function setupLinters(config: ProjectConfig): Promise<void> {
    // Biome設定オブジェクト
    const biomeConfig = {
        $schema: 'https://biomejs.dev/schemas/1.9.4/schema.json',
        vcs: {
            enabled: true,
            clientKind: 'git',
            useIgnoreFile: true,
        },
        files: {
            ignore: ['node_modules', '.next', 'dist', '*.min.js', 'coverage'],
        },
        formatter: {
            enabled: true,
            formatWithErrors: false,
            indentStyle: 'space',
            indentWidth: 2,
            lineEnding: 'lf',
            lineWidth: 100,
        },
        organizeImports: {
            enabled: true,
        },
        linter: {
            enabled: true,
            rules: {
                recommended: true,
                complexity: {
                    noExtraBooleanCast: 'error',
                    noMultipleSpacesInRegularExpressionLiterals: 'error',
                    noUselessCatch: 'error',
                    noWith: 'error',
                    useArrowFunction: 'error',
                },
                correctness: {
                    noConstAssign: 'error',
                    noConstantCondition: 'error',
                    noEmptyCharacterClassInRegex: 'error',
                    noEmptyPattern: 'error',
                    noGlobalObjectCalls: 'error',
                    noInvalidConstructorSuper: 'error',
                    noInvalidUseBeforeDeclaration: 'error',
                    noNewSymbol: 'error',
                    noPrecisionLoss: 'error',
                    noSelfAssign: 'error',
                    noSetterReturn: 'error',
                    noSwitchDeclarations: 'error',
                    noUndeclaredVariables: 'error',
                    noUnreachable: 'error',
                    noUnreachableSuper: 'error',
                    noUnsafeFinally: 'error',
                    noUnsafeOptionalChaining: 'error',
                    noUnusedLabels: 'error',
                    noUnusedVariables: 'error',
                    useIsNan: 'error',
                    useValidForDirection: 'error',
                    useYield: 'error',
                },
                style: {
                    noCommaOperator: 'error',
                    noNamespace: 'error',
                    noNonNullAssertion: 'warn',
                    noParameterAssign: 'error',
                    noVar: 'error',
                    useAsConstAssertion: 'error',
                    useBlockStatements: 'error',
                    useConst: 'error',
                    useDefaultParameterLast: 'error',
                    useExponentiationOperator: 'error',
                    useNumericLiterals: 'error',
                    useShorthandAssign: 'error',
                    useSingleVarDeclarator: 'error',
                    useTemplate: 'error',
                },
                suspicious: {
                    noAsyncPromiseExecutor: 'error',
                    noCatchAssign: 'error',
                    noClassAssign: 'error',
                    noCompareNegZero: 'error',
                    noConfusingLabels: 'error',
                    noControlCharactersInRegex: 'error',
                    noDebugger: 'error',
                    noDoubleEquals: 'error',
                    noDuplicateCase: 'error',
                    noDuplicateClassMembers: 'error',
                    noDuplicateJsxProps: 'error',
                    noDuplicateObjectKeys: 'error',
                    noDuplicateParameters: 'error',
                    noEmptyBlockStatements: 'error',
                    noFallthroughSwitchClause: 'error',
                    noFunctionAssign: 'error',
                    noGlobalAssign: 'error',
                    noImportAssign: 'error',
                    noLabelVar: 'error',
                    noMisleadingCharacterClass: 'error',
                    noPrototypeBuiltins: 'error',
                    noRedeclare: 'error',
                    noSelfCompare: 'error',
                    noShadowRestrictedNames: 'error',
                    noUnsafeNegation: 'error',
                    useDefaultSwitchClauseLast: 'error',
                    useValidTypeof: 'error',
                },
            },
        },
        javascript: {
            formatter: {
                quoteStyle: 'single',
                jsxQuoteStyle: 'double',
                quoteProperties: 'asNeeded',
                trailingCommas: 'es5',
                semicolons: 'always',
                arrowParentheses: 'always',
                bracketSameLine: false,
                bracketSpacing: true,
            },
        },
    };

    await fs.writeJSON(path.join(config.projectPath, 'biome.json'), biomeConfig, {
        spaces: 2,
    });
}
