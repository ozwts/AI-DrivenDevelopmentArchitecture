import type { Attachment } from "./attachment";
import { TodoStatus } from "./todo-status";

// TodoStatusを再エクスポート
export { TodoStatus };

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
  readonly description?: string;

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
   * オプション項目。
   */
  readonly dueDate: string | undefined;

  /**
   * プロジェクトID
   *
   * このTODOが属するプロジェクトのID。
   * オプション項目。プロジェクトに属さないTODOも存在可能。
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

  /**
   * コンストラクタ
   *
   * @param props - TODOのプロパティ
   */
  constructor(props: TodoProps) {
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
   * タイトルを変更して新しいTodoインスタンスを返す
   *
   * @param title - 新しいタイトル
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  changeTitle(title: string, updatedAt: string): Todo {
    return new Todo({
      ...this,
      title,
      updatedAt,
    });
  }

  /**
   * 説明を変更して新しいTodoインスタンスを返す
   *
   * @param description - 新しい説明
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  changeDescription(description: string | undefined, updatedAt: string): Todo {
    return new Todo({
      ...this,
      description,
      updatedAt,
    });
  }

  /**
   * ステータスを変更して新しいTodoインスタンスを返す
   *
   * @param status - 新しいステータス
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  changeStatus(status: TodoStatus, updatedAt: string): Todo {
    return new Todo({
      ...this,
      status,
      updatedAt,
    });
  }

  /**
   * 優先度を変更して新しいTodoインスタンスを返す
   *
   * @param priority - 新しい優先度
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  changePriority(priority: TodoPriority, updatedAt: string): Todo {
    return new Todo({
      ...this,
      priority,
      updatedAt,
    });
  }

  /**
   * 期限日を変更して新しいTodoインスタンスを返す
   *
   * @param dueDate - 新しい期限日
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  changeDueDate(dueDate: string | undefined, updatedAt: string): Todo {
    return new Todo({
      ...this,
      dueDate,
      updatedAt,
    });
  }

  /**
   * プロジェクトIDを変更して新しいTodoインスタンスを返す
   *
   * @param projectId - 新しいプロジェクトID
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  changeProjectId(projectId: string | undefined, updatedAt: string): Todo {
    return new Todo({
      ...this,
      projectId,
      updatedAt,
    });
  }

  /**
   * 担当者を変更して新しいTodoインスタンスを返す
   *
   * @param assigneeUserId - 新しい担当者ユーザーID
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  changeAssignee(assigneeUserId: string, updatedAt: string): Todo {
    return new Todo({
      ...this,
      assigneeUserId,
      updatedAt,
    });
  }

  /**
   * 添付ファイルを追加して新しいTodoインスタンスを返す
   *
   * @param attachment - 追加する添付ファイル
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  addAttachment(attachment: Attachment, updatedAt: string): Todo {
    return new Todo({
      ...this,
      attachments: [...this.attachments, attachment],
      updatedAt,
    });
  }

  /**
   * 添付ファイルを削除して新しいTodoインスタンスを返す
   *
   * @param attachmentId - 削除する添付ファイルのID
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  removeAttachment(attachmentId: string, updatedAt: string): Todo {
    return new Todo({
      ...this,
      attachments: this.attachments.filter((a) => a.id !== attachmentId),
      updatedAt,
    });
  }

  /**
   * 添付ファイルを更新して新しいTodoインスタンスを返す
   *
   * @param updatedAttachment - 更新する添付ファイル
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   */
  updateAttachment(updatedAttachment: Attachment, updatedAt: string): Todo {
    return new Todo({
      ...this,
      attachments: this.attachments.map((a) =>
        a.id === updatedAttachment.id ? updatedAttachment : a,
      ),
      updatedAt,
    });
  }
}
