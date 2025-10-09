import { importPage } from "nextra/pages";
import { useMDXComponents as getMDXComponents } from "../../../../mdx-components";

// サポートされるロケール
const locales = ["en-US", "ja-JP"];

// 静的生成用のパラメータ生成
export async function generateStaticParams() {
    const params = [];

    // 各ロケールについてパラメータを生成
    for (const locale of locales) {
        try {
            // get-startedページを各ロケールで生成
            params.push({
                locale,
                mdxPath: ["get-started"],
            });
        } catch (error) {
            console.warn(`Could not generate params for locale: ${locale}`, error);
        }
    }

    return params;
}

// メタデータ生成
export async function generateMetadata({ params }) {
    const { locale, mdxPath } = await params;

    try {
        // ロケール固有のメタデータを取得
        const { metadata } = await importPage(mdxPath);
        return metadata;
    } catch (error) {
        console.warn(`Could not load metadata for ${mdxPath.join("/")}, locale: ${locale}`);
        return {
            title: locale === "ja-JP" ? "はじめに" : "Get Started",
        };
    }
}

const Wrapper = getMDXComponents().wrapper;

export default async function LocalizedPage({ params }) {
    const { locale, mdxPath } = await params;

    try {
        // ロケール固有のファイル名を構築（例: get-started.ja-JP）
        const localizedPath = mdxPath.map((path) => `${path}.${locale}`);

        // 指定されたパスのコンテンツを読み込み
        const { default: MDXContent, toc, metadata, sourceCode } = await importPage(localizedPath);

        return (
            <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
                <MDXContent params={params} />
            </Wrapper>
        );
    } catch (error) {
        console.error(`Failed to load content for path: ${mdxPath.join("/")}.${locale}`, error);

        // フォールバック: デフォルトロケール（日本語）のコンテンツを試行
        try {
            const fallbackPath = mdxPath.map((path) => `${path}.ja-JP`);
            const { default: MDXContent, toc, metadata, sourceCode } = await importPage(fallbackPath);

            return (
                <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
                    <MDXContent params={params} />
                </Wrapper>
            );
        } catch (fallbackError) {
            console.error("Fallback also failed:", fallbackError);
            return (
                <div className="p-8">
                    <h1 className="text-2xl font-bold mb-4">
                        {locale === "ja-JP" ? "ページが見つかりません" : "Page Not Found"}
                    </h1>
                    <p>
                        {locale === "ja-JP"
                            ? "お探しのページは現在利用できません。"
                            : "The requested page is currently not available."}
                    </p>
                </div>
            );
        }
    }
}

// EOF
