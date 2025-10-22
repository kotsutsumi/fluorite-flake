import { useEffect, useState } from "react";
import type { JSX, PropsWithChildren } from "react";
import { Box, useStdout } from "ink";

type TerminalSize = {
    columns: number | undefined;
    rows: number | undefined;
};

// ターミナルのサイズ変更イベントを監視し、常に最新の幅・高さを保持する。
function useTerminalSize(): TerminalSize {
    const { stdout } = useStdout();
    const [size, setSize] = useState<TerminalSize>({
        columns: stdout?.columns,
        rows: stdout?.rows,
    });

    useEffect(() => {
        if (!stdout) {
            return;
        }

        const updateSize = () => {
            setSize({
                columns: stdout.columns,
                rows: stdout.rows,
            });
        };

        stdout.on("resize", updateSize);
        updateSize();

        return () => {
            stdout.off("resize", updateSize);
        };
    }, [stdout]);

    return size;
}

// Ink アプリ全体をターミナルのフルサイズに合わせてラップするコンテナ。
export function FullscreenContainer({ children }: PropsWithChildren): JSX.Element {
    const { stdout } = useStdout();
    const size = useTerminalSize();

    useEffect(() => {
        if (!stdout) {
            return;
        }

        // ANSI シーケンスで画面を初期化し、残像が残らないようにする。
        stdout.write("\u001b[2J\u001b[3J\u001b[H");
    }, [stdout]);

    return (
        <Box flexDirection="column" width={size.columns ?? undefined} height={size.rows ?? undefined} flexGrow={1}>
            {children}
        </Box>
    );
}

// ファイル終端
