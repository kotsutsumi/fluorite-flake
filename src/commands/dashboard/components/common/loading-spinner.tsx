/**
 * ローディングスピナーコンポーネント
 */
import type React from "react";
import { useEffect, useState } from "react";
import { Box, Text } from "ink";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

type LoadingSpinnerProps = {
    message?: string;
};

/**
 * ローディングスピナーコンポーネント
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    message = "Loading...",
}) => {
    const [frameIndex, setFrameIndex] = useState(0);

    // スピナーアニメーション
    useEffect(() => {
        const interval = setInterval(() => {
            setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
        }, 80);

        return () => clearInterval(interval);
    }, []);

    return (
        <Box
            alignItems="center"
            height="100%"
            justifyContent="center"
            position="absolute"
            width="100%"
        >
            <Box alignItems="center" flexDirection="column">
                <Text bold color="cyan">
                    {SPINNER_FRAMES[frameIndex]} {message}
                </Text>
                <Text color="gray" dimColor>
                    Please wait...
                </Text>
            </Box>
        </Box>
    );
};

// EOF
