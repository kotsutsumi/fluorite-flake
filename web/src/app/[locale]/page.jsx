import { importPage } from "nextra/pages";
import { useMDXComponents as getMDXComponents } from "../../../mdx-components";

// サポートされるロケール
const locales = ["en-US", "ja-JP"];

// 静的生成用のパラメータ
export async function generateStaticParams() {
    return locales.map((locale) => ({
        locale: locale,
    }));
}

// メタデータ生成
export async function generateMetadata({ params }) {
    const { locale } = await params;
    try {
        const { metadata } = await importPage([locale, "home"]);
        return metadata || {
            title: locale === "ja-JP" ? "ホーム" : "Home",
        };
    } catch (error) {
        console.warn(`Could not load metadata for ${locale}/home:`, error.message);
        return {
            title: locale === "ja-JP" ? "ホーム" : "Home",
            description: locale === "ja-JP" ? "Fluorite Flake ホームページ" : "Fluorite Flake Home",
        };
    }
}

const Wrapper = getMDXComponents().wrapper;

export default async function LocalePage({ params }) {
    const { locale } = await params;

    try {
        // ロケール固有のディレクトリからhome.mdxを読み込み
        const localizedPath = [locale, "home"];
        const { default: MDXContent, toc, metadata, sourceCode } = await importPage(localizedPath);

        return (
            <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
                <MDXContent params={params} />
            </Wrapper>
        );
    } catch (error) {
        console.error(`Failed to load content for ${locale}/home`, error);

        // フォールバック: 日本語版を表示
        try {
            const fallbackPath = ["ja-JP", "home"];
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
