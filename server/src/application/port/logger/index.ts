/**
 * ログに付与する補足情報
 * 例外オブジェクトまたは構造化データを指定可能
 */
export type AdditionalData = Error | Record<string, unknown>;

/**
 * アプリケーション共通のログ出力インターフェース
 *
 * @description
 * 実装詳細を隠蔽し、構造化ログ出力を可能にする。
 */
export type Logger = {
  /**
   * デバッグレベルのログを出力
   * @param message - 出力するメッセージ
   * @param data - 補足情報（任意）
   */
  debug(message: string, data?: AdditionalData): void;

  /**
   * 情報レベルのログを出力
   * @param message - 出力するメッセージ
   * @param data - 補足情報（任意）
   */
  info(message: string, data?: AdditionalData): void;

  /**
   * 警告レベルのログを出力
   * @param message - 出力するメッセージ
   * @param data - 補足情報（任意）
   */
  warn(message: string, data?: AdditionalData): void;

  /**
   * エラーレベルのログを出力
   * @param message - 出力するメッセージ
   * @param data - 補足情報（任意）
   */
  error(message: string, data?: AdditionalData): void;

  /**
   * 以降の全ログに共通キーを付与
   * @param params - 付与するキーと値のペア
   * @example
   * logger.appendKeys({ requestId: "abc-123" });
   * logger.info("処理開始"); // requestIdが自動付与される
   */
  appendKeys(params: Record<string, unknown>): void;
};
