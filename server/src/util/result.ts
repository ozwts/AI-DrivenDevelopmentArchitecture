/**
 * Result型
 *
 * 成功（data）または失敗（error）を表すクラス。
 * メソッドチェーンにより、Result型とEntity型を自然に結合できる。
 *
 * @example
 * ```typescript
 * // 完全フラットなメソッドチェーン
 * const result = Result.ok(order)
 *   .then(o => o.markAsRead())        // Orderを返す → 自動でResult.ok()に包む
 *   .then(o => o.approve())           // Result<Order>を返す → そのまま
 *   .then(o => o.ship());             // 完全にフラット
 * ```
 */
export class Result<T, E extends Error = Error> {
  readonly success: boolean;

  readonly data?: T;

  readonly error?: E;

  private constructor(success: boolean, data?: T, error?: E) {
    this.success = success;
    this.data = data;
    this.error = error;
  }

  /**
   * 成功結果を生成
   *
   * @param data - 成功時のデータ
   * @returns Result<T, never>
   *
   * @example
   * ```typescript
   * const result = Result.ok({ id: "123", name: "Example" });
   * ```
   */
  static ok<U>(data: U): Result<U, never> {
    return new Result<U, never>(true, data, undefined);
  }

  /**
   * 失敗結果を生成
   *
   * @param error - エラーオブジェクト
   * @returns Result<never, E>
   *
   * @example
   * ```typescript
   * const result = Result.err(new DomainError("Invalid status"));
   * ```
   */
  static err<F extends Error>(error: F): Result<never, F> {
    return new Result<never, F>(false, undefined, error);
  }

  /**
   * then（モナディックバインド）
   *
   * Result型のメソッドチェーンを可能にする。
   * 失敗の場合は変換をスキップし、そのまま失敗を返す。
   *
   * fnがResultを返す場合 → そのまま使用
   * fnが普通の値を返す場合 → Result.ok()で自動的に包む
   *
   * @param fn - 変換関数
   * @returns 変換後のResult
   *
   * @example
   * ```typescript
   * // Resultを返すメソッドと普通の値を返すメソッドを混在できる
   * const result = Result.ok(todo)
   *   .then(t => t.update({ title: "新しい" }))   // Todoを返す
   *   .then(t => repository.save(t))             // Result<void>を返す
   *   .then(() => t);                            // 完全にフラット
   * ```
   */
  then<U, E2 extends Error>(
    fn: (value: T) => U | Result<U, E2>,
  ): Result<U, E | E2> {
    if (!this.success) {
      return this as unknown as Result<U, E | E2>;
    }

    const next = fn(this.data!);

    // Resultかどうか判定
    if (
      next !== null &&
      next !== undefined &&
      typeof next === "object" &&
      "success" in next
    ) {
      return next as Result<U, E2>;
    }

    // 普通の値の場合、Result.ok()で包む
    return Result.ok(next as U) as Result<U, E | E2>;
  }
}
