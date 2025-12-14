/**
 * ログに付与する補足情報
 * サーバー側のLoggerと同じインターフェース
 */
export type AdditionalData = Error | Record<string, unknown>;

/**
 * vite-plugin-terminalの型定義
 * virtual:terminalへの型依存を排除するため明示的に定義
 */
type Terminal = {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
};

/**
 * vite-plugin-terminalのインスタンス
 * 開発環境でのみ非同期に初期化される
 */
let terminal: Terminal | null = null;

/**
 * グローバルなuserSub（横断的関心事として状態を保持）
 * 全てのloggerインスタンスで共有される
 */
let globalUserSub: string | undefined;

/**
 * グローバルなuserSubを設定
 * 認証成功時に呼び出し、以降の全ログにuserSubが付与される
 *
 * @param userSub - ユーザー識別子（ログアウト時はundefined）
 *
 * @example
 * // ログイン成功時
 * setUserSub(user.userId);
 *
 * // ログアウト時
 * setUserSub(undefined);
 */
export function setUserSub(userSub: string | undefined): void {
  globalUserSub = userSub;
}

// 開発環境でのみ非同期初期化
// 本番/テスト環境ではモジュールが存在しないため何もしない
if (typeof window !== "undefined") {
  import("virtual:terminal")
    .then((m) => {
      terminal = m.default;
    })
    .catch(() => {
      // 本番/テスト環境などでモジュールが存在しない場合は無視
    });
}

/**
 * アプリケーション共通のログ出力インターフェース
 * サーバー側のLoggerと同じインターフェース
 */
export type Logger = {
  debug(message: string, data?: AdditionalData): void;
  info(message: string, data?: AdditionalData): void;
  warn(message: string, data?: AdditionalData): void;
  error(message: string, data?: AdditionalData): void;

  /**
   * 以降の全ログに共通キーを付与
   * @param params - 付与するキーと値のペア
   * @example
   * logger.appendKeys({ userSub: "abc-123" });
   * logger.info("処理開始"); // userSubが自動付与される
   */
  appendKeys(params: Record<string, unknown>): void;
};

/**
 * コンポーネント/モジュール用のLoggerを生成
 *
 * @param component - コンポーネント名またはモジュール名
 * @returns Logger インスタンス
 *
 * @example
 * const logger = buildLogger("ResetPasswordRoute");
 * logger.appendKeys({ userSub: user.sub });
 * logger.info("確認コード送信", { email });
 * logger.error("送信失敗", error);
 */
export const buildLogger = (component: string): Logger => {
  // 永続キー（appendKeysで追加されたキー）
  let persistentKeys: Record<string, unknown> = {};

  const formatOutput = (
    level: string,
    message: string,
    data?: AdditionalData,
  ): [string, Record<string, unknown>?] => {
    const prefix = `[${level}] [${component}] ${message}`;

    // グローバルuserSubと永続キーをマージ
    const baseKeys: Record<string, unknown> = {
      ...(globalUserSub !== undefined ? { userSub: globalUserSub } : {}),
      ...persistentKeys,
    };
    const hasBaseKeys = Object.keys(baseKeys).length > 0;

    if (data === undefined) {
      if (hasBaseKeys) {
        return [prefix, { ...baseKeys }];
      }
      return [prefix];
    }

    if (data instanceof Error) {
      return [
        prefix,
        {
          ...baseKeys,
          error: data.message,
          stack: data.stack,
        },
      ];
    }

    return [prefix, { ...baseKeys, ...data }];
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
    appendKeys: (params: Record<string, unknown>) => {
      persistentKeys = { ...persistentKeys, ...params };
    },
  };
};
