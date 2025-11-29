import type { Result } from "@/util/result";
import type { DomainError } from "@/util/error-util";

/**
 * Value Object（値オブジェクト）のインスタンス型
 *
 * すべてのValue Objectはこの型を実装しなければならない。
 * `guardrails/policy/server/domain-model/25-value-object-overview.md` を参照。
 */
export type ValueObject<T> = {
  /**
   * 値の等価性を判定する
   */
  equals(other: T): boolean;

  /**
   * デバッグ・ログ用の文字列表現を返す
   *
   * 注: from()との対称性は期待しない（目的が異なる）
   */
  toString(): string;
};

/**
 * Value Objectの静的メソッド要件
 *
 * すべてのValue Objectクラスは`from`静的メソッドを実装しなければならない。
 * `staticImplements`デコレーターと組み合わせて使用する。
 *
 * 重要: from()は常にpropsパターンを使用する（Entityのreconstruct()と統一）
 */
export type ValueObjectConstructor<T> = {
  /**
   * propsからValue Objectを生成する
   *
   * 単一パラメータの場合: from(props: { value: string })
   * 複数パラメータの場合: from(props: { firstName: string; lastName: string })
   */
  from(props: unknown): Result<T, DomainError>;
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
 *   static from(props: { value: string }): Result<TodoStatus, DomainError> {
 *     // 実装
 *   }
 * }
 * ```
 */
export const staticImplements =
  <T>() =>
  <U extends T>(_constructor: U) => {};
