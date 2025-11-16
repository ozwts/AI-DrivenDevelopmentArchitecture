/**
 * トランザクション操作の型
 *
 * 具体的な実装はインフラストラクチャ層で定義する
 */
export type TransactionOperation = unknown;

/**
 * Unit of Work interface
 *
 * トランザクション内で実行する操作を登録・管理するインターフェース
 */
export type UnitOfWork = {
  /**
   * トランザクション操作を追加する
   *
   * @param operation - トランザクション操作
   */
  registerOperation(operation: TransactionOperation): void;

  /**
   * 登録された操作の数を取得する
   *
   * @returns 登録された操作数
   */
  getOperationCount(): number;
};
