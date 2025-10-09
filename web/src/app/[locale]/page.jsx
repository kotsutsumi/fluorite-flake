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
    const { metadata } = await importPage([`home.${locale}`]);
    return metadata;
}

const Wrapper = getMDXComponents().wrapper;

export default async function LocalePage({ params }) {
    const { locale } = await params;

    // ロケールファイルパスを生成
    const mdxPath = [`home.${locale}`];

    try {
        const { default: MDXContent, toc, metadata, sourceCode } = await importPage(mdxPath);

        return (
            <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
                <MDXContent params={params} />
            </Wrapper>
        );
    } catch (error) {
        console.error(`Failed to load content for locale: ${locale}`, error);
        // フォールバック: 日本語版を表示
        const fallbackPath = [`home.ja-JP`];
        const { default: MDXContent, toc, metadata, sourceCode } = await importPage(fallbackPath);

        return (
            <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
                <MDXContent params={params} />
            </Wrapper>
        );
    }
}

// EOF