import { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";
import type { Todo, TodoStatus } from "./todo.entity";

export type SaveResult = Result<void, UnexpectedError>;
export type FindByIdResult = Result<Todo | undefined, UnexpectedError>;
export type FindAllResult = Result<Todo[], UnexpectedError>;
export type FindByStatusResult = Result<Todo[], UnexpectedError>;
export type FindByProjectIdResult = Result<Todo[], UnexpectedError>;
export type RemoveResult = Result<void, UnexpectedError>;

export type TodoRepository = {
  /**
   * TODOIDを生成する
   */
  todoId(): string;

  /**
   * AttachmentIDを生成する
   */
  attachmentId(): string;

  /**
   * TODOをIDで検索する
   */
  findById(props: { id: string }): Promise<FindByIdResult>;

  /**
   * TODOを全件検索する
   */
  findAll(): Promise<FindAllResult>;

  /**
   * TODOをステータスで検索する
   */
  findByStatus(props: { status: TodoStatus }): Promise<FindByStatusResult>;

  /**
   * TODOをプロジェクトIDで検索する
   */
  findByProjectId(props: { projectId: string }): Promise<FindByProjectIdResult>;

  /**
   * TODOを保存する（新規作成・更新）
   */
  save(props: { todo: Todo }): Promise<SaveResult>;

  /**
   * TODOを削除する
   */
  remove(props: { id: string }): Promise<RemoveResult>;
};
