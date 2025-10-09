import { headers } from "next/headers";
import { redirect } from "next/navigation";

function getLocaleFromHeaders() {
    const headersList = headers();
    const acceptLanguage = headersList.get("accept-language") || "";

    // 日本語が含まれている場合は ja-JP を返す
    if (acceptLanguage.includes("ja")) {
        return "ja-JP";
    }

    // デフォルトは en-US
    return "en-US";
}

export default function HomePage() {
    const locale = getLocaleFromHeaders();
    // シンプルなロケールベースのリダイレクト
    redirect(`/${locale}`);
}
