import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { Box, Text } from "ink";

type FooterProps = {
    shortcutsLabel: string;
    versionLabel: string;
};

export function Footer({ shortcutsLabel, versionLabel }: FooterProps): JSX.Element {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    const formatter = useMemo(
        () =>
            new Intl.DateTimeFormat(undefined, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }),
        []
    );

    const timestamp = useMemo(() => formatter.format(now), [formatter, now]);

    return (
        <Box marginTop={0} marginX={1} justifyContent="space-between">
            <Text dimColor>{shortcutsLabel}</Text>
            <Text dimColor>
                {versionLabel} {timestamp}
            </Text>
        </Box>
    );
}

// EOF
