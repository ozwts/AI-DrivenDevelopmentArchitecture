import { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";
import type { ProjectMember } from "./project-member.entity";

export type SaveResult = Result<void, UnexpectedError>;
export type FindByIdResult = Result<ProjectMember | undefined, UnexpectedError>;
export type FindByProjectIdResult = Result<ProjectMember[], UnexpectedError>;
export type FindByProjectIdAndUserIdResult = Result<
  ProjectMember | undefined,
  UnexpectedError
>;
export type FindByUserIdResult = Result<ProjectMember[], UnexpectedError>;
export type CountOwnersByProjectIdResult = Result<number, UnexpectedError>;
export type RemoveResult = Result<void, UnexpectedError>;

export type ProjectMemberRepository = {
  /**
   * ProjectMember IDを生成する
   */
  projectMemberId(): string;

  /**
   * プロジェクトメンバーをIDで検索する
   */
  findById(props: { id: string }): Promise<FindByIdResult>;

  /**
   * プロジェクトIDでメンバー一覧を検索する
   */
  findByProjectId(props: {
    projectId: string;
  }): Promise<FindByProjectIdResult>;

  /**
   * プロジェクトIDとユーザーIDでメンバーを検索する
   */
  findByProjectIdAndUserId(props: {
    projectId: string;
    userId: string;
  }): Promise<FindByProjectIdAndUserIdResult>;

  /**
   * ユーザーIDでメンバーシップ一覧を検索する
   */
  findByUserId(props: { userId: string }): Promise<FindByUserIdResult>;

  /**
   * プロジェクトのオーナー数を取得する
   */
  countOwnersByProjectId(props: {
    projectId: string;
  }): Promise<CountOwnersByProjectIdResult>;

  /**
   * プロジェクトメンバーを保存する（新規作成・更新）
   */
  save(props: { projectMember: ProjectMember }): Promise<SaveResult>;

  /**
   * プロジェクトメンバーを削除する
   */
  remove(props: { id: string }): Promise<RemoveResult>;
};
