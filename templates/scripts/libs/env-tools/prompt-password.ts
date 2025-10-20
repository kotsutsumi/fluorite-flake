import { createInterface } from "node:readline/promises";

// ターミナルへ入力文字を表示させずにパスワード入力を擬似的に実現するための制御コード群。
const ESCAPE_KEY_CODE = 27;
const BACKSPACE_KEY_CODE = 8;
const DELETE_KEY_CODE = 127;
const ENTER_KEY_CODE = 13;
const LINE_FEED_KEY_CODE = 10;
const CTRL_C_KEY_CODE = 3;
const CTRL_D_KEY_CODE = 4;

const ESC = String.fromCharCode(ESCAPE_KEY_CODE);

export async function promptPassword(message: string): Promise<string> {
  const stdin = process.stdin;
  const stdout = process.stdout;

  // TTY に接続されていない場合（CI でのパイプ入力等）は readline の通常プロンプトにフォールバックする。
  if (!(stdin.isTTY && stdout.isTTY)) {
    const rl = createInterface({
      input: stdin,
      output: stdout,
    });
    try {
      return await rl.question(message);
    } finally {
      await rl.close();
    }
  }

  stdout.write(message);

  const previousRawMode = Boolean(stdin.isRaw);
  stdin.setRawMode(true);
  stdin.resume();

  return await new Promise<string>((resolve) => {
    let buffer = "";

    // 処理の終了時にリスナーを解除し raw モードを元に戻すための後始末。
    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(previousRawMode);
      stdin.pause();
    };

    function shouldSubmit(code: number | undefined): boolean {
      return code === ENTER_KEY_CODE || code === LINE_FEED_KEY_CODE || code === CTRL_D_KEY_CODE;
    }

    function shouldIgnore(code: number | undefined): boolean {
      return code === undefined || code === ESCAPE_KEY_CODE;
    }

    function shouldDelete(code: number | undefined): boolean {
      return code === BACKSPACE_KEY_CODE || code === DELETE_KEY_CODE;
    }

    function processDeletion(): void {
      // 一般的なシェルと同様、カーソルを戻して消去し、位置を調整する。
      if (buffer.length === 0) {
        return;
      }
      buffer = buffer.slice(0, -1);
      stdout.write(`${ESC}[1D ${ESC}[1D`);
    }

    function processAppend(chunk: Buffer): void {
      const text = chunk.toString("utf8");
      buffer += text;
      stdout.write("*".repeat(text.length));
    }

    function onData(chunk: Buffer) {
      const code = chunk[0];

      if (shouldSubmit(code)) {
        // 次のメッセージが新しい行から始まるよう改行を出力する。
        stdout.write(String.fromCharCode(LINE_FEED_KEY_CODE));
        cleanup();
        resolve(buffer);
        return;
      }

      if (code === CTRL_C_KEY_CODE) {
        // 通常のターミナル挙動に合わせ、Ctrl+C でプロセスを終了させる。
        /* v8 ignore next 3 */
        cleanup();
        process.exit(1);
      }

      if (shouldDelete(code)) {
        processDeletion();
        return;
      }

      if (shouldIgnore(code)) {
        return;
      }

      processAppend(chunk);
    }

    stdin.on("data", onData);
  });
}

// EOF
