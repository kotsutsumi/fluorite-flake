import { notFound } from "next/navigation";
import { getPageMap } from "nextra/page-map";
import { Banner } from "nextra/components";
import { Footer, Layout } from "nextra-theme-docs";

import { LocalizedNavbar } from "../../components/localized-navbar.jsx";

import "../globals.css";

// サポートされるロケール
const locales = ["en-US", "ja-JP"];

// 現在のロケールに基づいてページマップをフィルタリング
function filterPageMapByLocale(pageMap, currentLocale) {
    const filtered = [];
    let localeMetaData = null;

    // 最初にメタデータを確認
    pageMap.forEach(item => {
        if (item.data) {
            filtered.push(item);
            return;
        }

        // 現在のロケールのメタデータを取得
        if (item.name === currentLocale && item.children) {
            const metaChild = item.children.find(child => child.data);
            if (metaChild && metaChild.data) {
                localeMetaData = metaChild.data;
            }
        }
    });

    // 次に実際のページを処理
    pageMap.forEach(item => {
        // dataオブジェクトは既に処理済み
        if (item.data) {
            return;
        }

        // index、showcaseは除外
        if (item.name === 'index' || item.name === 'showcase') {
            return;
        }

        // 現在のロケールのページのみを展開
        if (item.name === currentLocale && item.children) {
            item.children.forEach(child => {
                if (child.name && child.route && !child.data) { // 実際のページか確認
                    // メタ設定をチェックして非表示ページを除外
                    if (localeMetaData && localeMetaData[child.name] && localeMetaData[child.name].display === "hidden") {
                        return; // 非表示ページはスキップ
                    }

                    // メタデータからhrefが指定されている場合はそれを使用、なければロケールプレフィックスを除去
                    const hrefFromMeta = localeMetaData && localeMetaData[child.name] && localeMetaData[child.name].href;
                    const newRoute = hrefFromMeta || (child.route.replace(`/${currentLocale}`, "") || "/");

                    // titleをメタデータから取得するか元の値を使用
                    const title = (localeMetaData && localeMetaData[child.name] && localeMetaData[child.name].title)
                        ? localeMetaData[child.name].title
                        : child.title;

                    filtered.push({
                        ...child,
                        route: newRoute,
                        title: title,
                    });
                }
            });
        }
    });

    return filtered;
}

export default async function LocaleLayout({ children, params }) {
    const { locale } = await params;

    // サポートされているロケールかチェック
    if (!locales.includes(locale)) {
        notFound();
    }

    const originalPageMap = await getPageMap();
    const pageMap = filterPageMapByLocale(originalPageMap, locale);

    return (
        <Layout
            banner={<Banner storageKey="fluorite-flake-docs">Fluorite-Flake Documentation</Banner>}
            navbar={<LocalizedNavbar />}
            footer={<Footer>MIT {new Date().getFullYear()} © Fluorite-Flake.</Footer>}
            editLink="GitHubでこのページを編集"
            docsRepositoryBase="https://github.com/kotsutsumi/fluorite-flake/blob/main/web/src/content"
            sidebar={{
                defaultMenuCollapseLevel: 1,
                toggleButton: true,
            }}
            pageMap={pageMap}
        >
            <div className="min-h-screen">{children}</div>
        </Layout>
    );
}

// EOF