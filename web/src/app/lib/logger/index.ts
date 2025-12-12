/**
 * ログに付与する補足情報
 * サーバー側のLoggerと同じインターフェース
 */
export type AdditionalData = Error | Record<string, unknown>;

/**
 * vite-plugin-terminalのインスタンス
 * クライアントサイドで非同期に初期化される
 */
let terminal: typeof import("virtual:terminal").default | null = null;

// クライアントサイドでのみ非同期初期化
// 本番ビルド時はvite-plugin-terminalのstrip機能で削除される
if (typeof window !== "undefined") {
  import("virtual:terminal")
    .then((m) => {
      terminal = m.default;
    })
    .catch(() => {
      // 本番環境などでモジュールが存在しない場合は無視
    });
}

/**
 * アプリケーション共通のログ出力インターフェース
 */
export type Logger = {
  debug(message: string, data?: AdditionalData): void;
  info(message: string, data?: AdditionalData): void;
  warn(message: string, data?: AdditionalData): void;
  error(message: string, data?: AdditionalData): void;
};

/**
 * コンポーネント/モジュール用のLoggerを生成
 *
 * @param component - コンポーネント名またはモジュール名
 * @returns Logger インスタンス
 *
 * @example
 * const logger = buildLogger("ResetPasswordRoute");
 * logger.info("確認コード送信", { email });
 * logger.error("送信失敗", error);
 */
export const buildLogger = (component: string): Logger => {
  const formatOutput = (
    level: string,
    message: string,
    data?: AdditionalData,
  ): [string, AdditionalData?] => {
    const prefix = `[${level}] [${component}] ${message}`;
    if (data === undefined) {
      return [prefix];
    }
    if (data instanceof Error) {
      return [prefix, { error: data.message, stack: data.stack }];
    }
    return [prefix, data];
  };

  const output = (
    method: "debug" | "info" | "warn" | "error",
    level: string,
    message: string,
    data?: AdditionalData,
  ) => {
    if (terminal === null) return;
    const [msg, extra] = formatOutput(level, message, data);
    if (extra !== undefined) {
      terminal[method](msg, extra);
    } else {
      terminal[method](msg);
    }
  };

  return {
    debug: (message: string, data?: AdditionalData) => {
      output("debug", "DEBUG", message, data);
    },
    info: (message: string, data?: AdditionalData) => {
      output("info", "INFO", message, data);
    },
    warn: (message: string, data?: AdditionalData) => {
      output("warn", "WARN", message, data);
    },
    error: (message: string, data?: AdditionalData) => {
      output("error", "ERROR", message, data);
    },
  };
};
