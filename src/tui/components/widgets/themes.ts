/**
 * TUIテーマ設定
 */

/**
 * テーマ設定
 */
export const THEMES = {
    dark: {
        fg: 'white',
        bg: 'black',
        border: 'cyan',
        selectedFg: 'white',
        selectedBg: 'blue',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        info: 'cyan',
    },
    light: {
        fg: 'black',
        bg: 'white',
        border: 'gray',
        selectedFg: 'white',
        selectedBg: 'blue',
        success: 'green',
        warning: 'yellow',
        error: 'red',
        info: 'blue',
    },
} as const;
