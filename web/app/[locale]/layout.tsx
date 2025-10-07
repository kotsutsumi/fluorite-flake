import type { Metadata } from "next";
import Image from "next/image";
import { Banner } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import { Footer, Layout, Navbar } from "nextra-theme-docs";
import type { ReactNode } from "react";

const REPOSITORY_BASE = "https://github.com/kotsutsumi/fluorite-flake";
const DOCS_EDIT_BASE = `${REPOSITORY_BASE}/tree/main/web/content`;

const LOCALE_MESSAGES = {
    en: {
        siteTitle: "Fluorite Flake Docs",
        titleTemplate: "%s | Fluorite Flake Docs",
        description: "Official documentation for the Fluorite Flake CLI.",
        banner: "Follow the latest release notes on GitHub.",
        editLink: "Edit this page on GitHub",
        feedback: "Create an issue to send feedback",
        tocTitle: "On This Page",
        logoAlt: "Fluorite Flake logo",
        footer: `MIT ${new Date().getFullYear()} © Fluorite Flake Maintainers.`,
    },
    ja: {
        siteTitle: "Fluorite Flake ドキュメント",
        titleTemplate: "%s | Fluorite Flake ドキュメント",
        description: "Fluorite Flake CLI の公式ドキュメント",
        banner: "Fluorite Flake CLI の最新情報を GitHub のリリースノートで確認してください。",
        editLink: "GitHub でこのページを編集",
        feedback: "Issue を作成してフィードバック",
        tocTitle: "目次",
        logoAlt: "Fluorite Flake のロゴ",
        footer: `MIT ${new Date().getFullYear()} © Fluorite Flake Maintainers.`,
    },
} as const;

const I18N_OPTIONS = [
    { locale: "en", name: "English" },
    { locale: "ja", name: "日本語" },
] as const;

type LocaleLayoutProps = {
    children: ReactNode;
    params: Promise<{
        locale: string;
    }>;
};

type LocaleKey = keyof typeof LOCALE_MESSAGES;

const getLocaleMessages = (
    locale: string
): (typeof LOCALE_MESSAGES)[LocaleKey] =>
    LOCALE_MESSAGES[locale as LocaleKey] ?? LOCALE_MESSAGES.en;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const messages = getLocaleMessages(locale);

    return {
        title: {
            default: messages.siteTitle,
            template: messages.titleTemplate,
        },
        description: messages.description,
        metadataBase: new URL(REPOSITORY_BASE),
        alternates: {
            canonical: locale === "en" ? "/" : `/${locale}`,
            languages: {
                en: "/en",
                ja: "/ja",
                "x-default": "/en",
            },
        },
        icons: {
            icon: "/fluorite-flake-logo.png",
        },
        openGraph: {
            title: messages.siteTitle,
            description: messages.description,
            type: "website",
            images: [
                {
                    url: "/fluorite-flake-logo.png",
                    width: 512,
                    height: 591,
                    alt: messages.logoAlt,
                },
            ],
        },
    };
}

export default async function LocaleLayout({
    children,
    params,
}: LocaleLayoutProps) {
    const { locale } = await params;
    const messages = getLocaleMessages(locale);
    const pageMap = await getPageMap(`/${locale}`);

    const banner = (
        <Banner storageKey="fluorite-flake-docs-banner">
            {messages.banner}
        </Banner>
    );

    const navbar = (
        <Navbar
            logo={
                <span className="flex items-center gap-2 font-semibold">
                    <Image
                        alt={messages.logoAlt}
                        height={36}
                        priority
                        src="/fluorite-flake-logo.png"
                        width={31}
                    />
                    <span className="hidden sm:inline">Fluorite Flake</span>
                </span>
            }
            projectLink={REPOSITORY_BASE}
        />
    );

    const footer = <Footer>{messages.footer}</Footer>;

    return (
        <Layout
            banner={banner}
            docsRepositoryBase={`${DOCS_EDIT_BASE}/${locale}`}
            editLink={messages.editLink}
            feedback={{
                content: messages.feedback,
                labels: "docs",
            }}
            footer={footer}
            i18n={[...I18N_OPTIONS]}
            navbar={navbar}
            pageMap={pageMap}
            sidebar={{
                defaultMenuCollapseLevel: 1,
            }}
            toc={{
                float: true,
                title: messages.tocTitle,
            }}
        >
            {children}
        </Layout>
    );
}

// EOF
