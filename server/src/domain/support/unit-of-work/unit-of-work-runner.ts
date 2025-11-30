import { Result } from "@/util/result";

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
   * - コールバックはResult型を返す
   * - Result.ok()の場合のみコミット
   * - Result.err()の場合はロールバック
   * - throwは使用しない（Result型でエラーを表現）
   *
   * @param callback - トランザクション内で実行する処理（Result型を返す）
   * @returns コールバックの実行結果（Result型）
   */
  run<TOutput, TError extends Error>(
    callback: (uow: TUoW) => Promise<Result<TOutput, TError>>,
  ): Promise<Result<TOutput, TError>>;
};
