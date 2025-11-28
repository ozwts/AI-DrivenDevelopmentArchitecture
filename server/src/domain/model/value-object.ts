import type { Result } from "@/util/result";
import type { ValidationError } from "@/util/error-util";

/**
 * Value Object（値オブジェクト）のインスタンス型
 *
 * すべてのValue Objectはこの型を実装しなければならない。
 * `guardrails/policy/server/domain-model/25-value-object-design.md` を参照。
 */
export type ValueObject<T> = {
  /**
   * 値の等価性を判定する
   */
  equals(other: T): boolean;

  /**
   * 文字列表現を返す
   */
  toString(): string;
};

/**
 * Value Objectの静的メソッド要件
 *
 * すべてのValue Objectクラスは`fromString`静的メソッドを実装しなければならない。
 * `staticImplements`デコレーターと組み合わせて使用する。
 */
export type ValueObjectConstructor<T> = {
  /**
   * 文字列からValue Objectを生成する
   */
  fromString(value: string): Result<T, ValidationError>;
};

/**
 * 静的メソッドの実装を強制するデコレーター
 *
 * コンパイル時に静的メソッドの存在をチェックする。
 * ランタイムでは何も実行しない（No-Op）。
 *
 * @example
 * ```typescript
 * @staticImplements<ValueObjectConstructor<TodoStatus>>()
 * export class TodoStatus implements ValueObject<TodoStatus> {
 *   static fromString(value: string): Result<TodoStatus, ValidationError> {
 *     // 実装
 *   }
 * }
 * ```
 */
export const staticImplements =
  <T>() =>
  <U extends T>(_constructor: U) => {};
