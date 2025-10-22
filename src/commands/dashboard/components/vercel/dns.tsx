import { Box, Text } from "ink";

import type { VercelSectionComponent } from "./types.js";

// DNS 設定を扱うセクション。該当情報がまだ無い場合のプレースホルダー。
export const DnsSection: VercelSectionComponent = ({ sectionLabel, placeholder }) => (
    <Box flexDirection="column">
        {/* 見出しを鮮やかに表示し、補足説明を続ける。 */}
        <Text color="cyanBright">{sectionLabel}</Text>
        <Text>{placeholder}</Text>
    </Box>
);

// ファイル終端
