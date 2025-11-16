/**
 * Unit of Work Runner interface
 *
 * トランザクション境界を管理し、トランザクション内でコールバックを実行するインターフェース
 *
 * @template TUoW - Unit of Work内で使用可能なリソース（リポジトリなど）の型
 */
export type UnitOfWorkRunner<TUoW> = {
  /**
   * トランザクション内でコールバックを実行する
   *
   * @param callback - トランザクション内で実行する処理
   * @returns コールバックの実行結果
   */
  run<TResult>(callback: (uow: TUoW) => Promise<TResult>): Promise<TResult>;
};
