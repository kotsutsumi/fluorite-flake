/**
 * Expo Router の `Link` を拡張し、ネイティブ環境でも安全に外部 URL を開くコンポーネント。
 * - Web では標準の target=\"_blank\" を利用
 * - iOS / Android では `expo-web-browser` のアプリ内ブラウザを利用して文脈を保つ
 */
import { type Href, Link } from "expo-router";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: Href & string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== "web") {
          // ネイティブ環境で標準ブラウザが開く既定動作を抑制する
          event.preventDefault();
          // アプリ内ブラウザでリンクを開く
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        } else {
          // Web ではブラウザのタブで開くのが自然な UX のため target=\"_blank\" をそのまま活かす
        }
      }}
    />
  );
}

// EOF
