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

  constructor(props: {
    id: string;
    sub: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = props.id;
    this.sub = props.sub;
    this.name = props.name;
    this.email = props.email;
    this.emailVerified = props.emailVerified;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * メールアドレスと検証状態を更新する
   *
   * @param email - 新しいメールアドレス
   * @param emailVerified - メールアドレスの検証状態
   * @param updatedAt - 更新日時
   * @returns 更新された新しいUserインスタンス
   */
  updateEmail(email: string, emailVerified: boolean, updatedAt: string): User {
    return new User({
      id: this.id,
      sub: this.sub,
      name: this.name,
      email,
      emailVerified,
      createdAt: this.createdAt,
      updatedAt,
    });
  }

  /**
   * ユーザー情報を更新して新しいUserインスタンスを返す
   *
   * エンティティの不変性を保つため、元のインスタンスは変更せず、
   * 新しいインスタンスを生成して返す。
   *
   * このメソッドはユーザーが編集可能なフィールド(name)とトークンから取得した
   * フィールド(email, emailVerified)の両方を更新できます。
   * email/emailVerifiedはCognitoトークンが信頼できる情報源です。
   *
   * @param props - 更新するプロパティ
   * @param props.name - 新しいユーザー名（オプション）
   * @param props.email - 新しいメールアドレス（オプション、トークンから取得）
   * @param props.emailVerified - メール検証状態（オプション、トークンから取得）
   * @param props.updatedAt - 更新日時（必須、ISO 8601形式）
   * @returns 更新された新しいUserインスタンス
   *
   * @example
   * ```typescript
   * // ユーザー入力からnameのみ更新
   * const updated = user.update({
   *   name: "新しい名前",
   *   updatedAt: "2024-01-02T00:00:00.000Z"
   * });
   *
   * // トークンからemailを同期
   * const synced = user.update({
   *   email: "new@example.com",
   *   emailVerified: true,
   *   updatedAt: "2024-01-02T00:00:00.000Z"
   * });
   *
   * // 両方を同時に更新
   * const both = user.update({
   *   name: "新しい名前",
   *   email: "new@example.com",
   *   emailVerified: true,
   *   updatedAt: "2024-01-02T00:00:00.000Z"
   * });
   * ```
   */
  update(props: {
    name?: string;
    email?: string;
    emailVerified?: boolean;
    updatedAt: string;
  }): User {
    return new User({
      id: this.id,
      sub: this.sub,
      name: props.name ?? this.name,
      email: props.email ?? this.email,
      emailVerified: props.emailVerified ?? this.emailVerified,
      createdAt: this.createdAt,
      updatedAt: props.updatedAt,
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
