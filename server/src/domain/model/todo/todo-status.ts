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
 *
 * 値の種類：
 * - TODO: 未着手
 * - IN_PROGRESS: 作業中
 * - COMPLETED: 完了
 *
 * Tier 1（Value Object化が必須）として定義。
 * すべての状態遷移を許可するため、状態遷移の制約は存在しない。
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
   * 未着手状態かどうか
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
   * 指定されたステータスへの遷移が可能かどうかを判定する
   *
   * このプロジェクトではすべての状態遷移を許可するため、常に成功を返す。
   *
   * @param _to - 遷移先のステータス（未使用）
   * @returns 常に成功
   */
  canTransitionTo(_to: TodoStatus): Result<void, DomainError> {
    // すべての遷移を許可
    return Result.ok(undefined);
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
