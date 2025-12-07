import { Result } from "@/util/result";
import type { UnexpectedError } from "@/util/error-util";

/**
 * 認証ペイロード
 *
 * @interface AuthPayload
 */
export type AuthPayload = {
  /**
   * ユーザーSub（ユーザー識別子）
   */
  userSub: string;

  /**
   * 発行者
   */
  issuer?: string;

  /**
   * 発行時間（UNIX時間）
   */
  issuedAt?: number;

  /**
   * 有効期限（UNIX時間）
   */
  expiresAt?: number;

  /**
   * カスタムクレーム
   */
  claims?: Record<string, unknown>;
};

/**
 * 認証ユーザー情報
 *
 * @interface AuthUser
 */
export type AuthUser = {
  /**
   * ユーザーID
   */
  id: string;

  /**
   * メールアドレス
   */
  email?: string;

  /**
   * メール確認済みフラグ
   */
  emailVerified?: boolean;

  /**
   * 無効化フラグ
   */
  disabled?: boolean;
};

/**
 * ユーザー削除結果
 */
export type DeleteUserResult = Result<void, UnexpectedError>;

/**
 * JWTトークン認証と認可
 *
 * @interface AuthClient
 */
export type AuthClient = {
  /**
   * JWTトークンをデコードする
   *
   * @param {string} token JWTトークン
   * @returns {Promise<AuthPayload>} デコードされたペイロード
   * @memberof AuthClient
   */
  decodeToken(token: string): Promise<AuthPayload>;

  /**
   * ユーザーIDからユーザー情報を取得する
   *
   * @param {string} userId ユーザーID
   * @returns {Promise<AuthUser>} ユーザー情報
   * @memberof AuthClient
   */
  getUserById(userId: string): Promise<AuthUser>;

  /**
   * トークンを検証する
   *
   * @param {string} token JWTトークン
   * @returns {Promise<boolean>} 検証結果
   * @memberof AuthClient
   */
  verifyToken(token: string): Promise<boolean>;

  /**
   * ユーザーを削除する
   *
   * @param {string} userId ユーザーID
   * @returns {Promise<DeleteUserResult>} 削除結果
   * @memberof AuthClient
   */
  deleteUser(userId: string): Promise<DeleteUserResult>;

  /**
   * カスタムトークンを生成する
   *
   * @param {string} userId ユーザーID
   * @param {Record<string, unknown>} additionalClaims 追加のクレーム（オプション）
   * @returns {Promise<string>} カスタムトークン
   * @memberof AuthClient
   */
  createCustomToken(
    userId: string,
    additionalClaims?: Record<string, unknown>,
  ): Promise<string>;
};
