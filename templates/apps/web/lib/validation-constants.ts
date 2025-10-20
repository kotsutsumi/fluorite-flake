/**
 * バリデーションで使用する定数を一元管理するモジュール。
 * - 最小 / 最大文字数などのマジックナンバーをここで定義
 */

export const VALIDATION_LIMITS = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
  },
  NAME: {
    MAX_LENGTH: 120,
  },
  NOTE: {
    MAX_LENGTH: 500,
  },
  TIMEOUT: {
    REDIRECT_DELAY: 1500,
  },
  AUTH: {
    BEARER_PREFIX_LENGTH: 7, // "Bearer " プレフィックスの文字数
  },
} as const;

// EOF
