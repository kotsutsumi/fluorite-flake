import nextra from "nextra";

const withNextra = nextra({
    // ドキュメント表示設定は app/layout.tsx 側でハンドリングする。
});

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
let basePath;
if (rawBasePath.startsWith("/")) {
    basePath = rawBasePath;
} else if (rawBasePath === "") {
    basePath = "";
} else {
    basePath = `/${rawBasePath}`;
}

const nextConfig = {
    reactStrictMode: true,
    typedRoutes: true,
    output: "export",
    images: {
        unoptimized: true,
    },
    trailingSlash: true,
    basePath,
    assetPrefix: basePath || undefined,
    i18n: {
        locales: ["en", "ja"],
        defaultLocale: "en",
    },
    turbopack: {
        resolveAlias: {
            "next-mdx-import-source-file": "./mdx-components.tsx",
        },
    },
    async redirects() {
        return [
            {
                source: "/",
                destination: "/en/",
                permanent: false,
            },
        ];
    },
};

export default withNextra(nextConfig);

// EOF
