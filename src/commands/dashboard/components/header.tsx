import type { JSX } from "react";
import { Box, Text } from "ink";

type HeaderProps = {
    title: string;
    activeServiceLabel: string;
    serviceName: string;
};

// 現在アクティブなサービス名とタイトルを表示するヘッダー。
export function Header({ title, activeServiceLabel, serviceName }: HeaderProps): JSX.Element {
    return (
        <Box marginX={1} justifyContent="space-between">
            <Text color="blackBright">🚀 {title}</Text>
            <Text color="blackBright">
                {activeServiceLabel}: <Text color="green">{serviceName}</Text>
            </Text>
        </Box>
    );
}

// ファイル終端
