/**
 * ちょっとした挨拶アニメーションを表示するコンポーネント。
 * - Reanimated の Animated.Text を利用し、CSS アニメーション記法で簡易な揺れを実装
 * - ネイティブ / Web 両対応のため、絵文字を直接描画
 */
import Animated from "react-native-reanimated";

export function HelloWave() {
  return (
    <Animated.Text
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        // CSS keyframes 互換の記法で 50% のタイミングに回転を仕込む
        animationName: {
          "50%": { transform: [{ rotate: "25deg" }] },
        },
        // 揺れを 4 回繰り返し、1 サイクル 300ms で軽快な印象にする
        animationIterationCount: 4,
        animationDuration: "300ms",
      }}
    >
      👋
    </Animated.Text>
  );
}

// EOF
