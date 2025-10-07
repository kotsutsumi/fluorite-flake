import type { Metadata } from "next";
import { generateStaticParamsFor, importPage } from "nextra/pages";

type PageParams = {
    locale: string;
    mdxPath?: string[];
};

export const dynamicParams = false;

export const generateStaticParams = generateStaticParamsFor(
    "mdxPath",
    "locale"
);

const getPage = async (paramsOrPromise: PageParams | Promise<PageParams>) => {
    const params = await paramsOrPromise;
    const mdxSegments = params.mdxPath?.length ? params.mdxPath : [];
    return importPage(mdxSegments, params.locale);
};

export async function generateMetadata({
    params,
}: {
    params: Promise<PageParams>;
}): Promise<Metadata> {
    const page = await getPage(params);
    return page.metadata;
}

export default async function Page({
    params,
}: {
    params: Promise<PageParams>;
}) {
    const page = await getPage(params);
    const Content = page.default;

    return <Content />;
}

// EOF
