/**
 * ログに付与する補足情報
 * サーバー側のLoggerと同じインターフェース
 */
export type AdditionalData = Error | Record<string, unknown>;

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
    const prefix = `[${component}] ${message}`;
    if (data === undefined) {
      return [prefix];
    }
    if (data instanceof Error) {
      return [prefix, { error: data.message, stack: data.stack }];
    }
    return [prefix, data];
  };

  return {
    debug(message: string, data?: AdditionalData): void {
      const [msg, extra] = formatOutput("DEBUG", message, data);
      if (extra !== undefined) {
        console.debug(msg, extra);
      } else {
        console.debug(msg);
      }
    },

    info(message: string, data?: AdditionalData): void {
      const [msg, extra] = formatOutput("INFO", message, data);
      if (extra !== undefined) {
        console.info(msg, extra);
      } else {
        console.info(msg);
      }
    },

    warn(message: string, data?: AdditionalData): void {
      const [msg, extra] = formatOutput("WARN", message, data);
      if (extra !== undefined) {
        console.warn(msg, extra);
      } else {
        console.warn(msg);
      }
    },

    error(message: string, data?: AdditionalData): void {
      const [msg, extra] = formatOutput("ERROR", message, data);
      if (extra !== undefined) {
        console.error(msg, extra);
      } else {
        console.error(msg);
      }
    },
  };
};
