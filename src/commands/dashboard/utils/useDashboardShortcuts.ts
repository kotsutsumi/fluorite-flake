import { useApp, useInput } from "ink";

import { useDashboard } from "../state/dashboard-store.js";

// ダッシュボード全体で使うキーボードショートカットを登録するカスタムフック。
export function useDashboardShortcuts(): void {
    const { exit } = useApp();
    const { cycleService, setActiveService, isInputMode } = useDashboard();

    // 入力モードかどうかを確認しながら、サービス切り替えなどの操作を割り当てる。
    useInput((input, key) => {
        if (isInputMode) {
            return;
        }

        if (!input) {
            return;
        }

        // 大文字・小文字の揺れを吸収して判定を簡略化する。
        const normalized = input.toLowerCase();

        if (normalized === "s") {
            cycleService();
        }

        if (normalized === "l") {
            setActiveService("logs");
        }

        if (normalized === "q" || key.escape) {
            exit();
        }
    });
}

// ファイル終端
