import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// シークレット管理に関するプレースホルダーコンポーネント。
export const SecretsSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* セクションタイトルを強調し、補足情報を続けて表示する。 */}
        <Text color="cyanBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
