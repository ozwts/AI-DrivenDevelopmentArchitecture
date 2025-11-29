import type { Attachment } from "./attachment";

/**
 * TODOステータス
 *
 * TODOの進捗状況を表す列挙型。
 * - TODO: 未着手
 * - IN_PROGRESS: 作業中
 * - COMPLETED: 完了
 */
export type TodoStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";

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
   * オプション項目。
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
   * @param props.id - TODO ID
   * @param props.title - タイトル
   * @param props.description - 説明（オプション）
   * @param props.status - ステータス（省略時は "TODO"）
   * @param props.priority - 優先度（省略時は "MEDIUM"）
   * @param props.dueDate - 期限日（オプション、ISO 8601形式）
   * @param props.projectId - プロジェクトID（オプション）
   * @param props.assigneeUserId - 担当者ユーザーID
   * @param props.createdAt - 作成日時（ISO 8601形式）
   * @param props.updatedAt - 更新日時（ISO 8601形式）
   * @param props.attachments - 添付ファイル（省略時は空配列）
   */
  constructor(props: {
    id: string;
    title: string;
    description?: string;
    status?: TodoStatus;
    priority?: TodoPriority;
    dueDate?: string;
    projectId?: string;
    assigneeUserId: string;
    createdAt: string;
    updatedAt: string;
    attachments?: Attachment[];
  }) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.status = props.status ?? "TODO";
    this.priority = props.priority ?? "MEDIUM";
    this.dueDate = props.dueDate;
    this.projectId = props.projectId;
    this.assigneeUserId = props.assigneeUserId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.attachments = props.attachments ?? [];
  }

  /**
   * ステータスを変更して新しいTodoインスタンスを返す
   *
   * エンティティの不変性を保つため、元のインスタンスは変更せず、
   * 新しいインスタンスを生成して返す。
   *
   * @param status - 新しいステータス
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   *
   * @example
   * ```typescript
   * const todo = new Todo({ ... });
   * const inProgress = todo.changeStatus("IN_PROGRESS", "2024-01-02T00:00:00.000Z");
   * ```
   */
  changeStatus(status: TodoStatus, updatedAt: string): Todo {
    return new Todo({
      id: this.id,
      title: this.title,
      description: this.description,
      status,
      priority: this.priority,
      dueDate: this.dueDate,
      projectId: this.projectId,
      assigneeUserId: this.assigneeUserId,
      createdAt: this.createdAt,
      updatedAt,
      attachments: this.attachments,
    });
  }

  /**
   * 優先度を変更して新しいTodoインスタンスを返す
   *
   * エンティティの不変性を保つため、元のインスタンスは変更せず、
   * 新しいインスタンスを生成して返す。
   *
   * @param priority - 新しい優先度
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   *
   * @example
   * ```typescript
   * const todo = new Todo({ ... });
   * const highPriority = todo.changePriority("HIGH", "2024-01-02T00:00:00.000Z");
   * ```
   */
  changePriority(priority: TodoPriority, updatedAt: string): Todo {
    return new Todo({
      id: this.id,
      title: this.title,
      description: this.description,
      status: this.status,
      priority,
      dueDate: this.dueDate,
      projectId: this.projectId,
      assigneeUserId: this.assigneeUserId,
      createdAt: this.createdAt,
      updatedAt,
      attachments: this.attachments,
    });
  }

  /**
   * TODO情報を更新して新しいTodoインスタンスを返す
   *
   * @param props - 更新するプロパティ
   * @param props.title - 新しいタイトル（オプション）
   * @param props.description - 新しい説明（オプション）
   * @param props.status - 新しいステータス（オプション）
   * @param props.priority - 新しい優先度（オプション）
   * @param props.dueDate - 新しい期限日（オプション）
   * @param props.projectId - 新しいプロジェクトID（オプション）
   * @param props.assigneeUserId - 新しい担当者ユーザーID（オプション）
   * @param props.updatedAt - 更新日時（必須、ISO 8601形式）
   * @returns 更新された新しいTodoインスタンス
   *
   * @example
   * ```typescript
   * const updated = todo.update({
   *   title: "新しいタイトル",
   *   status: "IN_PROGRESS",
   *   priority: "HIGH",
   *   assigneeUserId: "user-456",
   *   updatedAt: "2024-01-02T00:00:00.000Z"
   * });
   * ```
   */
  update(props: {
    title?: string;
    description?: string;
    status?: TodoStatus;
    priority?: TodoPriority;
    dueDate?: string;
    projectId?: string;
    assigneeUserId?: string;
    attachments?: Attachment[];
    updatedAt: string;
  }): Todo {
    return new Todo({
      id: this.id,
      title: props.title ?? this.title,
      description: props.description ?? this.description,
      status: props.status ?? this.status,
      priority: props.priority ?? this.priority,
      dueDate: props.dueDate ?? this.dueDate,
      projectId: props.projectId ?? this.projectId,
      assigneeUserId: props.assigneeUserId ?? this.assigneeUserId,
      createdAt: this.createdAt,
      updatedAt: props.updatedAt,
      attachments: props.attachments ?? this.attachments,
    });
  }

  /**
   * 添付ファイルを削除して新しいTodoインスタンスを返す
   *
   * エンティティの不変性を保つため、元のインスタンスは変更せず、
   * 新しいインスタンスを生成して返す。
   *
   * @param attachmentId - 削除する添付ファイルのID
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいTodoインスタンス
   *
   * @example
   * ```typescript
   * const todo = new Todo({ ... });
   * const updated = todo.removeAttachment("attachment-123", "2024-01-02T00:00:00.000Z");
   * ```
   */
  removeAttachment(attachmentId: string, updatedAt: string): Todo {
    const updatedAttachments = this.attachments.filter(
      (attachment) => attachment.id !== attachmentId,
    );

    return new Todo({
      id: this.id,
      title: this.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      dueDate: this.dueDate,
      projectId: this.projectId,
      assigneeUserId: this.assigneeUserId,
      createdAt: this.createdAt,
      updatedAt,
      attachments: updatedAttachments,
    });
  }
}
