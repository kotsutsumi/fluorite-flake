/**
 * エラーモーダルコンポーネント
 */

import { Box, Text, useInput } from "ink";
import type React from "react";
import { setErrorMessage } from "../../state/dashboard-store.js";

type ErrorModalProps = {
    message: string;
    title?: string;
};

/**
 * エラーモーダルコンポーネント
 */
export const ErrorModal: React.FC<ErrorModalProps> = ({
    message,
    title = "Error",
}) => {
    // ESCキーまたはEnterキーでモーダルを閉じる
    useInput((_input, key) => {
        if (key.escape || key.return) {
            setErrorMessage(undefined);
        }
    });

    return (
        <Box
            alignItems="center"
            height="100%"
            justifyContent="center"
            position="absolute"
            width="100%"
        >
            <Box
                borderColor="red"
                borderStyle="double"
                flexDirection="column"
                padding={2}
                width={60}
            >
                {/* エラータイトル */}
                <Box marginBottom={1}>
                    <Text bold color="red">
                        ❌ {title}
                    </Text>
                </Box>

                {/* エラーメッセージ */}
                <Box marginBottom={2}>
                    <Text color="white">{message}</Text>
                </Box>

                {/* 操作説明 */}
                <Box justifyContent="center">
                    <Text color="gray">Press [Enter] or [Esc] to close</Text>
                </Box>
            </Box>
        </Box>
    );
};

// EOF
