/**
 * コマンドライン引数にモノレポ制御フラグが含まれているかを判定する
 */

/**
 * モノレポ関連フラグが明示指定されているかを調べる
 */
export function hasExplicitMonorepoFlag(rawArgs: unknown): boolean {
    // 引数が配列でない場合に備えて空配列へフォールバックする
    const rawArgList = Array.isArray(rawArgs) ? rawArgs : [];
    // 許可されたフラグ名に一致する要素があるかを走査する
    return rawArgList.some(
        (arg) =>
            ["--monorepo", "--no-monorepo", "-m"].some((flag) => arg === flag || arg.startsWith(`${flag}=`)) ||
            arg.startsWith("--monorepo=")
    );
}

// EOF
