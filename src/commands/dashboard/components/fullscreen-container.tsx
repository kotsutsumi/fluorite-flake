import { useEffect, useState } from "react";
import type { JSX, PropsWithChildren } from "react";
import { Box, useStdout } from "ink";

type TerminalSize = {
    columns: number | undefined;
    rows: number | undefined;
};

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

export function FullscreenContainer({ children }: PropsWithChildren): JSX.Element {
    const { stdout } = useStdout();
    const size = useTerminalSize();

    useEffect(() => {
        if (!stdout) {
            return;
        }

        stdout.write("\u001b[2J\u001b[3J\u001b[H");
    }, [stdout]);

    return (
        <Box flexDirection="column" width={size.columns ?? undefined} height={size.rows ?? undefined} flexGrow={1}>
            {children}
        </Box>
    );
}

// EOF
