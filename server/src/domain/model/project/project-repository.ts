import type { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";
import type { Project } from "./project";

export type SaveResult = Result<void, UnexpectedError>;
export type FindByIdResult = Result<Project | undefined, UnexpectedError>;
export type FindAllResult = Result<Project[], UnexpectedError>;
export type RemoveResult = Result<void, UnexpectedError>;

export type ProjectRepository = {
  /**
   * Project IDを生成する
   */
  projectId(): string;

  /**
   * プロジェクトをIDで検索する
   */
  findById(props: { id: string }): Promise<FindByIdResult>;

  /**
   * プロジェクトを全件検索する
   */
  findAll(): Promise<FindAllResult>;

  /**
   * プロジェクトを保存する（新規作成・更新）
   */
  save(props: { project: Project }): Promise<SaveResult>;

  /**
   * プロジェクトを削除する
   */
  remove(props: { id: string }): Promise<RemoveResult>;
};
