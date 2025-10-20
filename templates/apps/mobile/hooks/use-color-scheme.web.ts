/**
 * Web ビルド時に水和 (Hydration) を考慮したカラースキーム判定フック。
 * - SSR/SSG では常にライトモードを返し、クライアントで再計算してちらつきを防ぐ
 * - React Native の実装をそのまま利用しつつ、水和完了フラグで結果を切り替える
 */
import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

/**
 * 静的レンダリングを成立させるために Web クライアント側で値を再計算する必要がある。
 * 水和前にダークモードを返すと DOM 差分が発生するため、明示的なフォールバックを挟んでいる。
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // 初回レンダリング後にフラグを立て、React Native のスキーム値を返せるようにする
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  // サーバー描画時はライトモードを固定で返し、水和後に再評価させる
  return "light";
}

// EOF
