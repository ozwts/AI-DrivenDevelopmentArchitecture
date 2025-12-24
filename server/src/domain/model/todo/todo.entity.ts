import type { Attachment } from "./attachment.entity";
import { TodoStatus } from "./todo-status.vo";

/**
 * TODO優先度
 *
 * TODOの重要度を表す列挙型。
 * - LOW: 低優先度
 * - MEDIUM: 中優先度
 * - HIGH: 高優先度
 */
export type TodoPriority = "LOW" | "MEDIUM" | "HIGH";

/**
 * Todo コンストラクタのProps型
 */
export type TodoProps = {
  id: string;
  title: string;
  description: string | undefined;
  status: TodoStatus;
  priority: TodoPriority;
  dueDate: string | undefined;
  projectId: string | undefined;
  assigneeUserId: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
};

/**
 * TODO エンティティ
 *
 * やるべきタスクを表すドメインエンティティ。
 * タイトル、説明、ステータス、優先度、期限日、プロジェクトIDなどの情報を持つ。
 *
 * @example
 * ```typescript
 * // TODOの作成
 * const todo = new Todo({
 *   id: "todo-123",
 *   title: "データベース設計",
 *   description: "ER図を作成する",
 *   status: "TODO",
 *   priority: "HIGH",
 *   dueDate: "2024-01-31T23:59:59.000Z",
 *   projectId: "project-1",
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   updatedAt: "2024-01-01T00:00:00.000Z"
 * });
 *
 * // ステータスの変更（新しいインスタンスを生成）
 * const inProgress = todo.changeStatus("IN_PROGRESS", "2024-01-02T00:00:00.000Z");
 * ```
 */
export class Todo {
  /**
   * TODO ID
   *
   * TODOを一意に識別するID。
   * リポジトリの実装によって生成される。
   */
  readonly id: string;

  /**
   * タイトル
   *
   * TODOの概要を示すタイトル。
   * 必須項目。
   */
  readonly title: string;

  /**
   * 説明
   *
   * TODOの詳細説明。
   * Tier 3（Optional）項目。
   */
  readonly description: string | undefined;

  /**
   * ステータス
   *
   * TODOの進捗状況。
   * デフォルト値は "TODO"（未着手）。
   */
  readonly status: TodoStatus;

  /**
   * 優先度
   *
   * TODOの重要度。
   * デフォルト値は "MEDIUM"（中優先度）。
   */
  readonly priority: TodoPriority;

  /**
   * 期限日
   *
   * TODOの完了期限（ISO 8601形式）。
   * - undefined: "期限なし"を意味する
   */
  readonly dueDate: string | undefined;

  /**
   * プロジェクトID
   *
   * このTODOが属するプロジェクトのID。
   * - undefined: "プロジェクトに属さない"を意味する
   */
  readonly projectId: string | undefined;

  /**
   * 担当者ユーザーID
   *
   * このTODOに割り当てられた担当者のユーザーID。
   * 担当者を表す必須項目。
   * デフォルトではTODOの作成者が担当者として設定される。
   */
  readonly assigneeUserId: string;

  /**
   * 作成日時
   *
   * TODOが作成された日時（ISO 8601形式）。
   * 一度設定されると変更されない。
   */
  readonly createdAt: string;

  /**
   * 更新日時
   *
   * TODOが最後に更新された日時（ISO 8601形式）。
   * TODO情報が更新されるたびに更新される。
   */
  readonly updatedAt: string;

  /**
   * 添付ファイル
   *
   * このTODOに添付されているファイルのリスト。
   * Todoアグリゲートの一部として管理される。
   */
  readonly attachments: Attachment[];

  private constructor(props: TodoProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.status = props.status;
    this.priority = props.priority;
    this.dueDate = props.dueDate;
    this.projectId = props.projectId;
    this.assigneeUserId = props.assigneeUserId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.attachments = props.attachments;
  }

  /**
   * Todoインスタンスを生成する
   *
   * @param props - TODOのプロパティ
   * @returns Todoインスタンス
   */
  static from(props: TodoProps): Todo {
    return new Todo(props);
  }

  /**
   * TODOのタイトルを変更する
   *
   * @param title - 新しいタイトル
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  retitle(title: string, updatedAt: string): Todo {
    return new Todo({
      ...this,
      title,
      updatedAt,
    });
  }

  /**
   * TODOの説明を明確化する
   *
   * @param description - 新しい説明
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  clarify(description: string | undefined, updatedAt: string): Todo {
    return new Todo({
      ...this,
      description,
      updatedAt,
    });
  }

  /**
   * TODOを開始する
   *
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  start(updatedAt: string): Todo {
    return new Todo({
      ...this,
      status: TodoStatus.inProgress(),
      updatedAt,
    });
  }

  /**
   * TODOを完了する
   *
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  complete(updatedAt: string): Todo {
    return new Todo({
      ...this,
      status: TodoStatus.completed(),
      updatedAt,
    });
  }

  /**
   * TODOを再開する（未着手状態に戻す）
   *
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  reopen(updatedAt: string): Todo {
    return new Todo({
      ...this,
      status: TodoStatus.todo(),
      updatedAt,
    });
  }

  /**
   * TODOの優先度を上げる
   *
   * @param priority - 新しい優先度
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  prioritize(priority: TodoPriority, updatedAt: string): Todo {
    return new Todo({
      ...this,
      priority,
      updatedAt,
    });
  }

  /**
   * TODOの期限を再設定する
   *
   * @param dueDate - 新しい期限日
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  reschedule(dueDate: string | undefined, updatedAt: string): Todo {
    return new Todo({
      ...this,
      dueDate,
      updatedAt,
    });
  }

  /**
   * TODOをプロジェクトに移動する
   *
   * @param projectId - 新しいプロジェクトID
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  moveToProject(projectId: string | undefined, updatedAt: string): Todo {
    return new Todo({
      ...this,
      projectId,
      updatedAt,
    });
  }

  /**
   * TODOに担当者をアサインする
   *
   * @param assigneeUserId - 新しい担当者ユーザーID
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  assign(assigneeUserId: string, updatedAt: string): Todo {
    return new Todo({
      ...this,
      assigneeUserId,
      updatedAt,
    });
  }

  /**
   * 添付ファイルを追加する
   *
   * @param attachment - 追加する添付ファイル
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  attach(attachment: Attachment, updatedAt: string): Todo {
    return new Todo({
      ...this,
      attachments: [...this.attachments, attachment],
      updatedAt,
    });
  }

  /**
   * 添付ファイルを削除する
   *
   * @param attachmentId - 削除する添付ファイルのID
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  detach(attachmentId: string, updatedAt: string): Todo {
    return new Todo({
      ...this,
      attachments: this.attachments.filter((a) => a.id !== attachmentId),
      updatedAt,
    });
  }

  /**
   * 添付ファイルを更新する
   *
   * @param updatedAttachment - 更新する添付ファイル
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  replaceAttachment(updatedAttachment: Attachment, updatedAt: string): Todo {
    return new Todo({
      ...this,
      attachments: this.attachments.map((a) =>
        a.id === updatedAttachment.id ? updatedAttachment : a,
      ),
      updatedAt,
    });
  }
}
