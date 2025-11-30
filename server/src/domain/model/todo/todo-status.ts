import { DomainError } from "../../../util/error-util";
import { Result } from "../../../util/result";
import {
  type ValueObject,
  type ValueObjectConstructor,
  staticImplements,
} from "../value-object";

/**
 * TodoStatus Props型
 */
export type TodoStatusProps = {
  status: string;
};

/**
 * TodoStatus Value Object
 *
 * TODOの進捗状況を表すValue Object。
 * 状態遷移ルールを持つため、Value Object化が必須（Tier 1）。
 *
 * 状態遷移ルール:
 * - TODO -> IN_PROGRESS: 可能
 * - TODO -> COMPLETED: 可能（直接完了も許可）
 * - IN_PROGRESS -> TODO: 可能（作業を戻す）
 * - IN_PROGRESS -> COMPLETED: 可能
 * - COMPLETED -> TODO: 可能（再開）
 * - COMPLETED -> IN_PROGRESS: 可能（再開）
 */
@staticImplements<ValueObjectConstructor<TodoStatus>>()
export class TodoStatus implements ValueObject<TodoStatus> {
  private constructor(private readonly _value: "TODO" | "IN_PROGRESS" | "COMPLETED") {}

  /**
   * 未着手状態を返す
   */
  static todo(): TodoStatus {
    return new TodoStatus("TODO");
  }

  /**
   * 作業中状態を返す
   */
  static inProgress(): TodoStatus {
    return new TodoStatus("IN_PROGRESS");
  }

  /**
   * 完了状態を返す
   */
  static completed(): TodoStatus {
    return new TodoStatus("COMPLETED");
  }

  /**
   * 文字列からTodoStatusを生成する
   *
   * @param props - TodoStatusProps
   * @returns TodoStatusまたはDomainError
   */
  static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
    const validStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
    if (!validStatuses.includes(props.status as typeof validStatuses[number])) {
      return Result.err(
        new DomainError(
          `Invalid TodoStatus: ${props.status}. Must be one of: ${validStatuses.join(", ")}`,
        ),
      );
    }

    return Result.ok(new TodoStatus(props.status as typeof validStatuses[number]));
  }

  /**
   * ステータスの値を取得
   */
  get value(): "TODO" | "IN_PROGRESS" | "COMPLETED" {
    return this._value;
  }

  /**
   * TODO状態かどうか
   */
  isTodo(): boolean {
    return this._value === "TODO";
  }

  /**
   * 作業中状態かどうか
   */
  isInProgress(): boolean {
    return this._value === "IN_PROGRESS";
  }

  /**
   * 完了状態かどうか
   */
  isCompleted(): boolean {
    return this._value === "COMPLETED";
  }

  /**
   * 値の等価性を判定する
   */
  equals(other: TodoStatus): boolean {
    return this._value === other._value;
  }

  /**
   * デバッグ・ログ用の文字列表現を返す
   */
  toString(): string {
    return this._value;
  }
}
