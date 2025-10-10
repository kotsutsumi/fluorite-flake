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
        console.log(`生成されたメタデータのパス: ${mdxPath}, ロケール: ${locale}`);

        // ロケール固有のパスを構築（例: ['get-started'] → ['ja-JP', 'get-started']）
        const localizedPath = [locale, ...mdxPath];

        // ロケール固有のメタデータを取得
        const { metadata } = await importPage(localizedPath);
        return (
            metadata || {
                title: locale === "ja-JP" ? "はじめに" : "Get Started",
            }
        );
    } catch (error) {
        console.warn(`Could not load metadata for ${locale}/${mdxPath.join("/")}:`, error.message);
        // フォールバック用のメタデータを返す
        return {
            title: locale === "ja-JP" ? "はじめに" : "Get Started",
            description: locale === "ja-JP" ? "Fluorite Flakeの使い方を学ぶ" : "Learn how to use Fluorite Flake",
        };
    }
}

const Wrapper = getMDXComponents().wrapper;

export default async function LocalizedPage({ params }) {
    const { locale, mdxPath } = await params;

    try {
        // ロケール固有のファイルパスを構築（例: ['ja-JP', 'get-started']）
        const localizedPath = [locale, ...mdxPath];

        // 指定されたパスのコンテンツを読み込み
        const { default: MDXContent, toc, metadata, sourceCode } = await importPage(localizedPath);

        return (
            <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
                <MDXContent params={params} />
            </Wrapper>
        );
    } catch (error) {
        console.error(`Failed to load content for path: ${locale}/${mdxPath.join("/")}`, error);

        // フォールバック: デフォルトロケール（日本語）のコンテンツを試行
        try {
            const fallbackPath = ["ja-JP", ...mdxPath];
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
