import { Box, Text } from "ink";

import type { TursoSectionComponent } from "./types.js";

// チームメンバー操作に関する案内を担うセクション。
export const MemberSection: TursoSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* シンプルなプレースホルダーでもレイアウトが崩れないようにする。 */}
        <Text color="blueBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
