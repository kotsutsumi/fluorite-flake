import { Box, Text } from "ink";

import type { TursoSectionComponent } from "./types.js";

// 組織設定に関する案内文を提供するセクション。
export const OrganizationSection: TursoSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* 見出しを強調しつつ詳細文を続けて表示する。 */}
        <Text color="cyanBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
