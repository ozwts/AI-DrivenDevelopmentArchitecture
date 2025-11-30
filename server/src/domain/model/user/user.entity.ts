/**
 * User コンストラクタのProps型
 */
export type UserProps = {
  id: string;
  sub: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * User エンティティ
 *
 * アプリケーションのユーザーを表すドメインエンティティ。
 * Cognito User Pool から提供される情報を保持します。
 */
export class User {
  /**
   * User ID
   *
   * ユーザーを一意に識別するID。
   * UUIDv7形式の文字列。
   */
  readonly id: string;

  /**
   * External User Identifier (Sub)
   *
   * 外部認証システムから提供されるユーザー識別子。
   * 認証プロバイダー内でユーザーを一意に識別するために使用されます。
   * 必須フィールド。
   */
  readonly sub: string;

  /**
   * User Name
   *
   * ユーザーの表示名。
   * 通常、メールアドレスの@より前の部分が設定されます。
   */
  readonly name: string;

  /**
   * Email
   *
   * ユーザーのメールアドレス。
   */
  readonly email: string;

  /**
   * Email Verified
   *
   * メールアドレスが検証済みかどうか。
   */
  readonly emailVerified: boolean;

  /**
   * Created At
   *
   * ユーザーの作成日時。
   * ISO 8601形式の文字列（例: "2024-01-01T00:00:00.000Z"）。
   */
  readonly createdAt: string;

  /**
   * Updated At
   *
   * ユーザーの最終更新日時。
   * ISO 8601形式の文字列（例: "2024-01-01T00:00:00.000Z"）。
   */
  readonly updatedAt: string;

  private constructor(props: UserProps) {
    this.id = props.id;
    this.sub = props.sub;
    this.name = props.name;
    this.email = props.email;
    this.emailVerified = props.emailVerified;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Userインスタンスを生成する
   *
   * @param props - Userのプロパティ
   * @returns Userインスタンス
   */
  static from(props: UserProps): User {
    return new User(props);
  }

  /**
   * ユーザー名を変更する
   *
   * @param name - 新しい名前
   * @param updatedAt - 更新日時
   * @returns 更新された新しいUserインスタンス
   */
  rename(name: string, updatedAt: string): User {
    return new User({
      ...this,
      name,
      updatedAt,
    });
  }

  /**
   * メールアドレスと検証状態を変更する
   *
   * @param email - 新しいメールアドレス
   * @param emailVerified - メールアドレスの検証状態
   * @param updatedAt - 更新日時
   * @returns 更新された新しいUserインスタンス
   */
  verifyEmail(email: string, emailVerified: boolean, updatedAt: string): User {
    return new User({
      ...this,
      email,
      emailVerified,
      updatedAt,
    });
  }

  /**
   * メールアドレスからユーザー名を生成する（初回登録時のデフォルト値用）
   *
   * ユーザー登録時に、メールアドレスの@より前の部分をデフォルトのユーザー名として使用します。
   * 登録後、ユーザーは自由に名前を変更できることを想定しています。
   *
   * @param email - メールアドレス
   * @returns メールアドレスの@より前の部分
   *
   * @example
   * ```typescript
   * // 初回登録時のみ使用
   * User.generateNameFromEmail('john.doe@example.com') // => 'john.doe'
   * ```
   */
  static generateNameFromEmail(email: string): string {
    const atIndex = email.indexOf("@");
    if (atIndex === -1) {
      return email;
    }
    return email.substring(0, atIndex);
  }
}
