/*
 * Result型の実装上、以下のESLintルールを無効化する必要がある:
 * - no-use-before-define: Ok/Errクラスが相互参照するため
 * - class-methods-use-this: 型ガードの戻り値型で this を使用するが、ESLintは検出しない
 * - no-redeclare: Result型とResultオブジェクトを同名で定義するパターン
 */

/**
 * Result型
 *
 * 成功（Ok）または失敗（Err）を表す型。
 * Ok と Err を別クラスとして実装することで、型ガードが完璧に動作する。
 *
 * @example
 * ```typescript
 * const result = await useCase.execute({ id });
 *
 * if (result.isErr()) {
 *   return handleError(result.error);  // error は E 型
 * }
 *
 * // result.data は T 型として確定
 * console.log(result.data);
 * ```
 */

/**
 * 成功を表すクラス
 */
class Ok<T, E extends Error = Error> {
  readonly data: T;

  constructor(data: T) {
    this.data = data;
  }

  /**
   * 成功かどうかを判定する型ガード
   * @returns 常にtrue
   */
  isOk(): this is Ok<T, E> {
    return true;
  }

  /**
   * 失敗かどうかを判定する型ガード
   * @returns 常にfalse
   */
  isErr(): this is Err<T, E> {
    return !this.isOk();
  }

  /**
   * map（モナディックバインド）
   *
   * fnがResultを返す場合 → そのまま使用
   * fnが普通の値を返す場合 → Ok で自動的に包む
   */
  map<U, E2 extends Error>(
    fn: (value: T) => U | Result<U, E2>,
  ): Result<U, E | E2> {
    const next = fn(this.data);

    // Resultかどうか判定
    if (
      next !== null &&
      next !== undefined &&
      typeof next === "object" &&
      "isOk" in next &&
      typeof next.isOk === "function"
    ) {
      return next as Result<U, E2>;
    }

    // 普通の値の場合、Ok で包む
    return new Ok(next as U);
  }
}

/**
 * 失敗を表すクラス
 */
class Err<T, E extends Error = Error> {
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  /**
   * 成功かどうかを判定する型ガード
   * @returns 常にfalse
   */
  isOk(): this is Ok<T, E> {
    return false;
  }

  /**
   * 失敗かどうかを判定する型ガード
   * @returns 常にtrue
   */
  isErr(): this is Err<T, E> {
    return !this.isOk();
  }

  /**
   * map（モナディックバインド）
   *
   * 失敗の場合は変換をスキップし、そのまま失敗を返す。
   */
  map<U, E2 extends Error>(
    _fn: (value: T) => U | Result<U, E2>,
  ): Result<U, E | E2> {
    return this as unknown as Result<U, E | E2>;
  }
}

/**
 * Result型（Ok または Err の Union）
 */
export type Result<T, E extends Error = Error> = Ok<T, E> | Err<T, E>;

/**
 * Result ヘルパー関数
 *
 * 同名の型とオブジェクトを定義することで、以下のように使用可能：
 * - 型として: `Result<T, E>`
 * - ファクトリとして: `Result.ok(data)`, `Result.err(error)`
 */
export const Result = {
  /**
   * 成功結果を生成
   *
   * @param data - 成功時のデータ
   * @returns Ok<T, never>
   *
   * @example
   * ```typescript
   * const result = Result.ok({ id: "123", name: "Example" });
   * ```
   */
  ok<U>(data: U): Ok<U, never> {
    return new Ok(data);
  },

  /**
   * 失敗結果を生成
   *
   * @param error - エラーオブジェクト
   * @returns Err<never, E>
   *
   * @example
   * ```typescript
   * const result = Result.err(new DomainError("Invalid status"));
   * ```
   */
  err<F extends Error>(error: F): Err<never, F> {
    return new Err(error);
  },
};
