import { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";
import type { User } from "./user.entity";

export type SaveResult = Result<void, UnexpectedError>;
export type FindByIdResult = Result<User | undefined, UnexpectedError>;
export type FindAllResult = Result<User[], UnexpectedError>;
export type RemoveResult = Result<void, UnexpectedError>;

/**
 * User Repository
 *
 * ユーザーの永続化を担当するリポジトリのインターフェース。
 */
export type UserRepository = {
  /**
   * ユーザーIDを生成する
   *
   * @returns 生成されたユーザーID
   */
  userId(): string;

  /**
   * ユーザーをIDで検索する
   *
   * @param props - 検索条件
   * @param props.id - ユーザーID
   * @returns ユーザー、またはundefined（見つからない場合）
   */
  findById(props: { id: string }): Promise<FindByIdResult>;

  /**
   * ユーザーをCognito User Subで検索する
   *
   * @param props - 検索条件
   * @param props.sub - Cognito User Sub
   * @returns ユーザー、またはundefined（見つからない場合）
   */
  findBySub(props: { sub: string }): Promise<FindByIdResult>;

  /**
   * ユーザーを全件検索する
   *
   * @returns 全ユーザーのリスト
   */
  findAll(): Promise<FindAllResult>;

  /**
   * ユーザーを保存する
   *
   * 既存のユーザーの場合は更新、新規の場合は作成します。
   *
   * @param props - 保存するユーザー情報
   * @param props.user - Userエンティティ
   * @returns 保存結果
   */
  save(props: { user: User }): Promise<SaveResult>;

  /**
   * ユーザーを削除する
   *
   * @param props - 削除条件
   * @param props.id - ユーザーID
   * @returns 削除結果
   */
  remove(props: { id: string }): Promise<RemoveResult>;
};
